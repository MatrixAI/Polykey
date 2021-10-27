import type { KeyManager } from '../keys';
import type { NodeManager } from '../nodes';
import type { SessionManager } from '../sessions';
import type { ForwardProxy, ReverseProxy } from '../network';
import type { TLSConfig } from '../network/types';
import type { GRPCServer } from '../grpc';

import * as utils from './utils';
import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '../grpc/utils';
import { messages } from '../client';

const createKeysRPC = ({
  keyManager,
  nodeManager,
  sessionManager,
  fwdProxy,
  revProxy,
  grpcServer,
}: {
  keyManager: KeyManager;
  nodeManager: NodeManager;
  sessionManager: SessionManager;
  fwdProxy: ForwardProxy;
  revProxy: ReverseProxy;
  grpcServer: GRPCServer;
}) => {
  return {
    keysKeyPairRoot: async (
      call: grpc.ServerUnaryCall<
        messages.common.EmptyMessage,
        messages.keys.KeyPair
      >,
      callback: grpc.sendUnaryData<messages.keys.KeyPair>,
    ): Promise<void> => {
      const response = new messages.keys.KeyPair();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const keyPair = keyManager.getRootKeyPairPem();
        response.setPublic(keyPair.publicKey);
        response.setPrivate(keyPair.privateKey);
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysKeyPairReset: async (
      call: grpc.ServerUnaryCall<
        messages.keys.Key,
        messages.common.EmptyMessage
      >,
      callback: grpc.sendUnaryData<messages.common.EmptyMessage>,
    ): Promise<void> => {
      const response = new messages.common.EmptyMessage();
      try {
        // Lock the nodeManager - because we need to do a database refresh too
        await nodeManager.transaction(async (nodeManager) => {
          await sessionManager.verifyToken(utils.getToken(call.metadata));
          const responseMeta = utils.createMetaTokenResponse(
            await sessionManager.generateToken(),
          );
          call.sendMetadata(responseMeta);
          await keyManager.resetRootKeyPair(call.request.getName());
          // Reset the TLS config with new keypair + certificate
          const tlsConfig: TLSConfig = {
            keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
            certChainPem: await keyManager.getRootCertChainPem(),
          };
          fwdProxy.setTLSConfig(tlsConfig);
          revProxy.setTLSConfig(tlsConfig);
          grpcServer.setTLSConfig(tlsConfig);
          // Finally, refresh the node buckets
          await nodeManager.refreshBuckets();
        });
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysKeyPairRenew: async (
      call: grpc.ServerUnaryCall<
        messages.keys.Key,
        messages.common.EmptyMessage
      >,
      callback: grpc.sendUnaryData<messages.common.EmptyMessage>,
    ): Promise<void> => {
      const response = new messages.common.EmptyMessage();
      try {
        // Lock the nodeManager - because we need to do a database refresh too
        await nodeManager.transaction(async (nodeManager) => {
          await sessionManager.verifyToken(utils.getToken(call.metadata));
          const responseMeta = utils.createMetaTokenResponse(
            await sessionManager.generateToken(),
          );
          call.sendMetadata(responseMeta);
          await keyManager.renewRootKeyPair(call.request.getName());
          // Reset the TLS config with new keypair + certificate
          const tlsConfig: TLSConfig = {
            keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
            certChainPem: await keyManager.getRootCertChainPem(),
          };
          fwdProxy.setTLSConfig(tlsConfig);
          revProxy.setTLSConfig(tlsConfig);
          grpcServer.setTLSConfig(tlsConfig);
          // Finally, refresh the node buckets
          await nodeManager.refreshBuckets();
        });
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysEncrypt: async (
      call: grpc.ServerUnaryCall<messages.keys.Crypto, messages.keys.Crypto>,
      callback: grpc.sendUnaryData<messages.keys.Crypto>,
    ): Promise<void> => {
      const response = new messages.keys.Crypto();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const data = await keyManager.encryptWithRootKeyPair(
          Buffer.from(call.request.getData(), 'binary'),
        );
        response.setData(data.toString('binary'));
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysDecrypt: async (
      call: grpc.ServerUnaryCall<messages.keys.Crypto, messages.keys.Crypto>,
      callback: grpc.sendUnaryData<messages.keys.Crypto>,
    ): Promise<void> => {
      const response = new messages.keys.Crypto();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const data = await keyManager.decryptWithRootKeyPair(
          Buffer.from(call.request.getData(), 'binary'),
        );
        response.setData(data.toString('binary'));
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysSign: async (
      call: grpc.ServerUnaryCall<messages.keys.Crypto, messages.keys.Crypto>,
      callback: grpc.sendUnaryData<messages.keys.Crypto>,
    ): Promise<void> => {
      const response = new messages.keys.Crypto();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const signature = await keyManager.signWithRootKeyPair(
          Buffer.from(call.request.getData(), 'binary'),
        );
        response.setSignature(signature.toString('binary'));
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysVerify: async (
      call: grpc.ServerUnaryCall<
        messages.keys.Crypto,
        messages.common.StatusMessage
      >,
      callback: grpc.sendUnaryData<messages.common.StatusMessage>,
    ): Promise<void> => {
      const response = new messages.common.StatusMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const status = await keyManager.verifyWithRootKeyPair(
          Buffer.from(call.request.getData(), 'binary'),
          Buffer.from(call.request.getSignature(), 'binary'),
        );
        response.setSuccess(status);
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysPasswordChange: async (
      call: grpc.ServerUnaryCall<
        messages.sessions.Password,
        messages.common.EmptyMessage
      >,
      callback: grpc.sendUnaryData<messages.common.EmptyMessage>,
    ): Promise<void> => {
      const response = new messages.common.EmptyMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        await keyManager.changeRootKeyPassword(call.request.getPassword());
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysCertsGet: async (
      call: grpc.ServerUnaryCall<
        messages.common.EmptyMessage,
        messages.keys.Certificate
      >,
      callback: grpc.sendUnaryData<messages.keys.Certificate>,
    ): Promise<void> => {
      const response = new messages.keys.Certificate();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const cert = keyManager.getRootCertPem();
        response.setCert(cert);
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysCertsChainGet: async (
      call: grpc.ServerWritableStream<
        messages.common.EmptyMessage,
        messages.keys.Certificate
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const certs: Array<string> = await keyManager.getRootCertChainPems();
        let certMessage: messages.keys.Certificate;
        for (const cert of certs) {
          certMessage = new messages.keys.Certificate();
          certMessage.setCert(cert);
          await genWritable.next(certMessage);
        }
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
  };
};

export default createKeysRPC;
