import type { Interceptor } from '@grpc/grpc-js';
import type { Session } from '../sessions';
import type { NodeId } from '../nodes/types';
import type { Host, Port, TLSConfig, ProxyConfig } from '../network/types';

import type * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import type * as agentPB from '../proto/js/polykey/v1/agent/agent_pb';
import type * as vaultsPB from '../proto/js/polykey/v1/vaults/vaults_pb';
import type * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import type * as notificationsPB from '../proto/js/polykey/v1/notifications/notifications_pb';
import type * as sessionsPB from '../proto/js/polykey/v1/sessions/sessions_pb';
import type * as gestaltsPB from '../proto/js/polykey/v1/gestalts/gestalts_pb';
import type * as identitiesPB from '../proto/js/polykey/v1/identities/identities_pb';
import type * as keysPB from '../proto/js/polykey/v1/keys/keys_pb';
import type * as permissionsPB from '../proto/js/polykey/v1/permissions/permissions_pb';
import type * as secretsPB from '../proto/js/polykey/v1/secrets/secrets_pb';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import Logger from '@matrixai/logger';
import * as clientErrors from './errors';
import * as clientUtils from './utils';
import { ClientServiceClient } from '../proto/js/polykey/v1/client_service_grpc_pb';
import { GRPCClient, utils as grpcUtils } from '../grpc';

interface GRPCClientClient extends CreateDestroy {}
@CreateDestroy()
class GRPCClientClient extends GRPCClient<ClientServiceClient> {
  /**
   * Creates GRPCClientClient
   * This connects to the client service
   * This connection should be encrypted with TLS with or without
   * client authentication
   */
  static async createGRPCClientClient({
    nodeId,
    host,
    port,
    tlsConfig,
    proxyConfig,
    session,
    timeout = Infinity,
    logger = new Logger(this.name),
  }: {
    nodeId: NodeId;
    host: Host;
    port: Port;
    tlsConfig?: Partial<TLSConfig>;
    proxyConfig?: ProxyConfig;
    session?: Session;
    timeout?: number;
    logger?: Logger;
  }): Promise<GRPCClientClient> {
    logger.info(`Creating ${this.name}`);
    const interceptors: Array<Interceptor> = [];
    if (session != null) {
      interceptors.push(clientUtils.sessionInterceptor(session));
    }
    const { client, serverCertChain } = await super.createClient({
      clientConstructor: ClientServiceClient,
      nodeId,
      host,
      port,
      tlsConfig,
      proxyConfig,
      timeout,
      interceptors,
      logger,
    });
    const grpcClientClient = new GRPCClientClient({
      client,
      nodeId,
      host,
      port,
      tlsConfig,
      proxyConfig,
      serverCertChain,
      logger,
    });
    logger.info(`Created ${this.name}`);
    return grpcClientClient;
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await super.destroy();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public agentStatus(...args) {
    return grpcUtils.promisifyUnaryCall<agentPB.InfoMessage>(
      this.client,
      this.client.agentStatus,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public agentStop(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.agentStop,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public sessionsUnlock(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.sessionsUnlock,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public sessionsLockAll(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.sessionsLockAll,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsList(...args) {
    return grpcUtils.promisifyReadableStreamCall<vaultsPB.List>(
      this.client,
      this.client.vaultsList,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsCreate(...args) {
    return grpcUtils.promisifyUnaryCall<vaultsPB.Vault>(
      this.client,
      this.client.vaultsCreate,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsRename(...args) {
    return grpcUtils.promisifyUnaryCall<vaultsPB.Vault>(
      this.client,
      this.client.vaultsRename,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsDelete(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsDelete,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsClone(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsClone,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsPull(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsPull,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsScan(...args) {
    return grpcUtils.promisifyReadableStreamCall<vaultsPB.List>(
      this.client,
      this.client.vaultsScan,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsPermissionsSet(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsPermissionsSet,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsPermissionsUnset(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsPermissionsUnset,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultPermissions(...args) {
    return grpcUtils.promisifyReadableStreamCall<vaultsPB.Permission>(
      this.client,
      this.client.vaultsPermissions,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsSecretsList(...args) {
    return grpcUtils.promisifyReadableStreamCall<secretsPB.Secret>(
      this.client,
      this.client.vaultsSecretsList,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsSecretsMkdir(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.vaultsSecretsMkdir,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsSecretsStat(...args) {
    return grpcUtils.promisifyUnaryCall<vaultsPB.Stat>(
      this.client,
      this.client.vaultsSecretsStat,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsSecretsDelete(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsSecretsDelete,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsSecretsEdit(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsSecretsEdit,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsSecretsGet(...args) {
    return grpcUtils.promisifyUnaryCall<secretsPB.Secret>(
      this.client,
      this.client.vaultsSecretsGet,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsSecretsRename(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsSecretsRename,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsSecretsNew(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsSecretsNew,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsSecretsNewDir(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.vaultsSecretsNewDir,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsVersion(...args) {
    return grpcUtils.promisifyUnaryCall<vaultsPB.VersionResult>(
      this.client,
      this.client.vaultsVersion,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public vaultsLog(...args) {
    return grpcUtils.promisifyReadableStreamCall<vaultsPB.LogEntry>(
      this.client,
      this.client.vaultsLog,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public keysKeyPairRoot(...args) {
    return grpcUtils.promisifyUnaryCall<keysPB.KeyPair>(
      this.client,
      this.client.keysKeyPairRoot,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public keysKeyPairReset(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.keysKeyPairReset,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public keysKeyPairRenew(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.keysKeyPairRenew,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public keysEncrypt(...args) {
    return grpcUtils.promisifyUnaryCall<keysPB.Crypto>(
      this.client,
      this.client.keysEncrypt,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public keysDecrypt(...args) {
    return grpcUtils.promisifyUnaryCall<keysPB.Crypto>(
      this.client,
      this.client.keysDecrypt,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public keysSign(...args) {
    return grpcUtils.promisifyUnaryCall<keysPB.Crypto>(
      this.client,
      this.client.keysSign,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public keysVerify(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.keysVerify,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public keysPasswordChange(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.keysPasswordChange,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public keysCertsGet(...args) {
    return grpcUtils.promisifyUnaryCall<keysPB.Certificate>(
      this.client,
      this.client.keysCertsGet,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public keysCertsChainGet(...args) {
    return grpcUtils.promisifyReadableStreamCall<keysPB.Certificate>(
      this.client,
      this.client.keysCertsChainGet,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public gestaltsGestaltList(...args) {
    return grpcUtils.promisifyReadableStreamCall<gestaltsPB.Gestalt>(
      this.client,
      this.client.gestaltsGestaltList,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public gestaltsGestaltGetByIdentity(...args) {
    return grpcUtils.promisifyUnaryCall<gestaltsPB.Graph>(
      this.client,
      this.client.gestaltsGestaltGetByIdentity,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public gestaltsGestaltGetByNode(...args) {
    return grpcUtils.promisifyUnaryCall<gestaltsPB.Graph>(
      this.client,
      this.client.gestaltsGestaltGetByNode,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public gestaltsDiscoveryByNode(...args) {
    return grpcUtils.promisifyUnaryCall<gestaltsPB.Gestalt>(
      this.client,
      this.client.gestaltsDiscoveryByNode,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public gestaltsDiscoveryByIdentity(...args) {
    return grpcUtils.promisifyUnaryCall<gestaltsPB.Gestalt>(
      this.client,
      this.client.gestaltsDiscoveryByIdentity,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public gestaltsActionsGetByNode(...args) {
    return grpcUtils.promisifyUnaryCall<permissionsPB.Actions>(
      this.client,
      this.client.gestaltsActionsGetByNode,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public gestaltsActionsGetByIdentity(...args) {
    return grpcUtils.promisifyUnaryCall<permissionsPB.Actions>(
      this.client,
      this.client.gestaltsActionsGetByIdentity,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public gestaltsActionsSetByNode(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.gestaltsActionsSetByNode,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public gestaltsActionsSetByIdentity(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.gestaltsActionsSetByIdentity,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public gestaltsActionsUnsetByNode(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.gestaltsActionsUnsetByNode,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public gestaltsActionsUnsetByIdentity(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.gestaltsActionsUnsetByIdentity,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public identitiesTokenPut(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.identitiesTokenPut,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public identitiesGetToken(...args) {
    return grpcUtils.promisifyUnaryCall<identitiesPB.Token>(
      this.client,
      this.client.identitiesTokenGet,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public identitiesTokenDelete(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.identitiesTokenDelete,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public identitiesProvidersList(...args) {
    return grpcUtils.promisifyUnaryCall<identitiesPB.Provider>(
      this.client,
      this.client.identitiesProvidersList,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public nodesAdd(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.nodesAdd,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public nodesPing(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.nodesPing,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public nodesClaim(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      this.client,
      this.client.nodesClaim,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public nodesFind(...args) {
    return grpcUtils.promisifyUnaryCall<nodesPB.NodeAddress>(
      this.client,
      this.client.nodesFind,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public identitiesAuthenticate(...args) {
    return grpcUtils.promisifyReadableStreamCall<identitiesPB.Provider>(
      this.client,
      this.client.identitiesAuthenticate,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public identitiesInfoGetConnected(...args) {
    return grpcUtils.promisifyUnaryCall<identitiesPB.ProviderSearch>(
      this.client,
      this.client.identitiesInfoGetConnected,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public identitiesInfoGet(...args) {
    return grpcUtils.promisifyUnaryCall<identitiesPB.Provider>(
      this.client,
      this.client.identitiesInfoGet,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public identitiesClaim(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.identitiesClaim,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public notificationsSend(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.notificationsSend,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public notificationsRead(...args) {
    return grpcUtils.promisifyUnaryCall<notificationsPB.List>(
      this.client,
      this.client.notificationsRead,
    )(...args);
  }

  @ready(new clientErrors.ErrorClientClientDestroyed())
  public notificationsClear(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.notificationsClear,
    )(...args);
  }
}

export default GRPCClientClient;
