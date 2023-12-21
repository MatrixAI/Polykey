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
  ProviderId,
  VaultIdEncoded,
} from '../ids';
import type { GestaltAction } from '../gestalts/types';
import type { CommitId, VaultAction, VaultName } from '../vaults/types';
import type { CertificatePEM, JWKEncrypted, PublicKeyJWK } from '../keys/types';
import type { Notification } from '../notifications/types';
import type { ProviderToken } from '../identities/types';
import type { AuditEventsGetTypeOverride } from './callers/auditEventsGet';
import type { AuditMetricGetTypeOverride } from './callers/auditMetricGet';
import type {
  NodeContact,
  NodeAddress,
  NodeContactAddressData,
} from '../nodes/types';

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
  success: boolean;
};

// Notifications messages

type NotificationReadMessage = {
  unread?: boolean;
  number?: number | 'all';
  order?: 'newest' | 'oldest';
};

type NotificationMessage = {
  notification: Notification;
};

type NotificationSendMessage = NodeIdMessage & {
  message: string;
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

type SecretNameMessage = {
  secretName: string;
};

type SecretIdentifierMessage = VaultIdentifierMessage & SecretNameMessage;

// Contains binary content as a binary string 'toString('binary')'
type ContentMessage = {
  secretContent: string;
};

type SecretContentMessage = SecretIdentifierMessage & ContentMessage;

type SecretMkdirMessage = VaultIdentifierMessage & {
  dirName: string;
  recursive: boolean;
};

type SecretDirMessage = VaultIdentifierMessage & {
  dirName: string;
};

type SecretRenameMessage = SecretIdentifierMessage & {
  newSecretName: string;
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
  } & T['methods'];
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
  NotificationMessage,
  NotificationReadMessage,
  NotificationSendMessage,
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
  SecretNameMessage,
  SecretIdentifierMessage,
  ContentMessage,
  SecretContentMessage,
  SecretMkdirMessage,
  SecretDirMessage,
  SecretRenameMessage,
  SecretStatMessage,
  SignatureMessage,
  OverrideRPClientType,
  AuditEventsGetTypeOverride,
  AuditMetricGetTypeOverride,
};
