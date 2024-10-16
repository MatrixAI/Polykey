import type {
  ClientManifest,
  JSONObject,
  JSONRPCResponseResult,
  RPCClient,
} from '@matrixai/rpc';
import type {
  GestaltIdEncoded,
  IdentityId,
  NodeIdEncoded,
  NotificationIdEncoded,
  ProviderId,
  VaultIdEncoded,
} from '../ids';
import type { GestaltAction } from '../gestalts/types';
import type { CommitId, VaultAction, VaultName } from '../vaults/types';
import type { CertificatePEM, JWKEncrypted, PublicKeyJWK } from '../keys/types';
import type { Notification } from '../notifications/types';
import type { ProviderToken } from '../identities/types';
import type { AuditMetricGetTypeOverride } from './callers/auditMetricGet';
import type {
  NodeContact,
  NodeAddress,
  NodeContactAddressData,
} from '../nodes/types';
import type { AuditEventsGetTypeOverride } from './callers/auditEventsGet';

type ClientRPCRequestParams<T extends JSONObject = JSONObject> =
  JSONRPCResponseResult<
    T,
    Partial<{
      authorization: string;
    }>
  >;

type ClientRPCResponseResult<T extends JSONObject = JSONObject> =
  JSONRPCResponseResult<
    T,
    Partial<{
      authorization: string;
    }>
  >;

type StatusResultMessage = {
  pid: number;
} & NodeIdMessage & {
    clientHost: string;
    clientPort: number;
    agentHost: string;
    agentPort: number;
    startTime: number;
    connectionsActive: number;
    nodesTotal: number;
    version: string;
    sourceVersion: string;
    stateVersion: number;
    networkVersion: number;
    versionMetadata: JSONObject;
  };

// Identity messages

type IdentityMessage = {
  providerId: string;
  identityId: string;
};

type ProviderSearchMessage = {
  authIdentityId?: string;
  identityId: string;
  disconnected: boolean;
  limit?: number;
  searchTermList?: Array<string>;
  providerIdList: Array<string>;
};

type IdentityInfoMessage = IdentityMessage & {
  name: string;
  email: string;
  url: string;
};

type AuthProcessMessage = {
  request?: {
    url: string;
    dataMap: Record<string, string>;
  };
  response?: {
    identityId: string;
  };
};

type ClaimIdMessage = {
  claimId: string;
  url?: string;
};

type ClaimNodeMessage = NodeIdMessage & {
  forceInvite?: boolean;
};

type TokenMessage = {
  token: ProviderToken;
};

// Nodes messages

type NodeIdMessage = {
  nodeIdEncoded: NodeIdEncoded;
};

type AddressMessage = {
  host: string;
  port: number;
};

type NodeAddressMessage = NodeIdMessage & AddressMessage;

type NodesFindMessage = {
  nodeAddress: NodeAddress;
  nodeContactAddressData: NodeContactAddressData;
};

type NodesGetMessage = NodeIdMessage & {
  nodeContact: NodeContact;
  bucketIndex: number;
};

type NodesAddMessage = NodeAddressMessage & {
  force?: boolean;
  ping?: boolean;
};

type NodeConnectionMessage = NodeAddressMessage & {
  hostname: string;
  usageCount: number;
  timeout: number;
};

// Gestalts messages

type ActionsListMessage = {
  actionsList: Array<GestaltAction>;
};

type SetIdentityActionMessage = IdentityMessage & {
  action: GestaltAction;
};

type SetNodeActionMessage = NodeIdMessage & {
  action: GestaltAction;
};

type GestaltMessage = {
  gestalt: {
    matrix: Record<NodeIdEncoded, Record<GestaltIdEncoded, null>>;
    nodes: Record<GestaltIdEncoded, { nodeId: NodeIdEncoded }>;
    identities: Record<
      GestaltIdEncoded,
      {
        providerId: ProviderId;
        identityId: IdentityId;
        name?: string;
        email?: string;
        url?: string;
      }
    >;
  };
};

// Keys messages

type CertMessage = {
  cert: CertificatePEM;
};

type DataMessage = {
  data: string;
};

type PublicKeyMessage = {
  publicKeyJwk: PublicKeyJWK;
};

type PrivateKeyMessage = {
  privateKeyJwe: JWKEncrypted;
};

type DecryptMessage = DataMessage & PublicKeyMessage;

type PasswordMessage = {
  password: string;
};

type KeyPairMessage = PrivateKeyMessage & PublicKeyMessage;

type SignatureMessage = {
  signature: string;
};

type VerifySignatureMessage = PublicKeyMessage & DataMessage & SignatureMessage;

type SuccessMessage = {
  type: 'success';
  success: boolean;
};

type ErrorMessage = {
  type: 'error';
  code: string;
  reason?: string;
  data?: JSONObject;
};

type SuccessOrErrorMessage = SuccessMessage | ErrorMessage;

// Notifications messages

type NotificationReadMessage = {
  seek?: NotificationIdEncoded | number;
  seekEnd?: NotificationIdEncoded | number;
  unread?: boolean;
  limit?: number;
  order?: 'asc' | 'desc';
};

type NotificationOutboxReadMessage = Omit<NotificationReadMessage, 'unread'>;

type NotificationInboxMessage = {
  notification: Notification;
};

type NotificationOutboxMessage = {
  notification: Notification;
  taskMetadata?: {
    remainingRetries: number;
    created: number;
    scheduled: number;
  };
};

type NotificationSendMessage = NodeIdMessage & {
  message: string;
  blocking?: boolean;
  retries?: number;
};

type NotificationRemoveMessage = {
  notificationIdEncoded: NotificationIdEncoded;
};

// Vaults messages

type VaultNameMessage = {
  vaultName: VaultName;
};

type VaultIdMessage = {
  vaultIdEncoded: VaultIdEncoded;
};

type VaultIdentifierMessage = {
  nameOrId: VaultIdEncoded | VaultName;
};

type CloneMessage = NodeIdMessage & VaultIdentifierMessage;

type VaultListMessage = VaultNameMessage & VaultIdMessage;

type VaultsLogMessage = VaultIdentifierMessage & {
  depth?: number;
  commitId?: string;
};

type LogEntryMessage = {
  commitId: CommitId;
  committer: string;
  timestamp: string;
  message: string;
};

type VaultPermissionMessage = VaultIdMessage &
  NodeIdMessage & {
    vaultPermissionList: Array<VaultAction>;
  };

type PermissionSetMessage = VaultIdentifierMessage &
  NodeIdMessage & {
    vaultPermissionList: Array<VaultAction>;
  };

type VaultsPullMessage = Partial<CloneMessage> & {
  pullVault: VaultIdEncoded | VaultName;
};

type VaultsRenameMessage = VaultIdentifierMessage & {
  newName: VaultName;
};

type VaultsScanMessage = VaultListMessage & {
  permissions: Array<VaultAction>;
};

type VaultsVersionMessage = VaultIdentifierMessage & {
  versionId: string;
};

type VaultsLatestVersionMessage = {
  latestVersion: boolean;
};

// Secrets
type SecretPathMessage = {
  secretName: string;
};

type SecretIdentifierMessage = VaultIdentifierMessage & SecretPathMessage;

// Contains binary content as a binary string 'toString('binary')'
type ContentMessage = {
  secretContent: string;
};

type ContentWithErrorMessage = ContentMessage & {
  error?: string;
};

type SecretContentMessage = SecretIdentifierMessage & ContentMessage;

type SecretDirMessage = VaultIdentifierMessage & {
  dirName: string;
};

type SecretRenameMessage = SecretIdentifierMessage & {
  newSecretName: string;
};

type SecretFilesMessage = {
  path: string;
  type: 'FILE' | 'DIRECTORY';
};

// Stat is the 'JSON.stringify version of the file stat
type SecretStatMessage = {
  stat: {
    dev: number;
    ino: number;
    mode: number;
    nlink: number;
    uid: number;
    gid: number;
    rdev: number;
    size: number;
    atime: string;
    mtime: string;
    ctime: string;
    birthtime: string;
    blksize: number;
    blocks: number;
  };
};

// Type casting for tricky handlers

type OverrideRPClientType<T extends RPCClient<ClientManifest>> = Omit<
  T,
  'methods'
> & {
  methods: {
    auditEventsGet: AuditEventsGetTypeOverride;
    auditMetricGet: AuditMetricGetTypeOverride;
  } & Omit<T['methods'], 'auditEventsGet' | 'auditMetricGet'>;
};

export type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  StatusResultMessage,
  IdentityMessage,
  ProviderSearchMessage,
  IdentityInfoMessage,
  AuthProcessMessage,
  ClaimIdMessage,
  ClaimNodeMessage,
  TokenMessage,
  NodeIdMessage,
  AddressMessage,
  NodeAddressMessage,
  NodesFindMessage,
  NodeConnectionMessage,
  ActionsListMessage,
  SetIdentityActionMessage,
  SetNodeActionMessage,
  GestaltMessage,
  CertMessage,
  DataMessage,
  PublicKeyMessage,
  PrivateKeyMessage,
  DecryptMessage,
  KeyPairMessage,
  VerifySignatureMessage,
  PasswordMessage,
  NodesGetMessage,
  NodesAddMessage,
  SuccessMessage,
  ErrorMessage,
  SuccessOrErrorMessage,
  NotificationInboxMessage,
  NotificationOutboxMessage,
  NotificationReadMessage,
  NotificationOutboxReadMessage,
  NotificationSendMessage,
  NotificationRemoveMessage,
  VaultNameMessage,
  VaultIdMessage,
  VaultIdentifierMessage,
  CloneMessage,
  VaultListMessage,
  VaultsLogMessage,
  LogEntryMessage,
  VaultPermissionMessage,
  PermissionSetMessage,
  VaultsPullMessage,
  VaultsRenameMessage,
  VaultsScanMessage,
  VaultsVersionMessage,
  VaultsLatestVersionMessage,
  SecretPathMessage,
  SecretIdentifierMessage,
  ContentMessage,
  ContentWithErrorMessage,
  SecretContentMessage,
  SecretDirMessage,
  SecretRenameMessage,
  SecretFilesMessage,
  SecretStatMessage,
  SignatureMessage,
  OverrideRPClientType,
  AuditMetricGetTypeOverride,
};
