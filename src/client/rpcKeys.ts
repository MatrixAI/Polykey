import { promisify } from 'util';

import * as grpc from '@grpc/grpc-js';
import * as clientPB from '../proto/js/Client_pb';

import { KeyManager } from '../keys';

const createKeysRPC = ({ keyManager }: { keyManager: KeyManager }) => {
  return {
    keysDelete: async (
      call: grpc.ServerUnaryCall<clientPB.KeyMessage, clientPB.EmptyMessage>,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
      try {
        await keyManager.delKey(call.request.getName());
      } catch (err) {
        callback(err, response);
      }
      callback(null, response);
    },
    keysGet: async (
      call: grpc.ServerUnaryCall<clientPB.KeyMessage, clientPB.KeyMessage>,
      callback: grpc.sendUnaryData<clientPB.KeyMessage>,
    ): Promise<void> => {
      const response = new clientPB.KeyMessage();
      try {
        const key = await keyManager.getKey(call.request.getName());
        if (key) {
          response.setName(key.toString());
        }
      } catch (err) {
        callback(err, response);
      }
      callback(null, response);
    },
    keysPut: async (
      call: grpc.ServerUnaryCall<clientPB.KeyMessage, clientPB.EmptyMessage>,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
      try {
        await keyManager.putKey(
          call.request.getName(),
          Buffer.from(call.request.getKey()),
        );
      } catch (err) {
        callback(err, response);
      }
      callback(null, response);
    },
    keysRootKeyPair: async (
      call: grpc.ServerUnaryCall<
        clientPB.EmptyMessage,
        clientPB.KeyPairMessage
      >,
      callback: grpc.sendUnaryData<clientPB.KeyPairMessage>,
    ): Promise<void> => {
      const response = new clientPB.KeyPairMessage();
      try {
        const keyPair = keyManager.getRootKeyPairPem();
        response.setPublic(keyPair.publicKey);
        response.setPrivate(keyPair.privateKey);
      } catch (err) {
        callback(err, response);
      }
      callback(null, response);
    },
    keysResetKeyPair: async (
      call: grpc.ServerUnaryCall<clientPB.KeyMessage, clientPB.EmptyMessage>,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
      try {
        await keyManager.resetRootKeyPair(call.request.getName());
      } catch (err) {
        callback(err, response);
      }
      callback(null, response);
    },
    keysRenewKeyPair: async (
      call: grpc.ServerUnaryCall<clientPB.KeyMessage, clientPB.EmptyMessage>,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
      try {
        await keyManager.renewRootKeyPair(call.request.getName());
      } catch (err) {
        callback(err, response);
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
        const data = await keyManager.encryptWithRootKeyPair(
          Buffer.from(call.request.getData(), 'binary'),
        );
        response.setData(data.toString('binary'));
      } catch (err) {
        callback(err, response);
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
        const data = await keyManager.decryptWithRootKeyPair(
          Buffer.from(call.request.getData(), 'binary'),
        );
        response.setData(data.toString('binary'));
      } catch (err) {
        callback(err, response);
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
        const signature = await keyManager.signWithRootKeyPair(
          Buffer.from(call.request.getData(), 'binary'),
        );
        response.setSignature(signature.toString('binary'));
      } catch (err) {
        callback(err, response);
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
        const status = await keyManager.verifyWithRootKeyPair(
          Buffer.from(call.request.getData(), 'binary'),
          Buffer.from(call.request.getSignature(), 'binary'),
        );
        response.setSuccess(status);
      } catch (err) {
        callback(err, response);
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
        await keyManager.changeRootKeyPassword(call.request.getPassword());
      } catch (err) {
        callback(err, response);
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
        const cert = keyManager.getRootCertPem();
        response.setCert(cert);
      } catch (err) {
        callback(err, response);
      }
      callback(null, response);
    },
    certsChainGet: async (
      call: grpc.ServerWritableStream<
        clientPB.EmptyMessage,
        clientPB.CertificateMessage
      >,
    ): Promise<void> => {
      const write = promisify(call.write).bind(call);
      const certs: Array<string> = await keyManager.getRootCertChainPems();
      let certMessage: clientPB.CertificateMessage;
      for (const cert of certs) {
        certMessage = new clientPB.CertificateMessage();
        certMessage.setCert(cert);
        await write(certMessage);
      }
      call.end();
    },
  };
};

export default createKeysRPC;
