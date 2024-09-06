import type { DB } from '@matrixai/db';
import type VaultManager from '../../vaults/VaultManager';
import { ReadableStream } from 'stream/web';
import { JSONObject, JSONRPCRequest, RawHandler } from '@matrixai/rpc';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import { fileTree } from '../../vaults';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import * as validationErrors from '../../validation/errors';
import { ContentNode } from '@/vaults/types';

class VaultsSecretsEdit extends RawHandler<{
  vaultManager: VaultManager;
  db: DB;
}> {
  public handle = async (
    input: [JSONRPCRequest, ReadableStream<Uint8Array>],
  ): Promise<[JSONObject, ReadableStream<Uint8Array>]> => {
    const { vaultManager, db } = this.container;
    const [headerMessage, secretContentStream] = input;
    const params = headerMessage.params;

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

    const data: Array<ContentNode | Uint8Array> = [];
    const dataStream = secretContentStream.pipeThrough(
      fileTree.parserTransformStreamFactory(),
    );
    for await (const chunk of dataStream) data.push(chunk);
    const secretContents = data
      .filter((v) => v instanceof Uint8Array)
      .map((v) => Buffer.from(v as Uint8Array).toString());

    await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(nameOrId, tran);
      const vaultId = vaultIdFromName ?? vaultsUtils.decodeVaultId(nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }

      await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          for (let i = 0; i < secretNames.length; i++) {
            const name = secretNames[i];
            const content = secretContents[i];
            await vaultOps.updateSecret(vault, name, content);
          }
        },
        tran,
      );
    });
    return [{ success: true }, new ReadableStream()];
  };
}

export default VaultsSecretsEdit;
