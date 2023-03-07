import type { RPCRequestParams, RPCResponseResult } from '../types';
import type KeyRing from 'keys/KeyRing';
import type { NodeId } from '../../ids';
import type NodeGraph from '../../nodes/NodeGraph';
import type { NodesGetMessage } from '../handlers/types';
import { IdInternal } from '@matrixai/id';
import * as nodesUtils from '../../nodes/utils';
import { ServerCaller } from '../../RPC/callers';
import { ServerHandler } from '../../RPC/handlers';

const nodesGetAll = new ServerCaller<
  RPCRequestParams,
  RPCResponseResult<NodesGetMessage>
>();

class NodesGetAllHandler extends ServerHandler<
  {
    nodeGraph: NodeGraph;
    keyRing: KeyRing;
  },
  RPCRequestParams,
  RPCResponseResult<NodesGetMessage>
> {
  public async *handle(): AsyncGenerator<RPCResponseResult<NodesGetMessage>> {
    const { nodeGraph, keyRing } = this.container;

    for await (const bucket of nodeGraph.getBuckets()) {
      let index;
      for (const id of Object.keys(bucket)) {
        const encodedId = nodesUtils.encodeNodeId(
          IdInternal.fromString<NodeId>(id),
        );
        // For every node in every bucket, add it to our message
        if (!index) {
          index = nodesUtils.bucketIndex(
            keyRing.getNodeId(),
            IdInternal.fromString<NodeId>(id),
          );
        }
        yield {
          bucketIndex: index,
          nodeIdEncoded: encodedId,
          host: bucket[id].address.host,
          port: bucket[id].address.port,
        };
      }
    }
  }
}

export { nodesGetAll, NodesGetAllHandler };
