import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodeIdMessage,
  VaultsScanMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { NodeId } from '../../ids';
import { ServerHandler } from '@matrixai/rpc';
import * as ids from '../../ids';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';

class VaultsScan extends ServerHandler<
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
          [['nodeId'], () => ids.parseNodeId(value)],
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

export default VaultsScan;
