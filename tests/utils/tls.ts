import type {
  CertId,
  Certificate,
  CertificatePEM,
  CertificatePEMChain,
  KeyPair,
  PrivateKeyPEM,
} from '@/keys/types';
import type { TLSConfig } from '@/network/types';
import * as keysUtils from '@/keys/utils';

async function createTLSConfig(
  keyPair: KeyPair,
  generateCertId?: () => CertId,
): Promise<TLSConfig> {
  generateCertId = generateCertId ?? keysUtils.createCertIdGenerator();
  const certificate = await keysUtils.generateCertificate({
    certId: generateCertId(),
    duration: 31536000,
    issuerPrivateKey: keyPair.privateKey,
    subjectKeyPair: {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
    },
  });
  return {
    keyPrivatePem: keysUtils.privateKeyToPEM(keyPair.privateKey),
    certChainPem: keysUtils.certToPEM(
      certificate,
    ) as unknown as CertificatePEMChain,
  };
}

async function createTLSConfigWithChain(
  keyPairs: Array<[KeyPair, number | undefined]>,
  generateCertId?: () => CertId,
): Promise<{
  keyPrivatePem: PrivateKeyPEM;
  certChainPem: Array<CertificatePEM>;
}> {
  if (keyPairs.length === 0) throw Error('Must have at least 1 keypair');
  generateCertId = generateCertId ?? keysUtils.createCertIdGenerator();
  let previousCert: Certificate | null = null;
  let previousKeyPair: KeyPair | null = null;
  const certChain: Array<Certificate> = [];
  for (const [keyPair, duration] of keyPairs) {
    const newCert = await keysUtils.generateCertificate({
      certId: generateCertId(),
      duration: duration ?? 31536000,
      issuerPrivateKey: previousKeyPair?.privateKey ?? keyPair.privateKey,
      subjectKeyPair: keyPair,
      issuerAttrsExtra: previousCert?.subjectName.toJSON(),
    });
    certChain.unshift(newCert);
    previousCert = newCert;
    previousKeyPair = keyPair;
  }
  const certChainPEMs = certChain.map((v) => keysUtils.certToPEM(v));

  return {
    keyPrivatePem: keysUtils.privateKeyToPEM(previousKeyPair!.privateKey),
    certChainPem: certChainPEMs,
  };
}

export { createTLSConfig, createTLSConfigWithChain };
