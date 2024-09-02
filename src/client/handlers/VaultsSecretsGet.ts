import type { DB } from '@matrixai/db';
import type { JSONObject, JSONRPCRequest } from '@matrixai/rpc';
import type VaultManager from '../../vaults/VaultManager';
import { RawHandler } from '@matrixai/rpc';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import { fileTree } from '../../vaults';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as validationErrors from '../../validation/errors';
import * as utils from '../../utils';

class VaultsSecretsGet extends RawHandler<{
  vaultManager: VaultManager;
  db: DB;
}> {
  public handle = async (
    input: [JSONRPCRequest, ReadableStream<Uint8Array>],
    _cancel: any,
    _ctx: any,
  ): Promise<[JSONObject, ReadableStream<Uint8Array>]> => {
    const { vaultManager, db } = this.container;
    const [headerMessage, inputStream] = input;
    const params = headerMessage.params;
    inputStream.cancel(); // Close input stream as it's useless for this call

    if (params == undefined)
      throw new validationErrors.ErrorParse('Input params cannot be undefined');

    const { nameOrId, secretName }: { nameOrId: string; secretName: string } =
      validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [
              ['nameOrId', 'secretName'],
              () => {
                return value as string;
              },
            ],
            () => value,
          );
        },
        {
          nameOrId: params.vaultNameOrId,
          secretName: params.secretName,
        },
      );
    const secretContentsGen = db.withTransactionG(
      async function* (tran): AsyncGenerator<Uint8Array, void, void> {
        const vaultIdFromName = await vaultManager.getVaultId(nameOrId, tran);
        const vaultId = vaultIdFromName ?? vaultsUtils.decodeVaultId(nameOrId);
        if (vaultId == null) {
          throw new vaultsErrors.ErrorVaultsVaultUndefined();
        }

        // Get secret contents
        yield* vaultManager.withVaultsG([vaultId], (vault) => {
          return vault.readG(async function* (fs): AsyncGenerator<
            Uint8Array,
            void,
            void
          > {
            const contents = fileTree.serializerStreamFactory(
              fs,
              fileTree.globWalk({
                fs: fs,
                basePath: '.',
                pattern: secretName,
                yieldRoot: false,
                yieldStats: false,
                yieldFiles: true,
                yieldParents: false,
                yieldDirectories: false,
              }),
            );
            for await (const chunk of contents) {
              yield chunk;
            }
          });
        });
      },
    );

    return [{}, utils.asyncGeneratorToStream(secretContentsGen)];
  };
}

export default VaultsSecretsGet;
