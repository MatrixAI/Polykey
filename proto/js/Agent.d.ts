import * as $protobuf from "protobufjs";
export = Agent;

declare namespace Agent {


    /** Namespace agentInterface. */
    namespace agentInterface {

        /** Represents an Agent */
        class Agent extends $protobuf.rpc.Service {

            /**
             * Constructs a new Agent service.
             * @param rpcImpl RPC implementation
             * @param [requestDelimited=false] Whether requests are length-delimited
             * @param [responseDelimited=false] Whether responses are length-delimited
             */
            constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);

            /**
             * Creates new Agent service using the specified rpc implementation.
             * @param rpcImpl RPC implementation
             * @param [requestDelimited=false] Whether requests are length-delimited
             * @param [responseDelimited=false] Whether responses are length-delimited
             * @returns RPC service. Useful where requests and/or responses are streamed.
             */
            public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): Agent;

            /**
             * Calls AddPeer.
             * @param request PeerInfoMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public addPeer(request: agentInterface.IPeerInfoMessage, callback: agentInterface.Agent.AddPeerCallback): void;

            /**
             * Calls AddPeer.
             * @param request PeerInfoMessage message or plain object
             * @returns Promise
             */
            public addPeer(request: agentInterface.IPeerInfoMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls DecryptFile.
             * @param request DecryptFileMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and StringMessage
             */
            public decryptFile(request: agentInterface.IDecryptFileMessage, callback: agentInterface.Agent.DecryptFileCallback): void;

            /**
             * Calls DecryptFile.
             * @param request DecryptFileMessage message or plain object
             * @returns Promise
             */
            public decryptFile(request: agentInterface.IDecryptFileMessage): Promise<agentInterface.StringMessage>;

            /**
             * Calls DeleteKey.
             * @param request StringMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public deleteKey(request: agentInterface.IStringMessage, callback: agentInterface.Agent.DeleteKeyCallback): void;

            /**
             * Calls DeleteKey.
             * @param request StringMessage message or plain object
             * @returns Promise
             */
            public deleteKey(request: agentInterface.IStringMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls DeleteSecret.
             * @param request SecretPathMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public deleteSecret(request: agentInterface.ISecretPathMessage, callback: agentInterface.Agent.DeleteSecretCallback): void;

            /**
             * Calls DeleteSecret.
             * @param request SecretPathMessage message or plain object
             * @returns Promise
             */
            public deleteSecret(request: agentInterface.ISecretPathMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls DeleteVault.
             * @param request StringMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public deleteVault(request: agentInterface.IStringMessage, callback: agentInterface.Agent.DeleteVaultCallback): void;

            /**
             * Calls DeleteVault.
             * @param request StringMessage message or plain object
             * @returns Promise
             */
            public deleteVault(request: agentInterface.IStringMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls DeriveKey.
             * @param request DeriveKeyMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public deriveKey(request: agentInterface.IDeriveKeyMessage, callback: agentInterface.Agent.DeriveKeyCallback): void;

            /**
             * Calls DeriveKey.
             * @param request DeriveKeyMessage message or plain object
             * @returns Promise
             */
            public deriveKey(request: agentInterface.IDeriveKeyMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls EncryptFile.
             * @param request EncryptFileMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and StringMessage
             */
            public encryptFile(request: agentInterface.IEncryptFileMessage, callback: agentInterface.Agent.EncryptFileCallback): void;

            /**
             * Calls EncryptFile.
             * @param request EncryptFileMessage message or plain object
             * @returns Promise
             */
            public encryptFile(request: agentInterface.IEncryptFileMessage): Promise<agentInterface.StringMessage>;

            /**
             * Calls FindPeer.
             * @param request ContactPeerMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public findPeer(request: agentInterface.IContactPeerMessage, callback: agentInterface.Agent.FindPeerCallback): void;

            /**
             * Calls FindPeer.
             * @param request ContactPeerMessage message or plain object
             * @returns Promise
             */
            public findPeer(request: agentInterface.IContactPeerMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls FindSocialPeer.
             * @param request ContactPeerMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public findSocialPeer(request: agentInterface.IContactPeerMessage, callback: agentInterface.Agent.FindSocialPeerCallback): void;

            /**
             * Calls FindSocialPeer.
             * @param request ContactPeerMessage message or plain object
             * @returns Promise
             */
            public findSocialPeer(request: agentInterface.IContactPeerMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls GetOAuthClient.
             * @param request EmptyMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and OAuthClientMessage
             */
            public getOAuthClient(request: agentInterface.IEmptyMessage, callback: agentInterface.Agent.GetOAuthClientCallback): void;

            /**
             * Calls GetOAuthClient.
             * @param request EmptyMessage message or plain object
             * @returns Promise
             */
            public getOAuthClient(request: agentInterface.IEmptyMessage): Promise<agentInterface.OAuthClientMessage>;

            /**
             * Calls GetKey.
             * @param request StringMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and StringMessage
             */
            public getKey(request: agentInterface.IStringMessage, callback: agentInterface.Agent.GetKeyCallback): void;

            /**
             * Calls GetKey.
             * @param request StringMessage message or plain object
             * @returns Promise
             */
            public getKey(request: agentInterface.IStringMessage): Promise<agentInterface.StringMessage>;

            /**
             * Calls GetLocalPeerInfo.
             * @param request EmptyMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and PeerInfoMessage
             */
            public getLocalPeerInfo(request: agentInterface.IEmptyMessage, callback: agentInterface.Agent.GetLocalPeerInfoCallback): void;

            /**
             * Calls GetLocalPeerInfo.
             * @param request EmptyMessage message or plain object
             * @returns Promise
             */
            public getLocalPeerInfo(request: agentInterface.IEmptyMessage): Promise<agentInterface.PeerInfoMessage>;

            /**
             * Calls GetPeerInfo.
             * @param request StringMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and PeerInfoMessage
             */
            public getPeerInfo(request: agentInterface.IStringMessage, callback: agentInterface.Agent.GetPeerInfoCallback): void;

            /**
             * Calls GetPeerInfo.
             * @param request StringMessage message or plain object
             * @returns Promise
             */
            public getPeerInfo(request: agentInterface.IStringMessage): Promise<agentInterface.PeerInfoMessage>;

            /**
             * Calls GetPrimaryKeyPair.
             * @param request BooleanMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and KeyPairMessage
             */
            public getPrimaryKeyPair(request: agentInterface.IBooleanMessage, callback: agentInterface.Agent.GetPrimaryKeyPairCallback): void;

            /**
             * Calls GetPrimaryKeyPair.
             * @param request BooleanMessage message or plain object
             * @returns Promise
             */
            public getPrimaryKeyPair(request: agentInterface.IBooleanMessage): Promise<agentInterface.KeyPairMessage>;

            /**
             * Calls GetRootCertificate.
             * @param request EmptyMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and StringMessage
             */
            public getRootCertificate(request: agentInterface.IEmptyMessage, callback: agentInterface.Agent.GetRootCertificateCallback): void;

            /**
             * Calls GetRootCertificate.
             * @param request EmptyMessage message or plain object
             * @returns Promise
             */
            public getRootCertificate(request: agentInterface.IEmptyMessage): Promise<agentInterface.StringMessage>;

            /**
             * Calls GetSecret.
             * @param request SecretPathMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and StringMessage
             */
            public getSecret(request: agentInterface.ISecretPathMessage, callback: agentInterface.Agent.GetSecretCallback): void;

            /**
             * Calls GetSecret.
             * @param request SecretPathMessage message or plain object
             * @returns Promise
             */
            public getSecret(request: agentInterface.ISecretPathMessage): Promise<agentInterface.StringMessage>;

            /**
             * Calls GetStatus.
             * @param request EmptyMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and AgentStatusMessage
             */
            public getStatus(request: agentInterface.IEmptyMessage, callback: agentInterface.Agent.GetStatusCallback): void;

            /**
             * Calls GetStatus.
             * @param request EmptyMessage message or plain object
             * @returns Promise
             */
            public getStatus(request: agentInterface.IEmptyMessage): Promise<agentInterface.AgentStatusMessage>;

            /**
             * Calls ListOAuthTokens.
             * @param request EmptyMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and StringListMessage
             */
            public listOAuthTokens(request: agentInterface.IEmptyMessage, callback: agentInterface.Agent.ListOAuthTokensCallback): void;

            /**
             * Calls ListOAuthTokens.
             * @param request EmptyMessage message or plain object
             * @returns Promise
             */
            public listOAuthTokens(request: agentInterface.IEmptyMessage): Promise<agentInterface.StringListMessage>;

            /**
             * Calls ListKeys.
             * @param request EmptyMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and StringListMessage
             */
            public listKeys(request: agentInterface.IEmptyMessage, callback: agentInterface.Agent.ListKeysCallback): void;

            /**
             * Calls ListKeys.
             * @param request EmptyMessage message or plain object
             * @returns Promise
             */
            public listKeys(request: agentInterface.IEmptyMessage): Promise<agentInterface.StringListMessage>;

            /**
             * Calls ListNodes.
             * @param request BooleanMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and StringListMessage
             */
            public listNodes(request: agentInterface.IBooleanMessage, callback: agentInterface.Agent.ListNodesCallback): void;

            /**
             * Calls ListNodes.
             * @param request BooleanMessage message or plain object
             * @returns Promise
             */
            public listNodes(request: agentInterface.IBooleanMessage): Promise<agentInterface.StringListMessage>;

            /**
             * Calls ListPeers.
             * @param request EmptyMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and StringListMessage
             */
            public listPeers(request: agentInterface.IEmptyMessage, callback: agentInterface.Agent.ListPeersCallback): void;

            /**
             * Calls ListPeers.
             * @param request EmptyMessage message or plain object
             * @returns Promise
             */
            public listPeers(request: agentInterface.IEmptyMessage): Promise<agentInterface.StringListMessage>;

            /**
             * Calls ListSecrets.
             * @param request StringMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and StringListMessage
             */
            public listSecrets(request: agentInterface.IStringMessage, callback: agentInterface.Agent.ListSecretsCallback): void;

            /**
             * Calls ListSecrets.
             * @param request StringMessage message or plain object
             * @returns Promise
             */
            public listSecrets(request: agentInterface.IStringMessage): Promise<agentInterface.StringListMessage>;

            /**
             * Calls ListVaults.
             * @param request EmptyMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and StringListMessage
             */
            public listVaults(request: agentInterface.IEmptyMessage, callback: agentInterface.Agent.ListVaultsCallback): void;

            /**
             * Calls ListVaults.
             * @param request EmptyMessage message or plain object
             * @returns Promise
             */
            public listVaults(request: agentInterface.IEmptyMessage): Promise<agentInterface.StringListMessage>;

            /**
             * Calls LockNode.
             * @param request EmptyMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and EmptyMessage
             */
            public lockNode(request: agentInterface.IEmptyMessage, callback: agentInterface.Agent.LockNodeCallback): void;

            /**
             * Calls LockNode.
             * @param request EmptyMessage message or plain object
             * @returns Promise
             */
            public lockNode(request: agentInterface.IEmptyMessage): Promise<agentInterface.EmptyMessage>;

            /**
             * Calls NewClientCertificate.
             * @param request NewClientCertificateMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and NewClientCertificateMessage
             */
            public newClientCertificate(request: agentInterface.INewClientCertificateMessage, callback: agentInterface.Agent.NewClientCertificateCallback): void;

            /**
             * Calls NewClientCertificate.
             * @param request NewClientCertificateMessage message or plain object
             * @returns Promise
             */
            public newClientCertificate(request: agentInterface.INewClientCertificateMessage): Promise<agentInterface.NewClientCertificateMessage>;

            /**
             * Calls NewNode.
             * @param request NewNodeMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public newNode(request: agentInterface.INewNodeMessage, callback: agentInterface.Agent.NewNodeCallback): void;

            /**
             * Calls NewNode.
             * @param request NewNodeMessage message or plain object
             * @returns Promise
             */
            public newNode(request: agentInterface.INewNodeMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls NewSecret.
             * @param request SecretContentMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public newSecret(request: agentInterface.ISecretContentMessage, callback: agentInterface.Agent.NewSecretCallback): void;

            /**
             * Calls NewSecret.
             * @param request SecretContentMessage message or plain object
             * @returns Promise
             */
            public newSecret(request: agentInterface.ISecretContentMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls NewOAuthToken.
             * @param request NewOAuthTokenMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and StringMessage
             */
            public newOAuthToken(request: agentInterface.INewOAuthTokenMessage, callback: agentInterface.Agent.NewOAuthTokenCallback): void;

            /**
             * Calls NewOAuthToken.
             * @param request NewOAuthTokenMessage message or plain object
             * @returns Promise
             */
            public newOAuthToken(request: agentInterface.INewOAuthTokenMessage): Promise<agentInterface.StringMessage>;

            /**
             * Calls NewVault.
             * @param request StringMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public newVault(request: agentInterface.IStringMessage, callback: agentInterface.Agent.NewVaultCallback): void;

            /**
             * Calls NewVault.
             * @param request StringMessage message or plain object
             * @returns Promise
             */
            public newVault(request: agentInterface.IStringMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls PingPeer.
             * @param request ContactPeerMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public pingPeer(request: agentInterface.IContactPeerMessage, callback: agentInterface.Agent.PingPeerCallback): void;

            /**
             * Calls PingPeer.
             * @param request ContactPeerMessage message or plain object
             * @returns Promise
             */
            public pingPeer(request: agentInterface.IContactPeerMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls PullVault.
             * @param request VaultPathMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public pullVault(request: agentInterface.IVaultPathMessage, callback: agentInterface.Agent.PullVaultCallback): void;

            /**
             * Calls PullVault.
             * @param request VaultPathMessage message or plain object
             * @returns Promise
             */
            public pullVault(request: agentInterface.IVaultPathMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls RevokeOAuthToken.
             * @param request StringMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public revokeOAuthToken(request: agentInterface.IStringMessage, callback: agentInterface.Agent.RevokeOAuthTokenCallback): void;

            /**
             * Calls RevokeOAuthToken.
             * @param request StringMessage message or plain object
             * @returns Promise
             */
            public revokeOAuthToken(request: agentInterface.IStringMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls ScanVaultNames.
             * @param request StringMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and StringListMessage
             */
            public scanVaultNames(request: agentInterface.IStringMessage, callback: agentInterface.Agent.ScanVaultNamesCallback): void;

            /**
             * Calls ScanVaultNames.
             * @param request StringMessage message or plain object
             * @returns Promise
             */
            public scanVaultNames(request: agentInterface.IStringMessage): Promise<agentInterface.StringListMessage>;

            /**
             * Calls SignFile.
             * @param request SignFileMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and StringMessage
             */
            public signFile(request: agentInterface.ISignFileMessage, callback: agentInterface.Agent.SignFileCallback): void;

            /**
             * Calls SignFile.
             * @param request SignFileMessage message or plain object
             * @returns Promise
             */
            public signFile(request: agentInterface.ISignFileMessage): Promise<agentInterface.StringMessage>;

            /**
             * Calls StopAgent.
             * @param request EmptyMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public stopAgent(request: agentInterface.IEmptyMessage, callback: agentInterface.Agent.StopAgentCallback): void;

            /**
             * Calls StopAgent.
             * @param request EmptyMessage message or plain object
             * @returns Promise
             */
            public stopAgent(request: agentInterface.IEmptyMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls ToggleStealthMode.
             * @param request BooleanMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public toggleStealthMode(request: agentInterface.IBooleanMessage, callback: agentInterface.Agent.ToggleStealthModeCallback): void;

            /**
             * Calls ToggleStealthMode.
             * @param request BooleanMessage message or plain object
             * @returns Promise
             */
            public toggleStealthMode(request: agentInterface.IBooleanMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls UnlockNode.
             * @param request UnlockNodeMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public unlockNode(request: agentInterface.IUnlockNodeMessage, callback: agentInterface.Agent.UnlockNodeCallback): void;

            /**
             * Calls UnlockNode.
             * @param request UnlockNodeMessage message or plain object
             * @returns Promise
             */
            public unlockNode(request: agentInterface.IUnlockNodeMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls UpdateLocalPeerInfo.
             * @param request PeerInfoMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public updateLocalPeerInfo(request: agentInterface.IPeerInfoMessage, callback: agentInterface.Agent.UpdateLocalPeerInfoCallback): void;

            /**
             * Calls UpdateLocalPeerInfo.
             * @param request PeerInfoMessage message or plain object
             * @returns Promise
             */
            public updateLocalPeerInfo(request: agentInterface.IPeerInfoMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls UpdatePeerInfo.
             * @param request PeerInfoMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public updatePeerInfo(request: agentInterface.IPeerInfoMessage, callback: agentInterface.Agent.UpdatePeerInfoCallback): void;

            /**
             * Calls UpdatePeerInfo.
             * @param request PeerInfoMessage message or plain object
             * @returns Promise
             */
            public updatePeerInfo(request: agentInterface.IPeerInfoMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls UpdateSecret.
             * @param request SecretContentMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public updateSecret(request: agentInterface.ISecretContentMessage, callback: agentInterface.Agent.UpdateSecretCallback): void;

            /**
             * Calls UpdateSecret.
             * @param request SecretContentMessage message or plain object
             * @returns Promise
             */
            public updateSecret(request: agentInterface.ISecretContentMessage): Promise<agentInterface.BooleanMessage>;

            /**
             * Calls VerifyFile.
             * @param request VerifyFileMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and BooleanMessage
             */
            public verifyFile(request: agentInterface.IVerifyFileMessage, callback: agentInterface.Agent.VerifyFileCallback): void;

            /**
             * Calls VerifyFile.
             * @param request VerifyFileMessage message or plain object
             * @returns Promise
             */
            public verifyFile(request: agentInterface.IVerifyFileMessage): Promise<agentInterface.BooleanMessage>;
        }

        namespace Agent {

            /**
             * Callback as used by {@link agentInterface.Agent#addPeer}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type AddPeerCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#decryptFile}.
             * @param error Error, if any
             * @param [response] StringMessage
             */
            type DecryptFileCallback = (error: (Error|null), response?: agentInterface.StringMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#deleteKey}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type DeleteKeyCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#deleteSecret}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type DeleteSecretCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#deleteVault}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type DeleteVaultCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#deriveKey}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type DeriveKeyCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#encryptFile}.
             * @param error Error, if any
             * @param [response] StringMessage
             */
            type EncryptFileCallback = (error: (Error|null), response?: agentInterface.StringMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#findPeer}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type FindPeerCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#findSocialPeer}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type FindSocialPeerCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#getOAuthClient}.
             * @param error Error, if any
             * @param [response] OAuthClientMessage
             */
            type GetOAuthClientCallback = (error: (Error|null), response?: agentInterface.OAuthClientMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#getKey}.
             * @param error Error, if any
             * @param [response] StringMessage
             */
            type GetKeyCallback = (error: (Error|null), response?: agentInterface.StringMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#getLocalPeerInfo}.
             * @param error Error, if any
             * @param [response] PeerInfoMessage
             */
            type GetLocalPeerInfoCallback = (error: (Error|null), response?: agentInterface.PeerInfoMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#getPeerInfo}.
             * @param error Error, if any
             * @param [response] PeerInfoMessage
             */
            type GetPeerInfoCallback = (error: (Error|null), response?: agentInterface.PeerInfoMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#getPrimaryKeyPair}.
             * @param error Error, if any
             * @param [response] KeyPairMessage
             */
            type GetPrimaryKeyPairCallback = (error: (Error|null), response?: agentInterface.KeyPairMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#getRootCertificate}.
             * @param error Error, if any
             * @param [response] StringMessage
             */
            type GetRootCertificateCallback = (error: (Error|null), response?: agentInterface.StringMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#getSecret}.
             * @param error Error, if any
             * @param [response] StringMessage
             */
            type GetSecretCallback = (error: (Error|null), response?: agentInterface.StringMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#getStatus}.
             * @param error Error, if any
             * @param [response] AgentStatusMessage
             */
            type GetStatusCallback = (error: (Error|null), response?: agentInterface.AgentStatusMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#listOAuthTokens}.
             * @param error Error, if any
             * @param [response] StringListMessage
             */
            type ListOAuthTokensCallback = (error: (Error|null), response?: agentInterface.StringListMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#listKeys}.
             * @param error Error, if any
             * @param [response] StringListMessage
             */
            type ListKeysCallback = (error: (Error|null), response?: agentInterface.StringListMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#listNodes}.
             * @param error Error, if any
             * @param [response] StringListMessage
             */
            type ListNodesCallback = (error: (Error|null), response?: agentInterface.StringListMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#listPeers}.
             * @param error Error, if any
             * @param [response] StringListMessage
             */
            type ListPeersCallback = (error: (Error|null), response?: agentInterface.StringListMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#listSecrets}.
             * @param error Error, if any
             * @param [response] StringListMessage
             */
            type ListSecretsCallback = (error: (Error|null), response?: agentInterface.StringListMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#listVaults}.
             * @param error Error, if any
             * @param [response] StringListMessage
             */
            type ListVaultsCallback = (error: (Error|null), response?: agentInterface.StringListMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#lockNode}.
             * @param error Error, if any
             * @param [response] EmptyMessage
             */
            type LockNodeCallback = (error: (Error|null), response?: agentInterface.EmptyMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#newClientCertificate}.
             * @param error Error, if any
             * @param [response] NewClientCertificateMessage
             */
            type NewClientCertificateCallback = (error: (Error|null), response?: agentInterface.NewClientCertificateMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#newNode}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type NewNodeCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#newSecret}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type NewSecretCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#newOAuthToken}.
             * @param error Error, if any
             * @param [response] StringMessage
             */
            type NewOAuthTokenCallback = (error: (Error|null), response?: agentInterface.StringMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#newVault}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type NewVaultCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#pingPeer}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type PingPeerCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#pullVault}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type PullVaultCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#revokeOAuthToken}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type RevokeOAuthTokenCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#scanVaultNames}.
             * @param error Error, if any
             * @param [response] StringListMessage
             */
            type ScanVaultNamesCallback = (error: (Error|null), response?: agentInterface.StringListMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#signFile}.
             * @param error Error, if any
             * @param [response] StringMessage
             */
            type SignFileCallback = (error: (Error|null), response?: agentInterface.StringMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#stopAgent}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type StopAgentCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#toggleStealthMode}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type ToggleStealthModeCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#unlockNode}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type UnlockNodeCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#updateLocalPeerInfo}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type UpdateLocalPeerInfoCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#updatePeerInfo}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type UpdatePeerInfoCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#updateSecret}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type UpdateSecretCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;

            /**
             * Callback as used by {@link agentInterface.Agent#verifyFile}.
             * @param error Error, if any
             * @param [response] BooleanMessage
             */
            type VerifyFileCallback = (error: (Error|null), response?: agentInterface.BooleanMessage) => void;
        }

        /** Properties of an EmptyMessage. */
        interface IEmptyMessage {
        }

        /** Represents an EmptyMessage. */
        class EmptyMessage implements IEmptyMessage {

            /**
             * Constructs a new EmptyMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IEmptyMessage);

            /**
             * Creates a new EmptyMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns EmptyMessage instance
             */
            public static create(properties?: agentInterface.IEmptyMessage): agentInterface.EmptyMessage;

            /**
             * Encodes the specified EmptyMessage message. Does not implicitly {@link agentInterface.EmptyMessage.verify|verify} messages.
             * @param m EmptyMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IEmptyMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified EmptyMessage message, length delimited. Does not implicitly {@link agentInterface.EmptyMessage.verify|verify} messages.
             * @param message EmptyMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IEmptyMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an EmptyMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns EmptyMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.EmptyMessage;

            /**
             * Decodes an EmptyMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns EmptyMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.EmptyMessage;
        }

        /** Properties of a StringMessage. */
        interface IStringMessage {

            /** StringMessage s */
            s?: (string|null);
        }

        /** Represents a StringMessage. */
        class StringMessage implements IStringMessage {

            /**
             * Constructs a new StringMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IStringMessage);

            /** StringMessage s. */
            public s: string;

            /**
             * Creates a new StringMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns StringMessage instance
             */
            public static create(properties?: agentInterface.IStringMessage): agentInterface.StringMessage;

            /**
             * Encodes the specified StringMessage message. Does not implicitly {@link agentInterface.StringMessage.verify|verify} messages.
             * @param m StringMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IStringMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified StringMessage message, length delimited. Does not implicitly {@link agentInterface.StringMessage.verify|verify} messages.
             * @param message StringMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IStringMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a StringMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns StringMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.StringMessage;

            /**
             * Decodes a StringMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns StringMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.StringMessage;
        }

        /** Properties of a BooleanMessage. */
        interface IBooleanMessage {

            /** BooleanMessage b */
            b?: (boolean|null);
        }

        /** Represents a BooleanMessage. */
        class BooleanMessage implements IBooleanMessage {

            /**
             * Constructs a new BooleanMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IBooleanMessage);

            /** BooleanMessage b. */
            public b: boolean;

            /**
             * Creates a new BooleanMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns BooleanMessage instance
             */
            public static create(properties?: agentInterface.IBooleanMessage): agentInterface.BooleanMessage;

            /**
             * Encodes the specified BooleanMessage message. Does not implicitly {@link agentInterface.BooleanMessage.verify|verify} messages.
             * @param m BooleanMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IBooleanMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified BooleanMessage message, length delimited. Does not implicitly {@link agentInterface.BooleanMessage.verify|verify} messages.
             * @param message BooleanMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IBooleanMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a BooleanMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns BooleanMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.BooleanMessage;

            /**
             * Decodes a BooleanMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns BooleanMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.BooleanMessage;
        }

        /** Properties of a StringListMessage. */
        interface IStringListMessage {

            /** StringListMessage s */
            s?: (string[]|null);
        }

        /** Represents a StringListMessage. */
        class StringListMessage implements IStringListMessage {

            /**
             * Constructs a new StringListMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IStringListMessage);

            /** StringListMessage s. */
            public s: string[];

            /**
             * Creates a new StringListMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns StringListMessage instance
             */
            public static create(properties?: agentInterface.IStringListMessage): agentInterface.StringListMessage;

            /**
             * Encodes the specified StringListMessage message. Does not implicitly {@link agentInterface.StringListMessage.verify|verify} messages.
             * @param m StringListMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IStringListMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified StringListMessage message, length delimited. Does not implicitly {@link agentInterface.StringListMessage.verify|verify} messages.
             * @param message StringListMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IStringListMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a StringListMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns StringListMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.StringListMessage;

            /**
             * Decodes a StringListMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns StringListMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.StringListMessage;
        }

        /** Properties of a PeerInfoMessage. */
        interface IPeerInfoMessage {

            /** PeerInfoMessage publicKey */
            publicKey?: (string|null);

            /** PeerInfoMessage rootCertificate */
            rootCertificate?: (string|null);

            /** PeerInfoMessage peerAddress */
            peerAddress?: (string|null);

            /** PeerInfoMessage apiAddress */
            apiAddress?: (string|null);
        }

        /** Represents a PeerInfoMessage. */
        class PeerInfoMessage implements IPeerInfoMessage {

            /**
             * Constructs a new PeerInfoMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IPeerInfoMessage);

            /** PeerInfoMessage publicKey. */
            public publicKey: string;

            /** PeerInfoMessage rootCertificate. */
            public rootCertificate: string;

            /** PeerInfoMessage peerAddress. */
            public peerAddress: string;

            /** PeerInfoMessage apiAddress. */
            public apiAddress: string;

            /**
             * Creates a new PeerInfoMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PeerInfoMessage instance
             */
            public static create(properties?: agentInterface.IPeerInfoMessage): agentInterface.PeerInfoMessage;

            /**
             * Encodes the specified PeerInfoMessage message. Does not implicitly {@link agentInterface.PeerInfoMessage.verify|verify} messages.
             * @param m PeerInfoMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IPeerInfoMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PeerInfoMessage message, length delimited. Does not implicitly {@link agentInterface.PeerInfoMessage.verify|verify} messages.
             * @param message PeerInfoMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IPeerInfoMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PeerInfoMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PeerInfoMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.PeerInfoMessage;

            /**
             * Decodes a PeerInfoMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PeerInfoMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.PeerInfoMessage;
        }

        /** AgentStatusType enum. */
        enum AgentStatusType {
            ONLINE = 0,
            OFFLINE = 1,
            ERRORED = 2
        }

        /** Properties of an AgentStatusMessage. */
        interface IAgentStatusMessage {

            /** AgentStatusMessage status */
            status?: (agentInterface.AgentStatusType|null);
        }

        /** Represents an AgentStatusMessage. */
        class AgentStatusMessage implements IAgentStatusMessage {

            /**
             * Constructs a new AgentStatusMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IAgentStatusMessage);

            /** AgentStatusMessage status. */
            public status: agentInterface.AgentStatusType;

            /**
             * Creates a new AgentStatusMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns AgentStatusMessage instance
             */
            public static create(properties?: agentInterface.IAgentStatusMessage): agentInterface.AgentStatusMessage;

            /**
             * Encodes the specified AgentStatusMessage message. Does not implicitly {@link agentInterface.AgentStatusMessage.verify|verify} messages.
             * @param m AgentStatusMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IAgentStatusMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified AgentStatusMessage message, length delimited. Does not implicitly {@link agentInterface.AgentStatusMessage.verify|verify} messages.
             * @param message AgentStatusMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IAgentStatusMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an AgentStatusMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns AgentStatusMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.AgentStatusMessage;

            /**
             * Decodes an AgentStatusMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns AgentStatusMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.AgentStatusMessage;
        }

        /** Properties of a NewNodeMessage. */
        interface INewNodeMessage {

            /** NewNodeMessage userId */
            userId?: (string|null);

            /** NewNodeMessage passphrase */
            passphrase?: (string|null);
        }

        /** Represents a NewNodeMessage. */
        class NewNodeMessage implements INewNodeMessage {

            /**
             * Constructs a new NewNodeMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.INewNodeMessage);

            /** NewNodeMessage userId. */
            public userId: string;

            /** NewNodeMessage passphrase. */
            public passphrase: string;

            /**
             * Creates a new NewNodeMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NewNodeMessage instance
             */
            public static create(properties?: agentInterface.INewNodeMessage): agentInterface.NewNodeMessage;

            /**
             * Encodes the specified NewNodeMessage message. Does not implicitly {@link agentInterface.NewNodeMessage.verify|verify} messages.
             * @param m NewNodeMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.INewNodeMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NewNodeMessage message, length delimited. Does not implicitly {@link agentInterface.NewNodeMessage.verify|verify} messages.
             * @param message NewNodeMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.INewNodeMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NewNodeMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns NewNodeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.NewNodeMessage;

            /**
             * Decodes a NewNodeMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns NewNodeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.NewNodeMessage;
        }

        /** Properties of a DeriveKeyMessage. */
        interface IDeriveKeyMessage {

            /** DeriveKeyMessage vaultName */
            vaultName?: (string|null);

            /** DeriveKeyMessage keyName */
            keyName?: (string|null);

            /** DeriveKeyMessage passphrase */
            passphrase?: (string|null);
        }

        /** Represents a DeriveKeyMessage. */
        class DeriveKeyMessage implements IDeriveKeyMessage {

            /**
             * Constructs a new DeriveKeyMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IDeriveKeyMessage);

            /** DeriveKeyMessage vaultName. */
            public vaultName: string;

            /** DeriveKeyMessage keyName. */
            public keyName: string;

            /** DeriveKeyMessage passphrase. */
            public passphrase: string;

            /**
             * Creates a new DeriveKeyMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns DeriveKeyMessage instance
             */
            public static create(properties?: agentInterface.IDeriveKeyMessage): agentInterface.DeriveKeyMessage;

            /**
             * Encodes the specified DeriveKeyMessage message. Does not implicitly {@link agentInterface.DeriveKeyMessage.verify|verify} messages.
             * @param m DeriveKeyMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IDeriveKeyMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DeriveKeyMessage message, length delimited. Does not implicitly {@link agentInterface.DeriveKeyMessage.verify|verify} messages.
             * @param message DeriveKeyMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IDeriveKeyMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DeriveKeyMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns DeriveKeyMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.DeriveKeyMessage;

            /**
             * Decodes a DeriveKeyMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns DeriveKeyMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.DeriveKeyMessage;
        }

        /** Properties of a SignFileMessage. */
        interface ISignFileMessage {

            /** SignFileMessage filePath */
            filePath?: (string|null);

            /** SignFileMessage privateKeyPath */
            privateKeyPath?: (string|null);

            /** SignFileMessage passphrase */
            passphrase?: (string|null);
        }

        /** Represents a SignFileMessage. */
        class SignFileMessage implements ISignFileMessage {

            /**
             * Constructs a new SignFileMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.ISignFileMessage);

            /** SignFileMessage filePath. */
            public filePath: string;

            /** SignFileMessage privateKeyPath. */
            public privateKeyPath: string;

            /** SignFileMessage passphrase. */
            public passphrase: string;

            /**
             * Creates a new SignFileMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SignFileMessage instance
             */
            public static create(properties?: agentInterface.ISignFileMessage): agentInterface.SignFileMessage;

            /**
             * Encodes the specified SignFileMessage message. Does not implicitly {@link agentInterface.SignFileMessage.verify|verify} messages.
             * @param m SignFileMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.ISignFileMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SignFileMessage message, length delimited. Does not implicitly {@link agentInterface.SignFileMessage.verify|verify} messages.
             * @param message SignFileMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.ISignFileMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SignFileMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns SignFileMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.SignFileMessage;

            /**
             * Decodes a SignFileMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SignFileMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.SignFileMessage;
        }

        /** Properties of a VerifyFileMessage. */
        interface IVerifyFileMessage {

            /** VerifyFileMessage filePath */
            filePath?: (string|null);

            /** VerifyFileMessage publicKeyPath */
            publicKeyPath?: (string|null);
        }

        /** Represents a VerifyFileMessage. */
        class VerifyFileMessage implements IVerifyFileMessage {

            /**
             * Constructs a new VerifyFileMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IVerifyFileMessage);

            /** VerifyFileMessage filePath. */
            public filePath: string;

            /** VerifyFileMessage publicKeyPath. */
            public publicKeyPath: string;

            /**
             * Creates a new VerifyFileMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns VerifyFileMessage instance
             */
            public static create(properties?: agentInterface.IVerifyFileMessage): agentInterface.VerifyFileMessage;

            /**
             * Encodes the specified VerifyFileMessage message. Does not implicitly {@link agentInterface.VerifyFileMessage.verify|verify} messages.
             * @param m VerifyFileMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IVerifyFileMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified VerifyFileMessage message, length delimited. Does not implicitly {@link agentInterface.VerifyFileMessage.verify|verify} messages.
             * @param message VerifyFileMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IVerifyFileMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a VerifyFileMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns VerifyFileMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.VerifyFileMessage;

            /**
             * Decodes a VerifyFileMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns VerifyFileMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.VerifyFileMessage;
        }

        /** Properties of a SecretPathMessage. */
        interface ISecretPathMessage {

            /** SecretPathMessage vaultName */
            vaultName?: (string|null);

            /** SecretPathMessage secretName */
            secretName?: (string|null);
        }

        /** Represents a SecretPathMessage. */
        class SecretPathMessage implements ISecretPathMessage {

            /**
             * Constructs a new SecretPathMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.ISecretPathMessage);

            /** SecretPathMessage vaultName. */
            public vaultName: string;

            /** SecretPathMessage secretName. */
            public secretName: string;

            /**
             * Creates a new SecretPathMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SecretPathMessage instance
             */
            public static create(properties?: agentInterface.ISecretPathMessage): agentInterface.SecretPathMessage;

            /**
             * Encodes the specified SecretPathMessage message. Does not implicitly {@link agentInterface.SecretPathMessage.verify|verify} messages.
             * @param m SecretPathMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.ISecretPathMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SecretPathMessage message, length delimited. Does not implicitly {@link agentInterface.SecretPathMessage.verify|verify} messages.
             * @param message SecretPathMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.ISecretPathMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SecretPathMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns SecretPathMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.SecretPathMessage;

            /**
             * Decodes a SecretPathMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SecretPathMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.SecretPathMessage;
        }

        /** Properties of a SecretContentMessage. */
        interface ISecretContentMessage {

            /** SecretContentMessage secretPath */
            secretPath?: (agentInterface.ISecretPathMessage|null);

            /** SecretContentMessage secretFilePath */
            secretFilePath?: (string|null);

            /** SecretContentMessage secretContent */
            secretContent?: (string|null);
        }

        /** Represents a SecretContentMessage. */
        class SecretContentMessage implements ISecretContentMessage {

            /**
             * Constructs a new SecretContentMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.ISecretContentMessage);

            /** SecretContentMessage secretPath. */
            public secretPath?: (agentInterface.ISecretPathMessage|null);

            /** SecretContentMessage secretFilePath. */
            public secretFilePath: string;

            /** SecretContentMessage secretContent. */
            public secretContent: string;

            /**
             * Creates a new SecretContentMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SecretContentMessage instance
             */
            public static create(properties?: agentInterface.ISecretContentMessage): agentInterface.SecretContentMessage;

            /**
             * Encodes the specified SecretContentMessage message. Does not implicitly {@link agentInterface.SecretContentMessage.verify|verify} messages.
             * @param m SecretContentMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.ISecretContentMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SecretContentMessage message, length delimited. Does not implicitly {@link agentInterface.SecretContentMessage.verify|verify} messages.
             * @param message SecretContentMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.ISecretContentMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SecretContentMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns SecretContentMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.SecretContentMessage;

            /**
             * Decodes a SecretContentMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SecretContentMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.SecretContentMessage;
        }

        /** Properties of an EncryptFileMessage. */
        interface IEncryptFileMessage {

            /** EncryptFileMessage filePath */
            filePath?: (string|null);

            /** EncryptFileMessage publicKeyPath */
            publicKeyPath?: (string|null);
        }

        /** Represents an EncryptFileMessage. */
        class EncryptFileMessage implements IEncryptFileMessage {

            /**
             * Constructs a new EncryptFileMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IEncryptFileMessage);

            /** EncryptFileMessage filePath. */
            public filePath: string;

            /** EncryptFileMessage publicKeyPath. */
            public publicKeyPath: string;

            /**
             * Creates a new EncryptFileMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns EncryptFileMessage instance
             */
            public static create(properties?: agentInterface.IEncryptFileMessage): agentInterface.EncryptFileMessage;

            /**
             * Encodes the specified EncryptFileMessage message. Does not implicitly {@link agentInterface.EncryptFileMessage.verify|verify} messages.
             * @param m EncryptFileMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IEncryptFileMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified EncryptFileMessage message, length delimited. Does not implicitly {@link agentInterface.EncryptFileMessage.verify|verify} messages.
             * @param message EncryptFileMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IEncryptFileMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an EncryptFileMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns EncryptFileMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.EncryptFileMessage;

            /**
             * Decodes an EncryptFileMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns EncryptFileMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.EncryptFileMessage;
        }

        /** Properties of a DecryptFileMessage. */
        interface IDecryptFileMessage {

            /** DecryptFileMessage filePath */
            filePath?: (string|null);

            /** DecryptFileMessage privateKeyPath */
            privateKeyPath?: (string|null);

            /** DecryptFileMessage passphrase */
            passphrase?: (string|null);
        }

        /** Represents a DecryptFileMessage. */
        class DecryptFileMessage implements IDecryptFileMessage {

            /**
             * Constructs a new DecryptFileMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IDecryptFileMessage);

            /** DecryptFileMessage filePath. */
            public filePath: string;

            /** DecryptFileMessage privateKeyPath. */
            public privateKeyPath: string;

            /** DecryptFileMessage passphrase. */
            public passphrase: string;

            /**
             * Creates a new DecryptFileMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns DecryptFileMessage instance
             */
            public static create(properties?: agentInterface.IDecryptFileMessage): agentInterface.DecryptFileMessage;

            /**
             * Encodes the specified DecryptFileMessage message. Does not implicitly {@link agentInterface.DecryptFileMessage.verify|verify} messages.
             * @param m DecryptFileMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IDecryptFileMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DecryptFileMessage message, length delimited. Does not implicitly {@link agentInterface.DecryptFileMessage.verify|verify} messages.
             * @param message DecryptFileMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IDecryptFileMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DecryptFileMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns DecryptFileMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.DecryptFileMessage;

            /**
             * Decodes a DecryptFileMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns DecryptFileMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.DecryptFileMessage;
        }

        /** Properties of a KeyPairMessage. */
        interface IKeyPairMessage {

            /** KeyPairMessage publicKey */
            publicKey?: (string|null);

            /** KeyPairMessage privateKey */
            privateKey?: (string|null);
        }

        /** Represents a KeyPairMessage. */
        class KeyPairMessage implements IKeyPairMessage {

            /**
             * Constructs a new KeyPairMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IKeyPairMessage);

            /** KeyPairMessage publicKey. */
            public publicKey: string;

            /** KeyPairMessage privateKey. */
            public privateKey: string;

            /**
             * Creates a new KeyPairMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns KeyPairMessage instance
             */
            public static create(properties?: agentInterface.IKeyPairMessage): agentInterface.KeyPairMessage;

            /**
             * Encodes the specified KeyPairMessage message. Does not implicitly {@link agentInterface.KeyPairMessage.verify|verify} messages.
             * @param m KeyPairMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IKeyPairMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified KeyPairMessage message, length delimited. Does not implicitly {@link agentInterface.KeyPairMessage.verify|verify} messages.
             * @param message KeyPairMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IKeyPairMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a KeyPairMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns KeyPairMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.KeyPairMessage;

            /**
             * Decodes a KeyPairMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns KeyPairMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.KeyPairMessage;
        }

        /** Properties of a VaultPathMessage. */
        interface IVaultPathMessage {

            /** VaultPathMessage vaultName */
            vaultName?: (string|null);

            /** VaultPathMessage publicKey */
            publicKey?: (string|null);
        }

        /** Represents a VaultPathMessage. */
        class VaultPathMessage implements IVaultPathMessage {

            /**
             * Constructs a new VaultPathMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IVaultPathMessage);

            /** VaultPathMessage vaultName. */
            public vaultName: string;

            /** VaultPathMessage publicKey. */
            public publicKey: string;

            /**
             * Creates a new VaultPathMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns VaultPathMessage instance
             */
            public static create(properties?: agentInterface.IVaultPathMessage): agentInterface.VaultPathMessage;

            /**
             * Encodes the specified VaultPathMessage message. Does not implicitly {@link agentInterface.VaultPathMessage.verify|verify} messages.
             * @param m VaultPathMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IVaultPathMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified VaultPathMessage message, length delimited. Does not implicitly {@link agentInterface.VaultPathMessage.verify|verify} messages.
             * @param message VaultPathMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IVaultPathMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a VaultPathMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns VaultPathMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.VaultPathMessage;

            /**
             * Decodes a VaultPathMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns VaultPathMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.VaultPathMessage;
        }

        /** Properties of a ContactPeerMessage. */
        interface IContactPeerMessage {

            /** ContactPeerMessage publicKeyOrHandle */
            publicKeyOrHandle?: (string|null);

            /** ContactPeerMessage timeout */
            timeout?: (number|null);
        }

        /** Represents a ContactPeerMessage. */
        class ContactPeerMessage implements IContactPeerMessage {

            /**
             * Constructs a new ContactPeerMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IContactPeerMessage);

            /** ContactPeerMessage publicKeyOrHandle. */
            public publicKeyOrHandle: string;

            /** ContactPeerMessage timeout. */
            public timeout: number;

            /**
             * Creates a new ContactPeerMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ContactPeerMessage instance
             */
            public static create(properties?: agentInterface.IContactPeerMessage): agentInterface.ContactPeerMessage;

            /**
             * Encodes the specified ContactPeerMessage message. Does not implicitly {@link agentInterface.ContactPeerMessage.verify|verify} messages.
             * @param m ContactPeerMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IContactPeerMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ContactPeerMessage message, length delimited. Does not implicitly {@link agentInterface.ContactPeerMessage.verify|verify} messages.
             * @param message ContactPeerMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IContactPeerMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ContactPeerMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ContactPeerMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.ContactPeerMessage;

            /**
             * Decodes a ContactPeerMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ContactPeerMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.ContactPeerMessage;
        }

        /** Properties of an UnlockNodeMessage. */
        interface IUnlockNodeMessage {

            /** UnlockNodeMessage passphrase */
            passphrase?: (string|null);

            /** UnlockNodeMessage timeout */
            timeout?: (number|null);
        }

        /** Represents an UnlockNodeMessage. */
        class UnlockNodeMessage implements IUnlockNodeMessage {

            /**
             * Constructs a new UnlockNodeMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IUnlockNodeMessage);

            /** UnlockNodeMessage passphrase. */
            public passphrase: string;

            /** UnlockNodeMessage timeout. */
            public timeout: number;

            /**
             * Creates a new UnlockNodeMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns UnlockNodeMessage instance
             */
            public static create(properties?: agentInterface.IUnlockNodeMessage): agentInterface.UnlockNodeMessage;

            /**
             * Encodes the specified UnlockNodeMessage message. Does not implicitly {@link agentInterface.UnlockNodeMessage.verify|verify} messages.
             * @param m UnlockNodeMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IUnlockNodeMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified UnlockNodeMessage message, length delimited. Does not implicitly {@link agentInterface.UnlockNodeMessage.verify|verify} messages.
             * @param message UnlockNodeMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IUnlockNodeMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an UnlockNodeMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns UnlockNodeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.UnlockNodeMessage;

            /**
             * Decodes an UnlockNodeMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns UnlockNodeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.UnlockNodeMessage;
        }

        /** Properties of a NewClientCertificateMessage. */
        interface INewClientCertificateMessage {

            /** NewClientCertificateMessage domain */
            domain?: (string|null);

            /** NewClientCertificateMessage certFile */
            certFile?: (string|null);

            /** NewClientCertificateMessage keyFile */
            keyFile?: (string|null);
        }

        /** Represents a NewClientCertificateMessage. */
        class NewClientCertificateMessage implements INewClientCertificateMessage {

            /**
             * Constructs a new NewClientCertificateMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.INewClientCertificateMessage);

            /** NewClientCertificateMessage domain. */
            public domain: string;

            /** NewClientCertificateMessage certFile. */
            public certFile: string;

            /** NewClientCertificateMessage keyFile. */
            public keyFile: string;

            /**
             * Creates a new NewClientCertificateMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NewClientCertificateMessage instance
             */
            public static create(properties?: agentInterface.INewClientCertificateMessage): agentInterface.NewClientCertificateMessage;

            /**
             * Encodes the specified NewClientCertificateMessage message. Does not implicitly {@link agentInterface.NewClientCertificateMessage.verify|verify} messages.
             * @param m NewClientCertificateMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.INewClientCertificateMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NewClientCertificateMessage message, length delimited. Does not implicitly {@link agentInterface.NewClientCertificateMessage.verify|verify} messages.
             * @param message NewClientCertificateMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.INewClientCertificateMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NewClientCertificateMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns NewClientCertificateMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.NewClientCertificateMessage;

            /**
             * Decodes a NewClientCertificateMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns NewClientCertificateMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.NewClientCertificateMessage;
        }

        /** Properties of a NewOAuthTokenMessage. */
        interface INewOAuthTokenMessage {

            /** NewOAuthTokenMessage scopes */
            scopes?: (string[]|null);

            /** NewOAuthTokenMessage expiry */
            expiry?: (number|null);
        }

        /** Represents a NewOAuthTokenMessage. */
        class NewOAuthTokenMessage implements INewOAuthTokenMessage {

            /**
             * Constructs a new NewOAuthTokenMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.INewOAuthTokenMessage);

            /** NewOAuthTokenMessage scopes. */
            public scopes: string[];

            /** NewOAuthTokenMessage expiry. */
            public expiry: number;

            /**
             * Creates a new NewOAuthTokenMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NewOAuthTokenMessage instance
             */
            public static create(properties?: agentInterface.INewOAuthTokenMessage): agentInterface.NewOAuthTokenMessage;

            /**
             * Encodes the specified NewOAuthTokenMessage message. Does not implicitly {@link agentInterface.NewOAuthTokenMessage.verify|verify} messages.
             * @param m NewOAuthTokenMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.INewOAuthTokenMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NewOAuthTokenMessage message, length delimited. Does not implicitly {@link agentInterface.NewOAuthTokenMessage.verify|verify} messages.
             * @param message NewOAuthTokenMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.INewOAuthTokenMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NewOAuthTokenMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns NewOAuthTokenMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.NewOAuthTokenMessage;

            /**
             * Decodes a NewOAuthTokenMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns NewOAuthTokenMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.NewOAuthTokenMessage;
        }

        /** Properties of a OAuthClientMessage. */
        interface IOAuthClientMessage {

            /** OAuthClientMessage id */
            id?: (string|null);

            /** OAuthClientMessage secret */
            secret?: (string|null);
        }

        /** Represents a OAuthClientMessage. */
        class OAuthClientMessage implements IOAuthClientMessage {

            /**
             * Constructs a new OAuthClientMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IOAuthClientMessage);

            /** OAuthClientMessage id. */
            public id: string;

            /** OAuthClientMessage secret. */
            public secret: string;

            /**
             * Creates a new OAuthClientMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns OAuthClientMessage instance
             */
            public static create(properties?: agentInterface.IOAuthClientMessage): agentInterface.OAuthClientMessage;

            /**
             * Encodes the specified OAuthClientMessage message. Does not implicitly {@link agentInterface.OAuthClientMessage.verify|verify} messages.
             * @param m OAuthClientMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IOAuthClientMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified OAuthClientMessage message, length delimited. Does not implicitly {@link agentInterface.OAuthClientMessage.verify|verify} messages.
             * @param message OAuthClientMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IOAuthClientMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a OAuthClientMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns OAuthClientMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.OAuthClientMessage;

            /**
             * Decodes a OAuthClientMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns OAuthClientMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.OAuthClientMessage;
        }
    }
}
