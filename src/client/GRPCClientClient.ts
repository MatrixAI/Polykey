import type { TLSConfig } from '../network/types';

import * as clientErrors from './errors';
import { GRPCClient, utils as grpcUtils } from '../grpc';
import * as clientPB from '../proto/js/Client_pb';
import { ClientClient } from '../proto/js/Client_grpc_pb';
import { Session } from '../sessions';

class GRPCClientClient extends GRPCClient<ClientClient> {
  public async start({
    tlsConfig,
    session,
    timeout = Infinity,
  }: {
    tlsConfig?: TLSConfig;
    session?: Session;
    timeout?: number;
  } = {}): Promise<void> {
    await super.start({
      clientConstructor: ClientClient,
      tlsConfig,
      timeout,
      secure: true,
      session,
    });
  }

  public echo(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EchoMessage>(
      this.client,
      this.client.echo,
    )(...args);
  }

  public agentStop(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.agentStop,
    )(...args);
  }

  public sessionUnlock(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.SessionTokenMessage>(
      this.client,
      this.client.sessionUnlock,
    )(...args);
  }

  public sessionRefresh(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.SessionTokenMessage>(
      this.client,
      this.client.sessionRefresh,
    )(...args);
  }

  public sessionLockAll(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.sessionLockAll,
    )(...args);
  }

  public vaultsList(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyReadableStreamCall<clientPB.VaultListMessage>(
      this.client,
      this.client.vaultsList,
    )(...args);
  }

  public vaultsCreate(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.VaultMessage>(
      this.client,
      this.client.vaultsCreate,
    )(...args);
  }

  public vaultsRename(...args) {
    if (!this.client) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.VaultMessage>(
      this.client,
      this.client.vaultsRename,
    )(...args);
  }

  public vaultsDelete(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.vaultsDelete,
    )(...args);
  }

  public vaultsClone(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.vaultsClone,
    )(...args);
  }

  public vaultsPull(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.vaultsPull,
    )(...args);
  }

  public vaultsScan(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyReadableStreamCall<clientPB.VaultListMessage>(
      this.client,
      this.client.vaultsScan,
    )(...args);
  }

  public vaultsPermissionsSet(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.vaultsPermissionsSet,
    )(...args);
  }

  public vaultsPermissionsUnset(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.vaultsPermissionsUnset,
    )(...args);
  }

  public vaultPermissions(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyReadableStreamCall<clientPB.PermissionMessage>(
      this.client,
      this.client.vaultsPermissions,
    )(...args);
  }

  public vaultsSecretsList(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyReadableStreamCall<clientPB.SecretMessage>(
      this.client,
      this.client.vaultsSecretsList,
    )(...args);
  }

  public vaultsSecretsMkdir(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.vaultsSecretsMkdir,
    )(...args);
  }

  public vaultsSecretsStat(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatMessage>(
      this.client,
      this.client.vaultsSecretsStat,
    )(...args);
  }

  public vaultsSecretsDelete(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.vaultsSecretsDelete,
    )(...args);
  }

  public vaultsSecretsEdit(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.vaultsSecretsEdit,
    )(...args);
  }

  public vaultsSecretsGet(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.SecretMessage>(
      this.client,
      this.client.vaultsSecretsGet,
    )(...args);
  }

  public vaultsSecretsRename(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.vaultsSecretsRename,
    )(...args);
  }

  public vaultsSecretsNew(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.vaultsSecretsNew,
    )(...args);
  }

  public vaultsSecretsNewDir(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.vaultsSecretsNewDir,
    )(...args);
  }

  public keysKeyPairRoot(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.KeyPairMessage>(
      this.client,
      this.client.keysKeyPairRoot,
    )(...args);
  }

  public keysKeyPairReset(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.keysKeyPairReset,
    )(...args);
  }

  public keysKeyPairRenew(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.keysKeyPairRenew,
    )(...args);
  }

  public keysEncrypt(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.CryptoMessage>(
      this.client,
      this.client.keysEncrypt,
    )(...args);
  }

  public keysDecrypt(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.CryptoMessage>(
      this.client,
      this.client.keysDecrypt,
    )(...args);
  }

  public keysSign(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.CryptoMessage>(
      this.client,
      this.client.keysSign,
    )(...args);
  }

  public keysVerify(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.keysVerify,
    )(...args);
  }

  public keysPasswordChange(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.keysPasswordChange,
    )(...args);
  }

  public keysCertsGet(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.CertificateMessage>(
      this.client,
      this.client.keysCertsGet,
    )(...args);
  }

  public keysCertsChainGet(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyReadableStreamCall<clientPB.CertificateMessage>(
      this.client,
      this.client.keysCertsChainGet,
    )(...args);
  }

  public gestaltsGestaltList(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyReadableStreamCall<clientPB.GestaltMessage>(
      this.client,
      this.client.gestaltsGestaltList,
    )(...args);
  }

  public gestaltsGestaltGetByIdentity(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.GestaltGraphMessage>(
      this.client,
      this.client.gestaltsGestaltGetByIdentity,
    )(...args);
  }

  public gestaltsGestaltGetByNode(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.GestaltGraphMessage>(
      this.client,
      this.client.gestaltsGestaltGetByNode,
    )(...args);
  }

  public gestaltsDiscoveryByNode(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.GestaltMessage>(
      this.client,
      this.client.gestaltsDiscoveryByNode,
    )(...args);
  }

  public gestaltsDiscoveryByIdentity(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.GestaltMessage>(
      this.client,
      this.client.gestaltsDiscoveryByIdentity,
    )(...args);
  }

  public gestaltsActionsGetByNode(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.ActionsMessage>(
      this.client,
      this.client.gestaltsActionsGetByNode,
    )(...args);
  }

  public gestaltsActionsGetByIdentity(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.ActionsMessage>(
      this.client,
      this.client.gestaltsActionsGetByIdentity,
    )(...args);
  }

  public gestaltsActionsSetByNode(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.gestaltsActionsSetByNode,
    )(...args);
  }

  public gestaltsActionsSetByIdentity(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.gestaltsActionsSetByIdentity,
    )(...args);
  }

  public gestaltsActionsUnsetByNode(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.gestaltsActionsUnsetByNode,
    )(...args);
  }

  public gestaltsActionsUnsetByIdentity(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.gestaltsActionsUnsetByIdentity,
    )(...args);
  }

  public identitiesTokenPut(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.identitiesTokenPut,
    )(...args);
  }

  public identitiesGetToken(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.TokenMessage>(
      this.client,
      this.client.identitiesTokenGet,
    )(...args);
  }

  public identitiesTokenDelete(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.identitiesTokenDelete,
    )(...args);
  }

  public identitiesProvidersList(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.ProviderMessage>(
      this.client,
      this.client.identitiesProvidersList,
    )(...args);
  }

  public nodesAdd(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.nodesAdd,
    )(...args);
  }

  public nodesPing(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.nodesPing,
    )(...args);
  }

  public nodesClaim(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      this.client,
      this.client.nodesClaim,
    )(...args);
  }

  public nodesFind(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.NodeAddressMessage>(
      this.client,
      this.client.nodesFind,
    )(...args);
  }

  public identitiesAuthenticate(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyReadableStreamCall<clientPB.ProviderMessage>(
      this.client,
      this.client.identitiesAuthenticate,
    )(...args);
  }

  public identitiesInfoGetConnected(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.ProviderSearchMessage>(
      this.client,
      this.client.identitiesInfoGetConnected,
    )(...args);
  }

  public identitiesInfoGet(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.ProviderMessage>(
      this.client,
      this.client.identitiesInfoGet,
    )(...args);
  }

  public identitiesClaim(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.identitiesClaim,
    )(...args);
  }

  public notificationsSend(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.notificationsSend,
    )(...args);
  }

  public notificationsRead(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.NotificationsListMessage>(
      this.client,
      this.client.notificationsRead,
    )(...args);
  }

  public notificationsClear(...args) {
    if (!this._started) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      this.client,
      this.client.notificationsClear,
    )(...args);
  }
}

export default GRPCClientClient;
