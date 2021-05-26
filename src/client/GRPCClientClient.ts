import type { TLSConfig } from '../network/types';

import * as clientErrors from './errors';
import { GRPCClient, utils as grpcUtils } from '../grpc';
import * as clientPB from '../proto/js/Client_pb';
import { ClientClient } from '../proto/js/Client_grpc_pb';

class GRPCClientClient extends GRPCClient<ClientClient> {
  public async start({
    tlsConfig,
    timeout = Infinity,
  }: {
    tlsConfig?: TLSConfig;
    timeout?: number;
  } = {}): Promise<void> {
    await super.start({
      clientConstructor: ClientClient,
      tlsConfig,
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
