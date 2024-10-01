import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  ContentWithErrorMessage,
  SecretIdentifierMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import { DuplexHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';

class VaultsSecretsTouch extends DuplexHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<ContentWithErrorMessage>
> {
  public handle = async function* (
    input: AsyncIterable<ClientRPCRequestParams<SecretIdentifierMessage>>,
  ): AsyncGenerator<ClientRPCResponseResult<ContentWithErrorMessage>> {
    // still working on it
  };
}

export default VaultsSecretsTouch;
