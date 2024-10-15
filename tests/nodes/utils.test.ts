import type { NodeId } from '@/ids/types';
import type { Key, CertificatePEM, PrivateKeyPEM } from '@/keys/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import lexi from 'lexicographic-integer';
import { IdInternal } from '@matrixai/id';
import { DB } from '@matrixai/db';
import { errors as rpcErrors } from '@matrixai/rpc';
import { utils as wsUtils } from '@matrixai/ws';
import { CryptoError } from '@matrixai/quic/dist/native';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import * as validationErrors from '@/validation/errors';
import * as utils from '@/utils';
import * as testNodesUtils from './utils';
import * as testTlsUtils from '../utils/tls';

describe('nodes/utils', () => {
  const logger = new Logger(`nodes/utils test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let db: DB;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const dbKey = keysUtils.generateKey();
    const dbPath = `${dataDir}/db`;
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: dbKey,
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(plainText),
            );
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(cipherText),
            );
          },
        },
      },
    });
  });
  afterEach(async () => {
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('calculating bucket index from the same node ID', () => {
    const nodeId1 = IdInternal.create<NodeId>([0]);
    const nodeId2 = IdInternal.create<NodeId>([0]);
    const distance = nodesUtils.nodeDistance(nodeId1, nodeId2);
    expect(distance).toBe(0n);
    expect(() => nodesUtils.bucketIndex(nodeId1, nodeId2)).toThrow(RangeError);
  });
  test('calculating bucket index 0', () => {
    // Distance is calculated based on XOR operation
    // 1 ^ 0 == 1
    // Distance of 1 is bucket 0
    const nodeId1 = IdInternal.create<NodeId>([1]);
    const nodeId2 = IdInternal.create<NodeId>([0]);
    const distance = nodesUtils.nodeDistance(nodeId1, nodeId2);
    const bucketIndex = nodesUtils.bucketIndex(nodeId1, nodeId2);
    expect(distance).toBe(1n);
    expect(bucketIndex).toBe(0);
    // Triangle inequality 2^i <= distance < 2^(i + 1)
    expect(2 ** bucketIndex <= distance).toBe(true);
    expect(distance < 2 ** (bucketIndex + 1)).toBe(true);
  });
  test('calculating bucket index 255', () => {
    const nodeId1 = IdInternal.create<NodeId>([
      255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const nodeId2 = IdInternal.create<NodeId>([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0,
    ]);
    const distance = nodesUtils.nodeDistance(nodeId1, nodeId2);
    const bucketIndex = nodesUtils.bucketIndex(nodeId1, nodeId2);
    expect(bucketIndex).toBe(255);
    // Triangle inequality 2^i <= distance < 2^(i + 1)
    expect(2 ** bucketIndex <= distance).toBe(true);
    expect(distance < 2 ** (bucketIndex + 1)).toBe(true);
  });
  test('calculating bucket index randomly', () => {
    for (let i = 0; i < 1000; i++) {
      const nodeId1 = testNodesUtils.generateRandomNodeId();
      const nodeId2 = testNodesUtils.generateRandomNodeId();
      if (nodeId1.equals(nodeId2)) {
        continue;
      }
      const distance = nodesUtils.nodeDistance(nodeId1, nodeId2);
      const bucketIndex = nodesUtils.bucketIndex(nodeId1, nodeId2);
      // Triangle inequality 2^i <= distance < 2^(i + 1)
      expect(2 ** bucketIndex <= distance).toBe(true);
      expect(distance < 2 ** (bucketIndex + 1)).toBe(true);
    }
  });
  test('parse NodeGraph buckets db key', async () => {
    const bucketsDbPath = ['buckets'];
    const data: Array<{
      bucketIndex: number;
      bucketKey: string;
      nodeId: NodeId;
      key: Buffer;
    }> = [];
    for (let i = 0; i < 1000; i++) {
      const bucketIndex = Math.floor(Math.random() * (255 + 1));
      const bucketKey = nodesUtils.bucketKey(bucketIndex);
      const nodeId = testNodesUtils.generateRandomNodeId();
      data.push({
        bucketIndex,
        bucketKey,
        nodeId,
        key: Buffer.concat([Buffer.from(bucketKey), nodeId]),
      });
      await db.put(
        ['buckets', bucketKey, nodesUtils.bucketDbKey(nodeId)],
        null,
      );
    }
    // LevelDB will store keys in lexicographic order
    // Use the key property as a concatenated buffer of the bucket key and node ID
    data.sort((a, b) => Buffer.compare(a.key, b.key));
    let i = 0;

    for await (const [key] of db.iterator(bucketsDbPath)) {
      const { bucketIndex, bucketKey, nodeId } = nodesUtils.parseBucketsDbKey(
        key as Array<Buffer>,
      );
      expect(bucketIndex).toBe(data[i].bucketIndex);
      expect(bucketKey).toBe(data[i].bucketKey);
      expect(nodeId.equals(data[i].nodeId)).toBe(true);
      i++;
    }
  });
  test('parse NodeGraph lastUpdated buckets db key', async () => {
    const lastUpdatedDbPath = ['lastUpdated'];
    const data: Array<{
      bucketIndex: number;
      bucketKey: string;
      lastUpdated: number;
      nodeId: NodeId;
      key: Buffer;
    }> = [];
    for (let i = 0; i < 1000; i++) {
      const bucketIndex = Math.floor(Math.random() * (255 + 1));
      const bucketKey = lexi.pack(bucketIndex, 'hex');
      const lastUpdated = utils.getUnixtime();
      const nodeId = testNodesUtils.generateRandomNodeId();
      const nodeIdKey = nodesUtils.bucketDbKey(nodeId);
      const lastUpdatedKey = nodesUtils.connectedKey(lastUpdated);
      data.push({
        bucketIndex,
        bucketKey,
        lastUpdated,
        nodeId,
        key: Buffer.concat([Buffer.from(bucketKey), lastUpdatedKey, nodeIdKey]),
      });
      await db.put(['lastUpdated', bucketKey, lastUpdatedKey, nodeIdKey], null);
    }
    // LevelDB will store keys in lexicographic order
    // Use the key property as a concatenated buffer of
    // the bucket key and last updated and node ID
    data.sort((a, b) => Buffer.compare(a.key, b.key));
    let i = 0;
    for await (const [key] of db.iterator(lastUpdatedDbPath)) {
      const { bucketIndex, bucketKey, lastUpdated, nodeId } =
        nodesUtils.parseLastUpdatedBucketsDbKey(key as Array<Buffer>);
      expect(bucketIndex).toBe(data[i].bucketIndex);
      expect(bucketKey).toBe(data[i].bucketKey);
      expect(lastUpdated).toBe(data[i].lastUpdated);
      expect(nodeId.equals(data[i].nodeId)).toBe(true);
      i++;
    }
  });
  test('should generate random distance for a bucket', async () => {
    // Const baseNodeId = testNodesUtils.generateRandomNodeId();
    const zeroNodeId = IdInternal.fromBuffer<NodeId>(Buffer.alloc(32, 0));
    for (let i = 0; i < 255; i++) {
      const randomDistance = nodesUtils.generateRandomDistanceForBucket(i);
      expect(nodesUtils.bucketIndex(zeroNodeId, randomDistance)).toEqual(i);
    }
  });
  test('should generate random NodeId for a bucket', async () => {
    const baseNodeId = testNodesUtils.generateRandomNodeId();
    for (let i = 0; i < 255; i++) {
      const randomDistance = nodesUtils.generateRandomNodeIdForBucket(
        baseNodeId,
        i,
      );
      expect(nodesUtils.bucketIndex(baseNodeId, randomDistance)).toEqual(i);
    }
  });
  test('code and reason converters', async () => {
    function check(reason: any): any {
      const _reason = new reason();
      const code = nodesUtils.reasonToCode('read', _reason);
      const convertedReason = nodesUtils.codeToReason('read', code);
      expect(convertedReason).toBeInstanceOf(reason);
    }

    check(rpcErrors.ErrorRPCHandlerFailed);
    check(rpcErrors.ErrorRPCMessageLength);
    check(rpcErrors.ErrorRPCMissingResponse);
    check(rpcErrors.ErrorRPCOutputStreamError);
    check(rpcErrors.ErrorRPCStreamEnded);
    check(rpcErrors.ErrorRPCTimedOut);
  });
  describe('parseSeedNodes', () => {
    const nodeIdEncoded1 =
      'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0';
    const nodeIdEncoded2 =
      'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg';
    const nodeIdEncoded3 =
      'vi3et1hrpv2m2lrplcm7cu913kr45v51cak54vm68anlbvuf83ra0';
    const hostname = 'testnet.polykey.com';
    const hostIPv4 = '127.0.0.1';
    const hostIPv6 = '[2001:db8:85a3:8d3:1319:8a2e:370:7348]';
    const port1 = 1314;
    const port2 = 1315;
    const port3 = 1316;
    test('parseSeedNodes - valid seed nodes (using hostname, IPv4, IPv6)', () => {
      const rawSeedNodes =
        `${nodeIdEncoded1}@${hostname}:${port1};` +
        `${nodeIdEncoded2}@${hostIPv4}:${port2};` +
        `${nodeIdEncoded3}@${hostIPv6}:${port3};`;
      const parsed = nodesUtils.parseSeedNodes(rawSeedNodes);
      const seeds = parsed[0];
      expect(seeds[nodeIdEncoded1]).toStrictEqual({
        host: hostname,
        port: port1,
      });
      expect(seeds[nodeIdEncoded2]).toStrictEqual({
        host: hostIPv4,
        port: port2,
      });
      expect(seeds[nodeIdEncoded3]).toStrictEqual({
        host: hostIPv6.replace(/\[|\]/g, ''),
        port: port3,
      });
      expect(parsed[1]).toBeFalsy();
    });
    test('parseSeedNodes - valid nodes optionally have pk://', () => {
      const rawSeedNodes =
        `pk://${nodeIdEncoded1}@${hostname}:${port1};` +
        `pk://${nodeIdEncoded2}@${hostIPv4}:${port2};` +
        `pk://${nodeIdEncoded3}@${hostIPv6}:${port3};`;
      const parsed = nodesUtils.parseSeedNodes(rawSeedNodes);
      const seeds = parsed[0];
      expect(seeds[nodeIdEncoded1]).toStrictEqual({
        host: hostname,
        port: port1,
      });
      expect(seeds[nodeIdEncoded2]).toStrictEqual({
        host: hostIPv4,
        port: port2,
      });
      expect(seeds[nodeIdEncoded3]).toStrictEqual({
        host: hostIPv6.replace(/\[|\]/g, ''),
        port: port3,
      });
      expect(parsed[1]).toBeFalsy();
    });
    test('parseSeedNodes - invalid node ID', () => {
      const rawSeedNodes = `INVALIDNODEID@${hostname}:${port1}`;
      expect(() => nodesUtils.parseSeedNodes(rawSeedNodes)).toThrow(
        validationErrors.ErrorParse,
      );
    });
    test('parseSeedNodes - invalid hostname', () => {
      const rawSeedNodes = `${nodeIdEncoded1}@$invalidHost:${port1}`;
      expect(() => nodesUtils.parseSeedNodes(rawSeedNodes)).toThrow(
        validationErrors.ErrorParse,
      );
    });
    test('parseSeedNodes - invalid URL', () => {
      expect(() =>
        nodesUtils.parseSeedNodes('thisisinvalid!@#$%^&*()'),
      ).toThrow(validationErrors.ErrorParse);
    });
    test('parseSeedNodes - invalid port', async () => {
      expect(() =>
        nodesUtils.parseSeedNodes(`${nodeIdEncoded1}@$invalidHost:-55555`),
      ).toThrow(validationErrors.ErrorParse);
      expect(() =>
        nodesUtils.parseSeedNodes(`${nodeIdEncoded1}@$invalidHost:999999999`),
      ).toThrow(validationErrors.ErrorParse);
    });
    test('parseSeedNodes - invalid structure', async () => {
      expect(() =>
        nodesUtils.parseSeedNodes(
          `${nodeIdEncoded1}!#$%^&*()@$invalidHost:${port1}`,
        ),
      ).toThrow(validationErrors.ErrorParse);
      expect(() =>
        nodesUtils.parseSeedNodes(
          `pk:/${nodeIdEncoded1}@$invalidHost:${port1}`,
        ),
      ).toThrow(validationErrors.ErrorParse);
      expect(() =>
        nodesUtils.parseSeedNodes(
          `asdpk://${nodeIdEncoded1}@$invalidHost:${port1}`,
        ),
      ).toThrow(validationErrors.ErrorParse);
    });
  });
  describe('verification utils', () => {
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

    describe('server verifyServerCertificateChain', () => {
      test('verify on leaf cert', async () => {
        const result = await nodesUtils.verifyServerCertificateChain(
          [nodeIdLeaf],
          cert.certChainPem.map((v) => wsUtils.pemToDER(v)),
        );
        expect(result.result).toBe('success');
        if (result.result === 'fail') fail();
        expect(Buffer.compare(result.nodeId, nodeIdLeaf)).toBe(0);
      });
      test('verify on intermediate cert', async () => {
        const result = await nodesUtils.verifyServerCertificateChain(
          [nodeIdIntermediate],
          cert.certChainPem.map((v) => wsUtils.pemToDER(v)),
        );
        expect(result.result).toBe('success');
        if (result.result === 'fail') fail();
        expect(Buffer.compare(result.nodeId, nodeIdIntermediate)).toBe(0);
      });
      test('verify on root cert', async () => {
        const result = await nodesUtils.verifyServerCertificateChain(
          [nodeIdRoot],
          cert.certChainPem.map((v) => wsUtils.pemToDER(v)),
        );
        expect(result.result).toBe('success');
        if (result.result === 'fail') fail();
        expect(Buffer.compare(result.nodeId, nodeIdRoot)).toBe(0);
      });
      test('newest cert takes priority', async () => {
        const result1 = await nodesUtils.verifyServerCertificateChain(
          [nodeIdLeaf, nodeIdIntermediate, nodeIdRoot],
          cert.certChainPem.map((v) => wsUtils.pemToDER(v)),
        );
        expect(result1.result).toBe('success');
        if (result1.result === 'fail') fail();
        expect(Buffer.compare(result1.nodeId, nodeIdLeaf)).toBe(0);
        const result2 = await nodesUtils.verifyServerCertificateChain(
          [nodeIdRoot, nodeIdIntermediate, nodeIdLeaf],
          cert.certChainPem.map((v) => wsUtils.pemToDER(v)),
        );
        expect(result2.result).toBe('success');
        if (result2.result === 'fail') fail();
        expect(Buffer.compare(result2.nodeId, nodeIdLeaf)).toBe(0);
      });
      test('verify on leaf cert with expired intermediate certs', async () => {
        cert = await testTlsUtils.createTLSConfigWithChain([
          [keyPairRoot, 0],
          [keyPairIntermediate, 0],
          [keyPairIntermediate, 0],
          [keyPairLeaf, undefined],
        ]);
        const result = await nodesUtils.verifyServerCertificateChain(
          [nodeIdLeaf],
          cert.certChainPem.map((v) => wsUtils.pemToDER(v)),
        );
        expect(result.result).toBe('success');
        if (result.result === 'fail') fail();
        expect(Buffer.compare(result.nodeId, nodeIdLeaf)).toBe(0);
      });
      test('verify on intermediate cert with expired intermediate certs', async () => {
        cert = await testTlsUtils.createTLSConfigWithChain([
          [keyPairRoot, 0],
          [keyPairIntermediate, 0],
          [keyPairIntermediate, undefined],
          [keyPairLeaf, undefined],
        ]);
        const result = await nodesUtils.verifyServerCertificateChain(
          [nodeIdIntermediate],
          cert.certChainPem.map((v) => wsUtils.pemToDER(v)),
        );
        expect(result.result).toBe('success');
        if (result.result === 'fail') fail();
        expect(Buffer.compare(result.nodeId, nodeIdIntermediate)).toBe(0);
      });
      test('fails with expired intermediate before valid target', async () => {
        cert = await testTlsUtils.createTLSConfigWithChain([
          [keyPairRoot, 0],
          [keyPairIntermediate, undefined],
          [keyPairLeaf, 0],
          [keyPairLeaf, undefined],
        ]);
        const result = await nodesUtils.verifyServerCertificateChain(
          [nodeIdIntermediate],
          cert.certChainPem.map((v) => wsUtils.pemToDER(v)),
        );
        expect(result.result).toBe('fail');
        if (result.result !== 'fail') {
          utils.never('result.result should be "fail"');
        }
        expect(result.value).toBe(CryptoError.CertificateExpired);
      });
    });
    describe('server verifyClientCertificateChain', () => {
      test('verify with multiple certs', async () => {
        const result = await nodesUtils.verifyClientCertificateChain(
          cert.certChainPem.map((v) => wsUtils.pemToDER(v)),
        );
        expect(result).toBeUndefined();
      });
      test('verify with expired intermediate certs', async () => {
        cert = await testTlsUtils.createTLSConfigWithChain([
          [keyPairRoot, 0],
          [keyPairIntermediate, 0],
          [keyPairLeaf, undefined],
        ]);
        const result = await nodesUtils.verifyClientCertificateChain(
          cert.certChainPem.map((v) => wsUtils.pemToDER(v)),
        );
        expect(result).toBeUndefined();
      });
      test('fails with expired leaf cert', async () => {
        cert = await testTlsUtils.createTLSConfigWithChain([
          [keyPairRoot, undefined],
          [keyPairIntermediate, undefined],
          [keyPairLeaf, 0],
        ]);
        const result = await nodesUtils.verifyClientCertificateChain(
          cert.certChainPem.map((v) => wsUtils.pemToDER(v)),
        );
        expect(result).toBe(CryptoError.CertificateExpired);
      });
    });
  });
});
