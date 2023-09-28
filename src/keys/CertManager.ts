import type { DB, DBTransaction, LevelPath, KeyPath } from '@matrixai/db';
import type {
  PublicKey,
  PrivateKey,
  Certificate,
  CertificateASN1,
  CertificatePEM,
  KeyPair,
  RecoveryCode,
  CertificatePEMChain,
} from './types';
import type KeyRing from './KeyRing';
import type TaskManager from '../tasks/TaskManager';
import type { CertId, TaskHandlerId, TaskId } from '../ids/types';
import type { Task, TaskHandler } from '../tasks/types';
import type { PolykeyWorkerManagerInterface } from '../workers/types';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { Lock } from '@matrixai/async-locks';
import * as keysUtils from './utils';
import * as keysErrors from './errors';
import * as keysEvents from './events';
import * as ids from '../ids';
import * as utils from '../utils/utils';
import config from '../config';
import {CertManagerOptions} from "@/PolykeyAgent";

/**
 * This signal reason indicates we want to stop the renewal
 */
const abortRenewCertTaskReason = Symbol(
  'abort automatic certificate task renewal',
);

interface CertManager extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new keysErrors.ErrorCertManagerRunning(),
  new keysErrors.ErrorCertManagerDestroyed(),
  {
    eventStart: keysEvents.EventCertManagerStart,
    eventStarted: keysEvents.EventCertManagerStarted,
    eventStop: keysEvents.EventCertManagerStop,
    eventStopped: keysEvents.EventCertManagerStopped,
    eventDestroy: keysEvents.EventCertManagerDestroy,
    eventDestroyed: keysEvents.EventCertManagerDestroyed,
  },
)
class CertManager {
  /**
   * The password is needed in case there needs to be an automatic renewal.
   * When the certificate is automatically renewed, a new key pair is generated.
   *
   * The `certDuration` is in seconds. This is the default duration of generated
   * certificates. Certificates will be valid from now until inclusive of
   * `now + certDuration`. Certificates only have second resolution, so `now` is
   * always interpreted as truncated to the second.
   *
   * The `certRenewLeadTime` is in seconds. This is the amount time set before the
   * last valid second timestamp, in which to automatically run the certificate
   * renewal with the current key pair. This must ensure enough time for change
   * propagation across the gestalt graph.
   */
  public static async createCertManager({
    db,
    keyRing,
    taskManager,
    options = {},
    workerManager,
    logger = new Logger(this.name),
    subjectAttrsExtra,
    now = new Date(),
    lazy = false,
    fresh = false,
  }: {
    db: DB;
    keyRing: KeyRing;
    taskManager: TaskManager;
    options: Partial<CertManagerOptions>;
    workerManager?: PolykeyWorkerManagerInterface;
    logger?: Logger;
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>;
    issuerAttrsExtra?: Array<{ [key: string]: Array<string> }>;
    now?: Date;
    lazy?: boolean;
    fresh?: boolean;
  }): Promise<CertManager> {
    logger.info(`Creating ${this.name}`);
    const optionsDefaulted = utils.mergeObjects(options, {
      certDuration: config.defaultsUser.certDuration,
      certRenewLeadTime: config.defaultsUser.certRenewLeadTime,
    }) as CertManagerOptions;
    const certManager = new this({
      db,
      keyRing,
      taskManager,
      options: optionsDefaulted,
      workerManager,
      logger,
    });
    await certManager.start({
      subjectAttrsExtra,
      now,
      lazy,
      fresh,
    });
    logger.info(`Created ${this.name}`);
    return certManager;
  }

  /**
   * Certificate duration in seconds
   */
  public readonly certDuration: number;
  public readonly certRenewLeadTime: number;

  protected logger: Logger;
  protected db: DB;
  protected keyRing: KeyRing;
  protected taskManager: TaskManager;
  protected workerManager?: PolykeyWorkerManagerInterface;
  protected generateCertId: () => CertId;
  protected dbPath: LevelPath = [this.constructor.name];
  /**
   * Certificate collection
   * `CertManager/certs/{CertId} -> {raw(CertificateASN1)}`
   */
  protected dbCertsPath: LevelPath = [...this.dbPath, 'certs'];
  /**
   * Maintain last `CertID` to preserve monotonicity across process restarts
   * `CertManager/lastCertId -> {raw(CertId)}`
   */
  protected dbLastCertIdPath: KeyPath = [...this.dbPath, 'lastCertId'];
  protected renewResetLock: Lock = new Lock();
  protected renewCurrentCertHandler: TaskHandler = async () => {
    // If the certificate is already being renewed or reset
    // then we can cancel this automatic renewal operation
    if (this.renewResetLock.isLocked()) {
      return;
    }
    await this.renewCertWithCurrentKeyPair();
  };
  protected renewCurrentCertHandlerId: TaskHandlerId =
    `${this.constructor.name}.renewCurrentCert` as TaskHandlerId;
  protected renewCurrentCertTaskId?: TaskId;
  protected subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>;
  protected tasksRunning: boolean = false;

  public constructor({
    db,
    keyRing,
    taskManager,
    options,
    workerManager,
    logger,
  }: {
    db: DB;
    keyRing: KeyRing;
    taskManager: TaskManager;
    options: CertManagerOptions;
    workerManager?: PolykeyWorkerManagerInterface;
    logger: Logger;
  }) {
    this.logger = logger;
    this.db = db;
    this.keyRing = keyRing;
    this.taskManager = taskManager;
    this.certDuration = options.certDuration;
    this.certRenewLeadTime = options.certRenewLeadTime;
    this.workerManager = workerManager;
  }

  public setWorkerManager(workerManager: PolykeyWorkerManagerInterface) {
    this.workerManager = workerManager;
  }

  public unsetWorkerManager() {
    delete this.workerManager;
  }

  public async start({
    subjectAttrsExtra,
    now = new Date(),
    lazy = false,
    fresh = false,
  }: {
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>;
    now?: Date;
    lazy?: boolean;
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.dbPath);
    }
    const lastCertId = await this.getLastCertId();
    this.generateCertId = keysUtils.createCertIdGenerator(lastCertId);
    // This will be used during automatic renewal
    this.subjectAttrsExtra = subjectAttrsExtra;
    await this.setupCurrentCert(now);
    this.logger.info(`Registering handler ${this.renewCurrentCertHandlerId}`);
    this.taskManager.registerHandler(
      this.renewCurrentCertHandlerId,
      this.renewCurrentCertHandler,
    );
    if (!lazy) {
      await this.startTasks(now);
    }
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await this.stopTasks();
    this.logger.info(`Deregistering handler ${this.renewCurrentCertHandlerId}`);
    this.taskManager.deregisterHandler(this.renewCurrentCertHandlerId);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.db.clear(this.dbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Start background tasks.
   * This is idempotent.
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning(), false, ['starting'])
  public async startTasks(now: Date = new Date()): Promise<void> {
    this.tasksRunning = true;
    await this.setupRenewCurrentCertTask(now);
  }

  /**
   * Stop background tasks.
   * This is idempotent.
   */
  public async stopTasks(): Promise<void> {
    // No persistence required for this task
    // it will be registered again upon startup
    if (this.renewCurrentCertTaskId != null) {
      this.logger.info(
        `Cancelling task ${this.renewCurrentCertHandlerId}:${ids.encodeTaskId(
          this.renewCurrentCertTaskId,
        )}`,
      );
      const task = await this.taskManager.getTask(this.renewCurrentCertTaskId);
      if (task != null) {
        task.cancel(abortRenewCertTaskReason);
        try {
          await task.promise();
        } catch (e) {
          // Legitimate abort
          if (e !== abortRenewCertTaskReason) {
            throw e;
          }
        }
      }
      delete this.renewCurrentCertTaskId;
    }
    this.tasksRunning = false;
  }

  @ready(new keysErrors.ErrorCertManagerNotRunning(), false, ['starting'])
  public async getLastCertId(
    tran?: DBTransaction,
  ): Promise<CertId | undefined> {
    const lastCertIdBuffer = await (tran ?? this.db).get(
      this.dbLastCertIdPath,
      true,
    );
    if (lastCertIdBuffer == null) return;
    return IdInternal.fromBuffer<CertId>(lastCertIdBuffer);
  }

  /**
   * Get a certificate according to the `CertID`
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning(), false, ['starting'])
  public async getCert(
    certId: CertId,
    tran?: DBTransaction,
  ): Promise<Certificate | undefined> {
    const certData = await (tran ?? this.db).get(
      [...this.dbCertsPath, certId.toBuffer()],
      true,
    );
    if (certData == null) {
      return;
    }
    return keysUtils.certFromASN1(certData as CertificateASN1);
  }

  /**
   * Get `Certificate` from leaf to root
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning(), false, ['starting'])
  public async *getCerts(tran?: DBTransaction): AsyncGenerator<Certificate> {
    if (tran == null) {
      return yield* this.db.withTransactionG((tran) => this.getCerts(tran));
    }
    for await (const [, certASN1] of tran.iterator(this.dbCertsPath, {
      keys: false,
      reverse: true,
    })) {
      yield keysUtils.certFromASN1(certASN1 as CertificateASN1)!;
    }
  }

  /**
   * Gets an array of `Certificate` in order of leaf to root
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async getCertsChain(
    tran?: DBTransaction,
  ): Promise<Array<Certificate>> {
    const certs: Array<Certificate> = [];
    for await (const cert of this.getCerts(tran)) {
      certs.push(cert);
    }
    return certs;
  }

  /**
   * Get `CertificatePEM` from leaf to root
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async *getCertPEMs(
    tran?: DBTransaction,
  ): AsyncGenerator<CertificatePEM> {
    for await (const cert of this.getCerts(tran)) {
      yield keysUtils.certToPEM(cert);
    }
  }

  /**
   * Gets an array of `CertificatePEM` in order of leaf to root
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async getCertPEMsChain(
    tran?: DBTransaction,
  ): Promise<Array<CertificatePEM>> {
    const pems: Array<CertificatePEM> = [];
    for await (const certPem of this.getCertPEMs(tran)) {
      pems.push(certPem);
    }
    return pems;
  }

  /**
   * Gets a concatenated `CertificatePEM` ordered from leaf to root
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async getCertPEMsChainPEM(
    tran?: DBTransaction,
  ): Promise<CertificatePEMChain> {
    let pem = '';
    for await (const certPem of this.getCertPEMs(tran)) {
      pem += certPem;
    }
    return pem as CertificatePEMChain;
  }

  /**
   * Get the current (leaf) certificate
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning(), false, ['starting'])
  public async getCurrentCert(tran?: DBTransaction): Promise<Certificate> {
    let cert: Certificate;
    for await (const cert_ of this.getCerts(tran)) {
      cert = cert_;
      break;
    }
    return cert!;
  }

  /**
   * Get the current (leaf) certificate in PEM
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async getCurrentCertPEM(
    tran?: DBTransaction,
  ): Promise<CertificatePEM> {
    const cert = await this.getCurrentCert(tran);
    return keysUtils.certToPEM(cert);
  }

  /**
   * Generates a new leaf certificate with a new key pair.
   * This new certificate is chained to the previous certificate.
   *
   * It is self-signed and also signed by the previous certificate
   *
   * The self-signed signature is encoded within the `NodeSignatureExtension`.
   * The certificate signature is produced by the previous certificate's
   * public key.
   *
   * Garbage collection of old certificates is executed immediately afterwards.
   * The garbage collection will be checking if the certificates are expired.
   * It will reference the same timestamp that was used to generate the new
   * certificate.
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async renewCertWithNewKeyPair(
    password: string,
    duration: number = this.certDuration,
    now: Date = new Date(),
  ): Promise<Certificate> {
    let certNew: Certificate;
    await this.renewResetLock.withF(async () => {
      this.logger.info('Renewing certificate chain with new key pair');
      let recoveryCodeNew: RecoveryCode;
      try {
        const currentCert = await this.getCurrentCert();
        await this.keyRing.rotateKeyPair(
          password,
          async (
            keyPairNew: KeyPair,
            keyPairOld: KeyPair,
            recoveryCodeNew_: RecoveryCode,
          ) => {
            recoveryCodeNew = recoveryCodeNew_;
            certNew = await this.generateCertificate({
              subjectKeyPair: keyPairNew,
              issuerPrivateKey: keyPairOld.privateKey,
              duration,
              subjectAttrsExtra: this.subjectAttrsExtra,
              issuerAttrsExtra: currentCert.subjectName.toJSON(),
              now,
            });
            // Putting the new certificate into the DB must complete
            // before the key pair rotation completes.
            // This is because we can rollback the new certificate
            // but we cannot rollback a key pair rotation.
            await this.putCert(certNew);
          },
        );
      } catch (e) {
        // Use the same now to ensure that the new certificate is not expired
        // even if the duration is set to 0
        await this.gcCerts(false, now);
        throw new keysErrors.ErrorCertsRenew(
          'Failed renewing with new key pair',
          { cause: e },
        );
      }
      // Use the same now to ensure that the new certificate is not expired
      // even if the duration is set to 0
      await this.gcCerts(false, now);
      if (this.tasksRunning) {
        await this.setupRenewCurrentCertTask(now);
      }
      this.dispatchEvent(
        new keysEvents.EventCertManagerCertChange({
          detail: {
            nodeId: this.keyRing.getNodeId(),
            keyPair: this.keyRing.keyPair,
            cert: certNew,
            recoveryCode: recoveryCodeNew!,
          },
        }),
      );
      this.logger.info('Renewed certificate chain with new key pair');
    });
    return certNew!;
  }

  /**
   * Generates a new leaf certificate with the current key pair.
   * This new certificate is chained to the previous certificate.
   * It is self-signed and also signed by the previous certificate
   *
   * The self-signed signature is encoded within the `NodeSignatureExtension`.
   * The certificate signature is produced by the previous certificate's
   * public key.
   *
   * This maintains a certificate chain that provides zero-downtime migration.
   * The `NodeId` does not change.
   *
   * Garbage collection of old certificates is executed immediately afterwards.
   * The garbage collection will be checking if the certificates are expired.
   * It will reference the same timestamp that was used to generate the new
   * certificate.
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning(), false, ['starting'])
  public async renewCertWithCurrentKeyPair(
    duration: number = this.certDuration,
    now: Date = new Date(),
  ): Promise<Certificate> {
    let certNew: Certificate;
    await this.renewResetLock.withF(async () => {
      this.logger.info('Renewing certificate chain with current key pair');
      try {
        const currentCert = await this.getCurrentCert();
        certNew = await this.generateCertificate({
          subjectKeyPair: this.keyRing.keyPair,
          issuerPrivateKey: this.keyRing.keyPair.privateKey,
          duration,
          subjectAttrsExtra: this.subjectAttrsExtra,
          issuerAttrsExtra: currentCert.subjectName.toJSON(),
          now,
        });
        await this.putCert(certNew);
      } catch (e) {
        // Use the same now to ensure that the new certificate is not expired
        // even if the duration is set to 0
        await this.gcCerts(false, now);
        throw new keysErrors.ErrorCertsRenew(
          'Failed renewing with current key pair',
          { cause: e },
        );
      }
      // Use the same now to ensure that the new certificate is not expired
      // even if the duration is set to 0
      await this.gcCerts(false, now);
      if (this.tasksRunning) {
        await this.setupRenewCurrentCertTask(now);
      }
      this.dispatchEvent(
        new keysEvents.EventCertManagerCertChange({
          detail: {
            nodeId: this.keyRing.getNodeId(),
            keyPair: this.keyRing.keyPair,
            cert: certNew,
            recoveryCode: undefined,
          },
        }),
      );
      this.logger.info('Renewed certificate chain with current key pair');
    });
    return certNew!;
  }

  /**
   * Generates a new certificate chain starting with a new key pair.
   * The new certificate is self-signed, and has no previous certificate.
   * The results in a new `NodeId`.
   *
   * The self-signed signature is encoded within the `NodeSignatureExtension`.
   *
   * Garbage collection of old certificates is executed immediately afterwards.
   * The garbage collection will be checking if the certificates are expired.
   * It will reference the same timestamp that was used to generate the new
   * certificate.
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async resetCertWithNewKeyPair(
    password: string,
    duration: number = this.certDuration,
    now: Date = new Date(),
  ): Promise<Certificate> {
    let certNew: Certificate;
    await this.renewResetLock.withF(async () => {
      this.logger.info('Resetting certificate chain with new key pair');
      let recoveryCodeNew: RecoveryCode;
      try {
        await this.keyRing.rotateKeyPair(
          password,
          async (keyPairNew: KeyPair, _, recoveryCodeNew_) => {
            recoveryCodeNew = recoveryCodeNew_;
            certNew = await this.generateCertificate({
              subjectKeyPair: keyPairNew,
              issuerPrivateKey: keyPairNew.privateKey,
              duration,
              subjectAttrsExtra: this.subjectAttrsExtra,
              issuerAttrsExtra: this.subjectAttrsExtra,
              now,
            });
            // Putting the new certificate into the DB must complete
            // before the key pair rotation completes.
            // This is because we can rollback the new certificate
            // but we cannot rollback a key pair rotation.
            await this.putCert(certNew);
          },
        );
      } catch (e) {
        // Use the same now to ensure that the new certificate is not expired
        // even if the duration is set to 0
        await this.gcCerts(false, now);
        throw new keysErrors.ErrorCertsReset(
          'Failed resetting with new key pair',
          { cause: e },
        );
      }
      // Use the same now to ensure that the new certificate is not expired
      // even if the duration is set to 0
      // Force delete certificates beyond the current certificate
      await this.gcCerts(true, now);
      if (this.tasksRunning) {
        await this.setupRenewCurrentCertTask(now);
      }
      this.dispatchEvent(
        new keysEvents.EventCertManagerCertChange({
          detail: {
            nodeId: this.keyRing.getNodeId(),
            keyPair: this.keyRing.keyPair,
            cert: certNew!,
            recoveryCode: recoveryCodeNew!,
          },
        }),
      );
      this.logger.info('Resetted certificate chain with new key pair');
    });
    return certNew!;
  }

  /**
   * Generates a new certificate chain starting with the current key pair.
   * The new certificate is self-signed, and has no previous certificate.
   * The `NodeId` does not change.
   *
   * The self-signed signature is encoded within the `NodeSignatureExtension`.
   *
   * Garbage collection of old certificates is executed immediately afterwards.
   * The garbage collection will be checking if the certificates are expired.
   * It will reference the same timestamp that was used to generate the new
   * certificate.
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async resetCertWithCurrentKeyPair(
    duration: number = this.certDuration,
    now: Date = new Date(),
  ): Promise<Certificate> {
    let certNew: Certificate;
    await this.renewResetLock.withF(async () => {
      this.logger.info('Resetting certificate chain with current key pair');
      try {
        certNew = await this.generateCertificate({
          subjectKeyPair: this.keyRing.keyPair,
          issuerPrivateKey: this.keyRing.keyPair.privateKey,
          duration,
          subjectAttrsExtra: this.subjectAttrsExtra,
          issuerAttrsExtra: this.subjectAttrsExtra,
          now,
        });
        await this.putCert(certNew);
      } catch (e) {
        // Use the same now to ensure that the new certificate is not expired
        // even if the duration is set to 0
        await this.gcCerts(false, now);
        throw new keysErrors.ErrorCertsReset(
          'Failed resetting with current key pair',
          { cause: e },
        );
      }
      // Use the same now to ensure that the new certificate is not expired
      // even if the duration is set to 0
      // Force delete certificates beyond the current certificate
      await this.gcCerts(true, now);
      if (this.tasksRunning) {
        await this.setupRenewCurrentCertTask(now);
      }
      this.dispatchEvent(
        new keysEvents.EventCertManagerCertChange({
          detail: {
            nodeId: this.keyRing.getNodeId(),
            keyPair: this.keyRing.keyPair,
            cert: certNew,
            recoveryCode: undefined,
          },
        }),
      );
      this.logger.info('Resetted certificate chain with current key pair');
    });
    return certNew!;
  }

  protected async putCert(
    cert: Certificate,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.putCert(cert, tran));
    }
    const certId = keysUtils.certCertId(cert)!;
    const certIdBuffer = certId.toBuffer();
    const certASN1 = keysUtils.certToASN1(cert);
    await tran.put([...this.dbCertsPath, certIdBuffer], certASN1, true);
    await tran.put(this.dbLastCertIdPath, certIdBuffer, true);
  }

  protected async delCert(certId: CertId, tran?: DBTransaction): Promise<void> {
    await (tran ?? this.db).del([...this.dbCertsPath, certId.toBuffer()]);
  }

  protected async setupCurrentCert(now: Date = new Date()): Promise<void> {
    this.logger.info('Begin current certificate setup');
    let cert: Certificate | undefined;
    for await (const [, certASN1] of this.db.iterator(this.dbCertsPath, {
      keys: false,
      reverse: true,
      limit: 1,
    })) {
      cert = keysUtils.certFromASN1(certASN1 as CertificateASN1);
    }
    // If no certificate, we will create the first one
    if (cert == null) {
      this.logger.info('Generating new current certificate');
      cert = await this.generateCertificate({
        subjectKeyPair: this.keyRing.keyPair,
        issuerPrivateKey: this.keyRing.keyPair.privateKey,
        duration: this.certDuration,
        subjectAttrsExtra: this.subjectAttrsExtra,
        issuerAttrsExtra: this.subjectAttrsExtra,
        now,
      });
      await this.putCert(cert);
      await this.gcCerts(false, now);
    } else {
      this.logger.info('Existing current certificate found');
      const certPublicKey = keysUtils.certPublicKey(cert)!;
      if (
        !certPublicKey.equals(this.keyRing.keyPair.publicKey) ||
        !keysUtils.certNotExpiredBy(cert, now)
      ) {
        this.logger.info(
          'Existing current certificate is invalid or expired, starting certificate renewal',
        );
        await this.renewCertWithCurrentKeyPair(this.certDuration, now);
      }
    }
    this.logger.info('Finish current certificate setup');
  }

  /**
   * Sets up the renew current certificate task.
   * This will set the renewal of the certificate to the remaining duration
   * minus the lead time, with the minimum delaying being 0.
   * This task is a singleton. It must be updated when the current certificate
   * is renewed.
   */
  protected async setupRenewCurrentCertTask(
    now: Date = new Date(),
  ): Promise<void> {
    await this.db.withTransactionF(async (tran) => {
      const cert = await this.getCurrentCert(tran);
      const delay = Math.max(
        keysUtils.certRemainingDuration(cert, now) - this.certRenewLeadTime,
        0,
      );
      let task: Task | undefined;
      for await (const task_ of this.taskManager.getTasks('asc', true, [
        this.renewCurrentCertHandlerId,
      ])) {
        // If the task is scheduled, we can update the delay
        // Otherwise we will let it complete, it will recall this method
        if (task_.status === 'scheduled') {
          await this.taskManager.updateTask(task_.id, { delay }, tran);
        }
        task = task_;
      }
      // Only if the task does not already exist, do we setup a new task
      if (task == null) {
        task = await this.taskManager.scheduleTask(
          {
            handlerId: this.renewCurrentCertHandlerId,
            delay,
            lazy: true,
            path: [this.renewCurrentCertHandlerId],
          },
          tran,
        );
        this.renewCurrentCertTaskId = task.id;
      }
    });
  }

  protected async generateCertificate({
    subjectKeyPair,
    issuerPrivateKey,
    duration,
    subjectAttrsExtra,
    issuerAttrsExtra,
    now = new Date(),
  }: {
    subjectKeyPair: {
      publicKey: PublicKey;
      privateKey: PrivateKey;
    };
    issuerPrivateKey: PrivateKey;
    duration: number;
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>;
    issuerAttrsExtra?: Array<{ [key: string]: Array<string> }>;
    now?: Date;
  }): Promise<Certificate> {
    let cert: Certificate;
    if (this.workerManager == null) {
      cert = await keysUtils.generateCertificate({
        certId: this.generateCertId(),
        subjectKeyPair,
        issuerPrivateKey,
        duration,
        subjectAttrsExtra,
        issuerAttrsExtra,
        now,
      });
    } else {
      cert = await this.workerManager.call(async (w) => {
        const result = await w.generateCertificate({
          certId: this.generateCertId().buffer,
          subjectKeyPair: {
            publicKey: subjectKeyPair.publicKey.buffer,
            privateKey: subjectKeyPair.privateKey.buffer,
          },
          issuerPrivateKey: issuerPrivateKey.buffer,
          duration,
          subjectAttrsExtra,
          issuerAttrsExtra,
          now,
        });
        return keysUtils.certFromASN1(Buffer.from(result) as CertificateASN1)!;
      });
    }
    return cert;
  }

  /**
   * Garbage collect invalid or expired certificates.
   * Invalid certificates can happen if key rotation does not succeed.
   * It could mean that the leaf certificate does not match the current key pair.
   *
   * Expired certificates are no longer valid and should be deleted.
   * This will always ensure that the current certificate is kept.
   * It will also keep the first expired certificate in the chain.
   * All subsequent certificates will be deleted.
   *
   * Note if generating a new certificate, it may be generated with a duration
   * of 0. When this occurs, the certificate is considered still valid for the
   * `now` timestamp at generation. Therefore upon finding the current
   * certificate we don't bother checking whether it is not expired. We can
   * assume it is not expired. However to be absolutely robust, pass the same
   * `now` between generation and `this.gcCerts` to prevent accidental garbage
   * collection of a 0-duration current certificate.
   */
  protected async gcCerts(
    force: boolean = false,
    now: Date = new Date(),
  ): Promise<void> {
    this.logger.info('Garbage collecting certificates');
    await this.db.withTransactionF(async (tran) => {
      await tran.lock(this.dbCertsPath.join(''));
      let currentCertFound: boolean = false;
      let expiredCertFound: boolean = false;
      for await (const [kP, certASN1] of tran.iterator(this.dbCertsPath, {
        reverse: true,
      })) {
        const certIdBuffer = kP[0] as Buffer;
        const certId = IdInternal.fromBuffer<CertId>(certIdBuffer);
        const cert = keysUtils.certFromASN1(certASN1 as CertificateASN1)!;
        // Delete certificates until you find the current certificate
        // There should always be a current certificate
        if (!currentCertFound) {
          const certPublicKey = keysUtils.certPublicKey(cert)!;
          if (certPublicKey.equals(this.keyRing.keyPair.publicKey)) {
            currentCertFound = true;
          } else {
            this.logger.warn(
              `Garbage collecting invalid certificate ${ids.encodeCertId(
                certId,
              )} caused by failed key rotation`,
            );
            // Delete this invalid certificate.
            // This can only happen if the key pair rotation failed
            // after the certificate was put in to the DB.
            await this.delCert(certId, tran);
          }
          continue;
        }
        // If forcing, delete all certificates after the current certificate.
        // This is only used during resetting of the certificate chain.
        if (force) {
          await this.delCert(certId, tran);
          continue;
        }
        if (!expiredCertFound) {
          // Keep the first expired certificate we find
          if (!keysUtils.certNotExpiredBy(cert, now)) {
            expiredCertFound = true;
          }
        } else {
          // Delete all certificates after the first expired certificate
          await this.delCert(certId, tran);
        }
      }
      if (!currentCertFound) {
        // This should never occur because there should always be a "valid"
        // current certificate after renewal or resetting
        throw new keysErrors.ErrorCertsGC(
          'Current certificate is not found during garbage collection',
        );
      }
    });
    this.logger.info('Garbage collected certificates');
  }
}

export default CertManager;
