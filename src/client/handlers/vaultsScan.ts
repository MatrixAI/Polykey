import type { RPCRequestParams, RPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { NodeId } from '../../ids';
import type { NodeIdMessage, VaultsScanMessage } from './types';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as validationUtils from '../../validation/utils';
import { ServerCaller } from '../../RPC/callers';
import { ServerHandler } from '../../RPC/handlers';

const vaultsScan = new ServerCaller<
  RPCRequestParams<NodeIdMessage>,
  RPCResponseResult<VaultsScanMessage>
>();

class VaultsScanHandler extends ServerHandler<
  {
    vaultManager: VaultManager;
  },
  RPCRequestParams<NodeIdMessage>,
  RPCResponseResult<VaultsScanMessage>
> {
  public async *handle(
    input: RPCRequestParams<NodeIdMessage>,
  ): AsyncGenerator<RPCResponseResult<VaultsScanMessage>> {
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

export { vaultsScan, VaultsScanHandler };
