import type { NodeIdMessage, VaultsScanMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { NodeId } from '../../ids';
import { ServerHandler } from '@matrixai/rpc';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils';

class VaultsScanHandler extends ServerHandler<
  {
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<VaultsScanMessage>
> {
  public async *handle(
    input: ClientRPCRequestParams<NodeIdMessage>,
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<VaultsScanMessage>> {
    if (ctx.signal.aborted) throw ctx.signal.reason;
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
      if (ctx.signal.aborted) throw ctx.signal.reason;
      yield {
        vaultName,
        vaultIdEncoded,
        permissions: vaultPermissions,
      };
    }
  }
}

export { VaultsScanHandler };
