import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { NodeId } from '../../ids';
import type { NodeIdMessage, VaultsScanMessage } from './types';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as validationUtils from '../../validation/utils';
import { ServerHandler } from '../../rpc/handlers';

class VaultsScanHandler extends ServerHandler<
  {
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<VaultsScanMessage>
> {
  public async *handle(
    input: ClientRPCRequestParams<NodeIdMessage>,
  ): AsyncGenerator<ClientRPCResponseResult<VaultsScanMessage>> {
    const { vaultManager } = this.container;
    const {
      nodeId,
    }: {
      nodeId: NodeId;
    } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['nodeId'], () => validationUtils.parseNodeId(value)],
          () => value,
        );
      },
      {
        nodeId: input.nodeIdEncoded,
      },
    );
    for await (const {
      vaultIdEncoded,
      vaultName,
      vaultPermissions,
    } of vaultManager.scanVaults(nodeId)) {
      yield {
        vaultName,
        vaultIdEncoded,
        permissions: vaultPermissions,
      };
    }
  }
}

export { VaultsScanHandler };
