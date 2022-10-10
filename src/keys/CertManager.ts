import type { DB, DBTransaction, LevelPath, KeyPath } from '@matrixai/db';
import type { ResourceRelease } from '@matrixai/resources';
import type { Certificate, CertificateASN1, KeyPair } from './types';
import type KeyRing from './KeyRing';
import type { CertId } from '../ids/types';
import path from 'path';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as keysUtils from './utils';
import * as keysErrors from './errors';
import * as ids from '../ids';
import * as utils from '../utils';

// certs now go into the DB, which makes it easier for us to manage
// plus we have a cert id generator

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
    fresh = false,
  }: {
      db: DB;
      keyRing: KeyRing;
      certDuration?: number;
      logger?: Logger;
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

  // do we call this something else?
  // usually it is given 1 domain to deal with it
  // but this is currently in the keys domain
  // so we are just using the current path
  // certManager
  // we could also just use `dbPath` to indicate whatever base path this is
  // without bothering with a fancy name

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
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.dbPath);
    }
    const lastCertId = await this.getLastCertId();
    this.generateCertId = keysUtils.createCertIdGenerator(lastCertId);
    const cert = await this.setupCert(
      this.keyRing.keyPair,
      this.certDuration,
    );

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

  // root mean "original" cert
  // or root in the case of the root key pair?
  // ah shit
  // that is a bit annoying
  // you can say
  // getNodeCertificate (end-entity certificate)
  // but this is a "root chain"
  // or leaf certificate
  // the main certificate is the current certificate
  // yea that doens't make any sense


  // root certificate
  // vs
  // leaf certificate

  public async getRootCert() {

  }

  /**
   * The root certificate is the first certificate in the chain.
   * There will always be at least 1 certificate.
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async getCurrentCert(tran?: DBTransaction): Promise<Certificate> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.getCurrentCert(tran));
    }
    let cert: Certificate;
    for await (const [, certASN1] of tran.iterator(this.dbCertsPath, {
      keys: false,
      reverse: true,
      limit: 1,
    })) {
      cert = keysUtils.certFromASN1(certASN1 as CertificateASN1)!;
    }
    return cert!;
  }

  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async getCertPem() {
  }

  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async getCertChain() {
  }

  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async getCertChainPems() {
  }

  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async getCertChainPem () {
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
  ) {

    // Because we need a password to do this
    // it actually means you must always pass a new password



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
  ) {

  }

  /**
   * Generates a new certificate chain starting with the current key pair.
   * The new certificate is self-signed, and has no previous certificate.
   * This does not result in a new `NodeId`.
   * It does result in a new certificate.
   */
  @ready(new keysErrors.ErrorCertManagerNotRunning())
  public async resetCertWithExistingKeyPair(
    duration: number = 31536000,
  ) {

  }

  protected async setupRootCert(
    keyPair: KeyPair
  ): Promise<Certificate> {

    // if this already exists
    // we don't bother creating one
    // we have to check first

    if (!await this.existsRootCert()) {

    }

    // let cert: Certificate;
    // for await (const [, certASN1] of tran.iterator(this.dbCertsPath, {
    //   keys: false,
    //   reverse: true,
    //   limit: 1,
    // })) {
    //   cert = keysUtils.certFromASN1(certASN1 as CertificateASN1)!;
    // }

  }

  // wait there may be multiple certs now
  // but there's only 1 ROOT cert
  // so you check
  protected existsRootCert(): Promise<boolean> {


  }


}

export default CertManager;
