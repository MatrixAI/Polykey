import type { DB } from '@matrixai/db';
import type { Permission } from '@/acl/types';
import type { NodeId, VaultId } from '@/ids/types';
import fc from 'fast-check';
import Logger, { LogLevel } from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import ACL from '@/acl/ACL';
import * as testsGestaltsUtils from '../gestalts/utils';
import * as testsVaultsUtils from '../vaults/utils';
import * as testsIdsUtils from '../ids/utils';

const permissionArb = (vaultIds: Array<VaultId> = []) =>
  fc.record({
    gestalt: testsGestaltsUtils.gestaltActionsArb(),
    vaults:
      vaultIds.length < 1
        ? fc.constant({})
        : fc.dictionary(
            fc.constantFrom(...vaultIds.map((id) => id.toString())),
            testsVaultsUtils.vaultActionsArb,
            {
              minKeys: vaultIds.length,
              maxKeys: vaultIds.length,
            },
          ),
  }) as fc.Arbitrary<Permission>;

const aclFactoryArb = (vaultIds: Array<VaultId> = []) => {
  return fc
    .record({
      nodes: fc.dictionary(
        testsIdsUtils.nodeIdStringArb,
        permissionArb(vaultIds),
      ),
    })
    .map(({ nodes }) => {
      const logger = new Logger(undefined, LogLevel.SILENT);
      return async (db: DB) => {
        const acl = await ACL.createACL({ db, logger, fresh: true });
        for (const nodeIdString in nodes) {
          const nodeId = IdInternal.fromString<NodeId>(nodeIdString);
          const permission = nodes[nodeIdString];
          await acl.setNodePerm(nodeId, permission);
          for (const vaultIdString in permission.vaults) {
            const vaultId = IdInternal.fromString<VaultId>(vaultIdString);
            const vaultActions = permission.vaults[vaultIdString].keys();
            for (const vaultAction of vaultActions) {
              await acl.setVaultAction(vaultId, nodeId, vaultAction);
            }
          }
        }
        return acl;
      };
    });
};

export { permissionArb, aclFactoryArb };
