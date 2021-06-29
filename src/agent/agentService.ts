import type { NodeId } from '../nodes/types';
import * as grpc from '@grpc/grpc-js';
import { GitBackend } from '../git';
import { promisify } from '../utils';
import * as networkUtils from '../network/utils';
import { KeyManager } from '../keys';
import { NodeManager } from '../nodes';
import { VaultManager } from '../vaults';
import { ErrorGRPC } from '../grpc/errors';
import { AgentService, IAgentServer } from '../proto/js/Agent_grpc_pb';

import * as agentPB from '../proto/js/Agent_pb';
import * as grpcUtils from '../../src/grpc/utils';

/**
 * Creates the client service for use with a GRPCServer
 * @param domains An object representing all the domains / managers the agent server uses.
 * @returns an IAgentServer object
 */
function createAgentService({
  keyManager,
  vaultManager,
  nodeManager,
  gitBackend,
}: {
  keyManager: KeyManager;
  vaultManager: VaultManager;
  nodeManager: NodeManager;
  gitBackend: GitBackend;
}): IAgentServer {
  const agentService: IAgentServer = {
    echo: async (
      call: grpc.ServerUnaryCall<agentPB.EchoMessage, agentPB.EchoMessage>,
      callback: grpc.sendUnaryData<agentPB.EchoMessage>,
    ): Promise<void> => {
      const response = new agentPB.EchoMessage();
      response.setChallenge(call.request.getChallenge());
      callback(null, response);
    },
    getGitInfo: async (
      call: grpc.ServerWritableStream<agentPB.InfoRequest, agentPB.PackChunk>,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);

      const request = call.request;
      const vaultName = request.getVaultName();

      const response = new agentPB.PackChunk();
      const responseGen = gitBackend.handleInfoRequest(vaultName);

      for await (const byte of responseGen) {
        if (byte !== null) {
          response.setChunk(byte);
          await genWritable.next(response);
        } else {
          await genWritable.next(null);
        }
      }
      await genWritable.next(null);
    },
    getGitPack: async (
      call: grpc.ServerDuplexStream<agentPB.PackChunk, agentPB.PackChunk>,
    ) => {
      const write = promisify(call.write).bind(call);
      const clientBodyBuffers: Buffer[] = [];
      call.on('data', (d) => {
        clientBodyBuffers.push(d.getChunk_asU8());
      });

      call.on('end', async () => {
        const body = Buffer.concat(clientBodyBuffers);

        const meta = call.metadata;
        const vaultName = meta.get('vault-name').pop();
        if (!vaultName) throw new ErrorGRPC('vault-name not in metadata.');

        const response = new agentPB.PackChunk();
        const [sideBand, progressStream] = await gitBackend.handlePackRequest(
          vaultName.toString(),
          Buffer.from(body),
        );

        response.setChunk(Buffer.from('0008NAK\n'));
        await write(response);

        const responseBuffers: Buffer[] = [];

        await new Promise<void>((resolve, reject) => {
          sideBand.on('data', async (data: Buffer) => {
            responseBuffers.push(data);
          });
          sideBand.on('end', async () => {
            response.setChunk(Buffer.concat(responseBuffers));
            await write(response);
            resolve();
          });
          sideBand.on('error', (err) => {
            reject(err);
          });
          progressStream.write(Buffer.from('0014progress is at 50%\n'));
          progressStream.end();
        });

        call.end();
      });
    },
    scanVaults: async (
      call: grpc.ServerWritableStream<agentPB.NodeIdMessage, agentPB.PackChunk>,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      const response = new agentPB.PackChunk();
      const id = call.request.getNodeid();

      const listResponse = gitBackend.handleVaultNamesRequest(id);

      for await (const byte of listResponse) {
        if (byte !== null) {
          response.setChunk(byte);
          await genWritable.next(response);
        } else {
          await genWritable.next(null);
        }
      }
      await genWritable.next(null);
    },
    getRootCertificate: async (
      call: grpc.ServerUnaryCall<
        agentPB.EmptyMessage,
        agentPB.CertificateMessage
      >,
      callback: grpc.sendUnaryData<agentPB.CertificateMessage>,
    ): Promise<void> => {
      const response = new agentPB.CertificateMessage();
      response.setCert('XXXXXXXXXXXXXXXXMYCERTXXXXXXXXXXXXXXXXXX');
      callback(null, response);
    },
    requestCertificateSigning: async (
      call: grpc.ServerUnaryCall<
        agentPB.CertificateMessage,
        agentPB.CertificateMessage
      >,
      callback: grpc.sendUnaryData<agentPB.CertificateMessage>,
    ): Promise<void> => {
      const response = new agentPB.CertificateMessage();
      const requestCert = call.request.getCert();
      // sign it
      response.setCert(requestCert);
      callback(null, response);
    },
    /**
     * Retrieves the local nodes (i.e. from the current node) that are closest
     * to some provided node ID.
     * @param call call that encodes a nodeId representing the target search node.
     * @param callback
     */
    getClosestLocalNodes: async (
      call: grpc.ServerUnaryCall<
        agentPB.NodeIdMessage,
        agentPB.NodeTableMessage
      >,
      callback: grpc.sendUnaryData<agentPB.NodeTableMessage>,
    ): Promise<void> => {
      const targetNodeId = call.request.getNodeid() as NodeId;
      const response = new agentPB.NodeTableMessage();

      // Get all local nodes that are closest to the target node from the request
      const closestNodes = await nodeManager.getClosestLocalNodes(targetNodeId);
      for (const node of closestNodes) {
        const addressMessage = new agentPB.NodeAddressMessage();
        addressMessage.setIp(node.address.ip);
        addressMessage.setPort(node.address.port);
        // Add the node to the response's map (mapping of node ID -> node address)
        response.getNodetableMap().set(node.id, addressMessage);
      }

      callback(null, response);
    },
    synchronizeDHT: async (
      call: grpc.ServerUnaryCall<
        agentPB.EmptyMessage,
        agentPB.NodeTableMessage
      >,
      callback: grpc.sendUnaryData<agentPB.NodeTableMessage>,
    ): Promise<void> => {
      const response = new agentPB.NodeTableMessage();

      // GET THE DHT SOMEHOW
      const addresses = [
        { ip: '5.5.5.5', port: 1234 },
        { ip: '6.6.6.6', port: 5678 },
      ];

      for (const address of addresses) {
        const addressMessage = new agentPB.NodeAddressMessage();
        addressMessage.setIp(address.ip);
        addressMessage.setPort(address.port);
        response
          .getNodetableMap()
          .set(`nodeIdxxx${address.ip}xxx`, addressMessage);
      }

      callback(null, response);
    },
    sendHolePunchMessage: async (
      call: grpc.ServerUnaryCall<agentPB.RelayMessage, agentPB.EmptyMessage>,
      callback: grpc.sendUnaryData<agentPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new agentPB.EmptyMessage();
      // Firstly, check if this node is the desired node
      // If so, then we want to make this node start sending hole punching packets
      // back to the source node.
      if (nodeManager.getNodeId() == (call.request.getTargetid() as NodeId)) {
        const [host, port] = networkUtils.parseAddress(
          call.request.getEgressaddress(),
        );
        await nodeManager.openConnection(host, port);
        // Otherwise, find if node in table
        // If so, ask the nodemanager to relay to the node
      } else if (
        await nodeManager.knowsNode(call.request.getSrcid() as NodeId)
      ) {
        nodeManager.relayHolePunchMessage(call.request);
      }

      callback(null, response);
    },
    checkVaultPermisssions: async (
      call: grpc.ServerUnaryCall<
        agentPB.VaultPermMessage,
        agentPB.PermissionMessage
      >,
      callback: grpc.sendUnaryData<agentPB.PermissionMessage>,
    ): Promise<void> => {
      const response = new agentPB.PermissionMessage();
      try {
        const nodeId = call.request.getNodeid();
        const vaultId = call.request.getVaultid();
        const result = await vaultManager.getVaultPermissions(vaultId, nodeId);
        if (result[nodeId] === undefined) {
          response.setPermission(false);
        } else if (result[nodeId]['pull'] === undefined) {
          response.setPermission(false);
        } else {
          response.setPermission(true);
        }
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
  };

  return agentService;
}

export default createAgentService;

export { AgentService };
