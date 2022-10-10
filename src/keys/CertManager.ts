import type { DB, DBTransaction, LevelPath, KeyPath } from '@matrixai/db';
import type { Certificate, CertificateASN1, CertificatePEM, KeyPair } from './types';
import type KeyRing from './KeyRing';
import type { CertId } from '../ids/types';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as keysUtils from './utils';
import * as keysErrors from './errors';

interface CertManager extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new keysErrors.ErrorCertManagerRunning(),
  new keysErrors.ErrorCertManagerDestroyed(),
)
class CertManager {
  public static async createCertManager({
    db,
    keyRing,
    certDuration = 31536000,
    logger = new Logger(this.name),
    subjectAttrsExtra,
    issuerAttrsExtra,
    fresh = false,
  }: {
      db: DB;
      keyRing: KeyRing;
      certDuration?: number;
      logger?: Logger;
      subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
      issuerAttrsExtra?: Array<{ [key: string]: Array<string> }>,
      fresh?: boolean;
    }
  ): Promise<CertManager> {
    logger.info(`Creating ${this.name}`);
    const certManager = new this({
      db,
      keyRing,
      certDuration,
      logger,
    });
    await certManager.start({
      subjectAttrsExtra,
      issuerAttrsExtra,
      fresh
    });
    logger.info(`Created ${this.name}`);
    return certManager;
  }

  /**
   * Certificate duration in seconds
   */
  public readonly certDuration: number;

  protected logger: Logger;
  protected db: DB;
  protected keyRing: KeyRing;
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

  public constructor({
    db,
    keyRing,
    certDuration,
    logger,
  }: {
    db: DB;
    keyRing: KeyRing;
    certDuration: number;
    logger: Logger;
  }) {
    this.logger = logger;
    this.db = db;
    this.keyRing = keyRing;
    this.certDuration = certDuration;
  }

  public async start({
    subjectAttrsExtra,
    issuerAttrsExtra,
    fresh = false,
  }: {
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
    issuerAttrsExtra?: Array<{ [key: string]: Array<string> }>,
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
      issuerAttrsExtra,
    );
    await this.gcCerts();
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.db.clear(this.dbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
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
      limit: 1,
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
  public async getCertPEMsChainPEM(tran?: DBTransaction): Promise<CertificatePEM> {
    let pem = '';
    for await (const certPem of this.getCertPEMs(tran)) {
      pem += certPem;
    }
    return pem as CertificatePEM;
  }

  /**
   * Get the current (leaf) certificate
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
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
   * It is self-signed and also signed by the previous certificate
   * The parent signature is encoded with `NodeSignatureExtension`>
   * This maintains a certificate chain that provides zero-downtime migration
   * This results in a new `NodeId`.
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async renewCertWithNewKeyPair(
    password: string,
    duration: number = 31536000,
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
    issuerAttrsExtra?: Array<{ [key: string]: Array<string> }>,
  ) {
    this.logger.info('Renewing certificate chain with new key pair');
    try {
      await this.keyRing.rotateKeyPair(
        password,
        async (keyPairNew: KeyPair, keyPairOld: KeyPair) => {
          const certNew = await keysUtils.generateCertificate({
            certId: this.generateCertId(),
            subjectKeyPair: keyPairNew,
            issuerPrivateKey: keyPairOld.privateKey,
            duration,
            subjectAttrsExtra,
            issuerAttrsExtra,
          });
          await this.putCert(certNew);
        }
      );
    } finally {
      await this.gcCerts();
    }
    this.logger.info('Renewed certificate chain with new key pair');
  }

  /**
   * Generates a new certificate chain starting with a new key pair.
   * The new certificate is self-signed, and has no previous certificate.
   * The results in a new `NodeId`.
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async resetCertWithNewKeyPair(
    password: string,
    duration: number = 31536000,
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
    issuerAttrsExtra?: Array<{ [key: string]: Array<string> }>,
  ) {
    this.logger.info('Resetting certificate chain with new key pair');
    try {
      await this.keyRing.rotateKeyPair(
        password,
        async (keyPairNew: KeyPair) => {
          const certNew = await keysUtils.generateCertificate({
            certId: this.generateCertId(),
            subjectKeyPair: keyPairNew,
            issuerPrivateKey: keyPairNew.privateKey,
            duration,
            subjectAttrsExtra,
            issuerAttrsExtra,
          });
          await this.putCert(certNew);
        }
      );
    } finally {
      await this.gcCerts();
    }
    this.logger.info('Resetted certificate chain with new key pair');
  }

  /**
   * Generates a new certificate chain starting with the current key pair.
   * The new certificate is self-signed, and has no previous certificate.
   * This does not result in a new `NodeId`.
   * It does result in a new certificate.
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async resetCertWithCurrentKeyPair(
    duration: number = 31536000,
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
    issuerAttrsExtra?: Array<{ [key: string]: Array<string> }>,
  ) {
    this.logger.info('Resetting certificate chain with current key pair');
    const certNew = await keysUtils.generateCertificate({
      certId: this.generateCertId(),
      subjectKeyPair: this.keyRing.keyPair,
      issuerPrivateKey: this.keyRing.keyPair.privateKey,
      duration,
      subjectAttrsExtra,
      issuerAttrsExtra,
    });
    await this.putCert(certNew);
    await this.gcCerts();
    this.logger.info('Resetted certificate chain with current key pair');
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
    issuerAttrsExtra?: Array<{ [key: string]: Array<string> }>,
  ): Promise<void> {
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
      cert = await keysUtils.generateCertificate({
        certId: this.generateCertId(),
        subjectKeyPair: this.keyRing.keyPair,
        issuerPrivateKey: this.keyRing.keyPair.privateKey,
        duration: this.certDuration,
        subjectAttrsExtra,
        issuerAttrsExtra,
      });
      await this.putCert(cert);
    }
  }

  /**
   * Garbage collect invalid or expired certificates.
   * Expired certificates are no longer valid and should be deleted.
   * Invalid certificates can happen if key rotation does not succeed.
   * It could mean that the leaf certificate does not match the current key pair.
   */
  protected async gcCerts(): Promise<void> {
    this.logger.info('Garbage collecting certificates');
    await this.db.withTransactionF(async (tran) => {
      await tran.lock(this.dbCertsPath.join(''));
      const now = new Date();
      let currentCertFound: boolean = false;
      for await (const [kP, certASN1] of tran.iterator(this.dbCertsPath, {
        reverse: true,
      })) {
        const certIdBuffer = kP[0] as Buffer;
        const certId = IdInternal.fromBuffer<CertId>(certIdBuffer);
        const cert = keysUtils.certFromASN1(certASN1 as CertificateASN1)!;
        if (!currentCertFound) {
          const certPublicKey = keysUtils.certPublicKey(cert)!;
          if (certPublicKey.equals(this.keyRing.keyPair.publicKey)) {
            currentCertFound = true;
          } else {
            // Delete this invalid certificate.
            // This can only happen if the key pair rotation failed
            // after the certificate was put in to the DB.
            this.delCert(certId, tran);
            // This will iterate up the chain to the root
            // until we find the current certificate.
            // It should be the very next certificate that is correct.
            continue;
          }
          if (!keysUtils.certNotExpiredBy(cert, now)) {
            this.delCert(certId, tran);
          }
        }
      }
    });
    this.logger.info('Garbage collected certificates');
  }
}

export default CertManager;
