import * as grpc from '@grpc/grpc-js';
import * as clientPB from '../proto/js/Client_pb';

import * as utils from './utils';
import * as grpcUtils from '../grpc/utils';
import { KeyManager } from '../keys';
import { SessionManager } from '../session';

const createKeysRPC = ({
  keyManager,
  sessionManager,
}: {
  keyManager: KeyManager;
  sessionManager: SessionManager;
}) => {
  return {
    keysRootKeyPair: async (
      call: grpc.ServerUnaryCall<
        clientPB.EmptyMessage,
        clientPB.KeyPairMessage
      >,
      callback: grpc.sendUnaryData<clientPB.KeyPairMessage>,
    ): Promise<void> => {
      const response = new clientPB.KeyPairMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const keyPair = keyManager.getRootKeyPairPem();
        response.setPublic(keyPair.publicKey);
        response.setPrivate(keyPair.privateKey);
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysResetKeyPair: async (
      call: grpc.ServerUnaryCall<clientPB.KeyMessage, clientPB.EmptyMessage>,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        await keyManager.resetRootKeyPair(call.request.getName());
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysRenewKeyPair: async (
      call: grpc.ServerUnaryCall<clientPB.KeyMessage, clientPB.EmptyMessage>,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        await keyManager.renewRootKeyPair(call.request.getName());
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    keysEncrypt: async (
      call: grpc.ServerUnaryCall<
        clientPB.CryptoMessage,
        clientPB.CryptoMessage
      >,
      callback: grpc.sendUnaryData<clientPB.CryptoMessage>,
    ): Promise<void> => {
      const response = new clientPB.CryptoMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
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
      call: grpc.ServerUnaryCall<
        clientPB.CryptoMessage,
        clientPB.CryptoMessage
      >,
      callback: grpc.sendUnaryData<clientPB.CryptoMessage>,
    ): Promise<void> => {
      const response = new clientPB.CryptoMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
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
      call: grpc.ServerUnaryCall<
        clientPB.CryptoMessage,
        clientPB.CryptoMessage
      >,
      callback: grpc.sendUnaryData<clientPB.CryptoMessage>,
    ): Promise<void> => {
      const response = new clientPB.CryptoMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
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
        clientPB.CryptoMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
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
    keysChangePassword: async (
      call: grpc.ServerUnaryCall<
        clientPB.PasswordMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        await keyManager.changeRootKeyPassword(call.request.getPassword());
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    certsGet: async (
      call: grpc.ServerUnaryCall<
        clientPB.EmptyMessage,
        clientPB.CertificateMessage
      >,
      callback: grpc.sendUnaryData<clientPB.CertificateMessage>,
    ): Promise<void> => {
      const response = new clientPB.CertificateMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const cert = keyManager.getRootCertPem();
        response.setCert(cert);
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    certsChainGet: async (
      call: grpc.ServerWritableStream<
        clientPB.EmptyMessage,
        clientPB.CertificateMessage
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const certs: Array<string> = await keyManager.getRootCertChainPems();
        let certMessage: clientPB.CertificateMessage;
        for (const cert of certs) {
          certMessage = new clientPB.CertificateMessage();
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
