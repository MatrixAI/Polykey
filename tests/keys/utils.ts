import type {
  CertId,
  Certificate,
  PrivateKey,
  KeyPair,
  Key,
  KeyJWK,
  PublicKeyJWK,
  PrivateKeyJWK,
  Signature,
} from '@/keys/types';
import type CertManager from '@/keys/CertManager';
import { fc } from '@fast-check/jest';

// This overloads the `AsyncIterable`, using the overloaded extensions
// then subsequently we are monkey patching operators using the `toarray`
// like below
// I still don'tu nderstand what's the point
// Factories can be brought in with `ix/add...
import { AsyncIterableX as AsyncIterable } from 'ix/asynciterable';

// import 'ix/add/asynciterable/toArray';
// import 'ix/add/asynciterable/last';
// import 'ix/add/asynciterable-operators/map';

// import 'ix/add/asynciterable/as';
import 'ix/add/asynciterable-operators/toarray';
import 'ix/add/asynciterable-operators/take';

// import * as asynciterable from 'ix/asynciterable';
// import * as asynciterableoperators from 'ix/asynciterable/operators';

import * as asymmetric from '@/keys/utils/asymmetric';
import * as jwk from '@/keys/utils/jwk';
import * as x509 from '@/keys/utils/x509';
import * as utils from '@/utils';

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
    certId: fc.uint8Array({
      minLength: 16,
      maxLength: 16,
    }) as fc.Arbitrary<CertId>,
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

const passwordArb = fc.string({ minLength: 0, maxLength: 20 }).noShrink();

type CertManagerModel = {
  certCount: number;
  currentCert: Certificate;
};

type CertManagerCommand = fc.AsyncCommand<CertManagerModel, CertManager>;

class RenewCertWithCurrentKeyPairCommand implements CertManagerCommand {
  constructor(
    public readonly duration: number = 31536000,
    public readonly subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
  ) {}

  check() {
    return true;
  }

  async run(model: CertManagerModel, real: CertManager) {
    // Update the real
    const now = new Date();
    await real.renewCertWithCurrentKeyPair(
      this.duration,
      this.subjectAttrsExtra,
      now
    );
    const certOld = model.currentCert;
    const certNew = await real.getCurrentCert();
    const [certNew_, certOld_] = await AsyncIterable.as(real.getCerts()).take(2).toArray();
    // Same key pair preserves the NodeId
    expect(x509.certNodeId(certNew),).toStrictEqual(x509.certNodeId(certOld));
    // New certificates should match
    expect(x509.certEqual(certNew_, certNew)).toBe(true);
    // Old certificate was the previous current certificate
    expect(x509.certEqual(certOld_, certOld)).toBe(true);
    // New certificate issued by old certificate
    expect(x509.certIssuedBy(certNew, certOld)).toBe(true);
    // New certificate signed by old certificate
    expect(await x509.certSignedBy(certNew, x509.certPublicKey(certOld)!)).toBe(true);
    // New certificate is self-signed via the node signature extension
    expect(await x509.certNodeSigned(certNew)).toBe(true);
    // New certificate is not expired from now and inclusive of the duration
    expect(x509.certNotExpiredBy(certNew, now)).toBe(true);
    expect(
      x509.certNotExpiredBy(
        certNew,
        new Date(now.getTime() + this.duration * 1000)
      )
    ).toBe(true);
    expect((await real.getCertsChain()).length).toBe(model.certCount + 1);
    // Update the model
    model.certCount++;
    model.currentCert = certNew;
  }

  toString() {
    return `RenewCertWithCurrentKeyPairCommand(${this.duration}, ${JSON.stringify(this.subjectAttrsExtra)})`;
  }
}

class RenewCertWithNewKeyPairCommand implements CertManagerCommand {
  constructor(
    public readonly password: string,
    public readonly duration: number = 31536000,
    public readonly subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>,
  ) {}

  check() {
    return true;
  }

  async run(model: CertManagerModel, real: CertManager) {
    // Update the real
    const now = new Date();
    await real.renewCertWithNewKeyPair(
      this.password,
      this.duration,
      this.subjectAttrsExtra,
      now
    );
    const certOld = model.currentCert;
    const certNew = await real.getCurrentCert();
    const [certNew_, certOld_] = await AsyncIterable.as(real.getCerts()).take(2).toArray();
    // Different key pair changes the the NodeId
    expect(x509.certNodeId(certNew),).not.toStrictEqual(x509.certNodeId(certOld));
    // New certificates should match
    expect(x509.certEqual(certNew_, certNew)).toBe(true);
    // Old certificate was the previous current certificate
    expect(x509.certEqual(certOld_, certOld)).toBe(true);
    // New certificate issued by old certificate
    expect(x509.certIssuedBy(certNew, certOld)).toBe(true);
    // New certificate signed by old certificate
    expect(await x509.certSignedBy(certNew, x509.certPublicKey(certOld)!)).toBe(true);
    // New certificate is self-signed via the node signature extension
    expect(await x509.certNodeSigned(certNew)).toBe(true);
    // New certificate is not expired from now and inclusive of the duration
    expect(x509.certNotExpiredBy(certNew, now)).toBe(true);
    expect(
      x509.certNotExpiredBy(
        certNew,
        new Date(now.getTime() + this.duration * 1000)
      )
    ).toBe(true);
    expect((await real.getCertsChain()).length).toBe(model.certCount + 1);
    // Update the model
    model.certCount++;
    model.currentCert = certNew;
  }

  toString() {
    return `RenewCertWithNewKeyPairCommand('${this.password}', ${this.duration}, ${JSON.stringify(this.subjectAttrsExtra)})`;
  }
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
  signatureArb,
  passwordArb,
  RenewCertWithCurrentKeyPairCommand,
  RenewCertWithNewKeyPairCommand,
};

export type {
  CertManagerModel,
  CertManagerCommand
};
