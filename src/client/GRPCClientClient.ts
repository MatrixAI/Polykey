import { ChannelCredentials, ClientOptions } from '@grpc/grpc-js';
import Logger from '@matrixai/logger';
import { ClientClient } from '../proto/js/Client_grpc_pb';
import * as clientPB from '../proto/js/Client_pb';
import { utils as grpcUtils } from '../grpc';
import * as clientErrors from './errors';
import GRPCClient from '../grpc/GRPCClient';

class GRPCClientClient extends GRPCClient<ClientClient> {
  constructor({
    host,
    port,
    logger,
  }: {
    host: string;
    port: number;
    logger?: Logger;
  }) {
    super({ host, port, logger });
  }

  public async start({
    credentials,
    options,
    timeout = Infinity,
  }: {
    credentials: ChannelCredentials;
    options?: Partial<ClientOptions>;
    timeout?: number;
  }): Promise<void> {
    await super.start({
      clientConstructor: ClientClient,
      credentials,
      options,
      timeout,
    });
  }

  public echo(...args) {
    if (!this.client) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EchoMessage>(
      this.client,
      this.client.echo,
    )(...args);
  }

  public vaultsList(...args) {
    if (!this.client) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyReadableStreamCall<clientPB.VaultMessage>(
      this.client,
      this.client.vaultsList,
    )(...args);
  }

  public vaultsCreate(...args) {
    if (!this.client) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.vaultsCreate,
    )(...args);
  }

  public vaultsDelete(...args) {
    if (!this.client) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.vaultsDelete,
    )(...args);
  }

  public vaultsListSecrets(...args) {
    if (!this.client) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyReadableStreamCall<clientPB.SecretMessage>(
      this.client,
      this.client.vaultsListSecrets,
    )(...args);
  }

  public vaultsMkdir(...args) {
    if (!this.client) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.vaultsMkdir,
    )(...args);
  }

  public commitSync(...args) {
    if (!this.client) throw new clientErrors.ErrorClientClientNotStarted();
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
