import type {
  CertificateId,
  PrivateKey,
  KeyPair,
  Key,
  KeyJWK,
  Signature,
} from '@/keys/types';
import { fc } from '@fast-check/jest';
import * as asymmetric from '@/keys/utils/asymmetric';
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

const keyJWKArb = keyArb.map((key) => {
  return {
    alg: 'XChaCha20-Poly1305-IETF',
    kty: 'oct',
    k: key.toString('base64url'),
    ext: true,
    key_ops: ['encrypt', 'decrypt'],
  };
}).noShrink() as fc.Arbitrary<KeyJWK>;

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

const certPArb = fc
  .record({
    subjectKeyPair: keyPairArb,
    issuerKeyPair: keyPairArb,
    certId: fc.uint8Array({
      minLength: 16,
      maxLength: 16,
    }) as fc.Arbitrary<CertificateId>,
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

export {
  bufferArb,
  keyArb,
  keyJWKArb,
  publicKeyArb,
  privateKeyArb,
  keyPairArb,
  certPArb,
  signatureArb,
};
