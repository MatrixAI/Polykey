/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.agentInterface = (function() {

    /**
     * Namespace agentInterface.
     * @exports agentInterface
     * @namespace
     */
    var agentInterface = {};

    agentInterface.Agent = (function() {

        /**
         * Constructs a new Agent service.
         * @memberof agentInterface
         * @classdesc Represents an Agent
         * @extends $protobuf.rpc.Service
         * @constructor
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         */
        function Agent(rpcImpl, requestDelimited, responseDelimited) {
            $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
        }

        (Agent.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = Agent;

        /**
         * Creates new Agent service using the specified rpc implementation.
         * @function create
         * @memberof agentInterface.Agent
         * @static
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         * @returns {Agent} RPC service. Useful where requests and/or responses are streamed.
         */
        Agent.create = function create(rpcImpl, requestDelimited, responseDelimited) {
            return new this(rpcImpl, requestDelimited, responseDelimited);
        };

        /**
         * Callback as used by {@link agentInterface.Agent#addPeer}.
         * @memberof agentInterface.Agent
         * @typedef AddPeerCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls AddPeer.
         * @function addPeer
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IPeerInfoMessage} request PeerInfoMessage message or plain object
         * @param {agentInterface.Agent.AddPeerCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.addPeer = function addPeer(request, callback) {
            return this.rpcCall(addPeer, $root.agentInterface.PeerInfoMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "AddPeer" });

        /**
         * Calls AddPeer.
         * @function addPeer
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IPeerInfoMessage} request PeerInfoMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#decryptFile}.
         * @memberof agentInterface.Agent
         * @typedef DecryptFileCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.StringMessage} [response] StringMessage
         */

        /**
         * Calls DecryptFile.
         * @function decryptFile
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IDecryptFileMessage} request DecryptFileMessage message or plain object
         * @param {agentInterface.Agent.DecryptFileCallback} callback Node-style callback called with the error, if any, and StringMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.decryptFile = function decryptFile(request, callback) {
            return this.rpcCall(decryptFile, $root.agentInterface.DecryptFileMessage, $root.agentInterface.StringMessage, request, callback);
        }, "name", { value: "DecryptFile" });

        /**
         * Calls DecryptFile.
         * @function decryptFile
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IDecryptFileMessage} request DecryptFileMessage message or plain object
         * @returns {Promise<agentInterface.StringMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#deleteKey}.
         * @memberof agentInterface.Agent
         * @typedef DeleteKeyCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls DeleteKey.
         * @function deleteKey
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @param {agentInterface.Agent.DeleteKeyCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.deleteKey = function deleteKey(request, callback) {
            return this.rpcCall(deleteKey, $root.agentInterface.StringMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "DeleteKey" });

        /**
         * Calls DeleteKey.
         * @function deleteKey
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#deleteSecret}.
         * @memberof agentInterface.Agent
         * @typedef DeleteSecretCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls DeleteSecret.
         * @function deleteSecret
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.ISecretPathMessage} request SecretPathMessage message or plain object
         * @param {agentInterface.Agent.DeleteSecretCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.deleteSecret = function deleteSecret(request, callback) {
            return this.rpcCall(deleteSecret, $root.agentInterface.SecretPathMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "DeleteSecret" });

        /**
         * Calls DeleteSecret.
         * @function deleteSecret
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.ISecretPathMessage} request SecretPathMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#deleteVault}.
         * @memberof agentInterface.Agent
         * @typedef DeleteVaultCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls DeleteVault.
         * @function deleteVault
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @param {agentInterface.Agent.DeleteVaultCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.deleteVault = function deleteVault(request, callback) {
            return this.rpcCall(deleteVault, $root.agentInterface.StringMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "DeleteVault" });

        /**
         * Calls DeleteVault.
         * @function deleteVault
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#deriveKey}.
         * @memberof agentInterface.Agent
         * @typedef DeriveKeyCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls DeriveKey.
         * @function deriveKey
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IDeriveKeyMessage} request DeriveKeyMessage message or plain object
         * @param {agentInterface.Agent.DeriveKeyCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.deriveKey = function deriveKey(request, callback) {
            return this.rpcCall(deriveKey, $root.agentInterface.DeriveKeyMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "DeriveKey" });

        /**
         * Calls DeriveKey.
         * @function deriveKey
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IDeriveKeyMessage} request DeriveKeyMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#encryptFile}.
         * @memberof agentInterface.Agent
         * @typedef EncryptFileCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.StringMessage} [response] StringMessage
         */

        /**
         * Calls EncryptFile.
         * @function encryptFile
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IEncryptFileMessage} request EncryptFileMessage message or plain object
         * @param {agentInterface.Agent.EncryptFileCallback} callback Node-style callback called with the error, if any, and StringMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.encryptFile = function encryptFile(request, callback) {
            return this.rpcCall(encryptFile, $root.agentInterface.EncryptFileMessage, $root.agentInterface.StringMessage, request, callback);
        }, "name", { value: "EncryptFile" });

        /**
         * Calls EncryptFile.
         * @function encryptFile
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IEncryptFileMessage} request EncryptFileMessage message or plain object
         * @returns {Promise<agentInterface.StringMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#findPeer}.
         * @memberof agentInterface.Agent
         * @typedef FindPeerCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls FindPeer.
         * @function findPeer
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IContactPeerMessage} request ContactPeerMessage message or plain object
         * @param {agentInterface.Agent.FindPeerCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.findPeer = function findPeer(request, callback) {
            return this.rpcCall(findPeer, $root.agentInterface.ContactPeerMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "FindPeer" });

        /**
         * Calls FindPeer.
         * @function findPeer
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IContactPeerMessage} request ContactPeerMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#findSocialPeer}.
         * @memberof agentInterface.Agent
         * @typedef FindSocialPeerCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls FindSocialPeer.
         * @function findSocialPeer
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IContactPeerMessage} request ContactPeerMessage message or plain object
         * @param {agentInterface.Agent.FindSocialPeerCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.findSocialPeer = function findSocialPeer(request, callback) {
            return this.rpcCall(findSocialPeer, $root.agentInterface.ContactPeerMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "FindSocialPeer" });

        /**
         * Calls FindSocialPeer.
         * @function findSocialPeer
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IContactPeerMessage} request ContactPeerMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#getKey}.
         * @memberof agentInterface.Agent
         * @typedef GetKeyCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.StringMessage} [response] StringMessage
         */

        /**
         * Calls GetKey.
         * @function getKey
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @param {agentInterface.Agent.GetKeyCallback} callback Node-style callback called with the error, if any, and StringMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.getKey = function getKey(request, callback) {
            return this.rpcCall(getKey, $root.agentInterface.StringMessage, $root.agentInterface.StringMessage, request, callback);
        }, "name", { value: "GetKey" });

        /**
         * Calls GetKey.
         * @function getKey
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @returns {Promise<agentInterface.StringMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#getLocalPeerInfo}.
         * @memberof agentInterface.Agent
         * @typedef GetLocalPeerInfoCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.PeerInfoMessage} [response] PeerInfoMessage
         */

        /**
         * Calls GetLocalPeerInfo.
         * @function getLocalPeerInfo
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IEmptyMessage} request EmptyMessage message or plain object
         * @param {agentInterface.Agent.GetLocalPeerInfoCallback} callback Node-style callback called with the error, if any, and PeerInfoMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.getLocalPeerInfo = function getLocalPeerInfo(request, callback) {
            return this.rpcCall(getLocalPeerInfo, $root.agentInterface.EmptyMessage, $root.agentInterface.PeerInfoMessage, request, callback);
        }, "name", { value: "GetLocalPeerInfo" });

        /**
         * Calls GetLocalPeerInfo.
         * @function getLocalPeerInfo
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IEmptyMessage} request EmptyMessage message or plain object
         * @returns {Promise<agentInterface.PeerInfoMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#getPeerInfo}.
         * @memberof agentInterface.Agent
         * @typedef GetPeerInfoCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.PeerInfoMessage} [response] PeerInfoMessage
         */

        /**
         * Calls GetPeerInfo.
         * @function getPeerInfo
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @param {agentInterface.Agent.GetPeerInfoCallback} callback Node-style callback called with the error, if any, and PeerInfoMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.getPeerInfo = function getPeerInfo(request, callback) {
            return this.rpcCall(getPeerInfo, $root.agentInterface.StringMessage, $root.agentInterface.PeerInfoMessage, request, callback);
        }, "name", { value: "GetPeerInfo" });

        /**
         * Calls GetPeerInfo.
         * @function getPeerInfo
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @returns {Promise<agentInterface.PeerInfoMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#getPrimaryKeyPair}.
         * @memberof agentInterface.Agent
         * @typedef GetPrimaryKeyPairCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.KeyPairMessage} [response] KeyPairMessage
         */

        /**
         * Calls GetPrimaryKeyPair.
         * @function getPrimaryKeyPair
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IBooleanMessage} request BooleanMessage message or plain object
         * @param {agentInterface.Agent.GetPrimaryKeyPairCallback} callback Node-style callback called with the error, if any, and KeyPairMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.getPrimaryKeyPair = function getPrimaryKeyPair(request, callback) {
            return this.rpcCall(getPrimaryKeyPair, $root.agentInterface.BooleanMessage, $root.agentInterface.KeyPairMessage, request, callback);
        }, "name", { value: "GetPrimaryKeyPair" });

        /**
         * Calls GetPrimaryKeyPair.
         * @function getPrimaryKeyPair
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IBooleanMessage} request BooleanMessage message or plain object
         * @returns {Promise<agentInterface.KeyPairMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#getSecret}.
         * @memberof agentInterface.Agent
         * @typedef GetSecretCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.StringMessage} [response] StringMessage
         */

        /**
         * Calls GetSecret.
         * @function getSecret
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.ISecretPathMessage} request SecretPathMessage message or plain object
         * @param {agentInterface.Agent.GetSecretCallback} callback Node-style callback called with the error, if any, and StringMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.getSecret = function getSecret(request, callback) {
            return this.rpcCall(getSecret, $root.agentInterface.SecretPathMessage, $root.agentInterface.StringMessage, request, callback);
        }, "name", { value: "GetSecret" });

        /**
         * Calls GetSecret.
         * @function getSecret
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.ISecretPathMessage} request SecretPathMessage message or plain object
         * @returns {Promise<agentInterface.StringMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#getStatus}.
         * @memberof agentInterface.Agent
         * @typedef GetStatusCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.AgentStatusMessage} [response] AgentStatusMessage
         */

        /**
         * Calls GetStatus.
         * @function getStatus
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IEmptyMessage} request EmptyMessage message or plain object
         * @param {agentInterface.Agent.GetStatusCallback} callback Node-style callback called with the error, if any, and AgentStatusMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.getStatus = function getStatus(request, callback) {
            return this.rpcCall(getStatus, $root.agentInterface.EmptyMessage, $root.agentInterface.AgentStatusMessage, request, callback);
        }, "name", { value: "GetStatus" });

        /**
         * Calls GetStatus.
         * @function getStatus
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IEmptyMessage} request EmptyMessage message or plain object
         * @returns {Promise<agentInterface.AgentStatusMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#listKeys}.
         * @memberof agentInterface.Agent
         * @typedef ListKeysCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.StringListMessage} [response] StringListMessage
         */

        /**
         * Calls ListKeys.
         * @function listKeys
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IEmptyMessage} request EmptyMessage message or plain object
         * @param {agentInterface.Agent.ListKeysCallback} callback Node-style callback called with the error, if any, and StringListMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.listKeys = function listKeys(request, callback) {
            return this.rpcCall(listKeys, $root.agentInterface.EmptyMessage, $root.agentInterface.StringListMessage, request, callback);
        }, "name", { value: "ListKeys" });

        /**
         * Calls ListKeys.
         * @function listKeys
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IEmptyMessage} request EmptyMessage message or plain object
         * @returns {Promise<agentInterface.StringListMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#listNodes}.
         * @memberof agentInterface.Agent
         * @typedef ListNodesCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.StringListMessage} [response] StringListMessage
         */

        /**
         * Calls ListNodes.
         * @function listNodes
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IBooleanMessage} request BooleanMessage message or plain object
         * @param {agentInterface.Agent.ListNodesCallback} callback Node-style callback called with the error, if any, and StringListMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.listNodes = function listNodes(request, callback) {
            return this.rpcCall(listNodes, $root.agentInterface.BooleanMessage, $root.agentInterface.StringListMessage, request, callback);
        }, "name", { value: "ListNodes" });

        /**
         * Calls ListNodes.
         * @function listNodes
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IBooleanMessage} request BooleanMessage message or plain object
         * @returns {Promise<agentInterface.StringListMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#listPeers}.
         * @memberof agentInterface.Agent
         * @typedef ListPeersCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.StringListMessage} [response] StringListMessage
         */

        /**
         * Calls ListPeers.
         * @function listPeers
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IEmptyMessage} request EmptyMessage message or plain object
         * @param {agentInterface.Agent.ListPeersCallback} callback Node-style callback called with the error, if any, and StringListMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.listPeers = function listPeers(request, callback) {
            return this.rpcCall(listPeers, $root.agentInterface.EmptyMessage, $root.agentInterface.StringListMessage, request, callback);
        }, "name", { value: "ListPeers" });

        /**
         * Calls ListPeers.
         * @function listPeers
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IEmptyMessage} request EmptyMessage message or plain object
         * @returns {Promise<agentInterface.StringListMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#listSecrets}.
         * @memberof agentInterface.Agent
         * @typedef ListSecretsCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.StringListMessage} [response] StringListMessage
         */

        /**
         * Calls ListSecrets.
         * @function listSecrets
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @param {agentInterface.Agent.ListSecretsCallback} callback Node-style callback called with the error, if any, and StringListMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.listSecrets = function listSecrets(request, callback) {
            return this.rpcCall(listSecrets, $root.agentInterface.StringMessage, $root.agentInterface.StringListMessage, request, callback);
        }, "name", { value: "ListSecrets" });

        /**
         * Calls ListSecrets.
         * @function listSecrets
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @returns {Promise<agentInterface.StringListMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#listVaults}.
         * @memberof agentInterface.Agent
         * @typedef ListVaultsCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.StringListMessage} [response] StringListMessage
         */

        /**
         * Calls ListVaults.
         * @function listVaults
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IEmptyMessage} request EmptyMessage message or plain object
         * @param {agentInterface.Agent.ListVaultsCallback} callback Node-style callback called with the error, if any, and StringListMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.listVaults = function listVaults(request, callback) {
            return this.rpcCall(listVaults, $root.agentInterface.EmptyMessage, $root.agentInterface.StringListMessage, request, callback);
        }, "name", { value: "ListVaults" });

        /**
         * Calls ListVaults.
         * @function listVaults
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IEmptyMessage} request EmptyMessage message or plain object
         * @returns {Promise<agentInterface.StringListMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#newNode}.
         * @memberof agentInterface.Agent
         * @typedef NewNodeCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls NewNode.
         * @function newNode
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.INewNodeMessage} request NewNodeMessage message or plain object
         * @param {agentInterface.Agent.NewNodeCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.newNode = function newNode(request, callback) {
            return this.rpcCall(newNode, $root.agentInterface.NewNodeMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "NewNode" });

        /**
         * Calls NewNode.
         * @function newNode
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.INewNodeMessage} request NewNodeMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#newSecret}.
         * @memberof agentInterface.Agent
         * @typedef NewSecretCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls NewSecret.
         * @function newSecret
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.ISecretContentMessage} request SecretContentMessage message or plain object
         * @param {agentInterface.Agent.NewSecretCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.newSecret = function newSecret(request, callback) {
            return this.rpcCall(newSecret, $root.agentInterface.SecretContentMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "NewSecret" });

        /**
         * Calls NewSecret.
         * @function newSecret
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.ISecretContentMessage} request SecretContentMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#newVault}.
         * @memberof agentInterface.Agent
         * @typedef NewVaultCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls NewVault.
         * @function newVault
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @param {agentInterface.Agent.NewVaultCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.newVault = function newVault(request, callback) {
            return this.rpcCall(newVault, $root.agentInterface.StringMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "NewVault" });

        /**
         * Calls NewVault.
         * @function newVault
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#pingPeer}.
         * @memberof agentInterface.Agent
         * @typedef PingPeerCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls PingPeer.
         * @function pingPeer
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IContactPeerMessage} request ContactPeerMessage message or plain object
         * @param {agentInterface.Agent.PingPeerCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.pingPeer = function pingPeer(request, callback) {
            return this.rpcCall(pingPeer, $root.agentInterface.ContactPeerMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "PingPeer" });

        /**
         * Calls PingPeer.
         * @function pingPeer
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IContactPeerMessage} request ContactPeerMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#pullVault}.
         * @memberof agentInterface.Agent
         * @typedef PullVaultCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls PullVault.
         * @function pullVault
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IVaultPathMessage} request VaultPathMessage message or plain object
         * @param {agentInterface.Agent.PullVaultCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.pullVault = function pullVault(request, callback) {
            return this.rpcCall(pullVault, $root.agentInterface.VaultPathMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "PullVault" });

        /**
         * Calls PullVault.
         * @function pullVault
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IVaultPathMessage} request VaultPathMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#registerNode}.
         * @memberof agentInterface.Agent
         * @typedef RegisterNodeCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls RegisterNode.
         * @function registerNode
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @param {agentInterface.Agent.RegisterNodeCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.registerNode = function registerNode(request, callback) {
            return this.rpcCall(registerNode, $root.agentInterface.StringMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "RegisterNode" });

        /**
         * Calls RegisterNode.
         * @function registerNode
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#requestHolePunch}.
         * @memberof agentInterface.Agent
         * @typedef RequestHolePunchCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls RequestHolePunch.
         * @function requestHolePunch
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @param {agentInterface.Agent.RequestHolePunchCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.requestHolePunch = function requestHolePunch(request, callback) {
            return this.rpcCall(requestHolePunch, $root.agentInterface.StringMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "RequestHolePunch" });

        /**
         * Calls RequestHolePunch.
         * @function requestHolePunch
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#requestRelay}.
         * @memberof agentInterface.Agent
         * @typedef RequestRelayCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls RequestRelay.
         * @function requestRelay
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @param {agentInterface.Agent.RequestRelayCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.requestRelay = function requestRelay(request, callback) {
            return this.rpcCall(requestRelay, $root.agentInterface.StringMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "RequestRelay" });

        /**
         * Calls RequestRelay.
         * @function requestRelay
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#scanVaultNames}.
         * @memberof agentInterface.Agent
         * @typedef ScanVaultNamesCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.StringListMessage} [response] StringListMessage
         */

        /**
         * Calls ScanVaultNames.
         * @function scanVaultNames
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @param {agentInterface.Agent.ScanVaultNamesCallback} callback Node-style callback called with the error, if any, and StringListMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.scanVaultNames = function scanVaultNames(request, callback) {
            return this.rpcCall(scanVaultNames, $root.agentInterface.StringMessage, $root.agentInterface.StringListMessage, request, callback);
        }, "name", { value: "ScanVaultNames" });

        /**
         * Calls ScanVaultNames.
         * @function scanVaultNames
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IStringMessage} request StringMessage message or plain object
         * @returns {Promise<agentInterface.StringListMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#signFile}.
         * @memberof agentInterface.Agent
         * @typedef SignFileCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.StringMessage} [response] StringMessage
         */

        /**
         * Calls SignFile.
         * @function signFile
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.ISignFileMessage} request SignFileMessage message or plain object
         * @param {agentInterface.Agent.SignFileCallback} callback Node-style callback called with the error, if any, and StringMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.signFile = function signFile(request, callback) {
            return this.rpcCall(signFile, $root.agentInterface.SignFileMessage, $root.agentInterface.StringMessage, request, callback);
        }, "name", { value: "SignFile" });

        /**
         * Calls SignFile.
         * @function signFile
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.ISignFileMessage} request SignFileMessage message or plain object
         * @returns {Promise<agentInterface.StringMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#stopAgent}.
         * @memberof agentInterface.Agent
         * @typedef StopAgentCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls StopAgent.
         * @function stopAgent
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IEmptyMessage} request EmptyMessage message or plain object
         * @param {agentInterface.Agent.StopAgentCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.stopAgent = function stopAgent(request, callback) {
            return this.rpcCall(stopAgent, $root.agentInterface.EmptyMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "StopAgent" });

        /**
         * Calls StopAgent.
         * @function stopAgent
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IEmptyMessage} request EmptyMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#toggleStealthMode}.
         * @memberof agentInterface.Agent
         * @typedef ToggleStealthModeCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls ToggleStealthMode.
         * @function toggleStealthMode
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IBooleanMessage} request BooleanMessage message or plain object
         * @param {agentInterface.Agent.ToggleStealthModeCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.toggleStealthMode = function toggleStealthMode(request, callback) {
            return this.rpcCall(toggleStealthMode, $root.agentInterface.BooleanMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "ToggleStealthMode" });

        /**
         * Calls ToggleStealthMode.
         * @function toggleStealthMode
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IBooleanMessage} request BooleanMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#updateLocalPeerInfo}.
         * @memberof agentInterface.Agent
         * @typedef UpdateLocalPeerInfoCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls UpdateLocalPeerInfo.
         * @function updateLocalPeerInfo
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IPeerInfoMessage} request PeerInfoMessage message or plain object
         * @param {agentInterface.Agent.UpdateLocalPeerInfoCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.updateLocalPeerInfo = function updateLocalPeerInfo(request, callback) {
            return this.rpcCall(updateLocalPeerInfo, $root.agentInterface.PeerInfoMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "UpdateLocalPeerInfo" });

        /**
         * Calls UpdateLocalPeerInfo.
         * @function updateLocalPeerInfo
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IPeerInfoMessage} request PeerInfoMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#updatePeerInfo}.
         * @memberof agentInterface.Agent
         * @typedef UpdatePeerInfoCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls UpdatePeerInfo.
         * @function updatePeerInfo
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IPeerInfoMessage} request PeerInfoMessage message or plain object
         * @param {agentInterface.Agent.UpdatePeerInfoCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.updatePeerInfo = function updatePeerInfo(request, callback) {
            return this.rpcCall(updatePeerInfo, $root.agentInterface.PeerInfoMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "UpdatePeerInfo" });

        /**
         * Calls UpdatePeerInfo.
         * @function updatePeerInfo
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IPeerInfoMessage} request PeerInfoMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#updateSecret}.
         * @memberof agentInterface.Agent
         * @typedef UpdateSecretCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls UpdateSecret.
         * @function updateSecret
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.ISecretContentMessage} request SecretContentMessage message or plain object
         * @param {agentInterface.Agent.UpdateSecretCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.updateSecret = function updateSecret(request, callback) {
            return this.rpcCall(updateSecret, $root.agentInterface.SecretContentMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "UpdateSecret" });

        /**
         * Calls UpdateSecret.
         * @function updateSecret
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.ISecretContentMessage} request SecretContentMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link agentInterface.Agent#verifyFile}.
         * @memberof agentInterface.Agent
         * @typedef VerifyFileCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {agentInterface.BooleanMessage} [response] BooleanMessage
         */

        /**
         * Calls VerifyFile.
         * @function verifyFile
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IVerifyFileMessage} request VerifyFileMessage message or plain object
         * @param {agentInterface.Agent.VerifyFileCallback} callback Node-style callback called with the error, if any, and BooleanMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Agent.prototype.verifyFile = function verifyFile(request, callback) {
            return this.rpcCall(verifyFile, $root.agentInterface.VerifyFileMessage, $root.agentInterface.BooleanMessage, request, callback);
        }, "name", { value: "VerifyFile" });

        /**
         * Calls VerifyFile.
         * @function verifyFile
         * @memberof agentInterface.Agent
         * @instance
         * @param {agentInterface.IVerifyFileMessage} request VerifyFileMessage message or plain object
         * @returns {Promise<agentInterface.BooleanMessage>} Promise
         * @variation 2
         */

        return Agent;
    })();

    agentInterface.EmptyMessage = (function() {

        /**
         * Properties of an EmptyMessage.
         * @memberof agentInterface
         * @interface IEmptyMessage
         */

        /**
         * Constructs a new EmptyMessage.
         * @memberof agentInterface
         * @classdesc Represents an EmptyMessage.
         * @implements IEmptyMessage
         * @constructor
         * @param {agentInterface.IEmptyMessage=} [p] Properties to set
         */
        function EmptyMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * Creates a new EmptyMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.EmptyMessage
         * @static
         * @param {agentInterface.IEmptyMessage=} [properties] Properties to set
         * @returns {agentInterface.EmptyMessage} EmptyMessage instance
         */
        EmptyMessage.create = function create(properties) {
            return new EmptyMessage(properties);
        };

        /**
         * Encodes the specified EmptyMessage message. Does not implicitly {@link agentInterface.EmptyMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.EmptyMessage
         * @static
         * @param {agentInterface.IEmptyMessage} m EmptyMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EmptyMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            return w;
        };

        /**
         * Encodes the specified EmptyMessage message, length delimited. Does not implicitly {@link agentInterface.EmptyMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.EmptyMessage
         * @static
         * @param {agentInterface.IEmptyMessage} message EmptyMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EmptyMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an EmptyMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.EmptyMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.EmptyMessage} EmptyMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EmptyMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.EmptyMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes an EmptyMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.EmptyMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.EmptyMessage} EmptyMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EmptyMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return EmptyMessage;
    })();

    agentInterface.StringMessage = (function() {

        /**
         * Properties of a StringMessage.
         * @memberof agentInterface
         * @interface IStringMessage
         * @property {string|null} [s] StringMessage s
         */

        /**
         * Constructs a new StringMessage.
         * @memberof agentInterface
         * @classdesc Represents a StringMessage.
         * @implements IStringMessage
         * @constructor
         * @param {agentInterface.IStringMessage=} [p] Properties to set
         */
        function StringMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * StringMessage s.
         * @member {string} s
         * @memberof agentInterface.StringMessage
         * @instance
         */
        StringMessage.prototype.s = "";

        /**
         * Creates a new StringMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.StringMessage
         * @static
         * @param {agentInterface.IStringMessage=} [properties] Properties to set
         * @returns {agentInterface.StringMessage} StringMessage instance
         */
        StringMessage.create = function create(properties) {
            return new StringMessage(properties);
        };

        /**
         * Encodes the specified StringMessage message. Does not implicitly {@link agentInterface.StringMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.StringMessage
         * @static
         * @param {agentInterface.IStringMessage} m StringMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StringMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.s != null && Object.hasOwnProperty.call(m, "s"))
                w.uint32(10).string(m.s);
            return w;
        };

        /**
         * Encodes the specified StringMessage message, length delimited. Does not implicitly {@link agentInterface.StringMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.StringMessage
         * @static
         * @param {agentInterface.IStringMessage} message StringMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StringMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a StringMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.StringMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.StringMessage} StringMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StringMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.StringMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.s = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a StringMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.StringMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.StringMessage} StringMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StringMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return StringMessage;
    })();

    agentInterface.BooleanMessage = (function() {

        /**
         * Properties of a BooleanMessage.
         * @memberof agentInterface
         * @interface IBooleanMessage
         * @property {boolean|null} [b] BooleanMessage b
         */

        /**
         * Constructs a new BooleanMessage.
         * @memberof agentInterface
         * @classdesc Represents a BooleanMessage.
         * @implements IBooleanMessage
         * @constructor
         * @param {agentInterface.IBooleanMessage=} [p] Properties to set
         */
        function BooleanMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * BooleanMessage b.
         * @member {boolean} b
         * @memberof agentInterface.BooleanMessage
         * @instance
         */
        BooleanMessage.prototype.b = false;

        /**
         * Creates a new BooleanMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.BooleanMessage
         * @static
         * @param {agentInterface.IBooleanMessage=} [properties] Properties to set
         * @returns {agentInterface.BooleanMessage} BooleanMessage instance
         */
        BooleanMessage.create = function create(properties) {
            return new BooleanMessage(properties);
        };

        /**
         * Encodes the specified BooleanMessage message. Does not implicitly {@link agentInterface.BooleanMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.BooleanMessage
         * @static
         * @param {agentInterface.IBooleanMessage} m BooleanMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BooleanMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.b != null && Object.hasOwnProperty.call(m, "b"))
                w.uint32(8).bool(m.b);
            return w;
        };

        /**
         * Encodes the specified BooleanMessage message, length delimited. Does not implicitly {@link agentInterface.BooleanMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.BooleanMessage
         * @static
         * @param {agentInterface.IBooleanMessage} message BooleanMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BooleanMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a BooleanMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.BooleanMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.BooleanMessage} BooleanMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BooleanMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.BooleanMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.b = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a BooleanMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.BooleanMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.BooleanMessage} BooleanMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BooleanMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return BooleanMessage;
    })();

    agentInterface.StringListMessage = (function() {

        /**
         * Properties of a StringListMessage.
         * @memberof agentInterface
         * @interface IStringListMessage
         * @property {Array.<string>|null} [s] StringListMessage s
         */

        /**
         * Constructs a new StringListMessage.
         * @memberof agentInterface
         * @classdesc Represents a StringListMessage.
         * @implements IStringListMessage
         * @constructor
         * @param {agentInterface.IStringListMessage=} [p] Properties to set
         */
        function StringListMessage(p) {
            this.s = [];
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * StringListMessage s.
         * @member {Array.<string>} s
         * @memberof agentInterface.StringListMessage
         * @instance
         */
        StringListMessage.prototype.s = $util.emptyArray;

        /**
         * Creates a new StringListMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.StringListMessage
         * @static
         * @param {agentInterface.IStringListMessage=} [properties] Properties to set
         * @returns {agentInterface.StringListMessage} StringListMessage instance
         */
        StringListMessage.create = function create(properties) {
            return new StringListMessage(properties);
        };

        /**
         * Encodes the specified StringListMessage message. Does not implicitly {@link agentInterface.StringListMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.StringListMessage
         * @static
         * @param {agentInterface.IStringListMessage} m StringListMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StringListMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.s != null && m.s.length) {
                for (var i = 0; i < m.s.length; ++i)
                    w.uint32(10).string(m.s[i]);
            }
            return w;
        };

        /**
         * Encodes the specified StringListMessage message, length delimited. Does not implicitly {@link agentInterface.StringListMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.StringListMessage
         * @static
         * @param {agentInterface.IStringListMessage} message StringListMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StringListMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a StringListMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.StringListMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.StringListMessage} StringListMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StringListMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.StringListMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    if (!(m.s && m.s.length))
                        m.s = [];
                    m.s.push(r.string());
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a StringListMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.StringListMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.StringListMessage} StringListMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StringListMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return StringListMessage;
    })();

    agentInterface.PeerInfoMessage = (function() {

        /**
         * Properties of a PeerInfoMessage.
         * @memberof agentInterface
         * @interface IPeerInfoMessage
         * @property {string|null} [publicKey] PeerInfoMessage publicKey
         * @property {string|null} [relayPublicKey] PeerInfoMessage relayPublicKey
         * @property {string|null} [peerAddress] PeerInfoMessage peerAddress
         * @property {string|null} [apiAddress] PeerInfoMessage apiAddress
         */

        /**
         * Constructs a new PeerInfoMessage.
         * @memberof agentInterface
         * @classdesc Represents a PeerInfoMessage.
         * @implements IPeerInfoMessage
         * @constructor
         * @param {agentInterface.IPeerInfoMessage=} [p] Properties to set
         */
        function PeerInfoMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PeerInfoMessage publicKey.
         * @member {string} publicKey
         * @memberof agentInterface.PeerInfoMessage
         * @instance
         */
        PeerInfoMessage.prototype.publicKey = "";

        /**
         * PeerInfoMessage relayPublicKey.
         * @member {string} relayPublicKey
         * @memberof agentInterface.PeerInfoMessage
         * @instance
         */
        PeerInfoMessage.prototype.relayPublicKey = "";

        /**
         * PeerInfoMessage peerAddress.
         * @member {string} peerAddress
         * @memberof agentInterface.PeerInfoMessage
         * @instance
         */
        PeerInfoMessage.prototype.peerAddress = "";

        /**
         * PeerInfoMessage apiAddress.
         * @member {string} apiAddress
         * @memberof agentInterface.PeerInfoMessage
         * @instance
         */
        PeerInfoMessage.prototype.apiAddress = "";

        /**
         * Creates a new PeerInfoMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.PeerInfoMessage
         * @static
         * @param {agentInterface.IPeerInfoMessage=} [properties] Properties to set
         * @returns {agentInterface.PeerInfoMessage} PeerInfoMessage instance
         */
        PeerInfoMessage.create = function create(properties) {
            return new PeerInfoMessage(properties);
        };

        /**
         * Encodes the specified PeerInfoMessage message. Does not implicitly {@link agentInterface.PeerInfoMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.PeerInfoMessage
         * @static
         * @param {agentInterface.IPeerInfoMessage} m PeerInfoMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerInfoMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            if (m.relayPublicKey != null && Object.hasOwnProperty.call(m, "relayPublicKey"))
                w.uint32(18).string(m.relayPublicKey);
            if (m.peerAddress != null && Object.hasOwnProperty.call(m, "peerAddress"))
                w.uint32(26).string(m.peerAddress);
            if (m.apiAddress != null && Object.hasOwnProperty.call(m, "apiAddress"))
                w.uint32(34).string(m.apiAddress);
            return w;
        };

        /**
         * Encodes the specified PeerInfoMessage message, length delimited. Does not implicitly {@link agentInterface.PeerInfoMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.PeerInfoMessage
         * @static
         * @param {agentInterface.IPeerInfoMessage} message PeerInfoMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerInfoMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PeerInfoMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.PeerInfoMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.PeerInfoMessage} PeerInfoMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerInfoMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.PeerInfoMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.publicKey = r.string();
                    break;
                case 2:
                    m.relayPublicKey = r.string();
                    break;
                case 3:
                    m.peerAddress = r.string();
                    break;
                case 4:
                    m.apiAddress = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a PeerInfoMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.PeerInfoMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.PeerInfoMessage} PeerInfoMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerInfoMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PeerInfoMessage;
    })();

    /**
     * AgentStatusType enum.
     * @name agentInterface.AgentStatusType
     * @enum {number}
     * @property {number} ONLINE=0 ONLINE value
     * @property {number} OFFLINE=1 OFFLINE value
     * @property {number} ERRORED=2 ERRORED value
     */
    agentInterface.AgentStatusType = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "ONLINE"] = 0;
        values[valuesById[1] = "OFFLINE"] = 1;
        values[valuesById[2] = "ERRORED"] = 2;
        return values;
    })();

    agentInterface.AgentStatusMessage = (function() {

        /**
         * Properties of an AgentStatusMessage.
         * @memberof agentInterface
         * @interface IAgentStatusMessage
         * @property {agentInterface.AgentStatusType|null} [status] AgentStatusMessage status
         */

        /**
         * Constructs a new AgentStatusMessage.
         * @memberof agentInterface
         * @classdesc Represents an AgentStatusMessage.
         * @implements IAgentStatusMessage
         * @constructor
         * @param {agentInterface.IAgentStatusMessage=} [p] Properties to set
         */
        function AgentStatusMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * AgentStatusMessage status.
         * @member {agentInterface.AgentStatusType} status
         * @memberof agentInterface.AgentStatusMessage
         * @instance
         */
        AgentStatusMessage.prototype.status = 0;

        /**
         * Creates a new AgentStatusMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.AgentStatusMessage
         * @static
         * @param {agentInterface.IAgentStatusMessage=} [properties] Properties to set
         * @returns {agentInterface.AgentStatusMessage} AgentStatusMessage instance
         */
        AgentStatusMessage.create = function create(properties) {
            return new AgentStatusMessage(properties);
        };

        /**
         * Encodes the specified AgentStatusMessage message. Does not implicitly {@link agentInterface.AgentStatusMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.AgentStatusMessage
         * @static
         * @param {agentInterface.IAgentStatusMessage} m AgentStatusMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AgentStatusMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.status != null && Object.hasOwnProperty.call(m, "status"))
                w.uint32(8).int32(m.status);
            return w;
        };

        /**
         * Encodes the specified AgentStatusMessage message, length delimited. Does not implicitly {@link agentInterface.AgentStatusMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.AgentStatusMessage
         * @static
         * @param {agentInterface.IAgentStatusMessage} message AgentStatusMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AgentStatusMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an AgentStatusMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.AgentStatusMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.AgentStatusMessage} AgentStatusMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AgentStatusMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.AgentStatusMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.status = r.int32();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes an AgentStatusMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.AgentStatusMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.AgentStatusMessage} AgentStatusMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AgentStatusMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return AgentStatusMessage;
    })();

    agentInterface.NewNodeMessage = (function() {

        /**
         * Properties of a NewNodeMessage.
         * @memberof agentInterface
         * @interface INewNodeMessage
         * @property {string|null} [userId] NewNodeMessage userId
         * @property {string|null} [passphrase] NewNodeMessage passphrase
         * @property {number|null} [nbits] NewNodeMessage nbits
         */

        /**
         * Constructs a new NewNodeMessage.
         * @memberof agentInterface
         * @classdesc Represents a NewNodeMessage.
         * @implements INewNodeMessage
         * @constructor
         * @param {agentInterface.INewNodeMessage=} [p] Properties to set
         */
        function NewNodeMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * NewNodeMessage userId.
         * @member {string} userId
         * @memberof agentInterface.NewNodeMessage
         * @instance
         */
        NewNodeMessage.prototype.userId = "";

        /**
         * NewNodeMessage passphrase.
         * @member {string} passphrase
         * @memberof agentInterface.NewNodeMessage
         * @instance
         */
        NewNodeMessage.prototype.passphrase = "";

        /**
         * NewNodeMessage nbits.
         * @member {number} nbits
         * @memberof agentInterface.NewNodeMessage
         * @instance
         */
        NewNodeMessage.prototype.nbits = 0;

        /**
         * Creates a new NewNodeMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.NewNodeMessage
         * @static
         * @param {agentInterface.INewNodeMessage=} [properties] Properties to set
         * @returns {agentInterface.NewNodeMessage} NewNodeMessage instance
         */
        NewNodeMessage.create = function create(properties) {
            return new NewNodeMessage(properties);
        };

        /**
         * Encodes the specified NewNodeMessage message. Does not implicitly {@link agentInterface.NewNodeMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.NewNodeMessage
         * @static
         * @param {agentInterface.INewNodeMessage} m NewNodeMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NewNodeMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.userId != null && Object.hasOwnProperty.call(m, "userId"))
                w.uint32(10).string(m.userId);
            if (m.passphrase != null && Object.hasOwnProperty.call(m, "passphrase"))
                w.uint32(18).string(m.passphrase);
            if (m.nbits != null && Object.hasOwnProperty.call(m, "nbits"))
                w.uint32(24).int32(m.nbits);
            return w;
        };

        /**
         * Encodes the specified NewNodeMessage message, length delimited. Does not implicitly {@link agentInterface.NewNodeMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.NewNodeMessage
         * @static
         * @param {agentInterface.INewNodeMessage} message NewNodeMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NewNodeMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a NewNodeMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.NewNodeMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.NewNodeMessage} NewNodeMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NewNodeMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.NewNodeMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.userId = r.string();
                    break;
                case 2:
                    m.passphrase = r.string();
                    break;
                case 3:
                    m.nbits = r.int32();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a NewNodeMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.NewNodeMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.NewNodeMessage} NewNodeMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NewNodeMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return NewNodeMessage;
    })();

    agentInterface.DeriveKeyMessage = (function() {

        /**
         * Properties of a DeriveKeyMessage.
         * @memberof agentInterface
         * @interface IDeriveKeyMessage
         * @property {string|null} [vaultName] DeriveKeyMessage vaultName
         * @property {string|null} [keyName] DeriveKeyMessage keyName
         * @property {string|null} [passphrase] DeriveKeyMessage passphrase
         */

        /**
         * Constructs a new DeriveKeyMessage.
         * @memberof agentInterface
         * @classdesc Represents a DeriveKeyMessage.
         * @implements IDeriveKeyMessage
         * @constructor
         * @param {agentInterface.IDeriveKeyMessage=} [p] Properties to set
         */
        function DeriveKeyMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * DeriveKeyMessage vaultName.
         * @member {string} vaultName
         * @memberof agentInterface.DeriveKeyMessage
         * @instance
         */
        DeriveKeyMessage.prototype.vaultName = "";

        /**
         * DeriveKeyMessage keyName.
         * @member {string} keyName
         * @memberof agentInterface.DeriveKeyMessage
         * @instance
         */
        DeriveKeyMessage.prototype.keyName = "";

        /**
         * DeriveKeyMessage passphrase.
         * @member {string} passphrase
         * @memberof agentInterface.DeriveKeyMessage
         * @instance
         */
        DeriveKeyMessage.prototype.passphrase = "";

        /**
         * Creates a new DeriveKeyMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.DeriveKeyMessage
         * @static
         * @param {agentInterface.IDeriveKeyMessage=} [properties] Properties to set
         * @returns {agentInterface.DeriveKeyMessage} DeriveKeyMessage instance
         */
        DeriveKeyMessage.create = function create(properties) {
            return new DeriveKeyMessage(properties);
        };

        /**
         * Encodes the specified DeriveKeyMessage message. Does not implicitly {@link agentInterface.DeriveKeyMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.DeriveKeyMessage
         * @static
         * @param {agentInterface.IDeriveKeyMessage} m DeriveKeyMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DeriveKeyMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultName != null && Object.hasOwnProperty.call(m, "vaultName"))
                w.uint32(10).string(m.vaultName);
            if (m.keyName != null && Object.hasOwnProperty.call(m, "keyName"))
                w.uint32(18).string(m.keyName);
            if (m.passphrase != null && Object.hasOwnProperty.call(m, "passphrase"))
                w.uint32(26).string(m.passphrase);
            return w;
        };

        /**
         * Encodes the specified DeriveKeyMessage message, length delimited. Does not implicitly {@link agentInterface.DeriveKeyMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.DeriveKeyMessage
         * @static
         * @param {agentInterface.IDeriveKeyMessage} message DeriveKeyMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DeriveKeyMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DeriveKeyMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.DeriveKeyMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.DeriveKeyMessage} DeriveKeyMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeriveKeyMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.DeriveKeyMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.vaultName = r.string();
                    break;
                case 2:
                    m.keyName = r.string();
                    break;
                case 3:
                    m.passphrase = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a DeriveKeyMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.DeriveKeyMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.DeriveKeyMessage} DeriveKeyMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeriveKeyMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return DeriveKeyMessage;
    })();

    agentInterface.SignFileMessage = (function() {

        /**
         * Properties of a SignFileMessage.
         * @memberof agentInterface
         * @interface ISignFileMessage
         * @property {string|null} [filePath] SignFileMessage filePath
         * @property {string|null} [privateKeyPath] SignFileMessage privateKeyPath
         * @property {string|null} [passphrase] SignFileMessage passphrase
         */

        /**
         * Constructs a new SignFileMessage.
         * @memberof agentInterface
         * @classdesc Represents a SignFileMessage.
         * @implements ISignFileMessage
         * @constructor
         * @param {agentInterface.ISignFileMessage=} [p] Properties to set
         */
        function SignFileMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * SignFileMessage filePath.
         * @member {string} filePath
         * @memberof agentInterface.SignFileMessage
         * @instance
         */
        SignFileMessage.prototype.filePath = "";

        /**
         * SignFileMessage privateKeyPath.
         * @member {string} privateKeyPath
         * @memberof agentInterface.SignFileMessage
         * @instance
         */
        SignFileMessage.prototype.privateKeyPath = "";

        /**
         * SignFileMessage passphrase.
         * @member {string} passphrase
         * @memberof agentInterface.SignFileMessage
         * @instance
         */
        SignFileMessage.prototype.passphrase = "";

        /**
         * Creates a new SignFileMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.SignFileMessage
         * @static
         * @param {agentInterface.ISignFileMessage=} [properties] Properties to set
         * @returns {agentInterface.SignFileMessage} SignFileMessage instance
         */
        SignFileMessage.create = function create(properties) {
            return new SignFileMessage(properties);
        };

        /**
         * Encodes the specified SignFileMessage message. Does not implicitly {@link agentInterface.SignFileMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.SignFileMessage
         * @static
         * @param {agentInterface.ISignFileMessage} m SignFileMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SignFileMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.filePath != null && Object.hasOwnProperty.call(m, "filePath"))
                w.uint32(10).string(m.filePath);
            if (m.privateKeyPath != null && Object.hasOwnProperty.call(m, "privateKeyPath"))
                w.uint32(18).string(m.privateKeyPath);
            if (m.passphrase != null && Object.hasOwnProperty.call(m, "passphrase"))
                w.uint32(26).string(m.passphrase);
            return w;
        };

        /**
         * Encodes the specified SignFileMessage message, length delimited. Does not implicitly {@link agentInterface.SignFileMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.SignFileMessage
         * @static
         * @param {agentInterface.ISignFileMessage} message SignFileMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SignFileMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SignFileMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.SignFileMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.SignFileMessage} SignFileMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SignFileMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.SignFileMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.filePath = r.string();
                    break;
                case 2:
                    m.privateKeyPath = r.string();
                    break;
                case 3:
                    m.passphrase = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a SignFileMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.SignFileMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.SignFileMessage} SignFileMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SignFileMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return SignFileMessage;
    })();

    agentInterface.VerifyFileMessage = (function() {

        /**
         * Properties of a VerifyFileMessage.
         * @memberof agentInterface
         * @interface IVerifyFileMessage
         * @property {string|null} [filePath] VerifyFileMessage filePath
         * @property {string|null} [publicKeyPath] VerifyFileMessage publicKeyPath
         */

        /**
         * Constructs a new VerifyFileMessage.
         * @memberof agentInterface
         * @classdesc Represents a VerifyFileMessage.
         * @implements IVerifyFileMessage
         * @constructor
         * @param {agentInterface.IVerifyFileMessage=} [p] Properties to set
         */
        function VerifyFileMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * VerifyFileMessage filePath.
         * @member {string} filePath
         * @memberof agentInterface.VerifyFileMessage
         * @instance
         */
        VerifyFileMessage.prototype.filePath = "";

        /**
         * VerifyFileMessage publicKeyPath.
         * @member {string} publicKeyPath
         * @memberof agentInterface.VerifyFileMessage
         * @instance
         */
        VerifyFileMessage.prototype.publicKeyPath = "";

        /**
         * Creates a new VerifyFileMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.VerifyFileMessage
         * @static
         * @param {agentInterface.IVerifyFileMessage=} [properties] Properties to set
         * @returns {agentInterface.VerifyFileMessage} VerifyFileMessage instance
         */
        VerifyFileMessage.create = function create(properties) {
            return new VerifyFileMessage(properties);
        };

        /**
         * Encodes the specified VerifyFileMessage message. Does not implicitly {@link agentInterface.VerifyFileMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.VerifyFileMessage
         * @static
         * @param {agentInterface.IVerifyFileMessage} m VerifyFileMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        VerifyFileMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.filePath != null && Object.hasOwnProperty.call(m, "filePath"))
                w.uint32(10).string(m.filePath);
            if (m.publicKeyPath != null && Object.hasOwnProperty.call(m, "publicKeyPath"))
                w.uint32(18).string(m.publicKeyPath);
            return w;
        };

        /**
         * Encodes the specified VerifyFileMessage message, length delimited. Does not implicitly {@link agentInterface.VerifyFileMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.VerifyFileMessage
         * @static
         * @param {agentInterface.IVerifyFileMessage} message VerifyFileMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        VerifyFileMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a VerifyFileMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.VerifyFileMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.VerifyFileMessage} VerifyFileMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        VerifyFileMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.VerifyFileMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.filePath = r.string();
                    break;
                case 2:
                    m.publicKeyPath = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a VerifyFileMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.VerifyFileMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.VerifyFileMessage} VerifyFileMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        VerifyFileMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return VerifyFileMessage;
    })();

    agentInterface.SecretPathMessage = (function() {

        /**
         * Properties of a SecretPathMessage.
         * @memberof agentInterface
         * @interface ISecretPathMessage
         * @property {string|null} [vaultName] SecretPathMessage vaultName
         * @property {string|null} [secretName] SecretPathMessage secretName
         */

        /**
         * Constructs a new SecretPathMessage.
         * @memberof agentInterface
         * @classdesc Represents a SecretPathMessage.
         * @implements ISecretPathMessage
         * @constructor
         * @param {agentInterface.ISecretPathMessage=} [p] Properties to set
         */
        function SecretPathMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * SecretPathMessage vaultName.
         * @member {string} vaultName
         * @memberof agentInterface.SecretPathMessage
         * @instance
         */
        SecretPathMessage.prototype.vaultName = "";

        /**
         * SecretPathMessage secretName.
         * @member {string} secretName
         * @memberof agentInterface.SecretPathMessage
         * @instance
         */
        SecretPathMessage.prototype.secretName = "";

        /**
         * Creates a new SecretPathMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.SecretPathMessage
         * @static
         * @param {agentInterface.ISecretPathMessage=} [properties] Properties to set
         * @returns {agentInterface.SecretPathMessage} SecretPathMessage instance
         */
        SecretPathMessage.create = function create(properties) {
            return new SecretPathMessage(properties);
        };

        /**
         * Encodes the specified SecretPathMessage message. Does not implicitly {@link agentInterface.SecretPathMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.SecretPathMessage
         * @static
         * @param {agentInterface.ISecretPathMessage} m SecretPathMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SecretPathMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultName != null && Object.hasOwnProperty.call(m, "vaultName"))
                w.uint32(10).string(m.vaultName);
            if (m.secretName != null && Object.hasOwnProperty.call(m, "secretName"))
                w.uint32(18).string(m.secretName);
            return w;
        };

        /**
         * Encodes the specified SecretPathMessage message, length delimited. Does not implicitly {@link agentInterface.SecretPathMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.SecretPathMessage
         * @static
         * @param {agentInterface.ISecretPathMessage} message SecretPathMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SecretPathMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SecretPathMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.SecretPathMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.SecretPathMessage} SecretPathMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SecretPathMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.SecretPathMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.vaultName = r.string();
                    break;
                case 2:
                    m.secretName = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a SecretPathMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.SecretPathMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.SecretPathMessage} SecretPathMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SecretPathMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return SecretPathMessage;
    })();

    agentInterface.SecretContentMessage = (function() {

        /**
         * Properties of a SecretContentMessage.
         * @memberof agentInterface
         * @interface ISecretContentMessage
         * @property {agentInterface.ISecretPathMessage|null} [secretPath] SecretContentMessage secretPath
         * @property {string|null} [secretFilePath] SecretContentMessage secretFilePath
         * @property {string|null} [secretContent] SecretContentMessage secretContent
         */

        /**
         * Constructs a new SecretContentMessage.
         * @memberof agentInterface
         * @classdesc Represents a SecretContentMessage.
         * @implements ISecretContentMessage
         * @constructor
         * @param {agentInterface.ISecretContentMessage=} [p] Properties to set
         */
        function SecretContentMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * SecretContentMessage secretPath.
         * @member {agentInterface.ISecretPathMessage|null|undefined} secretPath
         * @memberof agentInterface.SecretContentMessage
         * @instance
         */
        SecretContentMessage.prototype.secretPath = null;

        /**
         * SecretContentMessage secretFilePath.
         * @member {string} secretFilePath
         * @memberof agentInterface.SecretContentMessage
         * @instance
         */
        SecretContentMessage.prototype.secretFilePath = "";

        /**
         * SecretContentMessage secretContent.
         * @member {string} secretContent
         * @memberof agentInterface.SecretContentMessage
         * @instance
         */
        SecretContentMessage.prototype.secretContent = "";

        /**
         * Creates a new SecretContentMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.SecretContentMessage
         * @static
         * @param {agentInterface.ISecretContentMessage=} [properties] Properties to set
         * @returns {agentInterface.SecretContentMessage} SecretContentMessage instance
         */
        SecretContentMessage.create = function create(properties) {
            return new SecretContentMessage(properties);
        };

        /**
         * Encodes the specified SecretContentMessage message. Does not implicitly {@link agentInterface.SecretContentMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.SecretContentMessage
         * @static
         * @param {agentInterface.ISecretContentMessage} m SecretContentMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SecretContentMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.secretPath != null && Object.hasOwnProperty.call(m, "secretPath"))
                $root.agentInterface.SecretPathMessage.encode(m.secretPath, w.uint32(10).fork()).ldelim();
            if (m.secretFilePath != null && Object.hasOwnProperty.call(m, "secretFilePath"))
                w.uint32(18).string(m.secretFilePath);
            if (m.secretContent != null && Object.hasOwnProperty.call(m, "secretContent"))
                w.uint32(26).string(m.secretContent);
            return w;
        };

        /**
         * Encodes the specified SecretContentMessage message, length delimited. Does not implicitly {@link agentInterface.SecretContentMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.SecretContentMessage
         * @static
         * @param {agentInterface.ISecretContentMessage} message SecretContentMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SecretContentMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SecretContentMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.SecretContentMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.SecretContentMessage} SecretContentMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SecretContentMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.SecretContentMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.secretPath = $root.agentInterface.SecretPathMessage.decode(r, r.uint32());
                    break;
                case 2:
                    m.secretFilePath = r.string();
                    break;
                case 3:
                    m.secretContent = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a SecretContentMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.SecretContentMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.SecretContentMessage} SecretContentMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SecretContentMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return SecretContentMessage;
    })();

    agentInterface.EncryptFileMessage = (function() {

        /**
         * Properties of an EncryptFileMessage.
         * @memberof agentInterface
         * @interface IEncryptFileMessage
         * @property {string|null} [filePath] EncryptFileMessage filePath
         * @property {string|null} [publicKeyPath] EncryptFileMessage publicKeyPath
         */

        /**
         * Constructs a new EncryptFileMessage.
         * @memberof agentInterface
         * @classdesc Represents an EncryptFileMessage.
         * @implements IEncryptFileMessage
         * @constructor
         * @param {agentInterface.IEncryptFileMessage=} [p] Properties to set
         */
        function EncryptFileMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * EncryptFileMessage filePath.
         * @member {string} filePath
         * @memberof agentInterface.EncryptFileMessage
         * @instance
         */
        EncryptFileMessage.prototype.filePath = "";

        /**
         * EncryptFileMessage publicKeyPath.
         * @member {string} publicKeyPath
         * @memberof agentInterface.EncryptFileMessage
         * @instance
         */
        EncryptFileMessage.prototype.publicKeyPath = "";

        /**
         * Creates a new EncryptFileMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.EncryptFileMessage
         * @static
         * @param {agentInterface.IEncryptFileMessage=} [properties] Properties to set
         * @returns {agentInterface.EncryptFileMessage} EncryptFileMessage instance
         */
        EncryptFileMessage.create = function create(properties) {
            return new EncryptFileMessage(properties);
        };

        /**
         * Encodes the specified EncryptFileMessage message. Does not implicitly {@link agentInterface.EncryptFileMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.EncryptFileMessage
         * @static
         * @param {agentInterface.IEncryptFileMessage} m EncryptFileMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EncryptFileMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.filePath != null && Object.hasOwnProperty.call(m, "filePath"))
                w.uint32(10).string(m.filePath);
            if (m.publicKeyPath != null && Object.hasOwnProperty.call(m, "publicKeyPath"))
                w.uint32(18).string(m.publicKeyPath);
            return w;
        };

        /**
         * Encodes the specified EncryptFileMessage message, length delimited. Does not implicitly {@link agentInterface.EncryptFileMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.EncryptFileMessage
         * @static
         * @param {agentInterface.IEncryptFileMessage} message EncryptFileMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EncryptFileMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an EncryptFileMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.EncryptFileMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.EncryptFileMessage} EncryptFileMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EncryptFileMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.EncryptFileMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.filePath = r.string();
                    break;
                case 2:
                    m.publicKeyPath = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes an EncryptFileMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.EncryptFileMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.EncryptFileMessage} EncryptFileMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EncryptFileMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return EncryptFileMessage;
    })();

    agentInterface.DecryptFileMessage = (function() {

        /**
         * Properties of a DecryptFileMessage.
         * @memberof agentInterface
         * @interface IDecryptFileMessage
         * @property {string|null} [filePath] DecryptFileMessage filePath
         * @property {string|null} [privateKeyPath] DecryptFileMessage privateKeyPath
         * @property {string|null} [passphrase] DecryptFileMessage passphrase
         */

        /**
         * Constructs a new DecryptFileMessage.
         * @memberof agentInterface
         * @classdesc Represents a DecryptFileMessage.
         * @implements IDecryptFileMessage
         * @constructor
         * @param {agentInterface.IDecryptFileMessage=} [p] Properties to set
         */
        function DecryptFileMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * DecryptFileMessage filePath.
         * @member {string} filePath
         * @memberof agentInterface.DecryptFileMessage
         * @instance
         */
        DecryptFileMessage.prototype.filePath = "";

        /**
         * DecryptFileMessage privateKeyPath.
         * @member {string} privateKeyPath
         * @memberof agentInterface.DecryptFileMessage
         * @instance
         */
        DecryptFileMessage.prototype.privateKeyPath = "";

        /**
         * DecryptFileMessage passphrase.
         * @member {string} passphrase
         * @memberof agentInterface.DecryptFileMessage
         * @instance
         */
        DecryptFileMessage.prototype.passphrase = "";

        /**
         * Creates a new DecryptFileMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.DecryptFileMessage
         * @static
         * @param {agentInterface.IDecryptFileMessage=} [properties] Properties to set
         * @returns {agentInterface.DecryptFileMessage} DecryptFileMessage instance
         */
        DecryptFileMessage.create = function create(properties) {
            return new DecryptFileMessage(properties);
        };

        /**
         * Encodes the specified DecryptFileMessage message. Does not implicitly {@link agentInterface.DecryptFileMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.DecryptFileMessage
         * @static
         * @param {agentInterface.IDecryptFileMessage} m DecryptFileMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DecryptFileMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.filePath != null && Object.hasOwnProperty.call(m, "filePath"))
                w.uint32(10).string(m.filePath);
            if (m.privateKeyPath != null && Object.hasOwnProperty.call(m, "privateKeyPath"))
                w.uint32(18).string(m.privateKeyPath);
            if (m.passphrase != null && Object.hasOwnProperty.call(m, "passphrase"))
                w.uint32(26).string(m.passphrase);
            return w;
        };

        /**
         * Encodes the specified DecryptFileMessage message, length delimited. Does not implicitly {@link agentInterface.DecryptFileMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.DecryptFileMessage
         * @static
         * @param {agentInterface.IDecryptFileMessage} message DecryptFileMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DecryptFileMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DecryptFileMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.DecryptFileMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.DecryptFileMessage} DecryptFileMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DecryptFileMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.DecryptFileMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.filePath = r.string();
                    break;
                case 2:
                    m.privateKeyPath = r.string();
                    break;
                case 3:
                    m.passphrase = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a DecryptFileMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.DecryptFileMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.DecryptFileMessage} DecryptFileMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DecryptFileMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return DecryptFileMessage;
    })();

    agentInterface.KeyPairMessage = (function() {

        /**
         * Properties of a KeyPairMessage.
         * @memberof agentInterface
         * @interface IKeyPairMessage
         * @property {string|null} [publicKey] KeyPairMessage publicKey
         * @property {string|null} [privateKey] KeyPairMessage privateKey
         */

        /**
         * Constructs a new KeyPairMessage.
         * @memberof agentInterface
         * @classdesc Represents a KeyPairMessage.
         * @implements IKeyPairMessage
         * @constructor
         * @param {agentInterface.IKeyPairMessage=} [p] Properties to set
         */
        function KeyPairMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * KeyPairMessage publicKey.
         * @member {string} publicKey
         * @memberof agentInterface.KeyPairMessage
         * @instance
         */
        KeyPairMessage.prototype.publicKey = "";

        /**
         * KeyPairMessage privateKey.
         * @member {string} privateKey
         * @memberof agentInterface.KeyPairMessage
         * @instance
         */
        KeyPairMessage.prototype.privateKey = "";

        /**
         * Creates a new KeyPairMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.KeyPairMessage
         * @static
         * @param {agentInterface.IKeyPairMessage=} [properties] Properties to set
         * @returns {agentInterface.KeyPairMessage} KeyPairMessage instance
         */
        KeyPairMessage.create = function create(properties) {
            return new KeyPairMessage(properties);
        };

        /**
         * Encodes the specified KeyPairMessage message. Does not implicitly {@link agentInterface.KeyPairMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.KeyPairMessage
         * @static
         * @param {agentInterface.IKeyPairMessage} m KeyPairMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        KeyPairMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            if (m.privateKey != null && Object.hasOwnProperty.call(m, "privateKey"))
                w.uint32(18).string(m.privateKey);
            return w;
        };

        /**
         * Encodes the specified KeyPairMessage message, length delimited. Does not implicitly {@link agentInterface.KeyPairMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.KeyPairMessage
         * @static
         * @param {agentInterface.IKeyPairMessage} message KeyPairMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        KeyPairMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a KeyPairMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.KeyPairMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.KeyPairMessage} KeyPairMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        KeyPairMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.KeyPairMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.publicKey = r.string();
                    break;
                case 2:
                    m.privateKey = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a KeyPairMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.KeyPairMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.KeyPairMessage} KeyPairMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        KeyPairMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return KeyPairMessage;
    })();

    agentInterface.VaultPathMessage = (function() {

        /**
         * Properties of a VaultPathMessage.
         * @memberof agentInterface
         * @interface IVaultPathMessage
         * @property {string|null} [vaultName] VaultPathMessage vaultName
         * @property {string|null} [publicKey] VaultPathMessage publicKey
         */

        /**
         * Constructs a new VaultPathMessage.
         * @memberof agentInterface
         * @classdesc Represents a VaultPathMessage.
         * @implements IVaultPathMessage
         * @constructor
         * @param {agentInterface.IVaultPathMessage=} [p] Properties to set
         */
        function VaultPathMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * VaultPathMessage vaultName.
         * @member {string} vaultName
         * @memberof agentInterface.VaultPathMessage
         * @instance
         */
        VaultPathMessage.prototype.vaultName = "";

        /**
         * VaultPathMessage publicKey.
         * @member {string} publicKey
         * @memberof agentInterface.VaultPathMessage
         * @instance
         */
        VaultPathMessage.prototype.publicKey = "";

        /**
         * Creates a new VaultPathMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.VaultPathMessage
         * @static
         * @param {agentInterface.IVaultPathMessage=} [properties] Properties to set
         * @returns {agentInterface.VaultPathMessage} VaultPathMessage instance
         */
        VaultPathMessage.create = function create(properties) {
            return new VaultPathMessage(properties);
        };

        /**
         * Encodes the specified VaultPathMessage message. Does not implicitly {@link agentInterface.VaultPathMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.VaultPathMessage
         * @static
         * @param {agentInterface.IVaultPathMessage} m VaultPathMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        VaultPathMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultName != null && Object.hasOwnProperty.call(m, "vaultName"))
                w.uint32(10).string(m.vaultName);
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(18).string(m.publicKey);
            return w;
        };

        /**
         * Encodes the specified VaultPathMessage message, length delimited. Does not implicitly {@link agentInterface.VaultPathMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.VaultPathMessage
         * @static
         * @param {agentInterface.IVaultPathMessage} message VaultPathMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        VaultPathMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a VaultPathMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.VaultPathMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.VaultPathMessage} VaultPathMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        VaultPathMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.VaultPathMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.vaultName = r.string();
                    break;
                case 2:
                    m.publicKey = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a VaultPathMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.VaultPathMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.VaultPathMessage} VaultPathMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        VaultPathMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return VaultPathMessage;
    })();

    agentInterface.ContactPeerMessage = (function() {

        /**
         * Properties of a ContactPeerMessage.
         * @memberof agentInterface
         * @interface IContactPeerMessage
         * @property {string|null} [publicKeyOrHandle] ContactPeerMessage publicKeyOrHandle
         * @property {number|null} [timeout] ContactPeerMessage timeout
         */

        /**
         * Constructs a new ContactPeerMessage.
         * @memberof agentInterface
         * @classdesc Represents a ContactPeerMessage.
         * @implements IContactPeerMessage
         * @constructor
         * @param {agentInterface.IContactPeerMessage=} [p] Properties to set
         */
        function ContactPeerMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * ContactPeerMessage publicKeyOrHandle.
         * @member {string} publicKeyOrHandle
         * @memberof agentInterface.ContactPeerMessage
         * @instance
         */
        ContactPeerMessage.prototype.publicKeyOrHandle = "";

        /**
         * ContactPeerMessage timeout.
         * @member {number} timeout
         * @memberof agentInterface.ContactPeerMessage
         * @instance
         */
        ContactPeerMessage.prototype.timeout = 0;

        /**
         * Creates a new ContactPeerMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.ContactPeerMessage
         * @static
         * @param {agentInterface.IContactPeerMessage=} [properties] Properties to set
         * @returns {agentInterface.ContactPeerMessage} ContactPeerMessage instance
         */
        ContactPeerMessage.create = function create(properties) {
            return new ContactPeerMessage(properties);
        };

        /**
         * Encodes the specified ContactPeerMessage message. Does not implicitly {@link agentInterface.ContactPeerMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.ContactPeerMessage
         * @static
         * @param {agentInterface.IContactPeerMessage} m ContactPeerMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ContactPeerMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKeyOrHandle != null && Object.hasOwnProperty.call(m, "publicKeyOrHandle"))
                w.uint32(10).string(m.publicKeyOrHandle);
            if (m.timeout != null && Object.hasOwnProperty.call(m, "timeout"))
                w.uint32(16).int32(m.timeout);
            return w;
        };

        /**
         * Encodes the specified ContactPeerMessage message, length delimited. Does not implicitly {@link agentInterface.ContactPeerMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.ContactPeerMessage
         * @static
         * @param {agentInterface.IContactPeerMessage} message ContactPeerMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ContactPeerMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ContactPeerMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.ContactPeerMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.ContactPeerMessage} ContactPeerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ContactPeerMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.ContactPeerMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.publicKeyOrHandle = r.string();
                    break;
                case 2:
                    m.timeout = r.int32();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a ContactPeerMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.ContactPeerMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.ContactPeerMessage} ContactPeerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ContactPeerMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ContactPeerMessage;
    })();

    return agentInterface;
})();

module.exports = $root;
