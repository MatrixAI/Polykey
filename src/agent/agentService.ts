import type { NodeId } from '../nodes/types';
import type { ClaimId, ClaimEncoded, ClaimIntermediary } from '../claims/types';
import type { VaultId } from '../vaults/types';

import * as grpc from '@grpc/grpc-js';
import { promisify } from '../utils';
import * as networkUtils from '../network/utils';
import { NodeManager } from '../nodes';
import { VaultManager } from '../vaults';
import { Sigchain } from '../sigchain';
import { KeyManager } from '../keys';
import { NotificationsManager } from '../notifications';
import { ErrorGRPC } from '../grpc/errors';
import { AgentService, IAgentServer } from '../proto/js/Agent_grpc_pb';

import * as agentPB from '../proto/js/Agent_pb';
import * as grpcUtils from '../grpc/utils';
import {
  utils as notificationsUtils,
  errors as notificationsErrors,
} from '../notifications';
import { utils as claimsUtils, errors as claimsErrors } from '../claims';

/**
 * Creates the client service for use with a GRPCServer
 * @param domains An object representing all the domains / managers the agent server uses.
 * @returns an IAgentServer object
 */
function createAgentService({
  keyManager,
  vaultManager,
  nodeManager,
  notificationsManager,
  sigchain,
}: {
  keyManager: KeyManager;
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
    vaultsGitInfoGet: async (
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
    vaultsGitPackGet: async (
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
        if (vaultId == null) throw new ErrorGRPC('vault-name not in metadata.');
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
    vaultsScan: async (
      call: grpc.ServerWritableStream<
        agentPB.NodeIdMessage,
        agentPB.VaultListMessage
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      const response = new agentPB.VaultListMessage();
      const id = call.request.getNodeId() as NodeId;
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
    /**
     * Retrieves the local nodes (i.e. from the current node) that are closest
     * to some provided node ID.
     * @param call call that encodes a nodeId representing the target search node.
     * @param callback
     */
    nodesClosestLocalNodesGet: async (
      call: grpc.ServerUnaryCall<
        agentPB.NodeIdMessage,
        agentPB.NodeTableMessage
      >,
      callback: grpc.sendUnaryData<agentPB.NodeTableMessage>,
    ): Promise<void> => {
      const response = new agentPB.NodeTableMessage();
      try {
        const targetNodeId = call.request.getNodeId() as NodeId;
        // Get all local nodes that are closest to the target node from the request
        const closestNodes = await nodeManager.getClosestLocalNodes(
          targetNodeId,
        );
        for (const node of closestNodes) {
          const addressMessage = new agentPB.NodeAddressMessage();
          addressMessage.setIp(node.address.ip);
          addressMessage.setPort(node.address.port);
          // Add the node to the response's map (mapping of node ID -> node address)
          response.getNodeTableMap().set(node.id, addressMessage);
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
    nodesClaimsGet: async (
      call: grpc.ServerUnaryCall<
        agentPB.ClaimTypeMessage,
        agentPB.ClaimsMessage
      >,
      callback: grpc.sendUnaryData<agentPB.ClaimsMessage>,
    ): Promise<void> => {
      const response = new agentPB.ClaimsMessage();
      // Response.setClaimsList(
      //   await sigchain.getClaims(call.request.getClaimtype() as ClaimType)
      // );
      callback(null, response);
    },
    /**
     * Retrieves the ChainDataEncoded of this node.
     */
    nodesChainDataGet: async (
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
            signature.setProtected(signatureData.protected as string);
            signature.setSignature(signatureData.signature);
            claimMessage.getSignaturesList().push(signature);
          }
          // Add the serialized claim
          response.getChainDataMap().set(claimId, claimMessage);
        }
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    nodesHolePunchMessageSend: async (
      call: grpc.ServerUnaryCall<agentPB.RelayMessage, agentPB.EmptyMessage>,
      callback: grpc.sendUnaryData<agentPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new agentPB.EmptyMessage();
      try {
        // Firstly, check if this node is the desired node
        // If so, then we want to make this node start sending hole punching packets
        // back to the source node.
        if (
          nodeManager.getNodeId() === (call.request.getTargetId() as NodeId)
        ) {
          const [host, port] = networkUtils.parseAddress(
            call.request.getEgressAddress(),
          );
          await nodeManager.openConnection(host, port);
          // Otherwise, find if node in table
          // If so, ask the nodemanager to relay to the node
        } else if (
          await nodeManager.knowsNode(call.request.getSrcId() as NodeId)
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
        if (err instanceof notificationsErrors.ErrorNotifications) {
          callback(grpcUtils.fromError(err), response);
        } else {
          throw err;
        }
      }
      callback(null, response);
    },
    vaultsPermisssionsCheck: async (
      call: grpc.ServerUnaryCall<
        agentPB.VaultPermMessage,
        agentPB.PermissionMessage
      >,
      callback: grpc.sendUnaryData<agentPB.PermissionMessage>,
    ): Promise<void> => {
      const response = new agentPB.PermissionMessage();
      try {
        const nodeId = call.request.getNodeId() as NodeId;
        const vaultId = call.request.getVaultId() as VaultId;
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
    nodesCrossSignClaim: async (
      call: grpc.ServerDuplexStream<
        agentPB.CrossSignMessage,
        agentPB.CrossSignMessage
      >,
    ) => {
      // TODO: Move all "await genClaims.throw" to a final catch(). Wrap this
      // entire thing in a try block. And re-throw whatever error is caught
      const genClaims = grpcUtils.generatorDuplex(call);
      try {
        await sigchain.transaction(async (sigchain) => {
          const readStatus = await genClaims.read();
          // If nothing to read, end and destroy
          if (readStatus.done) {
            throw new claimsErrors.ErrorEmptyStream();
          }
          const receivedMessage = readStatus.value;
          const intermediaryClaimMessage =
            receivedMessage.getSinglySignedClaim();
          if (!intermediaryClaimMessage) {
            throw new claimsErrors.ErrorUndefinedSinglySignedClaim();
          }
          const intermediarySignature = intermediaryClaimMessage.getSignature();
          if (!intermediarySignature) {
            throw new claimsErrors.ErrorUndefinedSignature();
          }

          // 3. X --> responds with double signing the Y signed claim, and also --> Y
          //             bundles it with its own signed claim (intermediate)
          // Reconstruct the claim to verify its signature
          const constructedIntermediaryClaim: ClaimIntermediary = {
            payload: intermediaryClaimMessage.getPayload(),
            signature: {
              protected: intermediarySignature.getProtected(),
              signature: intermediarySignature.getSignature(),
            },
          };
          // Get the sender's node ID from the claim
          const constructedEncodedClaim: ClaimEncoded = {
            payload: intermediaryClaimMessage.getPayload(),
            signatures: [
              {
                protected: intermediarySignature.getProtected(),
                signature: intermediarySignature.getSignature(),
              },
            ],
          };
          const decodedClaim = claimsUtils.decodeClaim(constructedEncodedClaim);
          const payloadData = decodedClaim.payload.data;
          if (payloadData.type !== 'node') {
            throw new claimsErrors.ErrorNodesClaimType();
          }
          // Verify the claim
          const senderPublicKey = await nodeManager.getPublicKey(
            payloadData.node1,
          );
          const verified = claimsUtils.verifyClaimSignature(
            constructedEncodedClaim,
            senderPublicKey,
          );
          if (!verified) {
            throw new claimsErrors.ErrorSinglySignedClaimVerificationFailed();
          }
          // If verified, add your own signature to the received claim
          const doublySignedClaim = await claimsUtils.signIntermediaryClaim({
            claim: constructedIntermediaryClaim,
            privateKey: keyManager.getRootKeyPairPem().privateKey,
            signeeNodeId: nodeManager.getNodeId(),
          });
          // Then create your own intermediary node claim (from X -> Y)
          const singlySignedClaim = await sigchain.createIntermediaryClaim({
            type: 'node',
            node1: nodeManager.getNodeId(),
            node2: payloadData.node1,
          });
          // Should never be reached, but just for type safety
          if (!doublySignedClaim.payload || !singlySignedClaim.payload) {
            throw new claimsErrors.ErrorClaimsUndefinedClaimPayload();
          }
          // Write both these claims to a message to send
          const crossSignMessage = claimsUtils.createCrossSignMessage({
            singlySignedClaim,
            doublySignedClaim,
          });
          await genClaims.write(crossSignMessage);
          // 4. We expect to receive our singly signed claim we sent to now be a
          // doubly signed claim (signed by the other node).
          const responseStatus = await genClaims.read();
          if (responseStatus.done) {
            throw new claimsErrors.ErrorEmptyStream();
          }
          const receivedResponse = responseStatus.value;
          const receivedDoublySignedClaimMessage =
            receivedResponse.getDoublySignedClaim();
          if (!receivedDoublySignedClaimMessage) {
            throw new claimsErrors.ErrorUndefinedDoublySignedClaim();
          }
          // Reconstruct the expected object from message
          const constructedDoublySignedClaim: ClaimEncoded = {
            payload: receivedDoublySignedClaimMessage.getPayload(),
            signatures: receivedDoublySignedClaimMessage
              .getSignaturesList()
              .map((sMsg) => {
                return {
                  protected: sMsg.getProtected(),
                  signature: sMsg.getSignature(),
                };
              }),
          };
          // Verify the doubly signed claim with both our public key, and the sender's
          const verifiedDoubly =
            (await claimsUtils.verifyClaimSignature(
              constructedDoublySignedClaim,
              keyManager.getRootKeyPairPem().publicKey,
            )) &&
            (await claimsUtils.verifyClaimSignature(
              constructedDoublySignedClaim,
              senderPublicKey,
            ));
          if (!verifiedDoubly) {
            await genClaims.throw(
              new claimsErrors.ErrorDoublySignedClaimVerificationFailed(),
            );
          }
          // If verified, then we can safely add to our sigchain
          await sigchain.addExistingClaim(constructedDoublySignedClaim);
          // Close the stream
          await genClaims.next(null);
        });
      } catch (e) {
        await genClaims.throw(e);
        // TODO: Handle the exception on this server - throw e?
        // throw e;
      }
    },
  };

  return agentService;
}

export default createAgentService;

export { AgentService };
