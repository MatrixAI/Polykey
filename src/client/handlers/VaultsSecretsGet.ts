import type { DB } from '@matrixai/db';
import type { JSONObject, JSONRPCRequest } from '@matrixai/rpc';
import type VaultManager from '../../vaults/VaultManager';
import { ReadableStream } from 'stream/web';
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
  ): Promise<[JSONObject, ReadableStream<Uint8Array>]> => {
    const { vaultManager, db } = this.container;
    const [headerMessage, inputStream] = input;
    const params = headerMessage.params;
    await inputStream.cancel();

    if (params == null) {
      throw new validationErrors.ErrorParse('Input params cannot be undefined');
    }

    const {
      nameOrId,
      secretNames,
    }: { nameOrId: string; secretNames: Array<string> } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [
            ['nameOrId'],
            () => {
              if (typeof value != 'string') {
                throw new validationErrors.ErrorParse(
                  'Parameter must be of type string',
                );
              }
              return value as string;
            },
          ],
          [
            ['secretNames'],
            () => {
              if (
                !Array.isArray(value) ||
                value.length === 0 ||
                !value.every((v) => typeof v === 'string')
              ) {
                throw new validationErrors.ErrorParse(
                  'Parameter must be a non-empty array of strings',
                );
              }
              return value as Array<string>;
            },
          ],
          () => value,
        );
      },
      {
        nameOrId: params.nameOrId,
        secretNames: params.secretNames,
      },
    );
    const testGen = db.withTransactionG(async function* (tran): AsyncGenerator<
      Uint8Array,
      void,
      void
    > {
      const vaultIdFromName = await vaultManager.getVaultId(nameOrId, tran);
      const vaultId = vaultIdFromName ?? vaultsUtils.decodeVaultId(nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }
      // Get secret contents
      yield* vaultManager.withVaultsG(
        [vaultId],
        (vault) => {
          return vault.readG(async function* (fs): AsyncGenerator<
            Uint8Array,
            void,
            void
          > {
            const contents = fileTree.serializerStreamFactory(fs, secretNames);
            for await (const chunk of contents) yield chunk;
          });
        },
        tran,
      );
    });

    try {
      console.log(await testGen.next());
    } catch (e) {
      console.error(e);
    } finally {
      console.log('out of test block');
    }

    const secretContentsGen = db.withTransactionG(
      async function* (tran): AsyncGenerator<Uint8Array, void, void> {
        const vaultIdFromName = await vaultManager.getVaultId(nameOrId, tran);
        const vaultId = vaultIdFromName ?? vaultsUtils.decodeVaultId(nameOrId);
        if (vaultId == null) {
          throw new vaultsErrors.ErrorVaultsVaultUndefined();
        }
        // Get secret contents
        yield* vaultManager.withVaultsG(
          [vaultId],
          (vault) => {
            return vault.readG(async function* (fs): AsyncGenerator<
              Uint8Array,
              void,
              void
            > {
              const contents = fileTree.serializerStreamFactory(
                fs,
                secretNames,
              );
              for await (const chunk of contents) yield chunk;
            });
          },
          tran,
        );
      },
    );

    return [{}, utils.asyncGeneratorToStream(secretContentsGen)];
  };
}

export default VaultsSecretsGet;
