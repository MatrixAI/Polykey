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
} from '@/keys/types';
import type CertManager from '@/keys/CertManager';
import type { KeyRing } from '@/keys';
import { fc } from '@fast-check/jest';
import { IterableX as Iterable } from 'ix/iterable';
import { AsyncIterableX as AsyncIterable } from 'ix/asynciterable';
import 'ix/add/iterable-operators/takewhile';
import 'ix/add/iterable-operators/toarray';
import 'ix/add/asynciterable-operators/toarray';
import 'ix/add/asynciterable-operators/take';
import * as asymmetric from '@/keys/utils/asymmetric';
import * as jwk from '@/keys/utils/jwk';
import * as x509 from '@/keys/utils/x509';
import * as utils from '@/utils';
import * as keysUtils from '@/keys/utils';
import * as testsIdsUtils from '../ids/utils';

const bufferArb = (constraints?: fc.IntArrayConstraints) => {
  return fc.uint8Array(constraints).map(utils.bufferWrap);
};

/**
 * 256 bit symmetric key
 */
const keyArb = fc
  .uint8Array({ minLength: 32, maxLength: 32 })
  .map(utils.bufferWrap)
  .noShrink() as fc.Arbitrary<Key>;

const keyJWKArb = keyArb
  .map((key) => jwk.keyToJWK(key))
  .noShrink() as fc.Arbitrary<KeyJWK>;

/**
 * Ed25519 Private Key
 */
const privateKeyArb = fc
  .uint8Array({ minLength: 32, maxLength: 32 })
  .map(utils.bufferWrap)
  .noShrink() as fc.Arbitrary<PrivateKey>;

/**
 * Ed25519 Public Key
 */
const publicKeyArb = privateKeyArb
  .map(asymmetric.publicKeyFromPrivateKeyEd25519)
  .noShrink();

/**
 * Keypair of public and private key
 */
const keyPairArb = privateKeyArb
  .map((privateKey) => {
    const publicKey = asymmetric.publicKeyFromPrivateKeyEd25519(privateKey);
    return {
      publicKey,
      privateKey,
      secretKey: Buffer.concat([privateKey, publicKey]),
    };
  })
  .noShrink() as fc.Arbitrary<KeyPair>;

const publicKeyJWKArb = publicKeyArb
  .map((publicKey) => jwk.publicKeyToJWK(publicKey))
  .noShrink() as fc.Arbitrary<PublicKeyJWK>;

const privateKeyJWKArb = privateKeyArb
  .map((privateKey) => jwk.privateKeyToJWK(privateKey))
  .noShrink() as fc.Arbitrary<PrivateKeyJWK>;

const certPArb = fc
  .record({
    subjectKeyPair: keyPairArb,
    issuerKeyPair: keyPairArb,
    certId: testsIdsUtils.certIdArb,
    duration: fc.integer({ min: 1, max: 1000 }),
  })
  .map(async ({ subjectKeyPair, issuerKeyPair, certId, duration }) => {
    const cert = await x509.generateCertificate({
      certId,
      subjectKeyPair: subjectKeyPair,
      issuerPrivateKey: issuerKeyPair.privateKey,
      duration,
    });
    return cert;
  })
  .noShrink();

const signatureArb = fc
  .uint8Array({ minLength: 64, maxLength: 64 })
  .map(utils.bufferWrap)
  .noShrink() as fc.Arbitrary<Signature>;

const macArb = fc
  .uint8Array({ minLength: 32, maxLength: 32 })
  .map(utils.bufferWrap)
  .noShrink() as fc.Arbitrary<MAC>;

const passwordArb = fc.string({ minLength: 0, maxLength: 20 }).noShrink();

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
    model.certs = [certNew].concat(
      Iterable.as(model.certs)
        .takeWhile((cert) => {
          return x509.certNotExpiredBy(cert, now);
        })
        .toArray(),
    );
    if (firstExpiredCert != null) {
      model.certs.push(firstExpiredCert);
    }
    // Check consistency
    const [certNew_, certOld_] = await AsyncIterable.as(real.getCerts())
      .take(2)
      .toArray();
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
    model.certs = [certNew].concat(
      Iterable.as(model.certs)
        .takeWhile((cert) => {
          return x509.certNotExpiredBy(cert, now);
        })
        .toArray(),
    );
    if (firstExpiredCert != null) {
      model.certs.push(firstExpiredCert);
    }
    // Check consistency
    const [certNew_, certOld_] = await AsyncIterable.as(real.getCerts())
      .take(2)
      .toArray();
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
    const [certNew_, certOld_] = await AsyncIterable.as(real.getCerts())
      .take(2)
      .toArray();
    // New certificate with have a greater `CertId`
    expect(x509.certCertId(certNew)! > x509.certCertId(certOld)!).toBe(true);
    // Different key pair changes the the NodeId
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
    const [certNew_, certOld_] = await AsyncIterable.as(real.getCerts())
      .take(2)
      .toArray();
    // New certificate with have a greater `CertId`
    expect(x509.certCertId(certNew)! > x509.certCertId(certOld)!).toBe(true);
    // Different key pair changes the the NodeId
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
