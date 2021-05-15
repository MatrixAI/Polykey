import * as grpc from '@grpc/grpc-js';

import { GitBackend } from '../git';
import { KeyManager } from '../keys';
import { NodeManager } from '../nodes';
import { VaultManager } from '../vaults';
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
  git,
}: {
  keyManager: KeyManager;
  vaultManager: VaultManager;
  nodeManager: NodeManager;
  git: GitBackend;
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
    getGitInfo: async (
      call: grpc.ServerWritableStream<agentPB.InfoRequest, agentPB.PackChunk>,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);

      const request = call.request;
      const vaultName = request.getVaultName();

      const response = new agentPB.PackChunk();
      const responseGen = git.handleInfoRequest(vaultName);

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
    getGitPackStream: async (
      call: grpc.ServerWritableStream<agentPB.PackRequest, agentPB.PackChunk>,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);

      const request = call.request;
      const vaultName = request.getVaultName();
      const body = request.getBody_asU8();

      const response = new agentPB.PackChunk();
      const [sideBand, progressStream] = await git.handlePackRequest(
        vaultName,
        Buffer.from(body),
      );

      await git.handlePackRequest(vaultName, Buffer.from(body));

      response.setChunk(Buffer.from('0008NAK\n'));
      await genWritable.next(response);

      const responseBuffers: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        sideBand.on('data', async (data: Buffer) => {
          // response.setChunk(Buffer.from(data));

          // Because the following line does not work...
          // await genWritable.next(response);

          // This one can be used instead... But...
          // genWritable.stream.write(response);

          // Alternatively we could push the data into a buffer
          responseBuffers.push(data);
        });
        sideBand.on('end', async () => {
          // And at the end concatenate them and call the 'next'
          // method on the entire chunk
          response.setChunk(Buffer.concat(responseBuffers));
          await genWritable.next(response);
          resolve();
        });
        sideBand.on('error', (err) => {
          reject(err);
        });
        progressStream.write(Buffer.from('0014progress is at 50%\n'));
        progressStream.end();
      });

      await genWritable.next(null);
      // this should be used if we use the genWritable.stream.write style
      // genWritable.stream.end();
    },
    scanVaults: async (
      call: grpc.ServerWritableStream<agentPB.EmptyMessage, agentPB.PackChunk>,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      const response = new agentPB.PackChunk();

      const listResponse = git.handleVaultNamesRequest();

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
