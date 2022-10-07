import type { CertificateId } from '@/keys/types';
import { fc } from '@fast-check/jest';
import * as asymmetric from '@/keys/utils/asymmetric';
import * as x509 from '@/keys/utils/x509';
import { bufferWrap } from '@/utils';

const bufferArb = (constraints?: fc.IntArrayConstraints) => {
  return fc.uint8Array(constraints).map(bufferWrap);
};

/**
 * 256 bit symmetric key
 */
const keyArb = fc
  .uint8Array({ minLength: 32, maxLength: 32 })
  .map(bufferWrap)
  .noShrink();

/**
 * Ed25519 Private Key
 */
const privateKeyArb = fc
  .uint8Array({ minLength: 32, maxLength: 32 })
  .noShrink();

/**
 * Ed25519 Public Key
 */
const publicKeyArb = privateKeyArb
  .map(asymmetric.publicKeyFromPrivateKeyEd25519)
  .noShrink();

/**
 * Keypair of public and private key
 */
const keyPairPArb = privateKeyArb
  .map(async (privateKey) => {
    return {
      publicKey: await asymmetric.publicKeyFromPrivateKeyEd25519(privateKey),
      privateKey: bufferWrap(privateKey),
    };
  })
  .noShrink();

const certArb = fc
  .record({
    subjectKeyPairP: keyPairPArb,
    issuerKeyPairP: keyPairPArb,
    certId: fc.uint8Array({
      minLength: 16,
      maxLength: 16,
    }) as fc.Arbitrary<CertificateId>,
    duration: fc.integer({ min: 1, max: 1000 }),
  })
  .map(async ({ subjectKeyPairP, issuerKeyPairP, certId, duration }) => {
    const subjectKeyPair = await subjectKeyPairP;
    const issuerKeyPair = await issuerKeyPairP;
    const cert = await x509.generateCertificate({
      certId,
      subjectKeyPair: subjectKeyPair,
      issuerPrivateKey: issuerKeyPair.privateKey,
      duration,
    });
    return cert;
  })
  .noShrink();

export { bufferArb, keyArb, publicKeyArb, privateKeyArb, keyPairPArb, certArb };
