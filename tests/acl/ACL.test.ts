import type { Permission } from '@/acl/types';
import type { NodeId } from '@/nodes/types';
import type { VaultId } from '@/vaults/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { ACL, errors as aclErrors } from '@/acl';
import { KeyManager } from '@/keys';
import { DB } from '@/db';

describe('ACL', () => {
  const logger = new Logger('ACL Test', LogLevel.WARN, [new StreamHandler()]);
  let dataDir: string;
  let keyManager: KeyManager;
  let db: DB;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyManager = await KeyManager.createKeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
    const dbPath = `${dataDir}/db`;
    db = await DB.createDB({ dbPath, logger });
    await db.start({
      keyPair: keyManager.getRootKeyPair(),
    });
  });
  afterEach(async () => {
    await db.stop();
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('trust and untrust gestalts', async () => {
    const acl = new ACL({ db, logger });
    await acl.start();
    // Gestalt 1
    await acl.setNodesPerm(['g1-first', 'g1-second'] as Array<NodeId>, {
      gestalt: {
        notify: null,
      },
      vaults: {
        v1: { pull: null },
      },
    });
    // Gestalt2
    await acl.setNodesPerm(['g2-first', 'g2-second'] as Array<NodeId>, {
      gestalt: {
        notify: null,
      },
      vaults: {
        v2: { clone: null },
      },
    });
    // Check g1 perm
    const g1Perm1 = await acl.getNodePerm('g1-first' as NodeId);
    const g1Perm2 = await acl.getNodePerm('g1-second' as NodeId);
    expect(g1Perm1).toBeDefined();
    expect(g1Perm1).toEqual(g1Perm2);
    expect(g1Perm1!.gestalt).toHaveProperty('notify');
    expect(g1Perm1!.vaults['v1']).toHaveProperty('pull');
    // Check g2 perm
    const g2Perm = await acl.getNodePerm('g2-first' as NodeId);
    const g2Perm_ = await acl.getNodePerm('g2-second' as NodeId);
    expect(g2Perm).toBeDefined();
    expect(g2Perm).toEqual(g2Perm_);
    expect(g2Perm!.gestalt).toHaveProperty('notify');
    expect(g2Perm!.vaults['v2']).toHaveProperty('clone');
    // Make g1 permission untrusted
    const g1PermNew = {
      ...g1Perm1!,
      gestalt: {},
    };
    await acl.setNodePerm('g1-first' as NodeId, g1PermNew);
    // Check that g1-second also gets the same permission
    const g1Perm3 = await acl.getNodePerm('g1-second' as NodeId);
    expect(g1Perm3).toEqual(g1PermNew);
    const nodePerms = await acl.getNodePerms();
    expect(nodePerms).toEqual([
      {
        'g1-first': g1PermNew,
        'g1-second': g1PermNew,
      },
      {
        'g2-first': g2Perm,
        'g2-second': g2Perm,
      },
    ]);
    // Check that the permission object is identical
    // this should be a performance optimisation
    expect(nodePerms[0]['g1-first']).toBe(nodePerms[0]['g1-second']);
    await acl.stop();
  });
  test('setting and unsetting vault actions', async () => {
    const acl = new ACL({ db, logger });
    await acl.start();
    // The node id must exist as a gestalt first
    await expect(
      acl.setVaultAction('v1' as VaultId, 'g1-1' as NodeId, 'pull'),
    ).rejects.toThrow(aclErrors.ErrorACLNodeIdMissing);
    await acl.setNodesPerm(['g1-1'] as Array<NodeId>, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    let vaultPerm: Record<NodeId, Permission>;
    await acl.setVaultAction('v1' as VaultId, 'g1-1' as NodeId, 'pull');
    // Idempotent
    await acl.setVaultAction('v1' as VaultId, 'g1-1' as NodeId, 'pull');
    vaultPerm = await acl.getVaultPerm('v1' as VaultId);
    expect(vaultPerm['g1-1']).toEqual({
      gestalt: {
        notify: null,
      },
      vaults: {
        v1: { pull: null },
      },
    });
    await acl.unsetVaultAction('v1' as VaultId, 'g1-1' as NodeId, 'pull');
    // Idempotent
    await acl.unsetVaultAction('v1' as VaultId, 'g1-1' as NodeId, 'pull');
    vaultPerm = await acl.getVaultPerm('v1' as VaultId);
    expect(vaultPerm['g1-1']).toEqual({
      gestalt: {
        notify: null,
      },
      vaults: {
        v1: {},
      },
    });
    await acl.setVaultAction('v1' as VaultId, 'g1-1' as NodeId, 'pull');
    await acl.setVaultAction('v1' as VaultId, 'g1-1' as NodeId, 'clone');
    vaultPerm = await acl.getVaultPerm('v1' as VaultId);
    expect(vaultPerm['g1-1'].vaults['v1']).toHaveProperty('pull');
    expect(vaultPerm['g1-1'].vaults['v1']).toHaveProperty('clone');
    const vaultPerms = await acl.getVaultPerms();
    expect(vaultPerms).toEqual({
      v1: {
        'g1-1': {
          gestalt: {
            notify: null,
          },
          vaults: {
            v1: { pull: null, clone: null },
          },
        },
      },
    });
    await acl.stop();
  });
  test('joining existing gestalt permissions', async () => {
    const acl = new ACL({ db, logger });
    await acl.start();
    const g1Perm = {
      gestalt: {
        notify: null,
      },
      vaults: {
        v1: { pull: null },
      },
    };
    await acl.setNodesPerm(['g1-first', 'g1-second'] as Array<NodeId>, g1Perm);
    await acl.joinNodePerm(
      'g1-second' as NodeId,
      ['g1-third', 'g1-fourth'] as Array<NodeId>,
    );
    const nodePerm = await acl.getNodePerm('g1-fourth' as NodeId);
    expect(nodePerm).toEqual(g1Perm);
    const nodePerms = await acl.getNodePerms();
    expect(nodePerms).toEqual([
      {
        'g1-first': g1Perm,
        'g1-second': g1Perm,
        'g1-third': g1Perm,
        'g1-fourth': g1Perm,
      },
    ]);
    await acl.stop();
  });
  test('joining existing vault permissions', async () => {
    const acl = new ACL({ db, logger });
    await acl.start();
    await acl.setNodesPerm(['g1-1'] as Array<NodeId>, {
      gestalt: {
        notify: null,
      },
      vaults: {
        v1: { clone: null },
      },
    });
    await acl.setVaultAction('v1' as VaultId, 'g1-1' as NodeId, 'pull');
    await acl.joinVaultPerms('v1' as VaultId, ['v2', 'v3'] as Array<VaultId>);
    const vaultPerm1 = await acl.getVaultPerm('v1' as VaultId);
    const vaultPerm2 = await acl.getVaultPerm('v2' as VaultId);
    const vaultPerm3 = await acl.getVaultPerm('v3' as VaultId);
    expect(vaultPerm1).toEqual(vaultPerm2);
    expect(vaultPerm2).toEqual(vaultPerm3);
    expect(vaultPerm1['g1-1'].vaults['v1']).toHaveProperty('clone');
    expect(vaultPerm1['g1-1'].vaults['v1']).toHaveProperty('pull');
    const vaultPerms = await acl.getVaultPerms();
    expect(vaultPerms).toMatchObject({
      v1: {
        'g1-1': {
          gestalt: {
            notify: null,
          },
          vaults: {
            v1: { clone: null, pull: null },
            v2: { clone: null, pull: null },
            v3: { clone: null, pull: null },
          },
        },
      },
      v2: {
        'g1-1': {
          gestalt: {
            notify: null,
          },
          vaults: {
            v1: { clone: null, pull: null },
            v2: { clone: null, pull: null },
            v3: { clone: null, pull: null },
          },
        },
      },
      v3: {
        'g1-1': {
          gestalt: {
            notify: null,
          },
          vaults: {
            v1: { clone: null, pull: null },
            v2: { clone: null, pull: null },
            v3: { clone: null, pull: null },
          },
        },
      },
    });
    // Object identity for performance
    expect(vaultPerms['v1']['g1-1']).toEqual(vaultPerms['v2']['g1-1']);
    expect(vaultPerms['v2']['g1-1']).toEqual(vaultPerms['v3']['g1-1']);
    await acl.stop();
  });
  test('node removal', async () => {
    const acl = new ACL({ db, logger });
    await acl.start();
    const g1Perm = {
      gestalt: {
        notify: null,
      },
      vaults: {
        v1: { pull: null },
      },
    };
    await acl.setNodesPerm(['g1-first', 'g1-second'] as Array<NodeId>, g1Perm);
    await acl.unsetNodePerm('g1-first' as NodeId);
    expect(await acl.getNodePerm('g1-first' as NodeId)).toBeUndefined();
    const g1Perm_ = await acl.getNodePerm('g1-second' as NodeId);
    expect(g1Perm_).toEqual(g1Perm);
    await acl.unsetNodePerm('g1-second' as NodeId);
    expect(await acl.getNodePerm('g1-second' as NodeId)).toBeUndefined();
    expect(await acl.getNodePerms()).toHaveLength(0);
    await acl.stop();
  });
  test('vault removal', async () => {
    const acl = new ACL({ db, logger });
    await acl.start();
    const g1Perm = {
      gestalt: {
        notify: null,
      },
      vaults: {},
    };
    await acl.setNodesPerm(['g1-first', 'g1-second'] as Array<NodeId>, g1Perm);
    // V1 and v2 are pointing to the same gestalt
    // but using different node ids as the representative
    await acl.setVaultAction('v1' as VaultId, 'g1-first' as NodeId, 'clone');
    await acl.setVaultAction('v2' as VaultId, 'g1-second' as NodeId, 'pull');
    let vaultPerm;
    vaultPerm = await acl.getVaultPerm('v2' as VaultId);
    expect(vaultPerm).toEqual({
      'g1-second': {
        gestalt: {
          notify: null,
        },
        vaults: {
          v1: { clone: null },
          v2: { pull: null },
        },
      },
    });
    // V1 gets removed
    await acl.unsetVaultPerms('v1' as VaultId);
    vaultPerm = await acl.getVaultPerm('v2' as VaultId);
    expect(vaultPerm).toEqual({
      'g1-second': {
        gestalt: {
          notify: null,
        },
        vaults: {
          v2: { pull: null },
        },
      },
    });
    await acl.stop();
  });
  test('transactional operations', async () => {
    const acl = new ACL({ db, logger });
    await acl.start();
    const p1 = acl.getNodePerms();
    const p2 = acl.transaction(async (acl) => {
      await acl.setNodesPerm(['g1-first', 'g1-second'] as Array<NodeId>, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });
      await acl.setNodesPerm(['g2-first', 'g2-second'] as Array<NodeId>, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });
      await acl.setVaultAction('v1' as VaultId, 'g1-first' as NodeId, 'pull');
      await acl.setVaultAction('v1' as VaultId, 'g2-first' as NodeId, 'clone');
      await acl.joinNodePerm(
        'g1-second' as NodeId,
        ['g1-third', 'g1-fourth'] as Array<NodeId>,
      );
      // V3 and v4 joins v1
      // this means v3 and v4 now has g1 and g2 permissions
      await acl.joinVaultPerms('v1' as VaultId, ['v3', 'v4'] as Array<VaultId>);
      // Removing v3
      await acl.unsetVaultPerms('v3' as VaultId);
      // Removing g1-second
      await acl.unsetNodePerm('g1-second' as NodeId);
      // Unsetting pull just for v1 for g1
      await acl.unsetVaultAction('v1' as VaultId, 'g1-first' as NodeId, 'pull');
      return await acl.getNodePerms();
    });
    const p3 = acl.getNodePerms();
    const results = await Promise.all([p1, p2, p3]);
    expect(results[0]).toEqual([]);
    expect(results[1]).toEqual([
      {
        'g1-first': {
          gestalt: {
            notify: null,
          },
          vaults: {
            v1: {},
            v4: { pull: null },
          },
        },
        'g1-fourth': {
          gestalt: {
            notify: null,
          },
          vaults: {
            v1: {},
            v4: { pull: null },
          },
        },
        'g1-third': {
          gestalt: {
            notify: null,
          },
          vaults: {
            v1: {},
            v4: { pull: null },
          },
        },
      },
      {
        'g2-first': {
          gestalt: {
            notify: null,
          },
          vaults: {
            v1: { clone: null },
            v4: { clone: null },
          },
        },
        'g2-second': {
          gestalt: {
            notify: null,
          },
          vaults: {
            v1: { clone: null },
            v4: { clone: null },
          },
        },
      },
    ]);
    // If p2 was executed ahead of p3
    // then results[2] would equal results[1]
    // if p3 was executed ahead of p2
    // then results[2] woudl equal []
    // the order of execution is not specified
    expect([results[1], []]).toContainEqual(results[2]);
    await acl.stop();
  });
});
