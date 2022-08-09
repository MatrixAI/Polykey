import type { Permission } from '@/acl/types';
import type { NodeId } from '@/nodes/types';
import type { VaultAction, VaultId } from '@/vaults/types';
import type { GestaltAction } from '@/gestalts/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import ACL from '@/acl/ACL';
import * as aclErrors from '@/acl/errors';
import * as keysUtils from '@/keys/utils';
import * as vaultsUtils from '@/vaults/utils';
import * as testNodesUtils from '../nodes/utils';

describe(ACL.name, () => {
  const logger = new Logger(`${ACL.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);

  // Node Ids
  const nodeIdX = testNodesUtils.generateRandomNodeId();
  const nodeIdY = testNodesUtils.generateRandomNodeId();
  const nodeIdG1First = testNodesUtils.generateRandomNodeId();
  const nodeIdG1Second = testNodesUtils.generateRandomNodeId();
  const nodeIdG1Third = testNodesUtils.generateRandomNodeId();
  const nodeIdG1Fourth = testNodesUtils.generateRandomNodeId();
  const nodeIdG2First = testNodesUtils.generateRandomNodeId();
  const nodeIdG2Second = testNodesUtils.generateRandomNodeId();

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
      // @ts-ignore - version of js-logger is incompatible (remove when EFS logger updates to 3.*)
      logger,
      crypto: {
        key: dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
    vaultId1 = vaultsUtils.generateVaultId();
    vaultId2 = vaultsUtils.generateVaultId();
    vaultId3 = vaultsUtils.generateVaultId();
    vaultId4 = vaultsUtils.generateVaultId();
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
    await expect(acl.sameNodePerm(nodeIdX, nodeIdY)).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.getNodePerms()).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.getVaultPerms()).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.getNodePerm(nodeIdX)).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.getVaultPerm(1 as VaultId)).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(
      acl.setNodeAction(nodeIdX, {} as GestaltAction),
    ).rejects.toThrow(aclErrors.ErrorACLNotRunning);
    await expect(
      acl.unsetNodeAction(nodeIdX, {} as GestaltAction),
    ).rejects.toThrow(aclErrors.ErrorACLNotRunning);
    await expect(
      acl.setVaultAction(1 as VaultId, nodeIdX, {} as VaultAction),
    ).rejects.toThrow(aclErrors.ErrorACLNotRunning);
    await expect(
      acl.unsetVaultAction(1 as VaultId, nodeIdX, {} as VaultAction),
    ).rejects.toThrow(aclErrors.ErrorACLNotRunning);
    await expect(acl.setNodesPerm([], {} as Permission)).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.setNodePerm(nodeIdX, {} as Permission)).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.unsetNodePerm(nodeIdX)).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.unsetVaultPerms(1 as VaultId)).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.joinNodePerm(nodeIdX, [])).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
    await expect(acl.joinVaultPerms(1 as VaultId, [])).rejects.toThrow(
      aclErrors.ErrorACLNotRunning,
    );
  });
  test('trust and untrust gestalts', async () => {
    const acl = await ACL.createACL({ db, logger });
    // Gestalt 1
    await acl.setNodesPerm([nodeIdG1First, nodeIdG1Second] as Array<NodeId>, {
      gestalt: {
        notify: null,
      },
      vaults: {
        [vaultId1]: { pull: null },
      },
    });
    // Gestalt2
    await acl.setNodesPerm([nodeIdG2First, nodeIdG2Second] as Array<NodeId>, {
      gestalt: {
        notify: null,
      },
      vaults: {
        [vaultId2]: { clone: null },
      },
    });
    // Check g1 perm
    const g1Perm1 = await acl.getNodePerm(nodeIdG1First);
    const g1Perm2 = await acl.getNodePerm(nodeIdG1Second);
    expect(g1Perm1).toBeDefined();
    expect(g1Perm1).toEqual(g1Perm2);
    expect(g1Perm1!.gestalt).toHaveProperty('notify');
    expect(g1Perm1!.vaults[vaultId1]).toHaveProperty('pull');
    // Check g2 perm
    const g2Perm = await acl.getNodePerm(nodeIdG2First);
    const g2Perm_ = await acl.getNodePerm(nodeIdG2Second);
    expect(g2Perm).toBeDefined();
    expect(g2Perm).toEqual(g2Perm_);
    expect(g2Perm!.gestalt).toHaveProperty('notify');
    expect(g2Perm!.vaults[vaultId2]).toHaveProperty('clone');
    // Make g1 permission untrusted
    const g1PermNew = {
      ...g1Perm1!,
      gestalt: {},
    };
    await acl.setNodePerm(nodeIdG1First, g1PermNew);
    // Check that g1-second also gets the same permission
    const g1Perm3 = await acl.getNodePerm(nodeIdG1Second);
    expect(g1Perm3).toEqual(g1PermNew);
    const nodePerms = await acl.getNodePerms();
    expect(nodePerms).toContainEqual({
      [nodeIdG1First]: g1PermNew,
      [nodeIdG1Second]: g1PermNew,
    });
    expect(nodePerms).toContainEqual({
      [nodeIdG2First]: g2Perm,
      [nodeIdG2Second]: g2Perm,
    });
    // Check that the permission object is identical
    // this should be a performance optimisation
    expect(nodePerms[0][nodeIdG1First]).toBe(nodePerms[0][nodeIdG1Second]);
    await acl.stop();
  });
  test('setting and unsetting vault actions', async () => {
    const acl = await ACL.createACL({ db, logger });
    // The node id must exist as a gestalt first
    await expect(() =>
      acl.setVaultAction(vaultId1, nodeIdG1First, 'pull'),
    ).rejects.toThrow(aclErrors.ErrorACLNodeIdMissing);
    await acl.setNodesPerm([nodeIdG1First] as Array<NodeId>, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    let vaultPerm: Record<NodeId, Permission>;
    await acl.setVaultAction(vaultId1, nodeIdG1First, 'pull');
    // Idempotent
    await acl.setVaultAction(vaultId1, nodeIdG1First, 'pull');
    vaultPerm = await acl.getVaultPerm(vaultId1);
    expect(vaultPerm[nodeIdG1First]).toEqual({
      gestalt: {
        notify: null,
      },
      vaults: {
        [vaultId1]: { pull: null },
      },
    });
    await acl.unsetVaultAction(vaultId1, nodeIdG1First, 'pull');
    // Idempotent
    await acl.unsetVaultAction(vaultId1, nodeIdG1First, 'pull');
    vaultPerm = await acl.getVaultPerm(vaultId1);
    expect(vaultPerm[nodeIdG1First]).toEqual({
      gestalt: {
        notify: null,
      },
      vaults: {
        [vaultId1]: {},
      },
    });
    await acl.setVaultAction(vaultId1, nodeIdG1First, 'pull');
    await acl.setVaultAction(vaultId1, nodeIdG1First, 'clone');
    vaultPerm = await acl.getVaultPerm(vaultId1);
    expect(vaultPerm[nodeIdG1First].vaults[vaultId1]).toHaveProperty('pull');
    expect(vaultPerm[nodeIdG1First].vaults[vaultId1]).toHaveProperty('clone');
    const vaultPerms = await acl.getVaultPerms();
    expect(vaultPerms).toEqual({
      [vaultId1]: {
        [nodeIdG1First]: {
          gestalt: {
            notify: null,
          },
          vaults: {
            [vaultId1]: { pull: null, clone: null },
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
        [vaultId1]: { pull: null },
      },
    };
    await acl.setNodesPerm(
      [nodeIdG1First, nodeIdG1Second] as Array<NodeId>,
      g1Perm,
    );
    await acl.joinNodePerm(nodeIdG1Second, [
      nodeIdG1Third,
      nodeIdG1Fourth,
    ] as Array<NodeId>);
    const nodePerm = await acl.getNodePerm(nodeIdG1Fourth);
    expect(nodePerm).toEqual(g1Perm);
    const nodePerms = await acl.getNodePerms();
    expect(nodePerms).toEqual([
      {
        [nodeIdG1First]: g1Perm,
        [nodeIdG1Second]: g1Perm,
        [nodeIdG1Third]: g1Perm,
        [nodeIdG1Fourth]: g1Perm,
      },
    ]);
    await acl.stop();
  });
  test('joining existing vault permissions', async () => {
    const acl = await ACL.createACL({ db, logger });
    await acl.setNodesPerm([nodeIdG1First] as Array<NodeId>, {
      gestalt: {
        notify: null,
      },
      vaults: {
        [vaultId1]: { clone: null },
      },
    });
    await acl.setVaultAction(vaultId1, nodeIdG1First, 'pull');
    await acl.joinVaultPerms(vaultId1, [vaultId2, vaultId3]);
    const vaultPerm1 = await acl.getVaultPerm(vaultId1);
    const vaultPerm2 = await acl.getVaultPerm(vaultId2);
    const vaultPerm3 = await acl.getVaultPerm(vaultId3);
    expect(vaultPerm1).toEqual(vaultPerm2);
    expect(vaultPerm2).toEqual(vaultPerm3);
    expect(vaultPerm1[nodeIdG1First].vaults[vaultId1]).toHaveProperty('clone');
    expect(vaultPerm1[nodeIdG1First].vaults[vaultId1]).toHaveProperty('pull');
    const vaultPerms = await acl.getVaultPerms();
    expect(vaultPerms).toMatchObject({
      [vaultId1]: {
        [nodeIdG1First]: {
          gestalt: {
            notify: null,
          },
          vaults: {
            [vaultId1]: { clone: null, pull: null },
            [vaultId2]: { clone: null, pull: null },
            [vaultId3]: { clone: null, pull: null },
          },
        },
      },
      [vaultId2]: {
        [nodeIdG1First]: {
          gestalt: {
            notify: null,
          },
          vaults: {
            [vaultId1]: { clone: null, pull: null },
            [vaultId2]: { clone: null, pull: null },
            [vaultId3]: { clone: null, pull: null },
          },
        },
      },
      [vaultId3]: {
        [nodeIdG1First]: {
          gestalt: {
            notify: null,
          },
          vaults: {
            [vaultId1]: { clone: null, pull: null },
            [vaultId2]: { clone: null, pull: null },
            [vaultId3]: { clone: null, pull: null },
          },
        },
      },
    });
    // Object identity for performance
    expect(vaultPerms[vaultId1][nodeIdG1First]).toEqual(
      vaultPerms[vaultId2][nodeIdG1First],
    );
    expect(vaultPerms[vaultId2][nodeIdG1First]).toEqual(
      vaultPerms[vaultId3][nodeIdG1First],
    );
    await acl.stop();
  });
  test('node removal', async () => {
    const acl = await ACL.createACL({ db, logger });
    const g1Perm = {
      gestalt: {
        notify: null,
      },
      vaults: {
        [vaultId1]: { pull: null },
      },
    };
    await acl.setNodesPerm(
      [nodeIdG1First, nodeIdG1Second] as Array<NodeId>,
      g1Perm,
    );
    await acl.unsetNodePerm(nodeIdG1First);
    expect(await acl.getNodePerm(nodeIdG1First)).toBeUndefined();
    const g1Perm_ = await acl.getNodePerm(nodeIdG1Second);
    expect(g1Perm_).toEqual(g1Perm);
    await acl.unsetNodePerm(nodeIdG1Second);
    expect(await acl.getNodePerm(nodeIdG1Second)).toBeUndefined();
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
    await acl.setNodesPerm(
      [nodeIdG1First, nodeIdG1Second] as Array<NodeId>,
      g1Perm,
    );
    // V1 and v2 are pointing to the same gestalt
    // but using different node ids as the representative
    await acl.setVaultAction(vaultId1, nodeIdG1First, 'clone');
    await acl.setVaultAction(vaultId2, nodeIdG1Second, 'pull');
    let vaultPerm;
    vaultPerm = await acl.getVaultPerm(vaultId2);
    expect(vaultPerm).toEqual({
      [nodeIdG1Second]: {
        gestalt: {
          notify: null,
        },
        vaults: {
          [vaultId1]: { clone: null },
          [vaultId2]: { pull: null },
        },
      },
    });
    // V1 gets removed
    await acl.unsetVaultPerms(vaultId1);
    vaultPerm = await acl.getVaultPerm(vaultId2);
    expect(vaultPerm).toEqual({
      [nodeIdG1Second]: {
        gestalt: {
          notify: null,
        },
        vaults: {
          [vaultId2]: { pull: null },
        },
      },
    });
    await acl.stop();
  });
  test('transactional operations', async () => {
    const acl = await ACL.createACL({ db, logger });
    const p1 = acl.getNodePerms();
    const p2 = db.withTransactionF(async (tran) => {
      await acl.setNodesPerm(
        [nodeIdG1First, nodeIdG1Second] as Array<NodeId>,
        {
          gestalt: {
            notify: null,
          },
          vaults: {},
        },
        tran,
      );
      await acl.setNodesPerm(
        [nodeIdG2First, nodeIdG2Second] as Array<NodeId>,
        {
          gestalt: {
            notify: null,
          },
          vaults: {},
        },
        tran,
      );
      await acl.setVaultAction(vaultId1, nodeIdG1First, 'pull', tran);
      await acl.setVaultAction(vaultId1, nodeIdG2First, 'clone', tran);
      await acl.joinNodePerm(
        nodeIdG1Second,
        [nodeIdG1Third, nodeIdG1Fourth] as Array<NodeId>,
        undefined,
        tran,
      );
      // V3 and v4 joins v1
      // this means v3 and v4 now has g1 and g2 permissions
      await acl.joinVaultPerms(vaultId1, [vaultId3, vaultId4], tran);
      // Removing v3
      await acl.unsetVaultPerms(vaultId3, tran);
      // Removing g1-second
      await acl.unsetNodePerm(nodeIdG1Second, tran);
      // Unsetting pull just for v1 for g1
      await acl.unsetVaultAction(vaultId1, nodeIdG1First, 'pull', tran);
      return await acl.getNodePerms(tran);
    });
    const p3 = acl.getNodePerms();
    const results = await Promise.all([p1, p2, p3]);
    expect(results[0]).toEqual([]);
    expect(results[1]).toContainEqual({
      [nodeIdG1First]: {
        gestalt: {
          notify: null,
        },
        vaults: {
          [vaultId1]: {},
          [vaultId4]: { pull: null },
        },
      },
      [nodeIdG1Fourth]: {
        gestalt: {
          notify: null,
        },
        vaults: {
          [vaultId1]: {},
          [vaultId4]: { pull: null },
        },
      },
      [nodeIdG1Third]: {
        gestalt: {
          notify: null,
        },
        vaults: {
          [vaultId1]: {},
          [vaultId4]: { pull: null },
        },
      },
    });
    expect(results[1]).toContainEqual({
      [nodeIdG2First]: {
        gestalt: {
          notify: null,
        },
        vaults: {
          [vaultId1]: { clone: null },
          [vaultId4]: { clone: null },
        },
      },
      [nodeIdG2Second]: {
        gestalt: {
          notify: null,
        },
        vaults: {
          [vaultId1]: { clone: null },
          [vaultId4]: { clone: null },
        },
      },
    });
    // If p2 was executed ahead of p3
    // then results[2] would equal results[1]
    // if p3 was executed ahead of p2
    // then results[2] woudl equal []
    // the order of execution is not specified
    expect([results[1], []]).toContainEqual(results[2]);
    await acl.stop();
  });
});
