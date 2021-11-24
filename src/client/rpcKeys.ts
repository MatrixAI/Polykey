import type { KeyManager } from '../keys';
import type { NodeManager } from '../nodes';
import type { ForwardProxy, ReverseProxy } from '../network';
import type { TLSConfig } from '../network/types';
import type { GRPCServer } from '../grpc';

import type * as grpc from '@grpc/grpc-js';
import type * as utils from './utils';
import type * as sessionsPB from '../proto/js/polykey/v1/sessions/sessions_pb';
import * as grpcUtils from '../grpc/utils';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as keysPB from '../proto/js/polykey/v1/keys/keys_pb';

const createKeysRPC = ({
  keyManager,
  nodeManager,
  authenticate,
  fwdProxy,
  revProxy,
  clientGrpcServer,
}: {
  keyManager: KeyManager;
  nodeManager: NodeManager;
  authenticate: utils.Authenticate;
  fwdProxy: ForwardProxy;
  revProxy: ReverseProxy;
  clientGrpcServer: GRPCServer;
}) => {
  return {
    keysKeyPairRoot: async (
      call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, keysPB.KeyPair>,
      callback: grpc.sendUnaryData<keysPB.KeyPair>,
    ): Promise<void> => {
      const response = new keysPB.KeyPair();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const keyPair = keyManager.getRootKeyPairPem();
        response.setPublic(keyPair.publicKey);
        response.setPrivate(keyPair.privateKey);
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysKeyPairReset: async (
      call: grpc.ServerUnaryCall<keysPB.Key, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new utilsPB.EmptyMessage();
      try {
        // Lock the nodeManager - because we need to do a database refresh too
        await nodeManager.transaction(async (nodeManager) => {
          const metadata = await authenticate(call.metadata);
          call.sendMetadata(metadata);

          await keyManager.resetRootKeyPair(call.request.getName());
          // Reset the TLS config with new keypair + certificate
          const tlsConfig: TLSConfig = {
            keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
            certChainPem: await keyManager.getRootCertChainPem(),
          };
          fwdProxy.setTLSConfig(tlsConfig);
          revProxy.setTLSConfig(tlsConfig);
          clientGrpcServer.setTLSConfig(tlsConfig);
          // Finally, refresh the node buckets
          await nodeManager.refreshBuckets();
        });
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysKeyPairRenew: async (
      call: grpc.ServerUnaryCall<keysPB.Key, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new utilsPB.EmptyMessage();
      try {
        // Lock the nodeManager - because we need to do a database refresh too
        await nodeManager.transaction(async (nodeManager) => {
          const metadata = await authenticate(call.metadata);
          call.sendMetadata(metadata);
          await keyManager.renewRootKeyPair(call.request.getName());
          // Reset the TLS config with new keypair + certificate
          const tlsConfig: TLSConfig = {
            keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
            certChainPem: await keyManager.getRootCertChainPem(),
          };
          fwdProxy.setTLSConfig(tlsConfig);
          revProxy.setTLSConfig(tlsConfig);
          clientGrpcServer.setTLSConfig(tlsConfig);
          // Finally, refresh the node buckets
          await nodeManager.refreshBuckets();
        });
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysEncrypt: async (
      call: grpc.ServerUnaryCall<keysPB.Crypto, keysPB.Crypto>,
      callback: grpc.sendUnaryData<keysPB.Crypto>,
    ): Promise<void> => {
      const response = new keysPB.Crypto();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

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
      call: grpc.ServerUnaryCall<keysPB.Crypto, keysPB.Crypto>,
      callback: grpc.sendUnaryData<keysPB.Crypto>,
    ): Promise<void> => {
      const response = new keysPB.Crypto();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

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
      call: grpc.ServerUnaryCall<keysPB.Crypto, keysPB.Crypto>,
      callback: grpc.sendUnaryData<keysPB.Crypto>,
    ): Promise<void> => {
      const response = new keysPB.Crypto();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

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
      call: grpc.ServerUnaryCall<keysPB.Crypto, utilsPB.StatusMessage>,
      callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
    ): Promise<void> => {
      const response = new utilsPB.StatusMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

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
      call: grpc.ServerUnaryCall<sessionsPB.Password, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new utilsPB.EmptyMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        await keyManager.changeRootKeyPassword(call.request.getPassword());
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysCertsGet: async (
      call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, keysPB.Certificate>,
      callback: grpc.sendUnaryData<keysPB.Certificate>,
    ): Promise<void> => {
      const response = new keysPB.Certificate();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const cert = keyManager.getRootCertPem();
        response.setCert(cert);
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysCertsChainGet: async (
      call: grpc.ServerWritableStream<utilsPB.EmptyMessage, keysPB.Certificate>,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const certs: Array<string> = await keyManager.getRootCertChainPems();
        let certMessage: keysPB.Certificate;
        for (const cert of certs) {
          certMessage = new keysPB.Certificate();
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
