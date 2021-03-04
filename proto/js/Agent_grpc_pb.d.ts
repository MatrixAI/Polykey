// package: agentInterface
// file: Agent.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as Agent_pb from "./Agent_pb";

interface IAgentService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    addNode: IAgentService_IAddNode;
    augmentKeynode: IAgentService_IAugmentKeynode;
    authenticateProvider: IAgentService_IAuthenticateProvider;
    decryptFile: IAgentService_IDecryptFile;
    deleteKey: IAgentService_IDeleteKey;
    deleteSecret: IAgentService_IDeleteSecret;
    deleteVault: IAgentService_IDeleteVault;
    deriveKey: IAgentService_IDeriveKey;
    deriveKeyPair: IAgentService_IDeriveKeyPair;
    discoverGestaltIdentity: IAgentService_IDiscoverGestaltIdentity;
    discoverGestaltNode: IAgentService_IDiscoverGestaltNode;
    encryptFile: IAgentService_IEncryptFile;
    findNode: IAgentService_IFindNode;
    getConnectedIdentityInfos: IAgentService_IGetConnectedIdentityInfos;
    getIdentityInfo: IAgentService_IGetIdentityInfo;
    getGestalts: IAgentService_IGetGestalts;
    getGestaltByIdentity: IAgentService_IGetGestaltByIdentity;
    gestaltIsTrusted: IAgentService_IGestaltIsTrusted;
    getOAuthClient: IAgentService_IGetOAuthClient;
    getKey: IAgentService_IGetKey;
    getLocalNodeInfo: IAgentService_IGetLocalNodeInfo;
    getNodeInfo: IAgentService_IGetNodeInfo;
    getPrimaryKeyPair: IAgentService_IGetPrimaryKeyPair;
    getRootCertificate: IAgentService_IGetRootCertificate;
    getSecret: IAgentService_IGetSecret;
    getStatus: IAgentService_IGetStatus;
    getVaultStats: IAgentService_IGetVaultStats;
    initializeNode: IAgentService_IInitializeNode;
    listOAuthTokens: IAgentService_IListOAuthTokens;
    listKeys: IAgentService_IListKeys;
    listNodes: IAgentService_IListNodes;
    listSecrets: IAgentService_IListSecrets;
    listVaults: IAgentService_IListVaults;
    lockNode: IAgentService_ILockNode;
    newClientCertificate: IAgentService_INewClientCertificate;
    newSecret: IAgentService_INewSecret;
    newOAuthToken: IAgentService_INewOAuthToken;
    newVault: IAgentService_INewVault;
    pingNode: IAgentService_IPingNode;
    pullVault: IAgentService_IPullVault;
    renameVault: IAgentService_IRenameVault;
    readMessage: IAgentService_IReadMessage;
    recoverKeynode: IAgentService_IRecoverKeynode;
    revokeOAuthToken: IAgentService_IRevokeOAuthToken;
    scanVaultNames: IAgentService_IScanVaultNames;
    sendMessage: IAgentService_ISendMessage;
    setAlias: IAgentService_ISetAlias;
    setIdentity: IAgentService_ISetIdentity;
    shareVault: IAgentService_IShareVault;
    signFile: IAgentService_ISignFile;
    stopAgent: IAgentService_IStopAgent;
    toggleStealthMode: IAgentService_IToggleStealthMode;
    trustGestalt: IAgentService_ITrustGestalt;
    unlockNode: IAgentService_IUnlockNode;
    unsetAlias: IAgentService_IUnsetAlias;
    unshareVault: IAgentService_IUnshareVault;
    untrustGestalt: IAgentService_IUntrustGestalt;
    updateLocalNodeInfo: IAgentService_IUpdateLocalNodeInfo;
    updateNodeInfo: IAgentService_IUpdateNodeInfo;
    updateSecret: IAgentService_IUpdateSecret;
    verifyFile: IAgentService_IVerifyFile;
    verifyMnemonic: IAgentService_IVerifyMnemonic;
}

interface IAgentService_IAddNode extends grpc.MethodDefinition<Agent_pb.NodeInfoReadOnlyMessage, Agent_pb.StringMessage> {
    path: "/agentInterface.Agent/AddNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.NodeInfoReadOnlyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.NodeInfoReadOnlyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IAgentService_IAugmentKeynode extends grpc.MethodDefinition<Agent_pb.AugmentKeynodeRequest, Agent_pb.AugmentKeynodeReply> {
    path: "/agentInterface.Agent/AugmentKeynode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.AugmentKeynodeRequest>;
    requestDeserialize: grpc.deserialize<Agent_pb.AugmentKeynodeRequest>;
    responseSerialize: grpc.serialize<Agent_pb.AugmentKeynodeReply>;
    responseDeserialize: grpc.deserialize<Agent_pb.AugmentKeynodeReply>;
}
interface IAgentService_IAuthenticateProvider extends grpc.MethodDefinition<Agent_pb.AuthenticateProviderRequest, Agent_pb.AuthenticateProviderReply> {
    path: "/agentInterface.Agent/AuthenticateProvider";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.AuthenticateProviderRequest>;
    requestDeserialize: grpc.deserialize<Agent_pb.AuthenticateProviderRequest>;
    responseSerialize: grpc.serialize<Agent_pb.AuthenticateProviderReply>;
    responseDeserialize: grpc.deserialize<Agent_pb.AuthenticateProviderReply>;
}
interface IAgentService_IDecryptFile extends grpc.MethodDefinition<Agent_pb.DecryptFileMessage, Agent_pb.StringMessage> {
    path: "/agentInterface.Agent/DecryptFile";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.DecryptFileMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.DecryptFileMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IAgentService_IDeleteKey extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/DeleteKey";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IDeleteSecret extends grpc.MethodDefinition<Agent_pb.SecretPathMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/DeleteSecret";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.SecretPathMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.SecretPathMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IDeleteVault extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/DeleteVault";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IDeriveKey extends grpc.MethodDefinition<Agent_pb.DeriveKeyMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/DeriveKey";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.DeriveKeyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.DeriveKeyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IDeriveKeyPair extends grpc.MethodDefinition<Agent_pb.DeriveKeyPairMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/DeriveKeyPair";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.DeriveKeyPairMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.DeriveKeyPairMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IDiscoverGestaltIdentity extends grpc.MethodDefinition<Agent_pb.IdentityMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/DiscoverGestaltIdentity";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Agent_pb.IdentityMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.IdentityMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IDiscoverGestaltNode extends grpc.MethodDefinition<Agent_pb.IdentityMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/DiscoverGestaltNode";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Agent_pb.IdentityMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.IdentityMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IEncryptFile extends grpc.MethodDefinition<Agent_pb.EncryptFileMessage, Agent_pb.StringMessage> {
    path: "/agentInterface.Agent/EncryptFile";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EncryptFileMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EncryptFileMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IAgentService_IFindNode extends grpc.MethodDefinition<Agent_pb.ContactNodeMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/FindNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.ContactNodeMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.ContactNodeMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IGetConnectedIdentityInfos extends grpc.MethodDefinition<Agent_pb.ProviderSearchMessage, Agent_pb.IdentityInfoMessage> {
    path: "/agentInterface.Agent/GetConnectedIdentityInfos";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Agent_pb.ProviderSearchMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.ProviderSearchMessage>;
    responseSerialize: grpc.serialize<Agent_pb.IdentityInfoMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.IdentityInfoMessage>;
}
interface IAgentService_IGetIdentityInfo extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.IdentityInfo> {
    path: "/agentInterface.Agent/GetIdentityInfo";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.IdentityInfo>;
    responseDeserialize: grpc.deserialize<Agent_pb.IdentityInfo>;
}
interface IAgentService_IGetGestalts extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.GestaltListMessage> {
    path: "/agentInterface.Agent/GetGestalts";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.GestaltListMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.GestaltListMessage>;
}
interface IAgentService_IGetGestaltByIdentity extends grpc.MethodDefinition<Agent_pb.IdentityMessage, Agent_pb.GestaltMessage> {
    path: "/agentInterface.Agent/GetGestaltByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.IdentityMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.IdentityMessage>;
    responseSerialize: grpc.serialize<Agent_pb.GestaltMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.GestaltMessage>;
}
interface IAgentService_IGestaltIsTrusted extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.BooleanMessage> {
    path: "/agentInterface.Agent/GestaltIsTrusted";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.BooleanMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.BooleanMessage>;
}
interface IAgentService_IGetOAuthClient extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.OAuthClientMessage> {
    path: "/agentInterface.Agent/GetOAuthClient";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.OAuthClientMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.OAuthClientMessage>;
}
interface IAgentService_IGetKey extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.StringMessage> {
    path: "/agentInterface.Agent/GetKey";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IAgentService_IGetLocalNodeInfo extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.NodeInfoMessage> {
    path: "/agentInterface.Agent/GetLocalNodeInfo";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.NodeInfoMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.NodeInfoMessage>;
}
interface IAgentService_IGetNodeInfo extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.NodeInfoMessage> {
    path: "/agentInterface.Agent/GetNodeInfo";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.NodeInfoMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.NodeInfoMessage>;
}
interface IAgentService_IGetPrimaryKeyPair extends grpc.MethodDefinition<Agent_pb.BooleanMessage, Agent_pb.KeyPairMessage> {
    path: "/agentInterface.Agent/GetPrimaryKeyPair";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.BooleanMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.BooleanMessage>;
    responseSerialize: grpc.serialize<Agent_pb.KeyPairMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.KeyPairMessage>;
}
interface IAgentService_IGetRootCertificate extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.StringMessage> {
    path: "/agentInterface.Agent/GetRootCertificate";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IAgentService_IGetSecret extends grpc.MethodDefinition<Agent_pb.SecretPathMessage, Agent_pb.StringMessage> {
    path: "/agentInterface.Agent/GetSecret";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.SecretPathMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.SecretPathMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IAgentService_IGetStatus extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.AgentStatusMessage> {
    path: "/agentInterface.Agent/GetStatus";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.AgentStatusMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.AgentStatusMessage>;
}
interface IAgentService_IGetVaultStats extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.VaultStatsMessage> {
    path: "/agentInterface.Agent/GetVaultStats";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.VaultStatsMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.VaultStatsMessage>;
}
interface IAgentService_IInitializeNode extends grpc.MethodDefinition<Agent_pb.NewKeyPairMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/InitializeNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.NewKeyPairMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.NewKeyPairMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IListOAuthTokens extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.StringListMessage> {
    path: "/agentInterface.Agent/ListOAuthTokens";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringListMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringListMessage>;
}
interface IAgentService_IListKeys extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.StringListMessage> {
    path: "/agentInterface.Agent/ListKeys";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringListMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringListMessage>;
}
interface IAgentService_IListNodes extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.StringListMessage> {
    path: "/agentInterface.Agent/ListNodes";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringListMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringListMessage>;
}
interface IAgentService_IListSecrets extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.StringListMessage> {
    path: "/agentInterface.Agent/ListSecrets";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringListMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringListMessage>;
}
interface IAgentService_IListVaults extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.StringListMessage> {
    path: "/agentInterface.Agent/ListVaults";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringListMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringListMessage>;
}
interface IAgentService_ILockNode extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/LockNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_INewClientCertificate extends grpc.MethodDefinition<Agent_pb.NewClientCertificateMessage, Agent_pb.NewClientCertificateMessage> {
    path: "/agentInterface.Agent/NewClientCertificate";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.NewClientCertificateMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.NewClientCertificateMessage>;
    responseSerialize: grpc.serialize<Agent_pb.NewClientCertificateMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.NewClientCertificateMessage>;
}
interface IAgentService_INewSecret extends grpc.MethodDefinition<Agent_pb.SecretContentMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/NewSecret";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.SecretContentMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.SecretContentMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_INewOAuthToken extends grpc.MethodDefinition<Agent_pb.NewOAuthTokenMessage, Agent_pb.StringMessage> {
    path: "/agentInterface.Agent/NewOAuthToken";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.NewOAuthTokenMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.NewOAuthTokenMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IAgentService_INewVault extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/NewVault";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IPingNode extends grpc.MethodDefinition<Agent_pb.ContactNodeMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/PingNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.ContactNodeMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.ContactNodeMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IPullVault extends grpc.MethodDefinition<Agent_pb.VaultPathMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/PullVault";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.VaultPathMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.VaultPathMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IRenameVault extends grpc.MethodDefinition<Agent_pb.RenameVaultMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/RenameVault";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.RenameVaultMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.RenameVaultMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IReadMessage extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.NodeNotifMessage> {
    path: "/agentInterface.Agent/ReadMessage";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.NodeNotifMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.NodeNotifMessage>;
}
interface IAgentService_IRecoverKeynode extends grpc.MethodDefinition<Agent_pb.RecoverKeynodeMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/RecoverKeynode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.RecoverKeynodeMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.RecoverKeynodeMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IRevokeOAuthToken extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/RevokeOAuthToken";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IScanVaultNames extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.StringListMessage> {
    path: "/agentInterface.Agent/ScanVaultNames";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringListMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringListMessage>;
}
interface IAgentService_ISendMessage extends grpc.MethodDefinition<Agent_pb.NodeMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/SendMessage";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.NodeMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.NodeMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_ISetAlias extends grpc.MethodDefinition<Agent_pb.NodeAliasMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/SetAlias";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.NodeAliasMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.NodeAliasMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_ISetIdentity extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/SetIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IShareVault extends grpc.MethodDefinition<Agent_pb.ShareVaultMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/ShareVault";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.ShareVaultMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.ShareVaultMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_ISignFile extends grpc.MethodDefinition<Agent_pb.SignFileMessage, Agent_pb.StringMessage> {
    path: "/agentInterface.Agent/SignFile";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.SignFileMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.SignFileMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IAgentService_IStopAgent extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/StopAgent";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IToggleStealthMode extends grpc.MethodDefinition<Agent_pb.BooleanMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/ToggleStealthMode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.BooleanMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.BooleanMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_ITrustGestalt extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/TrustGestalt";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IUnlockNode extends grpc.MethodDefinition<Agent_pb.UnlockNodeMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/UnlockNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.UnlockNodeMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.UnlockNodeMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IUnsetAlias extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/UnsetAlias";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IUnshareVault extends grpc.MethodDefinition<Agent_pb.VaultPathMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/UnshareVault";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.VaultPathMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.VaultPathMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IUntrustGestalt extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/UntrustGestalt";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IUpdateLocalNodeInfo extends grpc.MethodDefinition<Agent_pb.NodeInfoMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/UpdateLocalNodeInfo";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.NodeInfoMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.NodeInfoMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IUpdateNodeInfo extends grpc.MethodDefinition<Agent_pb.NodeInfoReadOnlyMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/UpdateNodeInfo";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.NodeInfoReadOnlyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.NodeInfoReadOnlyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IUpdateSecret extends grpc.MethodDefinition<Agent_pb.SecretContentMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/UpdateSecret";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.SecretContentMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.SecretContentMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IVerifyFile extends grpc.MethodDefinition<Agent_pb.VerifyFileMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/VerifyFile";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.VerifyFileMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.VerifyFileMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_IVerifyMnemonic extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/VerifyMnemonic";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}

export const AgentService: IAgentService;

export interface IAgentServer {
    addNode: grpc.handleUnaryCall<Agent_pb.NodeInfoReadOnlyMessage, Agent_pb.StringMessage>;
    augmentKeynode: grpc.handleUnaryCall<Agent_pb.AugmentKeynodeRequest, Agent_pb.AugmentKeynodeReply>;
    authenticateProvider: grpc.handleUnaryCall<Agent_pb.AuthenticateProviderRequest, Agent_pb.AuthenticateProviderReply>;
    decryptFile: grpc.handleUnaryCall<Agent_pb.DecryptFileMessage, Agent_pb.StringMessage>;
    deleteKey: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.EmptyMessage>;
    deleteSecret: grpc.handleUnaryCall<Agent_pb.SecretPathMessage, Agent_pb.EmptyMessage>;
    deleteVault: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.EmptyMessage>;
    deriveKey: grpc.handleUnaryCall<Agent_pb.DeriveKeyMessage, Agent_pb.EmptyMessage>;
    deriveKeyPair: grpc.handleUnaryCall<Agent_pb.DeriveKeyPairMessage, Agent_pb.EmptyMessage>;
    discoverGestaltIdentity: grpc.handleServerStreamingCall<Agent_pb.IdentityMessage, Agent_pb.EmptyMessage>;
    discoverGestaltNode: grpc.handleServerStreamingCall<Agent_pb.IdentityMessage, Agent_pb.EmptyMessage>;
    encryptFile: grpc.handleUnaryCall<Agent_pb.EncryptFileMessage, Agent_pb.StringMessage>;
    findNode: grpc.handleUnaryCall<Agent_pb.ContactNodeMessage, Agent_pb.EmptyMessage>;
    getConnectedIdentityInfos: grpc.handleServerStreamingCall<Agent_pb.ProviderSearchMessage, Agent_pb.IdentityInfoMessage>;
    getIdentityInfo: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.IdentityInfo>;
    getGestalts: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.GestaltListMessage>;
    getGestaltByIdentity: grpc.handleUnaryCall<Agent_pb.IdentityMessage, Agent_pb.GestaltMessage>;
    gestaltIsTrusted: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.BooleanMessage>;
    getOAuthClient: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.OAuthClientMessage>;
    getKey: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.StringMessage>;
    getLocalNodeInfo: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.NodeInfoMessage>;
    getNodeInfo: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.NodeInfoMessage>;
    getPrimaryKeyPair: grpc.handleUnaryCall<Agent_pb.BooleanMessage, Agent_pb.KeyPairMessage>;
    getRootCertificate: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.StringMessage>;
    getSecret: grpc.handleUnaryCall<Agent_pb.SecretPathMessage, Agent_pb.StringMessage>;
    getStatus: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.AgentStatusMessage>;
    getVaultStats: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.VaultStatsMessage>;
    initializeNode: grpc.handleUnaryCall<Agent_pb.NewKeyPairMessage, Agent_pb.EmptyMessage>;
    listOAuthTokens: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.StringListMessage>;
    listKeys: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.StringListMessage>;
    listNodes: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.StringListMessage>;
    listSecrets: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.StringListMessage>;
    listVaults: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.StringListMessage>;
    lockNode: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.EmptyMessage>;
    newClientCertificate: grpc.handleUnaryCall<Agent_pb.NewClientCertificateMessage, Agent_pb.NewClientCertificateMessage>;
    newSecret: grpc.handleUnaryCall<Agent_pb.SecretContentMessage, Agent_pb.EmptyMessage>;
    newOAuthToken: grpc.handleUnaryCall<Agent_pb.NewOAuthTokenMessage, Agent_pb.StringMessage>;
    newVault: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.EmptyMessage>;
    pingNode: grpc.handleUnaryCall<Agent_pb.ContactNodeMessage, Agent_pb.EmptyMessage>;
    pullVault: grpc.handleUnaryCall<Agent_pb.VaultPathMessage, Agent_pb.EmptyMessage>;
    renameVault: grpc.handleUnaryCall<Agent_pb.RenameVaultMessage, Agent_pb.EmptyMessage>;
    readMessage: grpc.handleServerStreamingCall<Agent_pb.EmptyMessage, Agent_pb.NodeNotifMessage>;
    recoverKeynode: grpc.handleUnaryCall<Agent_pb.RecoverKeynodeMessage, Agent_pb.EmptyMessage>;
    revokeOAuthToken: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.EmptyMessage>;
    scanVaultNames: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.StringListMessage>;
    sendMessage: grpc.handleUnaryCall<Agent_pb.NodeMessage, Agent_pb.EmptyMessage>;
    setAlias: grpc.handleUnaryCall<Agent_pb.NodeAliasMessage, Agent_pb.EmptyMessage>;
    setIdentity: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.EmptyMessage>;
    shareVault: grpc.handleUnaryCall<Agent_pb.ShareVaultMessage, Agent_pb.EmptyMessage>;
    signFile: grpc.handleUnaryCall<Agent_pb.SignFileMessage, Agent_pb.StringMessage>;
    stopAgent: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.EmptyMessage>;
    toggleStealthMode: grpc.handleUnaryCall<Agent_pb.BooleanMessage, Agent_pb.EmptyMessage>;
    trustGestalt: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.EmptyMessage>;
    unlockNode: grpc.handleUnaryCall<Agent_pb.UnlockNodeMessage, Agent_pb.EmptyMessage>;
    unsetAlias: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.EmptyMessage>;
    unshareVault: grpc.handleUnaryCall<Agent_pb.VaultPathMessage, Agent_pb.EmptyMessage>;
    untrustGestalt: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.EmptyMessage>;
    updateLocalNodeInfo: grpc.handleUnaryCall<Agent_pb.NodeInfoMessage, Agent_pb.EmptyMessage>;
    updateNodeInfo: grpc.handleUnaryCall<Agent_pb.NodeInfoReadOnlyMessage, Agent_pb.EmptyMessage>;
    updateSecret: grpc.handleUnaryCall<Agent_pb.SecretContentMessage, Agent_pb.EmptyMessage>;
    verifyFile: grpc.handleUnaryCall<Agent_pb.VerifyFileMessage, Agent_pb.EmptyMessage>;
    verifyMnemonic: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.EmptyMessage>;
}

export interface IAgentClient {
    addNode(request: Agent_pb.NodeInfoReadOnlyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    addNode(request: Agent_pb.NodeInfoReadOnlyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    addNode(request: Agent_pb.NodeInfoReadOnlyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    augmentKeynode(request: Agent_pb.AugmentKeynodeRequest, callback: (error: grpc.ServiceError | null, response: Agent_pb.AugmentKeynodeReply) => void): grpc.ClientUnaryCall;
    augmentKeynode(request: Agent_pb.AugmentKeynodeRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.AugmentKeynodeReply) => void): grpc.ClientUnaryCall;
    augmentKeynode(request: Agent_pb.AugmentKeynodeRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.AugmentKeynodeReply) => void): grpc.ClientUnaryCall;
    authenticateProvider(request: Agent_pb.AuthenticateProviderRequest, callback: (error: grpc.ServiceError | null, response: Agent_pb.AuthenticateProviderReply) => void): grpc.ClientUnaryCall;
    authenticateProvider(request: Agent_pb.AuthenticateProviderRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.AuthenticateProviderReply) => void): grpc.ClientUnaryCall;
    authenticateProvider(request: Agent_pb.AuthenticateProviderRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.AuthenticateProviderReply) => void): grpc.ClientUnaryCall;
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
    discoverGestaltIdentity(request: Agent_pb.IdentityMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.EmptyMessage>;
    discoverGestaltIdentity(request: Agent_pb.IdentityMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.EmptyMessage>;
    discoverGestaltNode(request: Agent_pb.IdentityMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.EmptyMessage>;
    discoverGestaltNode(request: Agent_pb.IdentityMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.EmptyMessage>;
    encryptFile(request: Agent_pb.EncryptFileMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    encryptFile(request: Agent_pb.EncryptFileMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    encryptFile(request: Agent_pb.EncryptFileMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    findNode(request: Agent_pb.ContactNodeMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    findNode(request: Agent_pb.ContactNodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    findNode(request: Agent_pb.ContactNodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    getConnectedIdentityInfos(request: Agent_pb.ProviderSearchMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.IdentityInfoMessage>;
    getConnectedIdentityInfos(request: Agent_pb.ProviderSearchMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.IdentityInfoMessage>;
    getIdentityInfo(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.IdentityInfo) => void): grpc.ClientUnaryCall;
    getIdentityInfo(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.IdentityInfo) => void): grpc.ClientUnaryCall;
    getIdentityInfo(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.IdentityInfo) => void): grpc.ClientUnaryCall;
    getGestalts(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.GestaltListMessage) => void): grpc.ClientUnaryCall;
    getGestalts(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.GestaltListMessage) => void): grpc.ClientUnaryCall;
    getGestalts(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.GestaltListMessage) => void): grpc.ClientUnaryCall;
    getGestaltByIdentity(request: Agent_pb.IdentityMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.GestaltMessage) => void): grpc.ClientUnaryCall;
    getGestaltByIdentity(request: Agent_pb.IdentityMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.GestaltMessage) => void): grpc.ClientUnaryCall;
    getGestaltByIdentity(request: Agent_pb.IdentityMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.GestaltMessage) => void): grpc.ClientUnaryCall;
    gestaltIsTrusted(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.BooleanMessage) => void): grpc.ClientUnaryCall;
    gestaltIsTrusted(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.BooleanMessage) => void): grpc.ClientUnaryCall;
    gestaltIsTrusted(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.BooleanMessage) => void): grpc.ClientUnaryCall;
    getOAuthClient(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.OAuthClientMessage) => void): grpc.ClientUnaryCall;
    getOAuthClient(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.OAuthClientMessage) => void): grpc.ClientUnaryCall;
    getOAuthClient(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.OAuthClientMessage) => void): grpc.ClientUnaryCall;
    getKey(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getKey(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getKey(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getLocalNodeInfo(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeInfoMessage) => void): grpc.ClientUnaryCall;
    getLocalNodeInfo(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeInfoMessage) => void): grpc.ClientUnaryCall;
    getLocalNodeInfo(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeInfoMessage) => void): grpc.ClientUnaryCall;
    getNodeInfo(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeInfoMessage) => void): grpc.ClientUnaryCall;
    getNodeInfo(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeInfoMessage) => void): grpc.ClientUnaryCall;
    getNodeInfo(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeInfoMessage) => void): grpc.ClientUnaryCall;
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
    listNodes(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    listNodes(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    listNodes(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
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
    pingNode(request: Agent_pb.ContactNodeMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    pingNode(request: Agent_pb.ContactNodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    pingNode(request: Agent_pb.ContactNodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    pullVault(request: Agent_pb.VaultPathMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    pullVault(request: Agent_pb.VaultPathMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    pullVault(request: Agent_pb.VaultPathMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    renameVault(request: Agent_pb.RenameVaultMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    renameVault(request: Agent_pb.RenameVaultMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    renameVault(request: Agent_pb.RenameVaultMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    readMessage(request: Agent_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.NodeNotifMessage>;
    readMessage(request: Agent_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.NodeNotifMessage>;
    recoverKeynode(request: Agent_pb.RecoverKeynodeMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    recoverKeynode(request: Agent_pb.RecoverKeynodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    recoverKeynode(request: Agent_pb.RecoverKeynodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    revokeOAuthToken(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    revokeOAuthToken(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    revokeOAuthToken(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    scanVaultNames(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    scanVaultNames(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    scanVaultNames(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    sendMessage(request: Agent_pb.NodeMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    sendMessage(request: Agent_pb.NodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    sendMessage(request: Agent_pb.NodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    setAlias(request: Agent_pb.NodeAliasMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    setAlias(request: Agent_pb.NodeAliasMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    setAlias(request: Agent_pb.NodeAliasMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    setIdentity(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    setIdentity(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    setIdentity(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
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
    trustGestalt(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    trustGestalt(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    trustGestalt(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unlockNode(request: Agent_pb.UnlockNodeMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unlockNode(request: Agent_pb.UnlockNodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unlockNode(request: Agent_pb.UnlockNodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unsetAlias(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unsetAlias(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unsetAlias(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unshareVault(request: Agent_pb.VaultPathMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unshareVault(request: Agent_pb.VaultPathMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    unshareVault(request: Agent_pb.VaultPathMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    untrustGestalt(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    untrustGestalt(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    untrustGestalt(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    updateLocalNodeInfo(request: Agent_pb.NodeInfoMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    updateLocalNodeInfo(request: Agent_pb.NodeInfoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    updateLocalNodeInfo(request: Agent_pb.NodeInfoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    updateNodeInfo(request: Agent_pb.NodeInfoReadOnlyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    updateNodeInfo(request: Agent_pb.NodeInfoReadOnlyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    updateNodeInfo(request: Agent_pb.NodeInfoReadOnlyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
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
    public addNode(request: Agent_pb.NodeInfoReadOnlyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public addNode(request: Agent_pb.NodeInfoReadOnlyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public addNode(request: Agent_pb.NodeInfoReadOnlyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public augmentKeynode(request: Agent_pb.AugmentKeynodeRequest, callback: (error: grpc.ServiceError | null, response: Agent_pb.AugmentKeynodeReply) => void): grpc.ClientUnaryCall;
    public augmentKeynode(request: Agent_pb.AugmentKeynodeRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.AugmentKeynodeReply) => void): grpc.ClientUnaryCall;
    public augmentKeynode(request: Agent_pb.AugmentKeynodeRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.AugmentKeynodeReply) => void): grpc.ClientUnaryCall;
    public authenticateProvider(request: Agent_pb.AuthenticateProviderRequest, callback: (error: grpc.ServiceError | null, response: Agent_pb.AuthenticateProviderReply) => void): grpc.ClientUnaryCall;
    public authenticateProvider(request: Agent_pb.AuthenticateProviderRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.AuthenticateProviderReply) => void): grpc.ClientUnaryCall;
    public authenticateProvider(request: Agent_pb.AuthenticateProviderRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.AuthenticateProviderReply) => void): grpc.ClientUnaryCall;
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
    public discoverGestaltIdentity(request: Agent_pb.IdentityMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.EmptyMessage>;
    public discoverGestaltIdentity(request: Agent_pb.IdentityMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.EmptyMessage>;
    public discoverGestaltNode(request: Agent_pb.IdentityMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.EmptyMessage>;
    public discoverGestaltNode(request: Agent_pb.IdentityMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.EmptyMessage>;
    public encryptFile(request: Agent_pb.EncryptFileMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public encryptFile(request: Agent_pb.EncryptFileMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public encryptFile(request: Agent_pb.EncryptFileMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public findNode(request: Agent_pb.ContactNodeMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public findNode(request: Agent_pb.ContactNodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public findNode(request: Agent_pb.ContactNodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public getConnectedIdentityInfos(request: Agent_pb.ProviderSearchMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.IdentityInfoMessage>;
    public getConnectedIdentityInfos(request: Agent_pb.ProviderSearchMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.IdentityInfoMessage>;
    public getIdentityInfo(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.IdentityInfo) => void): grpc.ClientUnaryCall;
    public getIdentityInfo(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.IdentityInfo) => void): grpc.ClientUnaryCall;
    public getIdentityInfo(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.IdentityInfo) => void): grpc.ClientUnaryCall;
    public getGestalts(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.GestaltListMessage) => void): grpc.ClientUnaryCall;
    public getGestalts(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.GestaltListMessage) => void): grpc.ClientUnaryCall;
    public getGestalts(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.GestaltListMessage) => void): grpc.ClientUnaryCall;
    public getGestaltByIdentity(request: Agent_pb.IdentityMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.GestaltMessage) => void): grpc.ClientUnaryCall;
    public getGestaltByIdentity(request: Agent_pb.IdentityMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.GestaltMessage) => void): grpc.ClientUnaryCall;
    public getGestaltByIdentity(request: Agent_pb.IdentityMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.GestaltMessage) => void): grpc.ClientUnaryCall;
    public gestaltIsTrusted(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.BooleanMessage) => void): grpc.ClientUnaryCall;
    public gestaltIsTrusted(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.BooleanMessage) => void): grpc.ClientUnaryCall;
    public gestaltIsTrusted(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.BooleanMessage) => void): grpc.ClientUnaryCall;
    public getOAuthClient(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.OAuthClientMessage) => void): grpc.ClientUnaryCall;
    public getOAuthClient(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.OAuthClientMessage) => void): grpc.ClientUnaryCall;
    public getOAuthClient(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.OAuthClientMessage) => void): grpc.ClientUnaryCall;
    public getKey(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getKey(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getKey(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getLocalNodeInfo(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeInfoMessage) => void): grpc.ClientUnaryCall;
    public getLocalNodeInfo(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeInfoMessage) => void): grpc.ClientUnaryCall;
    public getLocalNodeInfo(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeInfoMessage) => void): grpc.ClientUnaryCall;
    public getNodeInfo(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeInfoMessage) => void): grpc.ClientUnaryCall;
    public getNodeInfo(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeInfoMessage) => void): grpc.ClientUnaryCall;
    public getNodeInfo(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeInfoMessage) => void): grpc.ClientUnaryCall;
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
    public listNodes(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public listNodes(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public listNodes(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
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
    public pingNode(request: Agent_pb.ContactNodeMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public pingNode(request: Agent_pb.ContactNodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public pingNode(request: Agent_pb.ContactNodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public pullVault(request: Agent_pb.VaultPathMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public pullVault(request: Agent_pb.VaultPathMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public pullVault(request: Agent_pb.VaultPathMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public renameVault(request: Agent_pb.RenameVaultMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public renameVault(request: Agent_pb.RenameVaultMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public renameVault(request: Agent_pb.RenameVaultMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public readMessage(request: Agent_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.NodeNotifMessage>;
    public readMessage(request: Agent_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.NodeNotifMessage>;
    public recoverKeynode(request: Agent_pb.RecoverKeynodeMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public recoverKeynode(request: Agent_pb.RecoverKeynodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public recoverKeynode(request: Agent_pb.RecoverKeynodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public revokeOAuthToken(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public revokeOAuthToken(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public revokeOAuthToken(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public scanVaultNames(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public scanVaultNames(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public scanVaultNames(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringListMessage) => void): grpc.ClientUnaryCall;
    public sendMessage(request: Agent_pb.NodeMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public sendMessage(request: Agent_pb.NodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public sendMessage(request: Agent_pb.NodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public setAlias(request: Agent_pb.NodeAliasMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public setAlias(request: Agent_pb.NodeAliasMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public setAlias(request: Agent_pb.NodeAliasMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public setIdentity(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public setIdentity(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public setIdentity(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
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
    public trustGestalt(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public trustGestalt(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public trustGestalt(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unlockNode(request: Agent_pb.UnlockNodeMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unlockNode(request: Agent_pb.UnlockNodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unlockNode(request: Agent_pb.UnlockNodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unsetAlias(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unsetAlias(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unsetAlias(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unshareVault(request: Agent_pb.VaultPathMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unshareVault(request: Agent_pb.VaultPathMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public unshareVault(request: Agent_pb.VaultPathMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public untrustGestalt(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public untrustGestalt(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public untrustGestalt(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public updateLocalNodeInfo(request: Agent_pb.NodeInfoMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public updateLocalNodeInfo(request: Agent_pb.NodeInfoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public updateLocalNodeInfo(request: Agent_pb.NodeInfoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public updateNodeInfo(request: Agent_pb.NodeInfoReadOnlyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public updateNodeInfo(request: Agent_pb.NodeInfoReadOnlyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public updateNodeInfo(request: Agent_pb.NodeInfoReadOnlyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
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
