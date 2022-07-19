import type { Host, Port } from '@/network/types';
import type { ClaimData } from '@/claims/types';
import type { IdentityId, ProviderId } from '@/identities/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientAgent from '@/agent/GRPCClientAgent';
import { AgentServiceService } from '@/proto/js/polykey/v1/agent_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as nodesUtils from '@/nodes/utils';
import nodesChainDataGet from '@/agent/service/nodesChainDataGet';
import * as testNodesUtils from '../../nodes/utils';
import { globalRootKeyPems } from '../../globalRootKeyPems';

describe('nodesChainDataGet', () => {
  const logger = new Logger('nodesChainDataGet test', LogLevel.WARN, [
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
    const agentService = {
      nodesChainDataGet: nodesChainDataGet({
        sigchain: pkAgent.sigchain,
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
  }, global.defaultTimeout);
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
  test('should get closest nodes', async () => {
    const srcNodeIdEncoded = nodesUtils.encodeNodeId(
      pkAgent.keyManager.getNodeId(),
    );
    // Add 10 claims
    for (let i = 1; i <= 5; i++) {
      const node2 = nodesUtils.encodeNodeId(
        testNodesUtils.generateRandomNodeId(),
      );
      const nodeLink: ClaimData = {
        type: 'node',
        node1: srcNodeIdEncoded,
        node2: node2,
      };
      await pkAgent.sigchain.addClaim(nodeLink);
    }
    for (let i = 6; i <= 10; i++) {
      const identityLink: ClaimData = {
        type: 'identity',
        node: srcNodeIdEncoded,
        provider: ('ProviderId' + i.toString()) as ProviderId,
        identity: ('IdentityId' + i.toString()) as IdentityId,
      };
      await pkAgent.sigchain.addClaim(identityLink);
    }

    const response = await grpcClient.nodesChainDataGet(
      new utilsPB.EmptyMessage(),
    );
    const chainIds: Array<string> = [];
    for (const [id] of response.toObject().chainDataMap) chainIds.push(id);
    expect(chainIds).toHaveLength(10);
  });
});
