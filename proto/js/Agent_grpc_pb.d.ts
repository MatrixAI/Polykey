// package: agentInterface
// file: Agent.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as Agent_pb from "./Agent_pb";

interface IAgentService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    addPeer: IAgentService_IAddPeer;
    decryptFile: IAgentService_IDecryptFile;
    deleteKey: IAgentService_IDeleteKey;
    deleteSecret: IAgentService_IDeleteSecret;
    deleteVault: IAgentService_IDeleteVault;
    deriveKey: IAgentService_IDeriveKey;
    deriveKeyPair: IAgentService_IDeriveKeyPair;
    encryptFile: IAgentService_IEncryptFile;
    findPeer: IAgentService_IFindPeer;
    findSocialPeer: IAgentService_IFindSocialPeer;
    getOAuthClient: IAgentService_IGetOAuthClient;
    getKey: IAgentService_IGetKey;
    getLocalPeerInfo: IAgentService_IGetLocalPeerInfo;
    getPeerInfo: IAgentService_IGetPeerInfo;
    getPrimaryKeyPair: IAgentService_IGetPrimaryKeyPair;
    getRootCertificate: IAgentService_IGetRootCertificate;
    getSecret: IAgentService_IGetSecret;
    getStatus: IAgentService_IGetStatus;
    getVaultStats: IAgentService_IGetVaultStats;
    initializeNode: IAgentService_IInitializeNode;
    listOAuthTokens: IAgentService_IListOAuthTokens;
    listKeys: IAgentService_IListKeys;
    listPeers: IAgentService_IListPeers;
    listSecrets: IAgentService_IListSecrets;
    listVaults: IAgentService_IListVaults;
    lockNode: IAgentService_ILockNode;
    newClientCertificate: IAgentService_INewClientCertificate;
    newSecret: IAgentService_INewSecret;
    newOAuthToken: IAgentService_INewOAuthToken;
    newVault: IAgentService_INewVault;
    pingPeer: IAgentService_IPingPeer;
    proveKeynode: IAgentService_IProveKeynode;
    pullVault: IAgentService_IPullVault;
    renameVault: IAgentService_IRenameVault;
    recoverKeynode: IAgentService_IRecoverKeynode;
    revokeOAuthToken: IAgentService_IRevokeOAuthToken;
    scanVaultNames: IAgentService_IScanVaultNames;
    setAlias: IAgentService_ISetAlias;
    shareVault: IAgentService_IShareVault;
    signFile: IAgentService_ISignFile;
    stopAgent: IAgentService_IStopAgent;
    toggleStealthMode: IAgentService_IToggleStealthMode;
    unlockNode: IAgentService_IUnlockNode;
    unsetAlias: IAgentService_IUnsetAlias;
    unshareVault: IAgentService_IUnshareVault;
    updateLocalPeerInfo: IAgentService_IUpdateLocalPeerInfo;
    updatePeerInfo: IAgentService_IUpdatePeerInfo;
    updateSecret: IAgentService_IUpdateSecret;
    verifyFile: IAgentService_IVerifyFile;
    verifyMnemonic: IAgentService_IVerifyMnemonic;
}

interface IAgentService_IAddPeer extends grpc.MethodDefinition<Agent_pb.PeerInfoReadOnlyMessage, Agent_pb.StringMessage> {
    path: string; // "/agentInterface.Agent/AddPeer"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.PeerInfoReadOnlyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.PeerInfoReadOnlyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IAgentService_IDecryptFile extends grpc.MethodDefinition<Agent_pb.DecryptFileMessage, Agent_pb.StringMessage> {
    path: string; // "/agentInterface.Agent/DecryptFile"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.DecryptFileMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.DecryptFileMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IAgentService_IDeleteKey extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/DeleteKey"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IDeleteSecret extends grpc.MethodDefinition<Agent_pb.SecretPathMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/DeleteSecret"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.SecretPathMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.SecretPathMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IDeleteVault extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/DeleteVault"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IDeriveKey extends grpc.MethodDefinition<Agent_pb.DeriveKeyMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/DeriveKey"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.DeriveKeyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.DeriveKeyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IDeriveKeyPair extends grpc.MethodDefinition<Agent_pb.DeriveKeyPairMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/DeriveKeyPair"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.DeriveKeyPairMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.DeriveKeyPairMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IEncryptFile extends grpc.MethodDefinition<Agent_pb.EncryptFileMessage, Agent_pb.StringMessage> {
    path: string; // "/agentInterface.Agent/EncryptFile"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EncryptFileMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EncryptFileMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IAgentService_IFindPeer extends grpc.MethodDefinition<Agent_pb.ContactPeerMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/FindPeer"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.ContactPeerMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.ContactPeerMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IFindSocialPeer extends grpc.MethodDefinition<Agent_pb.ContactPeerMessage, Agent_pb.StringListMessage> {
    path: string; // "/agentInterface.Agent/FindSocialPeer"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.ContactPeerMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.ContactPeerMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringListMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringListMessage>;
}
interface IAgentService_IGetOAuthClient extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.OAuthClientMessage> {
    path: string; // "/agentInterface.Agent/GetOAuthClient"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.OAuthClientMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.OAuthClientMessage>;
}
interface IAgentService_IGetKey extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.StringMessage> {
    path: string; // "/agentInterface.Agent/GetKey"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IAgentService_IGetLocalPeerInfo extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.PeerInfoMessage> {
    path: string; // "/agentInterface.Agent/GetLocalPeerInfo"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.PeerInfoMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.PeerInfoMessage>;
}
interface IAgentService_IGetPeerInfo extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.PeerInfoMessage> {
    path: string; // "/agentInterface.Agent/GetPeerInfo"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.PeerInfoMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.PeerInfoMessage>;
}
interface IAgentService_IGetPrimaryKeyPair extends grpc.MethodDefinition<Agent_pb.BooleanMessage, Agent_pb.KeyPairMessage> {
    path: string; // "/agentInterface.Agent/GetPrimaryKeyPair"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.BooleanMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.BooleanMessage>;
    responseSerialize: grpc.serialize<Agent_pb.KeyPairMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.KeyPairMessage>;
}
interface IAgentService_IGetRootCertificate extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.StringMessage> {
    path: string; // "/agentInterface.Agent/GetRootCertificate"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IAgentService_IGetSecret extends grpc.MethodDefinition<Agent_pb.SecretPathMessage, Agent_pb.StringMessage> {
    path: string; // "/agentInterface.Agent/GetSecret"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.SecretPathMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.SecretPathMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IAgentService_IGetStatus extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.AgentStatusMessage> {
    path: string; // "/agentInterface.Agent/GetStatus"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.AgentStatusMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.AgentStatusMessage>;
}
interface IAgentService_IGetVaultStats extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.VaultStatsMessage> {
    path: string; // "/agentInterface.Agent/GetVaultStats"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.VaultStatsMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.VaultStatsMessage>;
}
interface IAgentService_IInitializeNode extends grpc.MethodDefinition<Agent_pb.NewKeyPairMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/InitializeNode"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.NewKeyPairMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.NewKeyPairMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IListOAuthTokens extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.StringListMessage> {
    path: string; // "/agentInterface.Agent/ListOAuthTokens"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringListMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringListMessage>;
}
interface IAgentService_IListKeys extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.StringListMessage> {
    path: string; // "/agentInterface.Agent/ListKeys"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringListMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringListMessage>;
}
interface IAgentService_IListPeers extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.StringListMessage> {
    path: string; // "/agentInterface.Agent/ListPeers"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringListMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringListMessage>;
}
interface IAgentService_IListSecrets extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.StringListMessage> {
    path: string; // "/agentInterface.Agent/ListSecrets"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringListMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringListMessage>;
}
interface IAgentService_IListVaults extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.StringListMessage> {
    path: string; // "/agentInterface.Agent/ListVaults"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringListMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringListMessage>;
}
interface IAgentService_ILockNode extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/LockNode"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_INewClientCertificate extends grpc.MethodDefinition<Agent_pb.NewClientCertificateMessage, Agent_pb.NewClientCertificateMessage> {
    path: string; // "/agentInterface.Agent/NewClientCertificate"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.NewClientCertificateMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.NewClientCertificateMessage>;
    responseSerialize: grpc.serialize<Agent_pb.NewClientCertificateMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.NewClientCertificateMessage>;
}
interface IAgentService_INewSecret extends grpc.MethodDefinition<Agent_pb.SecretContentMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/NewSecret"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.SecretContentMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.SecretContentMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_INewOAuthToken extends grpc.MethodDefinition<Agent_pb.NewOAuthTokenMessage, Agent_pb.StringMessage> {
    path: string; // "/agentInterface.Agent/NewOAuthToken"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.NewOAuthTokenMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.NewOAuthTokenMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IAgentService_INewVault extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/NewVault"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IPingPeer extends grpc.MethodDefinition<Agent_pb.ContactPeerMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/PingPeer"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.ContactPeerMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.ContactPeerMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IProveKeynode extends grpc.MethodDefinition<Agent_pb.GestaltIdentityMessage, Agent_pb.PolykeyProofMessage> {
    path: string; // "/agentInterface.Agent/ProveKeynode"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.GestaltIdentityMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.GestaltIdentityMessage>;
    responseSerialize: grpc.serialize<Agent_pb.PolykeyProofMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.PolykeyProofMessage>;
}
interface IAgentService_IPullVault extends grpc.MethodDefinition<Agent_pb.VaultPathMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/PullVault"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.VaultPathMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.VaultPathMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IRenameVault extends grpc.MethodDefinition<Agent_pb.RenameVaultMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/RenameVault"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.RenameVaultMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.RenameVaultMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IRecoverKeynode extends grpc.MethodDefinition<Agent_pb.RecoverKeynodeMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/RecoverKeynode"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.RecoverKeynodeMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.RecoverKeynodeMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IRevokeOAuthToken extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/RevokeOAuthToken"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IScanVaultNames extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.StringListMessage> {
    path: string; // "/agentInterface.Agent/ScanVaultNames"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringListMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringListMessage>;
}
interface IAgentService_ISetAlias extends grpc.MethodDefinition<Agent_pb.PeerAliasMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/SetAlias"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.PeerAliasMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.PeerAliasMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IShareVault extends grpc.MethodDefinition<Agent_pb.ShareVaultMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/ShareVault"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.ShareVaultMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.ShareVaultMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_ISignFile extends grpc.MethodDefinition<Agent_pb.SignFileMessage, Agent_pb.StringMessage> {
    path: string; // "/agentInterface.Agent/SignFile"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.SignFileMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.SignFileMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IAgentService_IStopAgent extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/StopAgent"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IToggleStealthMode extends grpc.MethodDefinition<Agent_pb.BooleanMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/ToggleStealthMode"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.BooleanMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.BooleanMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IUnlockNode extends grpc.MethodDefinition<Agent_pb.UnlockNodeMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/UnlockNode"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.UnlockNodeMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.UnlockNodeMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IUnsetAlias extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/UnsetAlias"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IUnshareVault extends grpc.MethodDefinition<Agent_pb.VaultPathMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/UnshareVault"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.VaultPathMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.VaultPathMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IUpdateLocalPeerInfo extends grpc.MethodDefinition<Agent_pb.PeerInfoMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/UpdateLocalPeerInfo"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.PeerInfoMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.PeerInfoMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IUpdatePeerInfo extends grpc.MethodDefinition<Agent_pb.PeerInfoReadOnlyMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/UpdatePeerInfo"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.PeerInfoReadOnlyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.PeerInfoReadOnlyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IUpdateSecret extends grpc.MethodDefinition<Agent_pb.SecretContentMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/UpdateSecret"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.SecretContentMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.SecretContentMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IVerifyFile extends grpc.MethodDefinition<Agent_pb.VerifyFileMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/VerifyFile"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.VerifyFileMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.VerifyFileMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IVerifyMnemonic extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.EmptyMessage> {
    path: string; // "/agentInterface.Agent/VerifyMnemonic"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}

export const AgentService: IAgentService;

export interface IAgentServer {
    addPeer: grpc.handleUnaryCall<Agent_pb.PeerInfoReadOnlyMessage, Agent_pb.StringMessage>;
    decryptFile: grpc.handleUnaryCall<Agent_pb.DecryptFileMessage, Agent_pb.StringMessage>;
    deleteKey: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.EmptyMessage>;
    deleteSecret: grpc.handleUnaryCall<Agent_pb.SecretPathMessage, Agent_pb.EmptyMessage>;
    deleteVault: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.EmptyMessage>;
    deriveKey: grpc.handleUnaryCall<Agent_pb.DeriveKeyMessage, Agent_pb.EmptyMessage>;
    deriveKeyPair: grpc.handleUnaryCall<Agent_pb.DeriveKeyPairMessage, Agent_pb.EmptyMessage>;
    encryptFile: grpc.handleUnaryCall<Agent_pb.EncryptFileMessage, Agent_pb.StringMessage>;
    findPeer: grpc.handleUnaryCall<Agent_pb.ContactPeerMessage, Agent_pb.EmptyMessage>;
    findSocialPeer: grpc.handleUnaryCall<Agent_pb.ContactPeerMessage, Agent_pb.StringListMessage>;
    getOAuthClient: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.OAuthClientMessage>;
    getKey: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.StringMessage>;
    getLocalPeerInfo: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.PeerInfoMessage>;
    getPeerInfo: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.PeerInfoMessage>;
    getPrimaryKeyPair: grpc.handleUnaryCall<Agent_pb.BooleanMessage, Agent_pb.KeyPairMessage>;
    getRootCertificate: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.StringMessage>;
    getSecret: grpc.handleUnaryCall<Agent_pb.SecretPathMessage, Agent_pb.StringMessage>;
    getStatus: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.AgentStatusMessage>;
    getVaultStats: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.VaultStatsMessage>;
    initializeNode: grpc.handleUnaryCall<Agent_pb.NewKeyPairMessage, Agent_pb.EmptyMessage>;
    listOAuthTokens: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.StringListMessage>;
    listKeys: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.StringListMessage>;
    listPeers: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.StringListMessage>;
    listSecrets: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.StringListMessage>;
    listVaults: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.StringListMessage>;
    lockNode: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.EmptyMessage>;
    newClientCertificate: grpc.handleUnaryCall<Agent_pb.NewClientCertificateMessage, Agent_pb.NewClientCertificateMessage>;
    newSecret: grpc.handleUnaryCall<Agent_pb.SecretContentMessage, Agent_pb.EmptyMessage>;
    newOAuthToken: grpc.handleUnaryCall<Agent_pb.NewOAuthTokenMessage, Agent_pb.StringMessage>;
    newVault: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.EmptyMessage>;
    pingPeer: grpc.handleUnaryCall<Agent_pb.ContactPeerMessage, Agent_pb.EmptyMessage>;
    proveKeynode: grpc.handleUnaryCall<Agent_pb.GestaltIdentityMessage, Agent_pb.PolykeyProofMessage>;
    pullVault: grpc.handleUnaryCall<Agent_pb.VaultPathMessage, Agent_pb.EmptyMessage>;
    renameVault: grpc.handleUnaryCall<Agent_pb.RenameVaultMessage, Agent_pb.EmptyMessage>;
    recoverKeynode: grpc.handleUnaryCall<Agent_pb.RecoverKeynodeMessage, Agent_pb.EmptyMessage>;
    revokeOAuthToken: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.EmptyMessage>;
    scanVaultNames: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.StringListMessage>;
    setAlias: grpc.handleUnaryCall<Agent_pb.PeerAliasMessage, Agent_pb.EmptyMessage>;
    shareVault: grpc.handleUnaryCall<Agent_pb.ShareVaultMessage, Agent_pb.EmptyMessage>;
    signFile: grpc.handleUnaryCall<Agent_pb.SignFileMessage, Agent_pb.StringMessage>;
    stopAgent: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.EmptyMessage>;
    toggleStealthMode: grpc.handleUnaryCall<Agent_pb.BooleanMessage, Agent_pb.EmptyMessage>;
    unlockNode: grpc.handleUnaryCall<Agent_pb.UnlockNodeMessage, Agent_pb.EmptyMessage>;
    unsetAlias: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.EmptyMessage>;
    unshareVault: grpc.handleUnaryCall<Agent_pb.VaultPathMessage, Agent_pb.EmptyMessage>;
    updateLocalPeerInfo: grpc.handleUnaryCall<Agent_pb.PeerInfoMessage, Agent_pb.EmptyMessage>;
    updatePeerInfo: grpc.handleUnaryCall<Agent_pb.PeerInfoReadOnlyMessage, Agent_pb.EmptyMessage>;
    updateSecret: grpc.handleUnaryCall<Agent_pb.SecretContentMessage, Agent_pb.EmptyMessage>;
    verifyFile: grpc.handleUnaryCall<Agent_pb.VerifyFileMessage, Agent_pb.EmptyMessage>;
    verifyMnemonic: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.EmptyMessage>;
}

export interface IAgentClient {
    addPeer(request: Agent_pb.PeerInfoReadOnlyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    addPeer(request: Agent_pb.PeerInfoReadOnlyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    addPeer(request: Agent_pb.PeerInfoReadOnlyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    decryptFile(request: Agent_pb.DecryptFileMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    decryptFile(request: Agent_pb.DecryptFileMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    decryptFile(request: Agent_pb.DecryptFileMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    deleteKey(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    deleteKey(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    deleteKey(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    deleteSecret(request: Agent_pb.SecretPathMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    deleteSecret(request: Agent_pb.SecretPathMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    deleteSecret(request: Agent_pb.SecretPathMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    deleteVault(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    deleteVault(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    deleteVault(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    deriveKey(request: Agent_pb.DeriveKeyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    deriveKey(request: Agent_pb.DeriveKeyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    deriveKey(request: Agent_pb.DeriveKeyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    deriveKeyPair(request: Agent_pb.DeriveKeyPairMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    deriveKeyPair(request: Agent_pb.DeriveKeyPairMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    deriveKeyPair(request: Agent_pb.DeriveKeyPairMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    encryptFile(request: Agent_pb.EncryptFileMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    encryptFile(request: Agent_pb.EncryptFileMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    encryptFile(request: Agent_pb.EncryptFileMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    findPeer(request: Agent_pb.ContactPeerMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    findPeer(request: Agent_pb.ContactPeerMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    findPeer(request: Agent_pb.ContactPeerMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    findSocialPeer(request: Agent_pb.ContactPeerMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    findSocialPeer(request: Agent_pb.ContactPeerMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    findSocialPeer(request: Agent_pb.ContactPeerMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    getOAuthClient(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.OAuthClientMessage) => void): grpc.ClientUnaryCall;
    getOAuthClient(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.OAuthClientMessage) => void): grpc.ClientUnaryCall;
    getOAuthClient(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.OAuthClientMessage) => void): grpc.ClientUnaryCall;
    getKey(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getKey(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getKey(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getLocalPeerInfo(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.PeerInfoMessage) => void): grpc.ClientUnaryCall;
    getLocalPeerInfo(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.PeerInfoMessage) => void): grpc.ClientUnaryCall;
    getLocalPeerInfo(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.PeerInfoMessage) => void): grpc.ClientUnaryCall;
    getPeerInfo(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.PeerInfoMessage) => void): grpc.ClientUnaryCall;
    getPeerInfo(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.PeerInfoMessage) => void): grpc.ClientUnaryCall;
    getPeerInfo(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.PeerInfoMessage) => void): grpc.ClientUnaryCall;
    getPrimaryKeyPair(request: Agent_pb.BooleanMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.KeyPairMessage) => void): grpc.ClientUnaryCall;
    getPrimaryKeyPair(request: Agent_pb.BooleanMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.KeyPairMessage) => void): grpc.ClientUnaryCall;
    getPrimaryKeyPair(request: Agent_pb.BooleanMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.KeyPairMessage) => void): grpc.ClientUnaryCall;
    getRootCertificate(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getRootCertificate(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getRootCertificate(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getSecret(request: Agent_pb.SecretPathMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getSecret(request: Agent_pb.SecretPathMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getSecret(request: Agent_pb.SecretPathMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getStatus(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.AgentStatusMessage) => void): grpc.ClientUnaryCall;
    getStatus(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.AgentStatusMessage) => void): grpc.ClientUnaryCall;
    getStatus(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.AgentStatusMessage) => void): grpc.ClientUnaryCall;
    getVaultStats(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.VaultStatsMessage) => void): grpc.ClientUnaryCall;
    getVaultStats(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.VaultStatsMessage) => void): grpc.ClientUnaryCall;
    getVaultStats(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.VaultStatsMessage) => void): grpc.ClientUnaryCall;
    initializeNode(request: Agent_pb.NewKeyPairMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    initializeNode(request: Agent_pb.NewKeyPairMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    initializeNode(request: Agent_pb.NewKeyPairMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    listOAuthTokens(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    listOAuthTokens(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    listOAuthTokens(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    listKeys(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    listKeys(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    listKeys(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    listPeers(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    listPeers(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    listPeers(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    listSecrets(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    listSecrets(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    listSecrets(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    listVaults(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    listVaults(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    listVaults(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    lockNode(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    lockNode(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    lockNode(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    newClientCertificate(request: Agent_pb.NewClientCertificateMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.NewClientCertificateMessage) => void): grpc.ClientUnaryCall;
    newClientCertificate(request: Agent_pb.NewClientCertificateMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.NewClientCertificateMessage) => void): grpc.ClientUnaryCall;
    newClientCertificate(request: Agent_pb.NewClientCertificateMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.NewClientCertificateMessage) => void): grpc.ClientUnaryCall;
    newSecret(request: Agent_pb.SecretContentMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    newSecret(request: Agent_pb.SecretContentMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    newSecret(request: Agent_pb.SecretContentMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    newOAuthToken(request: Agent_pb.NewOAuthTokenMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    newOAuthToken(request: Agent_pb.NewOAuthTokenMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    newOAuthToken(request: Agent_pb.NewOAuthTokenMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    newVault(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    newVault(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    newVault(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    pingPeer(request: Agent_pb.ContactPeerMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    pingPeer(request: Agent_pb.ContactPeerMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    pingPeer(request: Agent_pb.ContactPeerMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    proveKeynode(request: Agent_pb.GestaltIdentityMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.PolykeyProofMessage) => void): grpc.ClientUnaryCall;
    proveKeynode(request: Agent_pb.GestaltIdentityMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.PolykeyProofMessage) => void): grpc.ClientUnaryCall;
    proveKeynode(request: Agent_pb.GestaltIdentityMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.PolykeyProofMessage) => void): grpc.ClientUnaryCall;
    pullVault(request: Agent_pb.VaultPathMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    pullVault(request: Agent_pb.VaultPathMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    pullVault(request: Agent_pb.VaultPathMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    renameVault(request: Agent_pb.RenameVaultMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    renameVault(request: Agent_pb.RenameVaultMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    renameVault(request: Agent_pb.RenameVaultMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    recoverKeynode(request: Agent_pb.RecoverKeynodeMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    recoverKeynode(request: Agent_pb.RecoverKeynodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    recoverKeynode(request: Agent_pb.RecoverKeynodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    revokeOAuthToken(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    revokeOAuthToken(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    revokeOAuthToken(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    scanVaultNames(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    scanVaultNames(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    scanVaultNames(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    setAlias(request: Agent_pb.PeerAliasMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    setAlias(request: Agent_pb.PeerAliasMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    setAlias(request: Agent_pb.PeerAliasMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    shareVault(request: Agent_pb.ShareVaultMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    shareVault(request: Agent_pb.ShareVaultMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    shareVault(request: Agent_pb.ShareVaultMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    signFile(request: Agent_pb.SignFileMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    signFile(request: Agent_pb.SignFileMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    signFile(request: Agent_pb.SignFileMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    stopAgent(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    stopAgent(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    stopAgent(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    toggleStealthMode(request: Agent_pb.BooleanMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    toggleStealthMode(request: Agent_pb.BooleanMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    toggleStealthMode(request: Agent_pb.BooleanMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unlockNode(request: Agent_pb.UnlockNodeMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unlockNode(request: Agent_pb.UnlockNodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unlockNode(request: Agent_pb.UnlockNodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unsetAlias(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unsetAlias(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unsetAlias(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unshareVault(request: Agent_pb.VaultPathMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unshareVault(request: Agent_pb.VaultPathMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unshareVault(request: Agent_pb.VaultPathMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    updateLocalPeerInfo(request: Agent_pb.PeerInfoMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    updateLocalPeerInfo(request: Agent_pb.PeerInfoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    updateLocalPeerInfo(request: Agent_pb.PeerInfoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    updatePeerInfo(request: Agent_pb.PeerInfoReadOnlyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    updatePeerInfo(request: Agent_pb.PeerInfoReadOnlyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    updatePeerInfo(request: Agent_pb.PeerInfoReadOnlyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    updateSecret(request: Agent_pb.SecretContentMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    updateSecret(request: Agent_pb.SecretContentMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    updateSecret(request: Agent_pb.SecretContentMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    verifyFile(request: Agent_pb.VerifyFileMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    verifyFile(request: Agent_pb.VerifyFileMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    verifyFile(request: Agent_pb.VerifyFileMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    verifyMnemonic(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    verifyMnemonic(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    verifyMnemonic(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
}

export class AgentClient extends grpc.Client implements IAgentClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
    public addPeer(request: Agent_pb.PeerInfoReadOnlyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public addPeer(request: Agent_pb.PeerInfoReadOnlyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public addPeer(request: Agent_pb.PeerInfoReadOnlyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public decryptFile(request: Agent_pb.DecryptFileMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public decryptFile(request: Agent_pb.DecryptFileMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public decryptFile(request: Agent_pb.DecryptFileMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public deleteKey(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public deleteKey(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public deleteKey(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public deleteSecret(request: Agent_pb.SecretPathMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public deleteSecret(request: Agent_pb.SecretPathMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public deleteSecret(request: Agent_pb.SecretPathMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public deleteVault(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public deleteVault(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public deleteVault(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public deriveKey(request: Agent_pb.DeriveKeyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public deriveKey(request: Agent_pb.DeriveKeyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public deriveKey(request: Agent_pb.DeriveKeyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public deriveKeyPair(request: Agent_pb.DeriveKeyPairMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public deriveKeyPair(request: Agent_pb.DeriveKeyPairMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public deriveKeyPair(request: Agent_pb.DeriveKeyPairMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public encryptFile(request: Agent_pb.EncryptFileMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public encryptFile(request: Agent_pb.EncryptFileMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public encryptFile(request: Agent_pb.EncryptFileMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public findPeer(request: Agent_pb.ContactPeerMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public findPeer(request: Agent_pb.ContactPeerMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public findPeer(request: Agent_pb.ContactPeerMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public findSocialPeer(request: Agent_pb.ContactPeerMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public findSocialPeer(request: Agent_pb.ContactPeerMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public findSocialPeer(request: Agent_pb.ContactPeerMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public getOAuthClient(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.OAuthClientMessage) => void): grpc.ClientUnaryCall;
    public getOAuthClient(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.OAuthClientMessage) => void): grpc.ClientUnaryCall;
    public getOAuthClient(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.OAuthClientMessage) => void): grpc.ClientUnaryCall;
    public getKey(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getKey(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getKey(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getLocalPeerInfo(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.PeerInfoMessage) => void): grpc.ClientUnaryCall;
    public getLocalPeerInfo(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.PeerInfoMessage) => void): grpc.ClientUnaryCall;
    public getLocalPeerInfo(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.PeerInfoMessage) => void): grpc.ClientUnaryCall;
    public getPeerInfo(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.PeerInfoMessage) => void): grpc.ClientUnaryCall;
    public getPeerInfo(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.PeerInfoMessage) => void): grpc.ClientUnaryCall;
    public getPeerInfo(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.PeerInfoMessage) => void): grpc.ClientUnaryCall;
    public getPrimaryKeyPair(request: Agent_pb.BooleanMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.KeyPairMessage) => void): grpc.ClientUnaryCall;
    public getPrimaryKeyPair(request: Agent_pb.BooleanMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.KeyPairMessage) => void): grpc.ClientUnaryCall;
    public getPrimaryKeyPair(request: Agent_pb.BooleanMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.KeyPairMessage) => void): grpc.ClientUnaryCall;
    public getRootCertificate(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getRootCertificate(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getRootCertificate(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getSecret(request: Agent_pb.SecretPathMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getSecret(request: Agent_pb.SecretPathMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getSecret(request: Agent_pb.SecretPathMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getStatus(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.AgentStatusMessage) => void): grpc.ClientUnaryCall;
    public getStatus(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.AgentStatusMessage) => void): grpc.ClientUnaryCall;
    public getStatus(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.AgentStatusMessage) => void): grpc.ClientUnaryCall;
    public getVaultStats(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.VaultStatsMessage) => void): grpc.ClientUnaryCall;
    public getVaultStats(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.VaultStatsMessage) => void): grpc.ClientUnaryCall;
    public getVaultStats(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.VaultStatsMessage) => void): grpc.ClientUnaryCall;
    public initializeNode(request: Agent_pb.NewKeyPairMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public initializeNode(request: Agent_pb.NewKeyPairMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public initializeNode(request: Agent_pb.NewKeyPairMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public listOAuthTokens(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public listOAuthTokens(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public listOAuthTokens(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public listKeys(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public listKeys(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public listKeys(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public listPeers(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public listPeers(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public listPeers(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public listSecrets(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public listSecrets(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public listSecrets(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public listVaults(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public listVaults(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public listVaults(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public lockNode(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public lockNode(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public lockNode(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public newClientCertificate(request: Agent_pb.NewClientCertificateMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.NewClientCertificateMessage) => void): grpc.ClientUnaryCall;
    public newClientCertificate(request: Agent_pb.NewClientCertificateMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.NewClientCertificateMessage) => void): grpc.ClientUnaryCall;
    public newClientCertificate(request: Agent_pb.NewClientCertificateMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.NewClientCertificateMessage) => void): grpc.ClientUnaryCall;
    public newSecret(request: Agent_pb.SecretContentMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public newSecret(request: Agent_pb.SecretContentMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public newSecret(request: Agent_pb.SecretContentMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public newOAuthToken(request: Agent_pb.NewOAuthTokenMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public newOAuthToken(request: Agent_pb.NewOAuthTokenMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public newOAuthToken(request: Agent_pb.NewOAuthTokenMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public newVault(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public newVault(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public newVault(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public pingPeer(request: Agent_pb.ContactPeerMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public pingPeer(request: Agent_pb.ContactPeerMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public pingPeer(request: Agent_pb.ContactPeerMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public proveKeynode(request: Agent_pb.GestaltIdentityMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.PolykeyProofMessage) => void): grpc.ClientUnaryCall;
    public proveKeynode(request: Agent_pb.GestaltIdentityMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.PolykeyProofMessage) => void): grpc.ClientUnaryCall;
    public proveKeynode(request: Agent_pb.GestaltIdentityMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.PolykeyProofMessage) => void): grpc.ClientUnaryCall;
    public pullVault(request: Agent_pb.VaultPathMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public pullVault(request: Agent_pb.VaultPathMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public pullVault(request: Agent_pb.VaultPathMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public renameVault(request: Agent_pb.RenameVaultMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public renameVault(request: Agent_pb.RenameVaultMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public renameVault(request: Agent_pb.RenameVaultMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public recoverKeynode(request: Agent_pb.RecoverKeynodeMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public recoverKeynode(request: Agent_pb.RecoverKeynodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public recoverKeynode(request: Agent_pb.RecoverKeynodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public revokeOAuthToken(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public revokeOAuthToken(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public revokeOAuthToken(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public scanVaultNames(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public scanVaultNames(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public scanVaultNames(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public setAlias(request: Agent_pb.PeerAliasMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public setAlias(request: Agent_pb.PeerAliasMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public setAlias(request: Agent_pb.PeerAliasMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public shareVault(request: Agent_pb.ShareVaultMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public shareVault(request: Agent_pb.ShareVaultMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public shareVault(request: Agent_pb.ShareVaultMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public signFile(request: Agent_pb.SignFileMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public signFile(request: Agent_pb.SignFileMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public signFile(request: Agent_pb.SignFileMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public stopAgent(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public stopAgent(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public stopAgent(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public toggleStealthMode(request: Agent_pb.BooleanMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public toggleStealthMode(request: Agent_pb.BooleanMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public toggleStealthMode(request: Agent_pb.BooleanMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unlockNode(request: Agent_pb.UnlockNodeMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unlockNode(request: Agent_pb.UnlockNodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unlockNode(request: Agent_pb.UnlockNodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unsetAlias(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unsetAlias(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unsetAlias(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unshareVault(request: Agent_pb.VaultPathMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unshareVault(request: Agent_pb.VaultPathMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unshareVault(request: Agent_pb.VaultPathMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public updateLocalPeerInfo(request: Agent_pb.PeerInfoMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public updateLocalPeerInfo(request: Agent_pb.PeerInfoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public updateLocalPeerInfo(request: Agent_pb.PeerInfoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public updatePeerInfo(request: Agent_pb.PeerInfoReadOnlyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public updatePeerInfo(request: Agent_pb.PeerInfoReadOnlyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public updatePeerInfo(request: Agent_pb.PeerInfoReadOnlyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public updateSecret(request: Agent_pb.SecretContentMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public updateSecret(request: Agent_pb.SecretContentMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public updateSecret(request: Agent_pb.SecretContentMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public verifyFile(request: Agent_pb.VerifyFileMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public verifyFile(request: Agent_pb.VerifyFileMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public verifyFile(request: Agent_pb.VerifyFileMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public verifyMnemonic(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public verifyMnemonic(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public verifyMnemonic(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
}
