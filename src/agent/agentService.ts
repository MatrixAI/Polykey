import type { NodeId } from '../nodes/types';
import type { ClaimId } from '../claims/types';
import type { VaultId } from '../vaults/types';

import * as grpc from '@grpc/grpc-js';
import { promisify } from '../utils';
import * as networkUtils from '../network/utils';
import { NodeManager } from '../nodes';
import { VaultManager } from '../vaults';
import { Sigchain } from '../sigchain';
import { NotificationsManager } from '../notifications';
import { ErrorGRPC } from '../grpc/errors';
import { AgentService, IAgentServer } from '../proto/js/Agent_grpc_pb';

import * as agentPB from '../proto/js/Agent_pb';
import * as grpcUtils from '../grpc/utils';
import * as notificationsUtils from '../notifications/utils';

/**
 * Creates the client service for use with a GRPCServer
 * @param domains An object representing all the domains / managers the agent server uses.
 * @returns an IAgentServer object
 */
function createAgentService({
  vaultManager,
  nodeManager,
  notificationsManager,
  sigchain,
}: {
  vaultManager: VaultManager;
  nodeManager: NodeManager;
  sigchain: Sigchain;
  notificationsManager: NotificationsManager;
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
      const vaultId = request.getId() as VaultId;

      const response = new agentPB.PackChunk();
      const vault = await vaultManager.getVault(vaultId);
      const responseGen = vault.handleInfoRequest();

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
        const vaultId = meta.get('vault-id').pop()?.toString() as VaultId;
        if (!vaultId) throw new ErrorGRPC('vault-name not in metadata.');
        const vault = await vaultManager.getVault(vaultId);

        const response = new agentPB.PackChunk();
        const [sideBand, progressStream] = await vault.handlePackRequest(
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
      call: grpc.ServerWritableStream<
        agentPB.NodeIdMessage,
        agentPB.VaultListMessage
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      const response = new agentPB.VaultListMessage();
      const id = call.request.getNodeid() as NodeId;
      try {
        const listResponse = vaultManager.handleVaultNamesRequest(id);

        for await (const vault of listResponse) {
          if (vault !== null) {
            response.setVault(vault);
            await genWritable.next(response);
          } else {
            await genWritable.next(null);
          }
        }
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
    getNodeDetails: async (
      call: grpc.ServerUnaryCall<
        agentPB.EmptyMessage,
        agentPB.NodeDetailsMessage
      >,
      callback: grpc.sendUnaryData<agentPB.NodeDetailsMessage>,
    ): Promise<void> => {
      const response = new agentPB.NodeDetailsMessage();
      try {
        const details = nodeManager.getNodeDetails();
        response.setNodeId(details.id);
        response.setPublicKey(details.publicKey);
        response.setNodeAddress(details.address);
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
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
      const response = new agentPB.NodeTableMessage();
      try {
        const targetNodeId = call.request.getNodeid() as NodeId;
        // Get all local nodes that are closest to the target node from the request
        const closestNodes = await nodeManager.getClosestLocalNodes(
          targetNodeId,
        );
        for (const node of closestNodes) {
          const addressMessage = new agentPB.NodeAddressMessage();
          addressMessage.setIp(node.address.ip);
          addressMessage.setPort(node.address.port);
          // Add the node to the response's map (mapping of node ID -> node address)
          response.getNodetableMap().set(node.id, addressMessage);
        }
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    /**
     * Retrieves all claims (of a specific type) of this node (within its sigchain).
     * TODO: Currently not required. Will need to refactor once we filter on what
     * claims we desire from the sigchain (e.g. in discoverGestalt).
     */
    getClaims: async (
      call: grpc.ServerUnaryCall<
        agentPB.ClaimTypeMessage,
        agentPB.ClaimsMessage
      >,
      callback: grpc.sendUnaryData<agentPB.ClaimsMessage>,
    ): Promise<void> => {
      const response = new agentPB.ClaimsMessage();
      // response.setClaimsList(
      //   await sigchain.getClaims(call.request.getClaimtype() as ClaimType)
      // );
      callback(null, response);
    },
    /**
     * Retrieves the ChainDataEncoded of this node.
     */
    getChainData: async (
      call: grpc.ServerUnaryCall<
        agentPB.EmptyMessage,
        agentPB.ChainDataMessage
      >,
      callback: grpc.sendUnaryData<agentPB.ChainDataMessage>,
    ): Promise<void> => {
      const response = new agentPB.ChainDataMessage();
      try {
        const chainData = await nodeManager.getChainData();
        // Iterate through each claim in the chain, and serialize for transport
        for (const c in chainData) {
          const claimId = c as ClaimId;
          const claim = chainData[claimId];
          const claimMessage = new agentPB.ClaimMessage();
          // Will always have a payload (never undefined) so cast as string
          claimMessage.setPayload(claim.payload as string);
          // Add the signatures
          for (const signatureData of claim.signatures) {
            const signature = new agentPB.SignatureMessage();
            // Will always have a protected header (never undefined) so cast as string
            signature.setHeader(signatureData.protected as string);
            signature.setSignature(signatureData.signature);
            claimMessage.getSignaturesList().push(signature);
          }
          // Add the serialized claim
          response.getChaindataMap().set(claimId, claimMessage);
        }
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    sendHolePunchMessage: async (
      call: grpc.ServerUnaryCall<agentPB.RelayMessage, agentPB.EmptyMessage>,
      callback: grpc.sendUnaryData<agentPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new agentPB.EmptyMessage();
      try {
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
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    notificationsSend: async (
      call: grpc.ServerUnaryCall<
        agentPB.NotificationMessage,
        agentPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<agentPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new agentPB.EmptyMessage();
      try {
        const jwt = call.request.getContent();
        const notification = await notificationsUtils.verifyAndDecodeNotif(jwt);
        await notificationsManager.receiveNotification(notification);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
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
        const nodeId = call.request.getNodeid() as NodeId;
        const vaultId = call.request.getVaultid() as VaultId;
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
