import type { Host, Port } from '@/network/types';
import type { NodeIdEncoded } from '@/nodes/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientAgent from '@/agent/GRPCClientAgent';
import { AgentServiceService } from '@/proto/js/polykey/v1/agent_service_grpc_pb';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import * as nodesUtils from '@/nodes/utils';
import nodesClosestLocalNodesGet from '@/agent/service/nodesClosestLocalNodesGet';
import * as testNodesUtils from '../../nodes/utils';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';

describe('nodesClosestLocalNode', () => {
  const logger = new Logger('nodesClosestLocalNode test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  let dataDir: string;
  let nodePath: string;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientAgent;
  let pkAgent: PolykeyAgent;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'keynode');
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[0],
      },
      seedNodes: {}, // Explicitly no seed nodes on startup
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
      },
      logger,
    });
    // Setting up a remote keynode
    const agentService = {
      nodesClosestLocalNodesGet: nodesClosestLocalNodesGet({
        nodeGraph: pkAgent.nodeGraph,
        db: pkAgent.db,
        logger,
      }),
    };
    grpcServer = new GRPCServer({ logger });
    await grpcServer.start({
      services: [[AgentServiceService, agentService]],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
    });
    grpcClient = await GRPCClientAgent.createGRPCClientAgent({
      nodeId: pkAgent.keyManager.getNodeId(),
      host: '127.0.0.1' as Host,
      port: grpcServer.getPort(),
      logger,
    });
  }, globalThis.defaultTimeout);
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await pkAgent.stop();
    await pkAgent.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('should get closest local nodes', async () => {
    // Adding 10 nodes
    const nodes: Array<NodeIdEncoded> = [];
    for (let i = 0; i < 10; i++) {
      const nodeId = testNodesUtils.generateRandomNodeId();
      await pkAgent.nodeGraph.setNode(nodeId, {
        host: 'localhost' as Host,
        port: 55555 as Port,
      });
      nodes.push(nodesUtils.encodeNodeId(nodeId));
    }
    const nodeIdEncoded = nodesUtils.encodeNodeId(
      testNodesUtils.generateRandomNodeId(),
    );
    const nodeMessage = new nodesPB.Node();
    nodeMessage.setNodeId(nodeIdEncoded);
    const result = await grpcClient.nodesClosestLocalNodesGet(nodeMessage);
    const resultNodes: Array<NodeIdEncoded> = [];
    for (const [resultNode] of result.toObject().nodeTableMap) {
      resultNodes.push(resultNode as NodeIdEncoded);
    }
    expect(nodes.sort()).toEqual(resultNodes.sort());
  });
});
