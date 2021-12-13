import type { Permission } from '@/acl/types';
import type { NodeId } from '@/nodes/types';
import type { VaultAction, VaultId } from '@/vaults/types';
import type { GestaltAction } from '@/gestalts/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { utils as idUtils } from '@matrixai/id';
import { ACL, errors as aclErrors } from '@/acl';
import { utils as keysUtils } from '@/keys';
import { utils as vaultsUtils } from '@/vaults';

describe('ACL', () => {
  const logger = new Logger(`${ACL.name} Test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let db: DB;
  let vaultId1: VaultId;
  let vaultId2: VaultId;
  let vaultId3: VaultId;
  let vaultId4: VaultId;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const dbKey = await keysUtils.generateKey();
    const dbPath = `${dataDir}/db`;
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      }
    });
    vaultId1 = vaultsUtils.makeVaultId(idUtils.fromString('vault1xxxxxxxxxx'));
    vaultId2 = vaultsUtils.makeVaultId(idUtils.fromString('vault2xxxxxxxxxx'));
    vaultId3 = vaultsUtils.makeVaultId(idUtils.fromString('vault3xxxxxxxxxx'));
    vaultId4 = vaultsUtils.makeVaultId(idUtils.fromString('vault4xxxxxxxxxx'));
  });
  afterEach(async () => {
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('acl readiness', async () => {
    const acl = await ACL.createACL({
      db,
      logger,
    });
    await expect(async () => {
      await acl.destroy();
    }).rejects.toThrow(aclErrors.ErrorACLRunning);
    // Should be a noop
    await acl.start();
    await acl.stop();
    await acl.destroy();
    await expect(async () => {
      await acl.start();
    }).rejects.toThrow(aclErrors.ErrorACLDestroyed);
    await expect(
      acl.sameNodePerm('x' as NodeId, 'y' as NodeId),
    ).rejects.toThrow(aclErrors.ErrorACLNotRunning);
    await expect(acl.getNodePerms()).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.getVaultPerms()).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.getNodePerm('x' as NodeId)).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.getVaultPerm(1 as VaultId)).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(
      acl.setNodeAction('x' as NodeId, {} as GestaltAction),
    ).rejects.toThrow(aclErrors.ErrorACLNotRunning);
    await expect(
      acl.unsetNodeAction('x' as NodeId, {} as GestaltAction),
    ).rejects.toThrow(aclErrors.ErrorACLNotRunning);
    await expect(
      acl.setVaultAction(1 as VaultId, 'x' as NodeId, {} as VaultAction),
    ).rejects.toThrow(aclErrors.ErrorACLNotRunning);
    await expect(
      acl.unsetVaultAction(1 as VaultId, 'x' as NodeId, {} as VaultAction),
    ).rejects.toThrow(aclErrors.ErrorACLNotRunning);
    await expect(acl.setNodesPerm([], {} as Permission)).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.setNodesPermOps([], {} as Permission)).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(
      acl.setNodePerm('x' as NodeId, {} as Permission),
    ).rejects.toThrow(aclErrors.ErrorACLNotRunning);
    await expect(
      acl.setNodePermOps('x' as NodeId, {} as Permission),
    ).rejects.toThrow(aclErrors.ErrorACLNotRunning);
    await expect(acl.unsetNodePerm('x' as NodeId)).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.unsetNodePermOps('x' as NodeId)).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.unsetVaultPerms(1 as VaultId)).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.joinNodePerm('x' as NodeId, [])).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.joinNodePermOps('x' as NodeId, [])).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.joinVaultPerms(1 as VaultId, [])).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
  });
  test('trust and untrust gestalts', async () => {
    const acl = await ACL.createACL({ db, logger });
    // Gestalt 1
    await acl.setNodesPerm(['g1-first', 'g1-second'] as Array<NodeId>, {
      gestalt: {
        notify: null,
      },
      vaults: {
        vault1xxxxxxxxxx: { pull: null },
      },
    });
    // Gestalt2
    await acl.setNodesPerm(['g2-first', 'g2-second'] as Array<NodeId>, {
      gestalt: {
        notify: null,
      },
      vaults: {
        vault2xxxxxxxxxx: { clone: null },
      },
    });
    // Check g1 perm
    const g1Perm1 = await acl.getNodePerm('g1-first' as NodeId);
    const g1Perm2 = await acl.getNodePerm('g1-second' as NodeId);
    expect(g1Perm1).toBeDefined();
    expect(g1Perm1).toEqual(g1Perm2);
    expect(g1Perm1!.gestalt).toHaveProperty('notify');
    expect(g1Perm1!.vaults[vaultId1]).toHaveProperty('pull');
    // Check g2 perm
    const g2Perm = await acl.getNodePerm('g2-first' as NodeId);
    const g2Perm_ = await acl.getNodePerm('g2-second' as NodeId);
    expect(g2Perm).toBeDefined();
    expect(g2Perm).toEqual(g2Perm_);
    expect(g2Perm!.gestalt).toHaveProperty('notify');
    expect(g2Perm!.vaults[vaultId2]).toHaveProperty('clone');
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
    const acl = await ACL.createACL({ db, logger });
    // The node id must exist as a gestalt first
    await expect(() =>
      acl.setVaultAction(vaultId1, 'g1-1' as NodeId, 'pull'),
    ).rejects.toThrow(aclErrors.ErrorACLNodeIdMissing);
    await acl.setNodesPerm(['g1-1'] as Array<NodeId>, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    let vaultPerm: Record<NodeId, Permission>;
    await acl.setVaultAction(vaultId1, 'g1-1' as NodeId, 'pull');
    // Idempotent
    await acl.setVaultAction(vaultId1, 'g1-1' as NodeId, 'pull');
    vaultPerm = await acl.getVaultPerm(vaultId1);
    expect(vaultPerm['g1-1']).toEqual({
      gestalt: {
        notify: null,
      },
      vaults: {
        vault1xxxxxxxxxx: { pull: null },
      },
    });
    await acl.unsetVaultAction(vaultId1, 'g1-1' as NodeId, 'pull');
    // Idempotent
    await acl.unsetVaultAction(vaultId1, 'g1-1' as NodeId, 'pull');
    vaultPerm = await acl.getVaultPerm(vaultId1);
    expect(vaultPerm['g1-1']).toEqual({
      gestalt: {
        notify: null,
      },
      vaults: {
        vault1xxxxxxxxxx: {},
      },
    });
    await acl.setVaultAction(vaultId1, 'g1-1' as NodeId, 'pull');
    await acl.setVaultAction(vaultId1, 'g1-1' as NodeId, 'clone');
    vaultPerm = await acl.getVaultPerm(vaultId1);
    expect(vaultPerm['g1-1'].vaults[vaultId1]).toHaveProperty('pull');
    expect(vaultPerm['g1-1'].vaults[vaultId1]).toHaveProperty('clone');
    const vaultPerms = await acl.getVaultPerms();
    expect(vaultPerms).toEqual({
      vault1xxxxxxxxxx: {
        'g1-1': {
          gestalt: {
            notify: null,
          },
          vaults: {
            vault1xxxxxxxxxx: { pull: null, clone: null },
          },
        },
      },
    });
    await acl.stop();
  });
  test('joining existing gestalt permissions', async () => {
    const acl = await ACL.createACL({ db, logger });
    const g1Perm = {
      gestalt: {
        notify: null,
      },
      vaults: {
        vault1xxxxxxxxxx: { pull: null },
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
    const acl = await ACL.createACL({ db, logger });
    await acl.setNodesPerm(['g1-1'] as Array<NodeId>, {
      gestalt: {
        notify: null,
      },
      vaults: {
        vault1xxxxxxxxxx: { clone: null },
      },
    });
    await acl.setVaultAction(vaultId1, 'g1-1' as NodeId, 'pull');
    await acl.joinVaultPerms(vaultId1, [vaultId2, vaultId3]);
    const vaultPerm1 = await acl.getVaultPerm(vaultId1);
    const vaultPerm2 = await acl.getVaultPerm(vaultId2);
    const vaultPerm3 = await acl.getVaultPerm(vaultId3);
    expect(vaultPerm1).toEqual(vaultPerm2);
    expect(vaultPerm2).toEqual(vaultPerm3);
    expect(vaultPerm1['g1-1'].vaults[vaultId1]).toHaveProperty('clone');
    expect(vaultPerm1['g1-1'].vaults[vaultId1]).toHaveProperty('pull');
    const vaultPerms = await acl.getVaultPerms();
    expect(vaultPerms).toMatchObject({
      vault1xxxxxxxxxx: {
        'g1-1': {
          gestalt: {
            notify: null,
          },
          vaults: {
            vault1xxxxxxxxxx: { clone: null, pull: null },
            vault2xxxxxxxxxx: { clone: null, pull: null },
            vault3xxxxxxxxxx: { clone: null, pull: null },
          },
        },
      },
      vault2xxxxxxxxxx: {
        'g1-1': {
          gestalt: {
            notify: null,
          },
          vaults: {
            vault1xxxxxxxxxx: { clone: null, pull: null },
            vault2xxxxxxxxxx: { clone: null, pull: null },
            vault3xxxxxxxxxx: { clone: null, pull: null },
          },
        },
      },
      vault3xxxxxxxxxx: {
        'g1-1': {
          gestalt: {
            notify: null,
          },
          vaults: {
            vault1xxxxxxxxxx: { clone: null, pull: null },
            vault2xxxxxxxxxx: { clone: null, pull: null },
            vault3xxxxxxxxxx: { clone: null, pull: null },
          },
        },
      },
    });
    // Object identity for performance
    expect(vaultPerms[vaultId1]['g1-1']).toEqual(vaultPerms[vaultId2]['g1-1']);
    expect(vaultPerms[vaultId2]['g1-1']).toEqual(vaultPerms[vaultId3]['g1-1']);
    await acl.stop();
  });
  test('node removal', async () => {
    const acl = await ACL.createACL({ db, logger });
    const g1Perm = {
      gestalt: {
        notify: null,
      },
      vaults: {
        vault1xxxxxxxxxx: { pull: null },
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
    const acl = await ACL.createACL({ db, logger });
    const g1Perm = {
      gestalt: {
        notify: null,
      },
      vaults: {},
    };
    await acl.setNodesPerm(['g1-first', 'g1-second'] as Array<NodeId>, g1Perm);
    // V1 and v2 are pointing to the same gestalt
    // but using different node ids as the representative
    await acl.setVaultAction(vaultId1, 'g1-first' as NodeId, 'clone');
    await acl.setVaultAction(vaultId2, 'g1-second' as NodeId, 'pull');
    let vaultPerm;
    vaultPerm = await acl.getVaultPerm(vaultId2);
    expect(vaultPerm).toEqual({
      'g1-second': {
        gestalt: {
          notify: null,
        },
        vaults: {
          vault1xxxxxxxxxx: { clone: null },
          vault2xxxxxxxxxx: { pull: null },
        },
      },
    });
    // V1 gets removed
    await acl.unsetVaultPerms(vaultId1);
    vaultPerm = await acl.getVaultPerm(vaultId2);
    expect(vaultPerm).toEqual({
      'g1-second': {
        gestalt: {
          notify: null,
        },
        vaults: {
          vault2xxxxxxxxxx: { pull: null },
        },
      },
    });
    await acl.stop();
  });
  test('transactional operations', async () => {
    const acl = await ACL.createACL({ db, logger });
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
      await acl.setVaultAction(vaultId1, 'g1-first' as NodeId, 'pull');
      await acl.setVaultAction(vaultId1, 'g2-first' as NodeId, 'clone');
      await acl.joinNodePerm(
        'g1-second' as NodeId,
        ['g1-third', 'g1-fourth'] as Array<NodeId>,
      );
      // V3 and v4 joins v1
      // this means v3 and v4 now has g1 and g2 permissions
      await acl.joinVaultPerms(vaultId1, [vaultId3, vaultId4]);
      // Removing v3
      await acl.unsetVaultPerms(vaultId3);
      // Removing g1-second
      await acl.unsetNodePerm('g1-second' as NodeId);
      // Unsetting pull just for v1 for g1
      await acl.unsetVaultAction(vaultId1, 'g1-first' as NodeId, 'pull');
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
            vault1xxxxxxxxxx: {},
            vault4xxxxxxxxxx: { pull: null },
          },
        },
        'g1-fourth': {
          gestalt: {
            notify: null,
          },
          vaults: {
            vault1xxxxxxxxxx: {},
            vault4xxxxxxxxxx: { pull: null },
          },
        },
        'g1-third': {
          gestalt: {
            notify: null,
          },
          vaults: {
            vault1xxxxxxxxxx: {},
            vault4xxxxxxxxxx: { pull: null },
          },
        },
      },
      {
        'g2-first': {
          gestalt: {
            notify: null,
          },
          vaults: {
            vault1xxxxxxxxxx: { clone: null },
            vault4xxxxxxxxxx: { clone: null },
          },
        },
        'g2-second': {
          gestalt: {
            notify: null,
          },
          vaults: {
            vault1xxxxxxxxxx: { clone: null },
            vault4xxxxxxxxxx: { clone: null },
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
