import type { TLSConfig } from '../network/types';

import * as clientErrors from './errors';
import { GRPCClient, utils as grpcUtils } from '../grpc';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as vaultsPB from '../proto/js/polykey/v1/vaults/vaults_pb';
import * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import * as notificationsPB from '../proto/js/polykey/v1/notifications/notifications_pb';
import * as sessionsPB from '../proto/js/polykey/v1/sessions/sessions_pb';
import * as gestaltsPB from '../proto/js/polykey/v1/gestalts/gestalts_pb';
import * as identitiesPB from '../proto/js/polykey/v1/identities/identities_pb';
import * as keysPB from '../proto/js/polykey/v1/keys/keys_pb';
import * as permissionsPB from '../proto/js/polykey/v1/permissions/permissions_pb';
import * as secretsPB from '../proto/js/polykey/v1/secrets/secrets_pb';
import { ClientServiceClient } from '../proto/js/polykey/v1/client_service_grpc_pb';
import { Session } from '../sessions';
import { NodeId } from '../nodes/types';
import { Host, Port, ProxyConfig } from '../network/types';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { errors as grpcErrors } from '../grpc';

@CreateDestroyStartStop(
  new grpcErrors.ErrorGRPCClientNotStarted(),
  new grpcErrors.ErrorGRPCClientDestroyed(),
)
class GRPCClientClient extends GRPCClient<ClientServiceClient> {
  static async createGRPCCLientClient({
    nodeId,
    host,
    port,
    proxyConfig,
    logger,
  }: {
    nodeId: NodeId;
    host: Host;
    port: Port;
    proxyConfig?: ProxyConfig;
    logger?: Logger;
  }): Promise<GRPCClientClient> {
    const logger_ = logger ?? new Logger('GRPCClientClient');
    logger_.info('Creating GRPCClientClient');
    const grpcClientClient = new GRPCClientClient({
      host,
      logger: logger_,
      nodeId,
      port,
      proxyConfig,
    });
    logger_.info('Created GRPCClientAgent');
    return grpcClientClient;
  }

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
      clientConstructor: ClientServiceClient,
      tlsConfig,
      timeout,
      secure: true,
      session,
    });
  }

  public async destroy() {
    this.logger.info('Destroyed GRPCClientClient');
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public echo(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      this.client,
      this.client.echo,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public agentStop(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.agentStop,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public sessionUnlock(...args) {
    return grpcUtils.promisifyUnaryCall<sessionsPB.Token>(
      this.client,
      this.client.sessionUnlock,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public sessionRefresh(...args) {
    return grpcUtils.promisifyUnaryCall<sessionsPB.Token>(
      this.client,
      this.client.sessionRefresh,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public sessionLockAll(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.sessionLockAll,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsList(...args) {
    return grpcUtils.promisifyReadableStreamCall<vaultsPB.List>(
      this.client,
      this.client.vaultsList,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsCreate(...args) {
    return grpcUtils.promisifyUnaryCall<vaultsPB.Vault>(
      this.client,
      this.client.vaultsCreate,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsRename(...args) {
    if (!this.client) throw new clientErrors.ErrorClientClientNotStarted();
    return grpcUtils.promisifyUnaryCall<vaultsPB.Vault>(
      this.client,
      this.client.vaultsRename,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsDelete(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsDelete,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsClone(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsClone,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsPull(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsPull,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsScan(...args) {
    return grpcUtils.promisifyReadableStreamCall<vaultsPB.List>(
      this.client,
      this.client.vaultsScan,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsPermissionsSet(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsPermissionsSet,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsPermissionsUnset(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsPermissionsUnset,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultPermissions(...args) {
    return grpcUtils.promisifyReadableStreamCall<vaultsPB.Permission>(
      this.client,
      this.client.vaultsPermissions,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsSecretsList(...args) {
    return grpcUtils.promisifyReadableStreamCall<secretsPB.Secret>(
      this.client,
      this.client.vaultsSecretsList,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsSecretsMkdir(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.vaultsSecretsMkdir,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsSecretsStat(...args) {
    return grpcUtils.promisifyUnaryCall<vaultsPB.Stat>(
      this.client,
      this.client.vaultsSecretsStat,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsSecretsDelete(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsSecretsDelete,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsSecretsEdit(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsSecretsEdit,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsSecretsGet(...args) {
    return grpcUtils.promisifyUnaryCall<secretsPB.Secret>(
      this.client,
      this.client.vaultsSecretsGet,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsSecretsRename(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsSecretsRename,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsSecretsNew(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsSecretsNew,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsSecretsNewDir(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsSecretsNewDir,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsVersion(...args) {
    return grpcUtils.promisifyUnaryCall<vaultsPB.VersionResult>(
      this.client,
      this.client.vaultsVersion,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsLog(...args) {
    return grpcUtils.promisifyReadableStreamCall<vaultsPB.LogEntry>(
      this.client,
      this.client.vaultsLog,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public keysKeyPairRoot(...args) {
    return grpcUtils.promisifyUnaryCall<keysPB.KeyPair>(
      this.client,
      this.client.keysKeyPairRoot,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public keysKeyPairReset(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.keysKeyPairReset,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public keysKeyPairRenew(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.keysKeyPairRenew,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public keysEncrypt(...args) {
    return grpcUtils.promisifyUnaryCall<keysPB.Crypto>(
      this.client,
      this.client.keysEncrypt,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public keysDecrypt(...args) {
    return grpcUtils.promisifyUnaryCall<keysPB.Crypto>(
      this.client,
      this.client.keysDecrypt,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public keysSign(...args) {
    return grpcUtils.promisifyUnaryCall<keysPB.Crypto>(
      this.client,
      this.client.keysSign,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public keysVerify(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.keysVerify,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public keysPasswordChange(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.keysPasswordChange,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public keysCertsGet(...args) {
    return grpcUtils.promisifyUnaryCall<keysPB.Certificate>(
      this.client,
      this.client.keysCertsGet,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public keysCertsChainGet(...args) {
    return grpcUtils.promisifyReadableStreamCall<keysPB.Certificate>(
      this.client,
      this.client.keysCertsChainGet,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public gestaltsGestaltList(...args) {
    return grpcUtils.promisifyReadableStreamCall<gestaltsPB.Gestalt>(
      this.client,
      this.client.gestaltsGestaltList,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public gestaltsGestaltGetByIdentity(...args) {
    return grpcUtils.promisifyUnaryCall<gestaltsPB.Graph>(
      this.client,
      this.client.gestaltsGestaltGetByIdentity,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public gestaltsGestaltGetByNode(...args) {
    return grpcUtils.promisifyUnaryCall<gestaltsPB.Graph>(
      this.client,
      this.client.gestaltsGestaltGetByNode,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public gestaltsDiscoveryByNode(...args) {
    return grpcUtils.promisifyUnaryCall<gestaltsPB.Gestalt>(
      this.client,
      this.client.gestaltsDiscoveryByNode,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public gestaltsDiscoveryByIdentity(...args) {
    return grpcUtils.promisifyUnaryCall<gestaltsPB.Gestalt>(
      this.client,
      this.client.gestaltsDiscoveryByIdentity,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public gestaltsActionsGetByNode(...args) {
    return grpcUtils.promisifyUnaryCall<permissionsPB.Actions>(
      this.client,
      this.client.gestaltsActionsGetByNode,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public gestaltsActionsGetByIdentity(...args) {
    return grpcUtils.promisifyUnaryCall<permissionsPB.Actions>(
      this.client,
      this.client.gestaltsActionsGetByIdentity,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public gestaltsActionsSetByNode(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.gestaltsActionsSetByNode,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public gestaltsActionsSetByIdentity(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.gestaltsActionsSetByIdentity,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public gestaltsActionsUnsetByNode(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.gestaltsActionsUnsetByNode,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public gestaltsActionsUnsetByIdentity(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.gestaltsActionsUnsetByIdentity,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public identitiesTokenPut(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.identitiesTokenPut,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public identitiesGetToken(...args) {
    return grpcUtils.promisifyUnaryCall<identitiesPB.Token>(
      this.client,
      this.client.identitiesTokenGet,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public identitiesTokenDelete(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.identitiesTokenDelete,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public identitiesProvidersList(...args) {
    return grpcUtils.promisifyUnaryCall<identitiesPB.Provider>(
      this.client,
      this.client.identitiesProvidersList,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public nodesAdd(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.nodesAdd,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public nodesPing(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.nodesPing,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public nodesClaim(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.nodesClaim,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public nodesFind(...args) {
    return grpcUtils.promisifyUnaryCall<nodesPB.NodeAddress>(
      this.client,
      this.client.nodesFind,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public identitiesAuthenticate(...args) {
    return grpcUtils.promisifyReadableStreamCall<identitiesPB.Provider>(
      this.client,
      this.client.identitiesAuthenticate,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public identitiesInfoGetConnected(...args) {
    return grpcUtils.promisifyUnaryCall<identitiesPB.ProviderSearch>(
      this.client,
      this.client.identitiesInfoGetConnected,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public identitiesInfoGet(...args) {
    return grpcUtils.promisifyUnaryCall<identitiesPB.Provider>(
      this.client,
      this.client.identitiesInfoGet,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public identitiesClaim(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.identitiesClaim,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public notificationsSend(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.notificationsSend,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public notificationsRead(...args) {
    return grpcUtils.promisifyUnaryCall<notificationsPB.List>(
      this.client,
      this.client.notificationsRead,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public notificationsClear(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.notificationsClear,
    )(...args);
  }
}

export default GRPCClientClient;
