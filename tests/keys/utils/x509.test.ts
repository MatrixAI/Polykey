import { testProp, fc } from '@fast-check/jest';
import * as generate from '@/keys/utils/generate';
import * as x509 from '@/keys/utils/x509';
import * as asymmetric from '@/keys/utils/asymmetric';
import * as ids from '@/ids';
import * as testsKeysUtils from '../utils';

describe('keys/utils/x509', () => {
  const certIdGenerator = ids.createCertIdGenerator();
  testProp(
    'generate x509 certificates',
    [
      testsKeysUtils.keyPairPArb,
      testsKeysUtils.keyPairPArb,
      fc.integer({ min: 0, max: 1000 }),
      fc.date({
        // X509's minimum date is 1970-01-01T00:00:00.000Z
        min: new Date(0),
        // X509's maximum date is 2049-12-31T23:59:59.000Z
        // here we use 1 ms less than 2050
        max: new Date(new Date('2050').getTime() - 1),
      }),
    ],
    async (issuerKeyPairP, subjectKeyPairP, duration, now) => {
      // Truncate to the nearest second
      const nowS = new Date(now.getTime() - (now.getTime() % 1000));
      // The current time plus duration must be lower than the 2050 time
      fc.pre(new Date(nowS.getTime() + duration * 1000) < new Date('2050'));
      const subjectKeyPair = await subjectKeyPairP;
      const issuerKeyPair = await issuerKeyPairP;
      jest.useFakeTimers();
      jest.setSystemTime(nowS);
      try {
        const cert = await x509.generateCertificate({
          certId: certIdGenerator(),
          subjectKeyPair,
          issuerPrivateKey: issuerKeyPair.privateKey,
          duration,
        });
        expect(cert.notBefore.getTime()).toBe(nowS.getTime());
        expect(cert.notAfter.getTime()).toBe(nowS.getTime() + duration * 1000);
        // Certificate is equal to itself
        expect(x509.certEqual(cert, cert)).toBe(true);
        // Certificate node ID is equal to the subject public key node ID
        expect(x509.certNodeId(cert)).toStrictEqual(
          asymmetric.publicKeyToNodeId(subjectKeyPair.publicKey),
        );
        // The cert is not self-issued
        expect(x509.certIssuedBy(cert, cert)).toBe(false);
        // The certificate is signed by the issuer
        expect(await x509.certSignedBy(cert, issuerKeyPair.publicKey)).toBe(
          true,
        );
        // The certificate has a node signature and it is valid
        expect(await x509.certNodeSigned(cert)).toBe(true);
        // It is not expired now
        expect(x509.certNotExpiredBy(cert, nowS)).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    },
  );
  testProp(
    'import and export PEM',
    [testsKeysUtils.keyPairPArb, testsKeysUtils.keyPairPArb],
    async (issuerKeyPairP, subjectKeyPairP) => {
      const subjectKeyPair = await subjectKeyPairP;
      const issuerKeyPair = await issuerKeyPairP;
      const cert = await x509.generateCertificate({
        certId: certIdGenerator(),
        subjectKeyPair: subjectKeyPair,
        issuerPrivateKey: issuerKeyPair.privateKey,
        duration: 1000,
      });
      const certPem = x509.certToPem(cert);
      const cert_ = x509.certFromPem(certPem);
      expect(x509.certEqual(cert, cert_)).toBe(true);
    },
  );
  testProp(
    'certificate is issued by parent certificate',
    [testsKeysUtils.keyPairPArb, testsKeysUtils.keyPairPArb],
    async (issuerKeyPairP, subjectKeyPairP) => {
      const issuerKeyPair = await issuerKeyPairP;
      const subjectKeyPair = await subjectKeyPairP;
      // The issuer cert is self-signed with the issuer key pair
      const issuerCert = await x509.generateCertificate({
        certId: certIdGenerator(),
        subjectKeyPair: issuerKeyPair,
        issuerPrivateKey: issuerKeyPair.privateKey,
        subjectAttrsExtra: [
          {
            O: ['Organisation Unit'],
            L: ['Location'],
            ST: ['State'],
            C: ['Country'],
          },
        ],
        duration: 1000,
      });
      // The subject cert is signed by the issuer key pair
      const subjectCertCorrect = await x509.generateCertificate({
        certId: certIdGenerator(),
        subjectKeyPair: subjectKeyPair,
        issuerPrivateKey: issuerKeyPair.privateKey,
        issuerAttrsExtra: issuerCert.subjectName.toJSON(),
        duration: 1000,
      });
      expect(x509.certIssuedBy(subjectCertCorrect, issuerCert)).toBe(true);
      const subjectCertIncorrect1 = await x509.generateCertificate({
        certId: certIdGenerator(),
        subjectKeyPair: subjectKeyPair,
        issuerPrivateKey: issuerKeyPair.privateKey,
        duration: 1000,
      });
      expect(x509.certIssuedBy(subjectCertIncorrect1, issuerCert)).toBe(false);
      const subjectCertIncorrect2 = await x509.generateCertificate({
        certId: certIdGenerator(),
        subjectKeyPair: subjectKeyPair,
        issuerPrivateKey: issuerKeyPair.privateKey,
        subjectAttrsExtra: issuerCert.subjectName.toJSON(),
        duration: 1000,
      });
      expect(x509.certIssuedBy(subjectCertIncorrect2, issuerCert)).toBe(false);
    },
    {
      numRuns: 50,
    },
  );
  testProp(
    'certificate is not expired by date',
    [fc.integer({ min: 0, max: 1000 })],
    async (duration) => {
      const subjectKeyPair = await generate.generateKeyPair();
      // Truncate to the nearest second
      const now = new Date();
      const nowS = new Date(now.getTime() - (now.getTime() % 1000));
      const nowTime = nowS.getTime();
      jest.useFakeTimers();
      jest.setSystemTime(nowS);
      try {
        const cert = await x509.generateCertificate({
          certId: certIdGenerator(),
          subjectKeyPair,
          issuerPrivateKey: subjectKeyPair.privateKey,
          duration,
        });
        // It not expired now
        expect(x509.certNotExpiredBy(cert)).toBe(true);
        // Is not expired now with explicit now
        expect(x509.certNotExpiredBy(cert, nowS)).toBe(true);
        // Only if duration is greater than 0
        if (duration > 0) {
          // Is not expired within the duration
          nowS.setTime(nowTime + (duration - 1) * 1000);
          expect(x509.certNotExpiredBy(cert, nowS)).toBe(true);
        }
        // Is not expired at the duration
        nowS.setTime(nowTime + duration * 1000);
        expect(x509.certNotExpiredBy(cert, nowS)).toBe(true);
        // Is expired after the duration
        nowS.setTime(nowTime + (duration + 1) * 1000);
        expect(x509.certNotExpiredBy(cert, nowS)).toBe(false);
        // Is expired before the duration
        nowS.setTime(nowTime - 1 * 1000);
        expect(x509.certNotExpiredBy(cert, nowS)).toBe(false);
      } finally {
        jest.useRealTimers();
      }
    },
  );
});
