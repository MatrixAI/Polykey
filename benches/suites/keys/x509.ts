import b from 'benny';
import * as generate from '@/keys/utils/generate';
import * as x509 from '@/keys/utils/x509';
import * as ids from '@/ids';
import { summaryName, suiteCommon } from '../../utils';

async function main() {
  const issuerKeyPair = generate.generateKeyPair();
  const subjectKeyPair = generate.generateKeyPair();
  const certIdGenerator = ids.createCertIdGenerator();
  const summary = await b.suite(
    summaryName(__filename),
    b.add('generate certificate', async () => {
      await x509.generateCertificate({
        certId: certIdGenerator(),
        subjectKeyPair,
        issuerPrivateKey: issuerKeyPair.privateKey,
        duration: 1000,
      });
    }),
    b.add('certificate serialization to ASN1 buffer', async () => {
      const cert = await x509.generateCertificate({
        certId: certIdGenerator(),
        subjectKeyPair,
        issuerPrivateKey: issuerKeyPair.privateKey,
        duration: 1000,
      });
      return () => {
        x509.certToASN1(cert);
      };
    }),
    b.add('certificate deserialization from ASN1 buffer', async () => {
      const cert = await x509.generateCertificate({
        certId: certIdGenerator(),
        subjectKeyPair,
        issuerPrivateKey: issuerKeyPair.privateKey,
        duration: 1000,
      });
      const certASN1 = x509.certToASN1(cert);
      return () => {
        x509.certFromASN1(certASN1);
      };
    }),
    b.add('certificate serialization & deserialization to ASN1 buffer', async () => {
      const cert = await x509.generateCertificate({
        certId: certIdGenerator(),
        subjectKeyPair,
        issuerPrivateKey: issuerKeyPair.privateKey,
        duration: 1000,
      });
      return () => {
        const certASN1 = x509.certToASN1(cert);
        x509.certFromASN1(certASN1);
      };
    }),
    ...suiteCommon,
  );
  return summary;
}

if (require.main === module) {
  void main();
}

export default main;
