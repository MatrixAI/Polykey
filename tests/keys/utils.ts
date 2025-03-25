import type {
  Certificate,
  PrivateKey,
  KeyPair,
  Key,
  KeyJWK,
  PublicKeyJWK,
  PrivateKeyJWK,
  Signature,
  MAC,
} from '#keys/types.js';
import type CertManager from '#keys/CertManager.js';
import type { KeyRing } from '#keys/index.js';
import { fc } from '@fast-check/jest';
import * as testsIdsUtils from '../ids/utils.js';
import * as testsUtils from '../utils/index.js';
import * as asymmetric from '#keys/utils/asymmetric.js';
import * as jwk from '#keys/utils/jwk.js';
import * as x509 from '#keys/utils/x509.js';
import * as utils from '#utils/index.js';
import * as keysUtils from '#keys/utils/index.js';

const bufferArb = (constraints?: fc.IntArrayConstraints) => {
  return fc.uint8Array(constraints).map(utils.bufferWrap);
};

/**
 * 256 bit symmetric key
 */
const keyArb = fc.noShrink(
  fc.uint8Array({ minLength: 32, maxLength: 32 }).map(utils.bufferWrap),
) as fc.Arbitrary<Key>;

const keyJWKArb = fc.noShrink(
  keyArb.map((key) => jwk.keyToJWK(key)),
) as fc.Arbitrary<KeyJWK>;

/**
 * Ed25519 Private Key
 */
const privateKeyArb = fc.noShrink(
  fc.uint8Array({ minLength: 32, maxLength: 32 }).map(utils.bufferWrap),
) as fc.Arbitrary<PrivateKey>;

/**
 * Ed25519 Public Key
 */
const publicKeyArb = fc.noShrink(
  privateKeyArb.map(asymmetric.publicKeyFromPrivateKeyEd25519),
);

/**
 * Keypair of public and private key
 */
const keyPairArb = fc.noShrink(
  privateKeyArb.map((privateKey) => {
    const publicKey = asymmetric.publicKeyFromPrivateKeyEd25519(privateKey);
    return {
      publicKey,
      privateKey,
      secretKey: Buffer.concat([privateKey, publicKey]),
    };
  }),
) as fc.Arbitrary<KeyPair>;

const publicKeyJWKArb = fc.noShrink(
  publicKeyArb.map((publicKey) => jwk.publicKeyToJWK(publicKey)),
) as fc.Arbitrary<PublicKeyJWK>;

const privateKeyJWKArb = fc.noShrink(
  privateKeyArb.map((privateKey) => jwk.privateKeyToJWK(privateKey)),
) as fc.Arbitrary<PrivateKeyJWK>;

const certPArb = fc.noShrink(
  fc
    .record(
      {
        subjectKeyPair: keyPairArb,
        issuerKeyPair: keyPairArb,
        certId: testsIdsUtils.certIdArb,
        duration: fc.integer({ min: 1, max: 1000 }),
      },
      { noNullPrototype: true },
    )
    .map(async ({ subjectKeyPair, issuerKeyPair, certId, duration }) => {
      const cert = await x509.generateCertificate({
        certId,
        subjectKeyPair: subjectKeyPair,
        issuerPrivateKey: issuerKeyPair.privateKey,
        duration,
      });
      return cert;
    }),
);

const signatureArb = fc.noShrink(
  fc.uint8Array({ minLength: 64, maxLength: 64 }).map(utils.bufferWrap),
) as fc.Arbitrary<Signature>;

const macArb = fc.noShrink(
  fc.uint8Array({ minLength: 32, maxLength: 32 }).map(utils.bufferWrap),
) as fc.Arbitrary<MAC>;

const passwordArb = fc.noShrink(fc.string({ minLength: 0, maxLength: 20 }));

type CertManagerModel = {
  certs: Array<Certificate>;
};

type CertManagerCommand = fc.AsyncCommand<CertManagerModel, CertManager>;

class RenewCertWithCurrentKeyPairCommand implements CertManagerCommand {
  constructor(public readonly duration: number = 31536000) {}

  check() {
    return true;
  }

  async run(model: CertManagerModel, real: CertManager) {
    // Update the real
    const now = new Date();
    await real.renewCertWithCurrentKeyPair(this.duration, now);
    // Update the model
    const certOld = model.certs[0];
    const certNew = await real.getCurrentCert();
    // Take the certs until it reaches the first expired certificate
    // but includes the first expired certificate
    const firstExpiredCert = model.certs.find((cert) => {
      return !x509.certNotExpiredBy(cert, now);
    });
    const newCerts = [certNew];
    for (const cert of model.certs) {
      if (!x509.certNotExpiredBy(cert, now)) break;
      newCerts.push(cert);
    }
    model.certs = newCerts;
    if (firstExpiredCert != null) {
      model.certs.push(firstExpiredCert);
    }
    // Check consistency
    const certList = await testsUtils.generatorToArray(real.getCerts());
    const [certNew_, certOld_] = certList.slice(0, 2);
    // New certificate with have a greater `CertId`
    expect(x509.certCertId(certNew)! > x509.certCertId(certOld)!).toBe(true);
    // Same key pair preserves the NodeId
    expect(x509.certNodeId(certNew)).toStrictEqual(x509.certNodeId(certOld));
    // New certificates should match
    expect(x509.certEqual(certNew_, certNew)).toBe(true);
    // Old certificate was the previous current certificate
    expect(x509.certEqual(certOld_, certOld)).toBe(true);
    // New certificate issued by old certificate
    expect(x509.certIssuedBy(certNew, certOld)).toBe(true);
    // New certificate signed by old certificate
    expect(await x509.certSignedBy(certNew, x509.certPublicKey(certOld)!)).toBe(
      true,
    );
    // New certificate is self-signed via the node signature extension
    expect(await x509.certNodeSigned(certNew)).toBe(true);
    // New certificate is not expired from now and inclusive of the duration
    expect(x509.certNotExpiredBy(certNew, now)).toBe(true);
    expect(
      x509.certNotExpiredBy(
        certNew,
        new Date(now.getTime() + this.duration * 1000),
      ),
    ).toBe(true);
    expect(await real.getCertsChain()).toStrictEqual(model.certs);
  }

  toString() {
    return `RenewCertWithCurrentKeyPairCommand(${this.duration})`;
  }
}

class RenewCertWithNewKeyPairCommand implements CertManagerCommand {
  constructor(
    public readonly password: string,
    public readonly duration: number = 31536000,
  ) {}

  check() {
    return true;
  }

  async run(model: CertManagerModel, real: CertManager) {
    // Update the real
    const now = new Date();
    await real.renewCertWithNewKeyPair(this.password, this.duration, now);
    // Update the model
    const certOld = model.certs[0];
    const certNew = await real.getCurrentCert();
    // Take the certs until it reaches the first expired certificate
    // but includes the first expired certificate
    const firstExpiredCert = model.certs.find((cert) => {
      return !x509.certNotExpiredBy(cert, now);
    });
    const newCerts = [certNew];
    for (const cert of model.certs) {
      if (!x509.certNotExpiredBy(cert, now)) break;
      newCerts.push(cert);
    }
    model.certs = newCerts;
    if (firstExpiredCert != null) {
      model.certs.push(firstExpiredCert);
    }
    // Check consistency
    const certList = await testsUtils.generatorToArray(real.getCerts());
    const [certNew_, certOld_] = certList.slice(0, 2);
    // New certificate with have a greater `CertId`
    expect(x509.certCertId(certNew)! > x509.certCertId(certOld)!).toBe(true);
    // Different key pair changes the the NodeId
    expect(x509.certNodeId(certNew)).not.toStrictEqual(
      x509.certNodeId(certOld),
    );
    // New certificates should match
    expect(x509.certEqual(certNew_, certNew)).toBe(true);
    // Old certificate was the previous current certificate
    expect(x509.certEqual(certOld_, certOld)).toBe(true);
    // New certificate issued by old certificate
    expect(x509.certIssuedBy(certNew, certOld)).toBe(true);
    // New certificate signed by old certificate
    expect(await x509.certSignedBy(certNew, x509.certPublicKey(certOld)!)).toBe(
      true,
    );
    // New certificate is self-signed via the node signature extension
    expect(await x509.certNodeSigned(certNew)).toBe(true);
    // New certificate is not expired from now and inclusive of the duration
    expect(x509.certNotExpiredBy(certNew, now)).toBe(true);
    expect(
      x509.certNotExpiredBy(
        certNew,
        new Date(now.getTime() + this.duration * 1000),
      ),
    ).toBe(true);
    expect(await real.getCertsChain()).toStrictEqual(model.certs);
  }

  toString() {
    return `RenewCertWithNewKeyPairCommand('${this.password}', ${this.duration})`;
  }
}

class ResetCertWithCurrentKeyPairCommand implements CertManagerCommand {
  constructor(public readonly duration: number = 31536000) {}

  check() {
    return true;
  }

  async run(model: CertManagerModel, real: CertManager) {
    // Update the real
    const now = new Date();
    await real.resetCertWithCurrentKeyPair(this.duration, now);
    // Update the model
    const certOld = model.certs[0];
    const certNew = await real.getCurrentCert();
    model.certs = [certNew];
    const certList = await testsUtils.generatorToArray(real.getCerts());
    const [certNew_, certOld_] = certList.slice(0, 2);
    // New certificate with have a greater `CertId`
    expect(x509.certCertId(certNew)! > x509.certCertId(certOld)!).toBe(true);
    // Different key pair changes the NodeId
    expect(x509.certNodeId(certNew)).toStrictEqual(x509.certNodeId(certOld));
    // New certificates should match
    expect(x509.certEqual(certNew_, certNew)).toBe(true);
    // Old certificate no longer exists
    expect(certOld_).toBeUndefined();
    // New certificate issued by itself
    expect(x509.certIssuedBy(certNew, certNew)).toBe(true);
    // New certificate is self-signed
    expect(await x509.certSignedBy(certNew, x509.certPublicKey(certNew)!)).toBe(
      true,
    );
    // New certificate is self-signed via the node signature extension
    expect(await x509.certNodeSigned(certNew)).toBe(true);
    // New certificate is not expired from now and inclusive of the duration
    expect(x509.certNotExpiredBy(certNew, now)).toBe(true);
    expect(
      x509.certNotExpiredBy(
        certNew,
        new Date(now.getTime() + this.duration * 1000),
      ),
    ).toBe(true);
    expect(await real.getCertsChain()).toStrictEqual(model.certs);
  }

  toString() {
    return `ResetCertWithCurrentKeyPair(${this.duration})`;
  }
}

class ResetCertWithNewKeyPairCommand implements CertManagerCommand {
  constructor(
    public readonly password: string,
    public readonly duration: number = 31536000,
  ) {}

  check() {
    return true;
  }

  async run(model: CertManagerModel, real: CertManager) {
    // Update the real
    const now = new Date();
    await real.resetCertWithNewKeyPair(this.password, this.duration, now);
    // Update the model
    const certOld = model.certs[0];
    const certNew = await real.getCurrentCert();
    model.certs = [certNew];
    const certList = await testsUtils.generatorToArray(real.getCerts());
    const [certNew_, certOld_] = certList.slice(0, 2);
    // New certificate with have a greater `CertId`
    expect(x509.certCertId(certNew)! > x509.certCertId(certOld)!).toBe(true);
    // Different key pair changes the NodeId
    expect(x509.certNodeId(certNew)).not.toStrictEqual(
      x509.certNodeId(certOld),
    );
    // New certificates should match
    expect(x509.certEqual(certNew_, certNew)).toBe(true);
    // Old certificate no longer exists
    expect(certOld_).toBeUndefined();
    // New certificate issued by itself
    expect(x509.certIssuedBy(certNew, certNew)).toBe(true);
    // New certificate is self-signed
    expect(await x509.certSignedBy(certNew, x509.certPublicKey(certNew)!)).toBe(
      true,
    );
    // New certificate is self-signed via the node signature extension
    expect(await x509.certNodeSigned(certNew)).toBe(true);
    // New certificate is not expired from now and inclusive of the duration
    expect(x509.certNotExpiredBy(certNew, now)).toBe(true);
    expect(
      x509.certNotExpiredBy(
        certNew,
        new Date(now.getTime() + this.duration * 1000),
      ),
    ).toBe(true);
    expect(await real.getCertsChain()).toStrictEqual(model.certs);
  }

  toString() {
    return `ResetCertWithNewKeyPairCommand('${this.password}', ${this.duration})`;
  }
}

/**
 * Creates a fake KeyRing that only provides the `keyPair` and `getNodeId()`
 */
function createDummyKeyRing() {
  const keyPair = keysUtils.generateKeyPair();
  const nodeId = keysUtils.publicKeyToNodeId(keyPair.publicKey);
  return {
    keyPair,
    getNodeId: () => nodeId,
  } as KeyRing;
}

export {
  bufferArb,
  keyArb,
  keyJWKArb,
  publicKeyArb,
  privateKeyArb,
  publicKeyJWKArb,
  privateKeyJWKArb,
  keyPairArb,
  certPArb,
  macArb,
  signatureArb,
  passwordArb,
  RenewCertWithCurrentKeyPairCommand,
  RenewCertWithNewKeyPairCommand,
  ResetCertWithCurrentKeyPairCommand,
  ResetCertWithNewKeyPairCommand,
  createDummyKeyRing,
};

export type { CertManagerModel, CertManagerCommand };
