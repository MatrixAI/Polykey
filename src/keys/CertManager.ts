import type { DB, DBTransaction, LevelPath, KeyPath } from '@matrixai/db';
import type {
  PublicKey,
  PrivateKey,
  Certificate,
  CertificateASN1,
  CertManagerChangeData,
  CertificatePEM,
  KeyPair,
  RecoveryCode,
  CertificatePEMChain,
} from './types';
import type KeyRing from './KeyRing';
import type TaskManager from '../tasks/TaskManager';
import type { CertId, TaskHandlerId, TaskId } from '../ids/types';
import type { TaskHandler } from '../tasks/types';
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
import * as ids from '../ids';

const abortRenewCertTaskReason = Symbol('abort certificate task reason');

interface CertManager extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new keysErrors.ErrorCertManagerRunning(),
  new keysErrors.ErrorCertManagerDestroyed(),
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
    certDuration = 31536000,
    certRenewLeadTime = 86400,
    changeCallback,
    workerManager,
    logger = new Logger(this.name),
    subjectAttrsExtra,
    now = new Date,
    lazy = false,
    fresh = false,
  }: {
      db: DB;
      keyRing: KeyRing;
      taskManager: TaskManager;
      certDuration?: number;
      certRenewLeadTime?: number;
      changeCallback?: (data: CertManagerChangeData) => any;
      workerManager?: PolykeyWorkerManagerInterface;
      logger?: Logger;
      subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
      issuerAttrsExtra?: Array<{ [key: string]: Array<string> }>,
      now?: Date;
      lazy?: boolean;
      fresh?: boolean;
    }
  ): Promise<CertManager> {
    logger.info(`Creating ${this.name}`);
    const certManager = new this({
      db,
      keyRing,
      taskManager,
      certDuration,
      certRenewLeadTime,
      changeCallback,
      workerManager,
      logger,
    });
    await certManager.start({
      subjectAttrsExtra,
      now,
      lazy,
      fresh
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
  protected changeCallback?: (data: CertManagerChangeData) => any;
  protected workerManager?: PolykeyWorkerManagerInterface;
  protected generateCertId: () => CertId;
  protected dbPath: LevelPath = [this.constructor.name];
  /**
   * Certificate colleciton
   * `CertManager/certs/{CertId} -> {raw(CertificateASN1)}`
   */
  protected dbCertsPath: LevelPath = [...this.dbPath, 'certs'];
  /**
   * Maintain last `CertID` to preserve monotonicity across process restarts
   * `CertManager/lastCertId -> {raw(CertId)}`
   */
  protected dblastCertIdPath: KeyPath = [...this.dbPath, 'lastCertId'];
  protected renewResetLock: Lock = new Lock();

  protected renewCurrentCertHandler: TaskHandler = async (
    _ctx,
    _taskInfo,
    duration: number,
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
  ) => {
    // If the certificate is already being renewed or reset
    // then we can cancel this automatic renewal operation
    if (this.renewResetLock.isLocked()) {
      return;
    }
    await this.renewCertWithCurrentKeyPair(
      duration,
      subjectAttrsExtra
    );
  };
  protected renewCurrentCertHandlerId: TaskHandlerId =
    `${this.constructor.name}.renewCurrentCert` as TaskHandlerId;
  protected renewCurrentCertTaskId?: TaskId;

  public constructor({
    db,
    keyRing,
    taskManager,
    certDuration,
    certRenewLeadTime,
    changeCallback,
    workerManager,
    logger,
  }: {
    db: DB;
    keyRing: KeyRing;
    taskManager: TaskManager;
    certDuration: number;
    certRenewLeadTime: number;
    changeCallback?: (data: CertManagerChangeData) => any;
    workerManager?: PolykeyWorkerManagerInterface;
    logger: Logger;
  }) {
    this.logger = logger;
    this.db = db;
    this.keyRing = keyRing;
    this.taskManager = taskManager;
    this.certDuration = certDuration;
    this.certRenewLeadTime = certRenewLeadTime;
    this.changeCallback = changeCallback;
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
    now = new Date,
    lazy = false,
    fresh = false,
  }: {
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
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
    await this.setupCurrentCert(
      subjectAttrsExtra,
      now,
    );
    this.logger.info(`Registering handler ${this.renewCurrentCertHandlerId}`);
    this.taskManager.registerHandler(
      this.renewCurrentCertHandlerId,
      this.renewCurrentCertHandler,
    );
    if (!lazy) {
      await this.startTasks({
        subjectAttrsExtra,
        now,
      });
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
  public async startTasks({
    subjectAttrsExtra,
    now = new Date,
  }: {
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
    now?: Date;
  }): Promise<void> {
    await this.setupRenewCurrentCertTask({
      subjectAttrsExtra,
      now,
    });
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
        `Cancelling task ${
          this.renewCurrentCertHandlerId
        }:${
          ids.encodeTaskId(this.renewCurrentCertTaskId)
        }`
      );
      const task = await this.taskManager.getTask(this.renewCurrentCertTaskId);
      if (task != null) {
        task.cancel(abortRenewCertTaskReason);
        await task.promise();
      }
      delete this.renewCurrentCertTaskId;
    }
  }

  @ready(new keysErrors.ErrorCertManagerNotRunning(), false, ['starting'])
  public async getLastCertId(
    tran?: DBTransaction,
  ): Promise<CertId | undefined> {
    const lastCertIdBuffer = await (tran ?? this.db).get(
      this.dblastCertIdPath,
      true,
    );
    if (lastCertIdBuffer == null) return;
    return IdInternal.fromBuffer<CertId>(lastCertIdBuffer);
  }

  /**
   * Get a certificate according to the `CertID`
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async getCert(certId: CertId, tran?: DBTransaction): Promise<Certificate | undefined> {
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
  @ready(new keysErrors.ErrorCertManagerNotRunning())
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
  public async getCertsChain(tran?: DBTransaction): Promise<Array<Certificate>> {
    let certs: Array<Certificate> = [];
    for await (const cert of this.getCerts(tran)) {
      certs.push(cert);
    }
    return certs;
  }

  /**
   * Get `CertificatePEM` from leaf to root
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async *getCertPEMs(tran?: DBTransaction): AsyncGenerator<CertificatePEM> {
    for await (const cert of this.getCerts(tran)) {
      yield keysUtils.certToPEM(cert);
    }
  }

  /**
   * Gets an array of `CertificatePEM` in order of leaf to root
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async getCertPEMsChain(tran?: DBTransaction): Promise<Array<CertificatePEM>> {
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
  public async getCertPEMsChainPEM(tran?: DBTransaction): Promise<CertificatePEMChain> {
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
  public async getCurrentCertPEM(tran?: DBTransaction): Promise<CertificatePEM> {
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
    duration: number = 31536000,
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
    now: Date = new Date,
  ) {
    await this.renewResetLock.withF(async () => {
      this.logger.info('Renewing certificate chain with new key pair');
      let certNew: Certificate;
      let recoveryCodeNew: RecoveryCode;
      try {
        const currentCert = await this.getCurrentCert();
        await this.keyRing.rotateKeyPair(
          password,
          async (keyPairNew: KeyPair, keyPairOld: KeyPair, recoveryCodeNew_: RecoveryCode) => {
            recoveryCodeNew = recoveryCodeNew_;
            certNew = await this.generateCertificate({
              subjectKeyPair: keyPairNew,
              issuerPrivateKey: keyPairOld.privateKey,
              duration,
              subjectAttrsExtra,
              issuerAttrsExtra: currentCert.subjectName.toJSON(),
              now,
            });
            // Putting the new certificate into the DB must complete
            // before the key pair rotation completes.
            // This is because we can rollback the new certificate
            // but we cannot rollback a key pair rotation.
            await this.putCert(certNew);
          }
        );
      } catch (e) {
        // Use the same now to ensure that the new certificate is not expired
        // even if the duration is set to 0
        await this.gcCerts(false, now);
        throw new keysErrors.ErrorCertsRenew(
          'Failed renewing with new key pair',
          { cause: e }
        );
      }
      // Use the same now to ensure that the new certificate is not expired
      // even if the duration is set to 0
      await this.gcCerts(false, now);
      if (this.changeCallback != null) {
        await this.changeCallback({
          nodeId: this.keyRing.getNodeId(),
          keyPair: this.keyRing.keyPair,
          cert: certNew!,
          recoveryCode: recoveryCodeNew!,
        });
      }
      this.logger.info('Renewed certificate chain with new key pair');
    });
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
    duration: number = 31536000,
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
    now: Date = new Date,
  ) {
    await this.renewResetLock.withF(async () => {
      this.logger.info('Renewing certificate chain with current key pair');
      let certNew: Certificate;
      try {
        const currentCert = await this.getCurrentCert();
        certNew = await this.generateCertificate({
          subjectKeyPair: this.keyRing.keyPair,
          issuerPrivateKey: this.keyRing.keyPair.privateKey,
          duration,
          subjectAttrsExtra,
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
          { cause: e }
        );
      }
      // Use the same now to ensure that the new certificate is not expired
      // even if the duration is set to 0
      await this.gcCerts(false, now);
      if (this.changeCallback != null) {
        await this.changeCallback({
          nodeId: this.keyRing.getNodeId(),
          keyPair: this.keyRing.keyPair,
          cert: certNew,
          recoveryCode: undefined,
        });
      }
      this.logger.info('Renewed certificate chain with current key pair');
    });
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
    duration: number = 31536000,
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
    now: Date = new Date,
  ) {
    await this.renewResetLock.withF(async () => {
      this.logger.info('Resetting certificate chain with new key pair');
      let certNew: Certificate;
      let recoveryCodeNew: RecoveryCode;
      try {
        const currentCert = await this.getCurrentCert();
        await this.keyRing.rotateKeyPair(
          password,
          async (keyPairNew: KeyPair, _, recoveryCodeNew_) => {
            recoveryCodeNew = recoveryCodeNew_;
            certNew = await this.generateCertificate({
              subjectKeyPair: keyPairNew,
              issuerPrivateKey: keyPairNew.privateKey,
              duration,
              subjectAttrsExtra,
              issuerAttrsExtra: subjectAttrsExtra,
              now,
            });
            // Putting the new certificate into the DB must complete
            // before the key pair rotation completes.
            // This is because we can rollback the new certificate
            // but we cannot rollback a key pair rotation.
            await this.putCert(certNew);
          }
        );
      } catch (e) {
        // Use the same now to ensure that the new certificate is not expired
        // even if the duration is set to 0
        await this.gcCerts(false, now);
        throw new keysErrors.ErrorCertsReset(
          'Failed resetting with new key pair',
          { cause: e }
        );
      }
      // Use the same now to ensure that the new certificate is not expired
      // even if the duration is set to 0
      // Force delete certificates beyond the current certificate
      await this.gcCerts(true, now);
      if (this.changeCallback != null) {
        await this.changeCallback({
          nodeId: this.keyRing.getNodeId(),
          keyPair: this.keyRing.keyPair,
          cert: certNew!,
          recoveryCode: recoveryCodeNew!,
        });
      }
      this.logger.info('Resetted certificate chain with new key pair');
    });
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
    duration: number = 31536000,
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
    now: Date = new Date,
  ) {
    await this.renewResetLock.withF(async () => {
      this.logger.info('Resetting certificate chain with current key pair');
      let certNew: Certificate;
      try {
        const currentCert = await this.getCurrentCert();
        certNew = await this.generateCertificate({
          subjectKeyPair: this.keyRing.keyPair,
          issuerPrivateKey: this.keyRing.keyPair.privateKey,
          duration,
          subjectAttrsExtra,
          issuerAttrsExtra: subjectAttrsExtra,
          now,
        });
        await this.putCert(certNew);
      } catch (e) {
        // Use the same now to ensure that the new certificate is not expired
        // even if the duration is set to 0
        await this.gcCerts(false, now);
        throw new keysErrors.ErrorCertsReset(
          'Failed resetting with current key pair',
          { cause: e }
        );
      }
      // Use the same now to ensure that the new certificate is not expired
      // even if the duration is set to 0
      // Force delete certificates beyond the current certificate
      await this.gcCerts(true, now);
      if (this.changeCallback != null) {
        await this.changeCallback({
          nodeId: this.keyRing.getNodeId(),
          keyPair: this.keyRing.keyPair,
          cert: certNew!,
        });
      }
      this.logger.info('Resetted certificate chain with current key pair');
    });
  }

  protected async putCert(cert: Certificate, tran?: DBTransaction): Promise<void> {
    const certId = keysUtils.certCertId(cert)!;
    const certASN1 = keysUtils.certToASN1(cert);
    await (tran ?? this.db).put(
      [...this.dbCertsPath, certId.toBuffer()],
      certASN1,
      true
    );
  }

  protected async delCert(certId: CertId, tran?: DBTransaction) : Promise<void> {
    await (tran ?? this.db).del([...this.dbCertsPath, certId.toBuffer()]);
  }

  protected async setupCurrentCert(
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
    now: Date = new Date,
  ): Promise<void> {
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
        subjectAttrsExtra,
        issuerAttrsExtra: subjectAttrsExtra,
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
        this.logger.info('Existing current certificate is invalid or expired, starting certificate renewal');
        await this.renewCertWithCurrentKeyPair(
          this.certDuration,
          subjectAttrsExtra,
          now,
        );
      }
    }
    this.logger.info('Finish current certificate setup');
  }

  /**
   * Sets up the renew current certificate task.
   * This will set the renewal of the certificate to 1 day before the expiration.
   * If the certificate duration is below 1 day, it will set it to the last valid second.
   * This task is a singleton. It must be updated when the current certificate is renewed.
   *
   * TBD, therefore this function can be an idempotent function.
   * Upon running, it always sets the new function up to be running.
   * The only issue is if the duration is set too short.
   * This will cause a LOOP of setting up the new certificate ALL the time.
   * That is literally a bad idea!
   * We don't want the durations to be below 1 second.
   * Well we could say that there needs to be a minimum amount of time the certificate is set to.
   * But we can't say for sure what that should be.
   */
  protected async setupRenewCurrentCertTask({
    subjectAttrsExtra,
    now = new Date,
  }: {
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
    now?: Date;
  }): Promise<void> {
    // TBD
    // Use the `this.certRenewalLeadTime` too
  }

  protected async generateCertificate({
    subjectKeyPair,
    issuerPrivateKey,
    duration,
    subjectAttrsExtra,
    issuerAttrsExtra,
    now = new Date,
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
    now: Date = new Date,
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
            this.logger.warn(`Garbage collecting invalid certificate ${ids.encodeCertId(certId)} caused by failed key rotation`);
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
          'Current certificate is not found during garbage collection'
        );
      }
    });
    this.logger.info('Garbage collected certificates');
  }
}

export default CertManager;
