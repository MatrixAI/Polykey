import * as grpc from '@grpc/grpc-js';
import * as agentPB from '../proto/js/Agent_pb';
import { AgentService, IAgentServer } from '../proto/js/Agent_grpc_pb';
import { KeyManager } from '../keys';
import { VaultManager } from '../vaults';
import { NodeManager } from '../nodes';

/**
 * Creates the client service for use with a GRPCServer
 * @param domains An object representing all the domains / managers the agent server uses.
 * @returns an IAgentServer object
 */
function createAgentService({
  keyManager,
  vaultManager,
  nodeManager,
}: {
  keyManager: KeyManager;
  vaultManager: VaultManager;
  nodeManager: NodeManager;
}) {
  const agentService: IAgentServer = {
    echo: async (
      call: grpc.ServerUnaryCall<agentPB.EchoMessage, agentPB.EchoMessage>,
      callback: grpc.sendUnaryData<agentPB.EchoMessage>,
    ): Promise<void> => {
      const response = new agentPB.EchoMessage();
      response.setChallenge(call.request.getChallenge());
      callback(null, response);
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
    getClosestLocalNodes: async (
      call: grpc.ServerUnaryCall<
        agentPB.NodeIdMessage,
        agentPB.NodeTableMessage
      >,
      callback: grpc.sendUnaryData<agentPB.NodeTableMessage>,
    ): Promise<void> => {
      const nodeId = call.request.getNodeid();

      const response = new agentPB.NodeTableMessage();

      // Get all local nodes somehow
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
          .set(`placeholder:${nodeId}${address.ip}`, addressMessage);
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
    relayHolePunchMessage: async (
      call: grpc.ServerUnaryCall<
        agentPB.ConnectionMessage,
        agentPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<agentPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new agentPB.EmptyMessage();

      const request = call.request;

      const bId = request.getBid();

      // If this.nodes has bId, do something
      // otherwise, drop

      callback(null, response);
    },
  };

  return agentService;
}

export default createAgentService;

export { AgentService };
