import type { ContextTimed } from '@matrixai/contexts';
import type { JSONValue } from '@matrixai/rpc';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodeIdMessage,
  VaultsScanMessage,
} from '../types';
import type { NodeId } from '../../ids';
import type VaultManager from '../../vaults/VaultManager';
import { ServerHandler } from '@matrixai/rpc';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as ids from '../../ids';

class VaultsScan extends ServerHandler<
  {
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<VaultsScanMessage>
> {
  public handle = async function* (
    input: ClientRPCRequestParams<NodeIdMessage>,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<VaultsScanMessage>> {
    const { vaultManager }: { vaultManager: VaultManager } = this.container;
    const { nodeId }: { nodeId: NodeId } = validateSync(
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
    } of vaultManager.scanVaults(nodeId, ctx)) {
      ctx.signal.throwIfAborted();
      yield {
        vaultName: vaultName,
        vaultIdEncoded: vaultIdEncoded,
        permissions: vaultPermissions,
      };
    }
  };
}

export default VaultsScan;
