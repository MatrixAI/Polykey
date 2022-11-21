import type { Host, Port } from '@/network/types';
import type { IdentityId, ProviderId } from '@/identities/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientAgent from '@/agent/GRPCClientAgent';
import { AgentServiceService } from '@/proto/js/polykey/v1/agent_service_grpc_pb';
import * as nodesUtils from '@/nodes/utils';
import nodesChainDataGet from '@/agent/service/nodesChainDataGet';
import { encodeProviderIdentityId } from '@/identities/utils';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import * as testNodesUtils from '../../nodes/utils';
import * as keysUtils from '../../../src/keys/utils/index';

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
      seedNodes: {}, // Explicitly no seed nodes on startup
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
      },
      keyRingConfig: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
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
      nodeId: pkAgent.keyRing.getNodeId(),
      host: '127.0.0.1' as Host,
      port: grpcServer.getPort(),
      logger,
    });
  }, globalThis.defaultTimeout);
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('Should get chain data', async () => {
    const srcNodeIdEncoded = nodesUtils.encodeNodeId(
      pkAgent.keyRing.getNodeId(),
    );
    // Add 10 claims
    for (let i = 1; i <= 5; i++) {
      const node2 = nodesUtils.encodeNodeId(
        testNodesUtils.generateRandomNodeId(),
      );
      const nodeLink = {
        type: 'ClaimLinkNode',
        iss: srcNodeIdEncoded,
        sub: node2,
      };
      await pkAgent.sigchain.addClaim(nodeLink);
    }
    for (let i = 6; i <= 10; i++) {
      const identityLink = {
        type: 'ClaimLinkIdentity',
        iss: srcNodeIdEncoded,
        sub: encodeProviderIdentityId([
          ('ProviderId' + i.toString()) as ProviderId,
          ('IdentityId' + i.toString()) as IdentityId,
        ]),
      };
      await pkAgent.sigchain.addClaim(identityLink);
    }

    const response = grpcClient.nodesChainDataGet(new nodesPB.ClaimId());
    const chainIds: Array<string> = [];
    for await (const claim of response) {
      chainIds.push(claim.getClaimId());
    }
    expect(chainIds).toHaveLength(10);
  });
});
