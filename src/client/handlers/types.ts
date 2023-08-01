import type { IdentityId, ProviderId, VaultIdEncoded } from '../../ids';
import type { GestaltAction } from '../../gestalts/types';
import type { ProviderToken } from '../../identities/types';
import type { GestaltIdEncoded, NodeIdEncoded } from '../../ids';
import type {
  CertificatePEM,
  CertificatePEMChain,
  JWKEncrypted,
  PublicKeyJWK,
} from '../../keys/types';
import type { Notification } from '../../notifications/types';
import type { CommitId, VaultAction, VaultName } from '../../vaults/types';

// Agent messages
export type StatusResultMessage = {
  pid: number;
} & NodeIdMessage &
  PublicKeyMessage & {
    clientHost: string;
    clientPort: number;
    agentHost: string;
    agentPort: number;
    certChainPEM: CertificatePEMChain;
  };

// Identity messages
export type IdentityMessage = {
  providerId: string;
  identityId: string;
};

export type ProviderSearchMessage = {
  authIdentityId?: string;
  identityId: string;
  disconnected: boolean;
  limit?: number;
  searchTermList?: Array<string>;
  providerIdList: Array<string>;
};

export type IdentityInfoMessage = IdentityMessage & {
  name: string;
  email: string;
  url: string;
};

export type AuthProcessMessage = {
  request?: {
    url: string;
    dataMap: Record<string, string>;
  };
  response?: {
    identityId: string;
  };
};

export type ClaimIdMessage = {
  claimId: string;
  url?: string;
};

export type ClaimNodeMessage = NodeIdMessage & {
  forceInvite?: boolean;
};

export type TokenMessage = {
  token: ProviderToken;
};

// Nodes messages
export type NodeIdMessage = {
  nodeIdEncoded: NodeIdEncoded;
};

export type AddressMessage = {
  host: string;
  port: number;
};

export type NodeAddressMessage = NodeIdMessage & AddressMessage;

export type NodesGetMessage = NodeAddressMessage & { bucketIndex: number };

export type NodesAddMessage = NodeAddressMessage & {
  force?: boolean;
  ping?: boolean;
};

export type NodeConnectionMessage = NodeAddressMessage & {
  hostname: string;
  usageCount: number;
  timeout: number;
};

// Gestalts messages
export type ActionsListMessage = {
  actionsList: Array<GestaltAction>;
};

export type SetIdentityActionMessage = IdentityMessage & {
  action: GestaltAction;
};

export type SetNodeActionMessage = NodeIdMessage & {
  action: GestaltAction;
};

export type GestaltMessage = {
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
export type CertMessage = {
  cert: CertificatePEM;
};

export type DataMessage = {
  data: string;
};

export type PublicKeyMessage = {
  publicKeyJwk: PublicKeyJWK;
};

export type PrivateKeyMessage = {
  privateKeyJwe: JWKEncrypted;
};

export type DecryptMessage = DataMessage & PublicKeyMessage;

export type PasswordMessage = {
  password: string;
};

export type KeyPairMessage = PrivateKeyMessage & PublicKeyMessage;

export type SignatureMessage = {
  signature: string;
};

export type VerifySignatureMessage = PublicKeyMessage &
  DataMessage &
  SignatureMessage;

export type SuccessMessage = {
  success: boolean;
};

// Notifications messages
export type NotificationReadMessage = {
  unread?: boolean;
  number?: number | 'all';
  order?: 'newest' | 'oldest';
};

export type NotificationMessage = {
  notification: Notification;
};

export type NotificationSendMessage = NodeIdMessage & {
  message: string;
};

// Vaults messages
export type VaultNameMessage = {
  vaultName: VaultName;
};

export type VaultIdMessage = {
  vaultIdEncoded: VaultIdEncoded;
};

export type VaultIdentifierMessage = {
  nameOrId: VaultIdEncoded | VaultName;
};
export type CloneMessage = NodeIdMessage & VaultIdentifierMessage;

export type VaultListMessage = VaultNameMessage & VaultIdMessage;

export type VaultsLogMessage = VaultIdentifierMessage & {
  depth?: number;
  commitId?: string;
};

export type LogEntryMessage = {
  commitId: CommitId;
  committer: string;
  timestamp: string;
  message: string;
};

export type VaultPermissionMessage = VaultIdMessage &
  NodeIdMessage & {
    vaultPermissionList: Array<VaultAction>;
  };

export type PermissionSetMessage = VaultIdentifierMessage &
  NodeIdMessage & {
    vaultPermissionList: Array<VaultAction>;
  };

export type VaultsPullMessage = Partial<CloneMessage> & {
  pullVault: VaultIdEncoded | VaultName;
};

export type VaultsRenameMessage = VaultIdentifierMessage & {
  newName: VaultName;
};

export type VaultsScanMessage = VaultListMessage & {
  permissions: Array<VaultAction>;
};

export type VaultsVersionMessage = VaultIdentifierMessage & {
  versionId: string;
};

export type VaultsLatestVersionMessage = {
  latestVersion: boolean;
};

// Secrets
export type SecretNameMessage = {
  secretName: string;
};

export type SecretIdentifierMessage = VaultIdentifierMessage &
  SecretNameMessage;

// Contains binary content as a binary string 'toString('binary')'
export type ContentMessage = {
  secretContent: string;
};

export type SecretContentMessage = SecretIdentifierMessage & ContentMessage;

export type SecretMkdirMessage = VaultIdentifierMessage & {
  dirName: string;
  recursive: boolean;
};

export type SecretDirMessage = VaultIdentifierMessage & {
  dirName: string;
};

export type SecretRenameMessage = SecretIdentifierMessage & {
  newSecretName: string;
};

// Stat is the 'JSON.stringify version of the file stat
export type SecretStatMessage = {
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
