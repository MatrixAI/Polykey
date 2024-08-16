import type { CertificatePEM, PrivateKeyPEM } from '@/keys/types';
import { utils as wsUtils } from '@matrixai/ws';
import * as clientUtils from '@/client/utils';
import * as keysUtils from '@/keys/utils';
import * as testTlsUtils from '../utils/tls';

describe('client/utils', () => {
  const keyPairRoot = keysUtils.generateKeyPair();
  const nodeIdRoot = keysUtils.publicKeyToNodeId(keyPairRoot.publicKey);
  const keyPairIntermediate = keysUtils.generateKeyPair();
  const nodeIdIntermediate = keysUtils.publicKeyToNodeId(
    keyPairIntermediate.publicKey,
  );
  const keyPairLeaf = keysUtils.generateKeyPair();
  const nodeIdLeaf = keysUtils.publicKeyToNodeId(keyPairLeaf.publicKey);

  let cert: {
    keyPrivatePem: PrivateKeyPEM;
    certChainPem: Array<CertificatePEM>;
  };

  beforeAll(async () => {
    cert = await testTlsUtils.createTLSConfigWithChain([
      [keyPairRoot, undefined],
      [keyPairIntermediate, undefined],
      [keyPairLeaf, undefined],
    ]);
  });

  describe('client verifyServerCertificateChain', () => {
    test('verify on leaf cert', async () => {
      const result = await clientUtils.verifyServerCertificateChain(
        [nodeIdLeaf],
        cert.certChainPem.map((v) => wsUtils.pemToDER(v)),
      );
      expect(Buffer.compare(result, nodeIdLeaf)).toBe(0);
    });
    test('verify on intermediate cert', async () => {
      const result = await clientUtils.verifyServerCertificateChain(
        [nodeIdIntermediate],
        cert.certChainPem.map((v) => wsUtils.pemToDER(v)),
      );
      expect(Buffer.compare(result, nodeIdIntermediate)).toBe(0);
    });
    test('verify on root cert', async () => {
      const result = await clientUtils.verifyServerCertificateChain(
        [nodeIdRoot],
        cert.certChainPem.map((v) => wsUtils.pemToDER(v)),
      );
      expect(Buffer.compare(result, nodeIdRoot)).toBe(0);
    });
    test('newest cert takes priority', async () => {
      const result1 = await clientUtils.verifyServerCertificateChain(
        [nodeIdLeaf, nodeIdIntermediate, nodeIdRoot],
        cert.certChainPem.map((v) => wsUtils.pemToDER(v)),
      );
      expect(Buffer.compare(result1, nodeIdLeaf)).toBe(0);
      const result2 = await clientUtils.verifyServerCertificateChain(
        [nodeIdRoot, nodeIdIntermediate, nodeIdLeaf],
        cert.certChainPem.map((v) => wsUtils.pemToDER(v)),
      );
      expect(Buffer.compare(result2, nodeIdLeaf)).toBe(0);
    });
  });
});
