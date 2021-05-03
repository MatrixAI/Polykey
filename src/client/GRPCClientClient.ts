import type { NodeId } from '@/nodes/types';
import type { CertificatePemChain, PrivateKeyPem } from '../keys/types';

import Logger from '@matrixai/logger';
import * as clientErrors from './errors';
import { utils as grpcUtils } from '../grpc';
import GRPCClient from '../grpc/GRPCClient';
import * as clientPB from '../proto/js/Client_pb';
import { ClientClient } from '../proto/js/Client_grpc_pb';

class GRPCClientClient extends GRPCClient<ClientClient> {
  constructor({
    nodeId,
    host,
    port,
    logger,
  }: {
    nodeId: NodeId;
    host: string;
    port: number;
    logger?: Logger;
  }) {
    super({ nodeId, host, port, logger });
  }

  public async start({
    keyPrivatePem,
    certChainPem,
    timeout = Infinity,
  }: {
    keyPrivatePem: PrivateKeyPem;
    certChainPem: CertificatePemChain;
    timeout?: number;
  }): Promise<void> {
    await super.start({
      clientConstructor: ClientClient,
      keyPrivatePem,
      certChainPem,
      timeout,
    });
  }

  public echo(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EchoMessage>(
      this.client,
      this.client.echo,
    )(...args);
  }

  public vaultsList(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyReadableStreamCall<clientPB.VaultMessage>(
      this.client,
      this.client.vaultsList,
    )(...args);
  }

  public vaultsCreate(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.vaultsCreate,
    )(...args);
  }

  public vaultsDelete(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.vaultsDelete,
    )(...args);
  }

  public vaultsListSecrets(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyReadableStreamCall<clientPB.SecretMessage>(
      this.client,
      this.client.vaultsListSecrets,
    )(...args);
  }

  public vaultsMkdir(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.vaultsMkdir,
    )(...args);
  }

  public commitSync(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyWritableStreamCall<
      clientPB.CommitMessage,
      clientPB.CommitMessage
    >(
      this.client,
      this.client.commitSync,
    )(...args);
  }
}

export default GRPCClientClient;
