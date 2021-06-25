import type { Cryptolink } from '@/sigchain/types';
import type { NodeId } from '@/nodes/types';
import type { ProviderId, IdentityId } from '@/identities/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { KeyManager } from '@/keys';
import { Sigchain } from '@/sigchain';
import * as sigchainUtils from '@/sigchain/utils';

describe('Sigchain', () => {
  const logger = new Logger('Sigchain Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let keyManager: KeyManager;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyManager = new KeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
  });
  afterEach(async () => {
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('construction has no side effects', async () => {
    const sigchainPath = `${dataDir}/sigchain`;
    new Sigchain({ sigchainPath, keyManager, logger });
    await expect(fs.promises.stat(sigchainPath)).rejects.toThrow(/ENOENT/);
  });
  test('async start constructs the sigchain leveldb and initialises the sequence number', async () => {
    const sigchainPath = `${dataDir}/sigchain`;
    const sigchain = new Sigchain({ sigchainPath, keyManager, logger });
    await sigchain.start();
    const sigchainPathContents = await fs.promises.readdir(sigchainPath);
    expect(sigchainPathContents).toContain('sigchain_db');
    const sequenceNumber = await sigchain.getSequenceNumber();
    expect(sequenceNumber).toBe(0);
    await sigchain.stop();
  });
  test('start and stop preserves the acl key', async () => {
    const sigchainPath = `${dataDir}/sigchain`;
    const sigchain = new Sigchain({ sigchainPath, keyManager, logger });
    await sigchain.start();
    const sigchainDbKey = await keyManager.getKey('Sigchain');
    expect(sigchainDbKey).not.toBeUndefined();
    await sigchain.stop();
    await sigchain.start();
    const followingSigchainDbKey = await keyManager.getKey('Sigchain');
    expect(followingSigchainDbKey).not.toBeUndefined();
    await sigchain.stop();
    expect(sigchainDbKey).toEqual(followingSigchainDbKey);
  });
  test('adds and retrieves a cryptolink, verifies signature', async () => {
    const sigchainPath = `${dataDir}/sigchain`;
    const sigchain = new Sigchain({ sigchainPath, keyManager, logger });
    await sigchain.start();
    const cryptolink: Cryptolink = {
      claimType: 'cryptolink',
      linkId: 'id1',
      type: 'node',
      node1: 'NodeId1' as NodeId,
      node2: 'NodeId2' as NodeId,
    };
    await sigchain.addCryptolink(cryptolink);
    const claim = await sigchain.getClaim(1);

    // Check the claim is correct
    const decoded = sigchainUtils.decodeClaim(claim);
    expect(decoded).toEqual({
      header: { alg: 'RS256' },
      payload: {
        hashPrevious: null,
        sequenceNumber: 1,
        claimData: {
          claimType: 'cryptolink',
          linkId: 'id1',
          type: 'node',
          node1: 'NodeId1',
          node2: 'NodeId2',
        },
        iat: expect.any(Number),
      },
    });

    // Check the signature is valid
    const verified = await sigchainUtils.verifyClaimSignature(
      claim,
      keyManager.getRootKeyPairPem().publicKey,
    );
    expect(verified).toBe(true);

    await sigchain.stop();
  });
  test('adds and retrieves 2 cryptolinks, verifies signatures and hash', async () => {
    const sigchainPath = `${dataDir}/sigchain`;
    const sigchain = new Sigchain({ sigchainPath, keyManager, logger });
    await sigchain.start();
    const cryptolink1: Cryptolink = {
      claimType: 'cryptolink',
      linkId: 'id1',
      type: 'node',
      node1: 'NodeId1' as NodeId,
      node2: 'NodeId2' as NodeId,
    };
    await sigchain.addCryptolink(cryptolink1);

    const cryptolink2: Cryptolink = {
      claimType: 'cryptolink',
      linkId: 'id2',
      type: 'node',
      node1: 'NodeId1' as NodeId,
      node2: 'NodeId3' as NodeId,
    };
    await sigchain.addCryptolink(cryptolink2);

    const claim1 = await sigchain.getClaim(1);
    const claim2 = await sigchain.getClaim(2);

    // Check the claim is correct
    const decoded1 = sigchainUtils.decodeClaim(claim1);
    expect(decoded1).toEqual({
      header: { alg: 'RS256' },
      payload: {
        hashPrevious: null,
        sequenceNumber: 1,
        claimData: {
          claimType: 'cryptolink',
          linkId: 'id1',
          type: 'node',
          node1: 'NodeId1',
          node2: 'NodeId2',
        },
        iat: expect.any(Number),
      },
    });
    const decoded2 = sigchainUtils.decodeClaim(claim2);
    expect(decoded2).toEqual({
      header: { alg: 'RS256' },
      payload: {
        hashPrevious: expect.any(String),
        sequenceNumber: 2,
        claimData: {
          claimType: 'cryptolink',
          linkId: 'id2',
          type: 'node',
          node1: 'NodeId1',
          node2: 'NodeId3',
        },
        iat: expect.any(Number),
      },
    });

    // Check the signature is valid
    const verified1 = await sigchainUtils.verifyClaimSignature(
      claim1,
      keyManager.getRootKeyPairPem().publicKey,
    );
    const verified2 = await sigchainUtils.verifyClaimSignature(
      claim2,
      keyManager.getRootKeyPairPem().publicKey,
    );
    expect(verified1).toBe(true);
    expect(verified2).toBe(true);

    // Check the hash of the previous claim is correct
    const verifiedHash = await sigchainUtils.verifyHashOfClaim(
      claim1,
      decoded2.payload.hashPrevious,
    );
    expect(verifiedHash).toBe(true);

    await sigchain.stop();
  });
  test('retrieves all cryptolinks from sigchain', async () => {
    const sigchainPath = `${dataDir}/sigchain`;
    const sigchain = new Sigchain({ sigchainPath, keyManager, logger });
    await sigchain.start();

    // Add 30 claims, with cryptolink claims at sequence numbers 5, 10, 13, 29.
    for (let i = 0; i < 30; i++) {
      // Add 2 node cryptolinks
      if (i == 5 || i == 13) {
        const cryptolink: Cryptolink = {
          claimType: 'cryptolink',
          linkId: 'id' + i.toString(),
          type: 'node',
          node1: 'NodeId1' as NodeId,
          node2: ('NodeId' + i.toString()) as NodeId,
        };
        await sigchain.addCryptolink(cryptolink);
        // Add 2 identity cryptolinks
      } else if (i == 10 || i == 29) {
        const cryptolink: Cryptolink = {
          claimType: 'cryptolink',
          linkId: 'id' + i.toString(),
          type: 'identity',
          node: 'NodeId1' as NodeId,
          provider: ('ProviderId' + i.toString()) as ProviderId,
          identity: ('IdentityId' + i.toString()) as IdentityId,
        };
        await sigchain.addCryptolink(cryptolink);
      } else {
        await sigchain.addArbitraryClaim();
      }
    }

    const cryptolinks = await sigchain.getAllCryptolinks();
    expect(cryptolinks.length).toBe(4);
    // Verify each cryptolink
    for (const c of cryptolinks) {
      const decoded = sigchainUtils.decodeClaim(c);
      const i = decoded.payload.sequenceNumber;
      // Verify contents of node cryptolinks
      if (i == 5 || i == 13) {
        expect(decoded).toEqual({
          header: { alg: 'RS256' },
          payload: {
            hashPrevious: expect.any(String),
            sequenceNumber: i,
            claimData: {
              claimType: 'cryptolink',
              linkId: 'id' + i.toString(),
              type: 'node',
              node1: 'NodeId1',
              node2: 'NodeId' + i.toString(),
            },
            iat: expect.any(Number),
          },
        });
        // Verify contents of identity cryptolinks
      } else if (i == 10 || i == 29) {
        expect(decoded).toEqual({
          header: { alg: 'RS256' },
          payload: {
            hashPrevious: expect.any(String),
            sequenceNumber: i,
            claimData: {
              claimType: 'cryptolink',
              linkId: 'id' + i.toString(),
              type: 'identity',
              node: 'NodeId1',
              provider: 'ProviderId' + i.toString(),
              identity: 'IdentityId' + i.toString(),
            },
            iat: expect.any(Number),
          },
        });
      }
      // Verify signature of the cryptolink
      const verified = await sigchainUtils.verifyClaimSignature(
        c,
        keyManager.getRootKeyPairPem().publicKey,
      );
      expect(verified).toBe(true);

      // Verify hash of the cryptolinks
      const verifiedHash = await sigchainUtils.verifyHashOfClaim(
        await sigchain.getClaim(i - 1),
        decoded.payload.hashPrevious,
      );
      expect(verifiedHash).toBe(true);
    }

    await sigchain.stop();
  });
});
