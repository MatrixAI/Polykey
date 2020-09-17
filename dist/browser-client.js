(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["browser-client"] = factory();
	else
		root["browser-client"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = require("protobufjs/minimal");

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const PeerInfo_1 = __importStar(__webpack_require__(7));
const Agent_1 = __webpack_require__(11);
class PolykeyClient {
    constructor(getStream) {
        this.getStream = getStream;
    }
    async sendRequestToAgent(request) {
        const stream = this.getStream();
        const responseList = await new Promise((resolve, reject) => {
            try {
                const responseList = [];
                stream.on('data', (data) => {
                    if (data instanceof Uint8Array) {
                        responseList.push(data);
                    }
                    else {
                        responseList.push(...data);
                    }
                });
                stream.on('error', (err) => {
                    reject(err);
                });
                stream.on('end', () => {
                    resolve(responseList);
                });
                if (!stream.writableEnded) {
                    stream.write(request);
                }
            }
            catch (err) {
                reject(err);
            }
        });
        return responseList;
    }
    async handleAgentCommunication(type, nodePath, request) {
        // Encode message and sent
        const agentMessage = Agent_1.agentInterface.AgentMessage.encodeDelimited({
            type: type,
            isResponse: false,
            nodePath: nodePath,
            subMessage: request,
        }).finish();
        const responseList = await this.sendRequestToAgent(agentMessage);
        const agentMessageList = [];
        for (const response of responseList.values()) {
            const { subMessage, type } = Agent_1.agentInterface.AgentMessage.decodeDelimited(response);
            if (type == Agent_1.agentInterface.AgentMessageType.ERROR) {
                const { error } = Agent_1.agentInterface.ErrorMessage.decodeDelimited(subMessage);
                const reason = new Error(`Agent Error: ${error}`);
                throw reason;
            }
            else {
                agentMessageList.push(Agent_1.agentInterface.AgentMessage.decodeDelimited(response));
            }
        }
        return agentMessageList;
    }
    async registerNode(path, passphrase) {
        var _a;
        const registerNodeRequest = Agent_1.agentInterface.RegisterNodeRequestMessage.encodeDelimited({ passphrase }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.REGISTER_NODE, path, registerNodeRequest);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.REGISTER_NODE)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.RegisterNodeResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    async newNode(path, userId, passphrase, nbits) {
        var _a;
        const newNodeRequest = Agent_1.agentInterface.NewNodeRequestMessage.encodeDelimited({
            userId,
            passphrase,
            nbits,
        }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.NEW_NODE, path, newNodeRequest);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.NEW_NODE)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.NewNodeResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    async listNodes(unlockedOnly = true) {
        var _a;
        const newNodeRequest = Agent_1.agentInterface.ListNodesRequestMessage.encodeDelimited({ unlockedOnly }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.LIST_NODES, undefined, newNodeRequest);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.LIST_NODES)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { nodes } = Agent_1.agentInterface.ListNodesResponseMessage.decodeDelimited(subMessage);
        return nodes;
    }
    /////////////////////
    // Key commands //
    /////////////////////
    async deriveKey(nodePath, keyName, passphrase) {
        var _a;
        const request = Agent_1.agentInterface.DeriveKeyRequestMessage.encodeDelimited({ keyName, passphrase }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.DERIVE_KEY, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.DERIVE_KEY)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.DeriveKeyResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    async deleteKey(nodePath, keyName) {
        var _a;
        const request = Agent_1.agentInterface.DeleteKeyRequestMessage.encodeDelimited({ keyName }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.DELETE_KEY, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.DELETE_KEY)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.DeleteKeyResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    async listKeys(nodePath) {
        var _a;
        const request = Agent_1.agentInterface.ListKeysRequestMessage.encodeDelimited({}).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.LIST_KEYS, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.LIST_KEYS)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { keyNames } = Agent_1.agentInterface.ListKeysResponseMessage.decodeDelimited(subMessage);
        return keyNames;
    }
    async getKey(nodePath, keyName) {
        var _a;
        const request = Agent_1.agentInterface.GetKeyRequestMessage.encodeDelimited({ keyName }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.GET_KEY, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.GET_KEY)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { keyContent } = Agent_1.agentInterface.GetKeyResponseMessage.decodeDelimited(subMessage);
        return keyContent;
    }
    async getPrimaryKeyPair(nodePath, includePrivateKey = false) {
        var _a;
        const request = Agent_1.agentInterface.GetPrimaryKeyPairRequestMessage.encodeDelimited({ includePrivateKey }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.GET_PRIMARY_KEYPAIR, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.GET_PRIMARY_KEYPAIR)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { publicKey, privateKey } = Agent_1.agentInterface.GetPrimaryKeyPairResponseMessage.decodeDelimited(subMessage);
        return { publicKey, privateKey };
    }
    /////////////////////
    // Crypto commands //
    /////////////////////
    async signFile(nodePath, filePath, privateKeyPath, passphrase) {
        var _a;
        const request = Agent_1.agentInterface.SignFileRequestMessage.encodeDelimited({
            filePath,
            privateKeyPath,
            passphrase,
        }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.SIGN_FILE, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.SIGN_FILE)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { signaturePath } = Agent_1.agentInterface.SignFileResponseMessage.decodeDelimited(subMessage);
        return signaturePath;
    }
    async verifyFile(nodePath, filePath, publicKeyPath) {
        var _a;
        const request = Agent_1.agentInterface.VerifyFileRequestMessage.encodeDelimited({ filePath, publicKeyPath }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.VERIFY_FILE, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.VERIFY_FILE)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { verified } = Agent_1.agentInterface.VerifyFileResponseMessage.decodeDelimited(subMessage);
        return verified;
    }
    async encryptFile(nodePath, filePath, publicKeyPath) {
        var _a;
        const request = Agent_1.agentInterface.EncryptFileRequestMessage.encodeDelimited({ filePath, publicKeyPath }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.ENCRYPT_FILE, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.ENCRYPT_FILE)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { encryptedPath } = Agent_1.agentInterface.EncryptFileResponseMessage.decodeDelimited(subMessage);
        return encryptedPath;
    }
    async decryptFile(nodePath, filePath, privateKeyPath, passphrase) {
        var _a;
        const request = Agent_1.agentInterface.DecryptFileRequestMessage.encodeDelimited({
            filePath,
            privateKeyPath,
            passphrase,
        }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.DECRYPT_FILE, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.DECRYPT_FILE)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { decryptedPath } = Agent_1.agentInterface.DecryptFileResponseMessage.decodeDelimited(subMessage);
        return decryptedPath;
    }
    //////////////////////
    // Vault Operations //
    //////////////////////
    async listVaults(nodePath) {
        var _a;
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.LIST_VAULTS, nodePath);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.LIST_VAULTS)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { vaultNames } = Agent_1.agentInterface.ListVaultsResponseMessage.decodeDelimited(subMessage);
        return vaultNames;
    }
    async scanVaultNames(nodePath, publicKey) {
        var _a;
        const request = Agent_1.agentInterface.ScanVaultNamesRequestMessage.encodeDelimited({ publicKey }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.SCAN_VAULT_NAMES, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.SCAN_VAULT_NAMES)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { vaultNames } = Agent_1.agentInterface.ScanVaultNamesResponseMessage.decodeDelimited(subMessage);
        return vaultNames;
    }
    async newVault(nodePath, vaultName) {
        var _a;
        const request = Agent_1.agentInterface.NewVaultRequestMessage.encodeDelimited({ vaultName }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.NEW_VAULT, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.NEW_VAULT)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.NewVaultResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    async pullVault(nodePath, vaultName, publicKey) {
        var _a;
        const request = Agent_1.agentInterface.PullVaultRequestMessage.encodeDelimited({ vaultName, publicKey }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.PULL_VAULT, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.PULL_VAULT)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.PullVaultResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    async destroyVault(nodePath, vaultName) {
        var _a;
        const request = Agent_1.agentInterface.DestroyVaultRequestMessage.encodeDelimited({ vaultName }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.DESTROY_VAULT, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.DESTROY_VAULT)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.DestroyVaultResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    ///////////////////////
    // Secret Operations //
    ///////////////////////
    async listSecrets(nodePath, vaultName) {
        var _a;
        const request = Agent_1.agentInterface.ListSecretsRequestMessage.encodeDelimited({ vaultName }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.LIST_SECRETS, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.LIST_SECRETS)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { secretNames } = Agent_1.agentInterface.ListSecretsResponseMessage.decodeDelimited(subMessage);
        return secretNames;
    }
    async createSecret(nodePath, vaultName, secretName, secret) {
        var _a;
        let request;
        if (typeof secret == 'string') {
            request = Agent_1.agentInterface.CreateSecretRequestMessage.encodeDelimited({
                vaultName,
                secretName,
                secretPath: secret,
            }).finish();
        }
        else {
            request = Agent_1.agentInterface.CreateSecretRequestMessage.encodeDelimited({
                vaultName,
                secretName,
                secretContent: secret,
            }).finish();
        }
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.CREATE_SECRET, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.CREATE_SECRET)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.CreateSecretResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    async destroySecret(nodePath, vaultName, secretName) {
        var _a;
        const request = Agent_1.agentInterface.DestroySecretRequestMessage.encodeDelimited({ vaultName, secretName }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.DESTROY_SECRET, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.DESTROY_SECRET)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.DestroySecretResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    async getSecret(nodePath, vaultName, secretName) {
        var _a;
        const request = Agent_1.agentInterface.GetSecretRequestMessage.encodeDelimited({ vaultName, secretName }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.GET_SECRET, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.GET_SECRET)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { secret } = Agent_1.agentInterface.GetSecretResponseMessage.decodeDelimited(subMessage);
        return Buffer.from(secret);
    }
    async updateSecret(nodePath, vaultName, secretName, secret) {
        var _a;
        let request;
        if (typeof secret == 'string') {
            request = Agent_1.agentInterface.UpdateSecretRequestMessage.encodeDelimited({
                vaultName,
                secretName,
                secretPath: secret,
            }).finish();
        }
        else {
            request = Agent_1.agentInterface.UpdateSecretRequestMessage.encodeDelimited({
                vaultName,
                secretName,
                secretContent: secret,
            }).finish();
        }
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.UPDATE_SECRET, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.UPDATE_SECRET)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.UpdateSecretResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    /////////////////////
    // Peer Operations //
    /////////////////////
    async addPeer(nodePath, publicKey, peerAddress, relayPublicKey) {
        var _a;
        const request = Agent_1.agentInterface.AddPeerRequestMessage.encodeDelimited({
            publicKey,
            peerAddress,
            relayPublicKey,
        }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.ADD_PEER, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.ADD_PEER)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.AddPeerResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    async getPeerInfo(nodePath, current = false, publicKey) {
        var _a;
        const request = Agent_1.agentInterface.PeerInfoRequestMessage.encodeDelimited({ current, publicKey }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.GET_PEER_INFO, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.GET_PEER_INFO)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { publicKey: responsePublicKey, peerAddress, relayPublicKey, } = Agent_1.agentInterface.PeerInfoResponseMessage.decodeDelimited(subMessage);
        return new PeerInfo_1.default(responsePublicKey, peerAddress, relayPublicKey);
    }
    async pingPeer(nodePath, publicKey, timeout) {
        var _a;
        const request = Agent_1.agentInterface.PingPeerRequestMessage.encodeDelimited({ publicKey, timeout }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.PING_PEER, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.PING_PEER)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.PingPeerResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    async findPeer(nodePath, publicKey, timeout) {
        var _a;
        const request = Agent_1.agentInterface.FindPeerRequestMessage.encodeDelimited({ publicKey, timeout }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.FIND_PEER, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.FIND_PEER)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.FindPeerResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    async findSocialPeer(nodePath, handle, service, timeout) {
        var _a;
        const request = Agent_1.agentInterface.FindSocialPeerRequestMessage.encodeDelimited({ handle, service, timeout }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.FIND_SOCIAL_PEER, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.FIND_SOCIAL_PEER)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.FindSocialPeerResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    async listPeers(nodePath) {
        var _a;
        const request = Agent_1.agentInterface.ListPeersRequestMessage.encodeDelimited({}).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.LIST_PEERS, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.LIST_PEERS)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { publicKeys } = Agent_1.agentInterface.ListPeersResponseMessage.decodeDelimited(subMessage);
        return publicKeys;
    }
    async toggleStealth(nodePath, active) {
        var _a;
        const request = Agent_1.agentInterface.ToggleStealthRequestMessage.encodeDelimited({ active }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.TOGGLE_STEALTH, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.TOGGLE_STEALTH)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.ToggleStealthResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    async updatePeer(nodePath, publicKey, currentNode, peerHost, peerPort, relayPublicKey) {
        var _a;
        const request = Agent_1.agentInterface.UpdatePeerInfoRequestMessage.encodeDelimited({
            publicKey,
            currentNode,
            peerHost,
            peerPort,
            relayPublicKey,
        }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.UPDATE_PEER_INFO, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.UPDATE_PEER_INFO)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.UpdatePeerInfoResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    async requestRelay(nodePath, publicKey) {
        var _a;
        const request = Agent_1.agentInterface.RequestRelayRequestMessage.encodeDelimited({ publicKey }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.REQUEST_RELAY, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.REQUEST_RELAY)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = Agent_1.agentInterface.RequestRelayResponseMessage.decodeDelimited(subMessage);
        return successful;
    }
    async requestPunch(nodePath, publicKey) {
        var _a;
        const request = Agent_1.agentInterface.RequestPunchRequestMessage.encodeDelimited({ publicKey }).finish();
        const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.REQUEST_PUNCH, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.REQUEST_PUNCH)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { address } = Agent_1.agentInterface.RequestPunchResponseMessage.decodeDelimited(subMessage);
        return PeerInfo_1.Address.parse(address);
    }
    ///////////////////
    // Agent control //
    ///////////////////
    async getAgentStatus() {
        var _a;
        try {
            const encodedResponse = await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.STATUS);
            const subMessage = (_a = encodedResponse.find((r) => r.type == Agent_1.agentInterface.AgentMessageType.STATUS)) === null || _a === void 0 ? void 0 : _a.subMessage;
            if (!subMessage) {
                throw Error('agent did not respond');
            }
            const { status } = Agent_1.agentInterface.AgentStatusResponseMessage.decodeDelimited(subMessage);
            return status;
        }
        catch (err) {
            if (err.toString().match(/ECONNRESET|ENOENT|ECONNRESET/)) {
                return Agent_1.agentInterface.AgentStatusType.OFFLINE;
            }
            throw err;
        }
    }
    async stopAgent() {
        try {
            // Tell it to start shutting and wait for response
            await this.handleAgentCommunication(Agent_1.agentInterface.AgentMessageType.STOP_AGENT);
            return true;
        }
        catch (err) {
            return (await this.getAgentStatus()) != Agent_1.agentInterface.AgentStatusType.ONLINE;
        }
    }
}
exports.default = PolykeyClient;

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(2).Buffer))

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */



var base64 = __webpack_require__(4)
var ieee754 = __webpack_require__(5)
var isArray = __webpack_require__(6)

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(3)))

/***/ }),
/* 3 */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || new Function("return this")();
} catch (e) {
	// This works if the window reference is available
	if (typeof window === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = require("base64-js");

/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = require("ieee754");

/***/ }),
/* 6 */
/***/ (function(module, exports) {

module.exports = require("isarray");

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Peer_1 = __webpack_require__(8);
const utils_1 = __webpack_require__(9);
class Address {
    constructor(host, port) {
        const parsedAddress = Address.parseHelper(`${host}:${port}`);
        this.host = parsedAddress.host;
        this.port = parsedAddress.port;
    }
    updateHost(host) {
        if (host != undefined && host != '') {
            this.host = host;
        }
    }
    updatePort(port) {
        if (port != undefined && port != 0) {
            this.port = port;
        }
    }
    /**
     * Create an address object from a address string
     * @param addressString Address string in the format of `${this.ip}:${this.port}`
     */
    static parse(addressString) {
        const { host, port } = Address.parseHelper(addressString);
        return new Address(host, port);
    }
    /**
     * Create an address object from a net.AddressInfo
     * @param addressInfo AddressInfo of desired address
     */
    static fromAddressInfo(addressInfo) {
        const host = addressInfo.address == '::' ? 'localhost' : addressInfo.address;
        return new Address(host, addressInfo.port);
    }
    /**
     * Convert address into string of format `${this.host}:${this.port}`
     */
    toString() {
        return `${this.host}:${this.port}`;
    }
    static parseHelper(addressString) {
        var _a;
        if (!addressString || addressString == '') {
            throw Error(`cannot parse empty or undefined string`);
        }
        if (!Address.AddressRegex.test(addressString)) {
            throw Error(`cannot parse address string: '${addressString}'`);
        }
        // parse using regex
        const components = (_a = addressString.match(Address.AddressRegex)) === null || _a === void 0 ? void 0 : _a.slice(1, 3);
        const host = components[0];
        const port = parseInt(components[1]);
        return { host, port };
    }
}
exports.Address = Address;
/**
 * Parses an address string in the format of `host:port` with the help of regex
 */
Address.AddressRegex = /^([a-zA-Z.]+|(?:[0-9]{1,3}\.){3}[0-9]{1,3})(?::)([0-9]{1,5})$/;
class PeerInfo {
    constructor(publicKey, connectedAddress, relayPublicKey) {
        this.publicKey = PeerInfo.formatPublicKey(publicKey);
        if (connectedAddress) {
            const addr = Address.parse(connectedAddress);
            this.peerAddress = addr;
        }
        if (relayPublicKey) {
            this.relayPublicKey = PeerInfo.formatPublicKey(relayPublicKey);
        }
    }
    static formatPublicKey(str) {
        const startString = '-----BEGIN PGP PUBLIC KEY BLOCK-----';
        const endString = '-----END PGP PUBLIC KEY BLOCK-----';
        return str.slice(str.indexOf(startString), str.indexOf(endString) + endString.length);
    }
    deepCopy() {
        var _a;
        return new PeerInfo(this.publicKey, (_a = this.peerAddress) === null || _a === void 0 ? void 0 : _a.toString(), this.relayPublicKey);
    }
    toStringB64() {
        var _a;
        const message = Peer_1.peerInterface.PeerInfoMessage.encodeDelimited({
            publicKey: this.publicKey,
            peerAddress: (_a = this.peerAddress) === null || _a === void 0 ? void 0 : _a.toString(),
            relayPublicKey: this.relayPublicKey,
        }).finish();
        return utils_1.protobufToString(message);
    }
    static parseB64(str) {
        const message = utils_1.stringToProtobuf(str);
        const decoded = Peer_1.peerInterface.PeerInfoMessage.decodeDelimited(message);
        return new PeerInfo(decoded.publicKey, decoded.peerAddress, decoded.relayPublicKey);
    }
}
exports.default = PeerInfo;


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/


var $protobuf = __webpack_require__(0);

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.peerInterface = (function() {

    /**
     * Namespace peerInterface.
     * @exports peerInterface
     * @namespace
     */
    var peerInterface = {};

    peerInterface.Peer = (function() {

        /**
         * Constructs a new Peer service.
         * @memberof peerInterface
         * @classdesc Represents a Peer
         * @extends $protobuf.rpc.Service
         * @constructor
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         */
        function Peer(rpcImpl, requestDelimited, responseDelimited) {
            $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
        }

        (Peer.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = Peer;

        /**
         * Creates new Peer service using the specified rpc implementation.
         * @function create
         * @memberof peerInterface.Peer
         * @static
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         * @returns {Peer} RPC service. Useful where requests and/or responses are streamed.
         */
        Peer.create = function create(rpcImpl, requestDelimited, responseDelimited) {
            return new this(rpcImpl, requestDelimited, responseDelimited);
        };

        /**
         * Callback as used by {@link peerInterface.Peer#messagePeer}.
         * @memberof peerInterface.Peer
         * @typedef MessagePeerCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {peerInterface.PeerMessage} [response] PeerMessage
         */

        /**
         * Calls MessagePeer.
         * @function messagePeer
         * @memberof peerInterface.Peer
         * @instance
         * @param {peerInterface.IPeerMessage} request PeerMessage message or plain object
         * @param {peerInterface.Peer.MessagePeerCallback} callback Node-style callback called with the error, if any, and PeerMessage
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(Peer.prototype.messagePeer = function messagePeer(request, callback) {
            return this.rpcCall(messagePeer, $root.peerInterface.PeerMessage, $root.peerInterface.PeerMessage, request, callback);
        }, "name", { value: "MessagePeer" });

        /**
         * Calls MessagePeer.
         * @function messagePeer
         * @memberof peerInterface.Peer
         * @instance
         * @param {peerInterface.IPeerMessage} request PeerMessage message or plain object
         * @returns {Promise<peerInterface.PeerMessage>} Promise
         * @variation 2
         */

        return Peer;
    })();

    peerInterface.PeerMessage = (function() {

        /**
         * Properties of a PeerMessage.
         * @memberof peerInterface
         * @interface IPeerMessage
         * @property {string|null} [publicKey] PeerMessage publicKey
         * @property {peerInterface.SubServiceType|null} [type] PeerMessage type
         * @property {string|null} [subMessage] PeerMessage subMessage
         */

        /**
         * Constructs a new PeerMessage.
         * @memberof peerInterface
         * @classdesc Represents a PeerMessage.
         * @implements IPeerMessage
         * @constructor
         * @param {peerInterface.IPeerMessage=} [p] Properties to set
         */
        function PeerMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PeerMessage publicKey.
         * @member {string} publicKey
         * @memberof peerInterface.PeerMessage
         * @instance
         */
        PeerMessage.prototype.publicKey = "";

        /**
         * PeerMessage type.
         * @member {peerInterface.SubServiceType} type
         * @memberof peerInterface.PeerMessage
         * @instance
         */
        PeerMessage.prototype.type = 0;

        /**
         * PeerMessage subMessage.
         * @member {string} subMessage
         * @memberof peerInterface.PeerMessage
         * @instance
         */
        PeerMessage.prototype.subMessage = "";

        /**
         * Creates a new PeerMessage instance using the specified properties.
         * @function create
         * @memberof peerInterface.PeerMessage
         * @static
         * @param {peerInterface.IPeerMessage=} [properties] Properties to set
         * @returns {peerInterface.PeerMessage} PeerMessage instance
         */
        PeerMessage.create = function create(properties) {
            return new PeerMessage(properties);
        };

        /**
         * Encodes the specified PeerMessage message. Does not implicitly {@link peerInterface.PeerMessage.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.PeerMessage
         * @static
         * @param {peerInterface.IPeerMessage} m PeerMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            if (m.type != null && Object.hasOwnProperty.call(m, "type"))
                w.uint32(16).int32(m.type);
            if (m.subMessage != null && Object.hasOwnProperty.call(m, "subMessage"))
                w.uint32(26).string(m.subMessage);
            return w;
        };

        /**
         * Encodes the specified PeerMessage message, length delimited. Does not implicitly {@link peerInterface.PeerMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.PeerMessage
         * @static
         * @param {peerInterface.IPeerMessage} message PeerMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PeerMessage message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.PeerMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.PeerMessage} PeerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.PeerMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.publicKey = r.string();
                    break;
                case 2:
                    m.type = r.int32();
                    break;
                case 3:
                    m.subMessage = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a PeerMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.PeerMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.PeerMessage} PeerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PeerMessage;
    })();

    /**
     * SubServiceType enum.
     * @name peerInterface.SubServiceType
     * @enum {number}
     * @property {number} PING_PEER=0 PING_PEER value
     * @property {number} GIT=1 GIT value
     * @property {number} NAT_TRAVERSAL=2 NAT_TRAVERSAL value
     */
    peerInterface.SubServiceType = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "PING_PEER"] = 0;
        values[valuesById[1] = "GIT"] = 1;
        values[valuesById[2] = "NAT_TRAVERSAL"] = 2;
        return values;
    })();

    peerInterface.PingPeerMessage = (function() {

        /**
         * Properties of a PingPeerMessage.
         * @memberof peerInterface
         * @interface IPingPeerMessage
         * @property {string|null} [publicKey] PingPeerMessage publicKey
         * @property {string|null} [challenge] PingPeerMessage challenge
         * @property {peerInterface.IPeerInfoMessage|null} [peerInfo] PingPeerMessage peerInfo
         */

        /**
         * Constructs a new PingPeerMessage.
         * @memberof peerInterface
         * @classdesc Represents a PingPeerMessage.
         * @implements IPingPeerMessage
         * @constructor
         * @param {peerInterface.IPingPeerMessage=} [p] Properties to set
         */
        function PingPeerMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PingPeerMessage publicKey.
         * @member {string} publicKey
         * @memberof peerInterface.PingPeerMessage
         * @instance
         */
        PingPeerMessage.prototype.publicKey = "";

        /**
         * PingPeerMessage challenge.
         * @member {string} challenge
         * @memberof peerInterface.PingPeerMessage
         * @instance
         */
        PingPeerMessage.prototype.challenge = "";

        /**
         * PingPeerMessage peerInfo.
         * @member {peerInterface.IPeerInfoMessage|null|undefined} peerInfo
         * @memberof peerInterface.PingPeerMessage
         * @instance
         */
        PingPeerMessage.prototype.peerInfo = null;

        /**
         * Creates a new PingPeerMessage instance using the specified properties.
         * @function create
         * @memberof peerInterface.PingPeerMessage
         * @static
         * @param {peerInterface.IPingPeerMessage=} [properties] Properties to set
         * @returns {peerInterface.PingPeerMessage} PingPeerMessage instance
         */
        PingPeerMessage.create = function create(properties) {
            return new PingPeerMessage(properties);
        };

        /**
         * Encodes the specified PingPeerMessage message. Does not implicitly {@link peerInterface.PingPeerMessage.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.PingPeerMessage
         * @static
         * @param {peerInterface.IPingPeerMessage} m PingPeerMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PingPeerMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            if (m.challenge != null && Object.hasOwnProperty.call(m, "challenge"))
                w.uint32(18).string(m.challenge);
            if (m.peerInfo != null && Object.hasOwnProperty.call(m, "peerInfo"))
                $root.peerInterface.PeerInfoMessage.encode(m.peerInfo, w.uint32(26).fork()).ldelim();
            return w;
        };

        /**
         * Encodes the specified PingPeerMessage message, length delimited. Does not implicitly {@link peerInterface.PingPeerMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.PingPeerMessage
         * @static
         * @param {peerInterface.IPingPeerMessage} message PingPeerMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PingPeerMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PingPeerMessage message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.PingPeerMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.PingPeerMessage} PingPeerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PingPeerMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.PingPeerMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.publicKey = r.string();
                    break;
                case 2:
                    m.challenge = r.string();
                    break;
                case 3:
                    m.peerInfo = $root.peerInterface.PeerInfoMessage.decode(r, r.uint32());
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a PingPeerMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.PingPeerMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.PingPeerMessage} PingPeerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PingPeerMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PingPeerMessage;
    })();

    peerInterface.PeerInfoMessage = (function() {

        /**
         * Properties of a PeerInfoMessage.
         * @memberof peerInterface
         * @interface IPeerInfoMessage
         * @property {string|null} [publicKey] PeerInfoMessage publicKey
         * @property {string|null} [peerAddress] PeerInfoMessage peerAddress
         * @property {string|null} [relayPublicKey] PeerInfoMessage relayPublicKey
         */

        /**
         * Constructs a new PeerInfoMessage.
         * @memberof peerInterface
         * @classdesc Represents a PeerInfoMessage.
         * @implements IPeerInfoMessage
         * @constructor
         * @param {peerInterface.IPeerInfoMessage=} [p] Properties to set
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
         * @memberof peerInterface.PeerInfoMessage
         * @instance
         */
        PeerInfoMessage.prototype.publicKey = "";

        /**
         * PeerInfoMessage peerAddress.
         * @member {string} peerAddress
         * @memberof peerInterface.PeerInfoMessage
         * @instance
         */
        PeerInfoMessage.prototype.peerAddress = "";

        /**
         * PeerInfoMessage relayPublicKey.
         * @member {string} relayPublicKey
         * @memberof peerInterface.PeerInfoMessage
         * @instance
         */
        PeerInfoMessage.prototype.relayPublicKey = "";

        /**
         * Creates a new PeerInfoMessage instance using the specified properties.
         * @function create
         * @memberof peerInterface.PeerInfoMessage
         * @static
         * @param {peerInterface.IPeerInfoMessage=} [properties] Properties to set
         * @returns {peerInterface.PeerInfoMessage} PeerInfoMessage instance
         */
        PeerInfoMessage.create = function create(properties) {
            return new PeerInfoMessage(properties);
        };

        /**
         * Encodes the specified PeerInfoMessage message. Does not implicitly {@link peerInterface.PeerInfoMessage.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.PeerInfoMessage
         * @static
         * @param {peerInterface.IPeerInfoMessage} m PeerInfoMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerInfoMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            if (m.peerAddress != null && Object.hasOwnProperty.call(m, "peerAddress"))
                w.uint32(18).string(m.peerAddress);
            if (m.relayPublicKey != null && Object.hasOwnProperty.call(m, "relayPublicKey"))
                w.uint32(26).string(m.relayPublicKey);
            return w;
        };

        /**
         * Encodes the specified PeerInfoMessage message, length delimited. Does not implicitly {@link peerInterface.PeerInfoMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.PeerInfoMessage
         * @static
         * @param {peerInterface.IPeerInfoMessage} message PeerInfoMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerInfoMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PeerInfoMessage message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.PeerInfoMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.PeerInfoMessage} PeerInfoMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerInfoMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.PeerInfoMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.publicKey = r.string();
                    break;
                case 2:
                    m.peerAddress = r.string();
                    break;
                case 3:
                    m.relayPublicKey = r.string();
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
         * @memberof peerInterface.PeerInfoMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.PeerInfoMessage} PeerInfoMessage
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

    peerInterface.PeerInfoListMessage = (function() {

        /**
         * Properties of a PeerInfoListMessage.
         * @memberof peerInterface
         * @interface IPeerInfoListMessage
         * @property {Array.<peerInterface.IPeerInfoMessage>|null} [peerInfoList] PeerInfoListMessage peerInfoList
         */

        /**
         * Constructs a new PeerInfoListMessage.
         * @memberof peerInterface
         * @classdesc Represents a PeerInfoListMessage.
         * @implements IPeerInfoListMessage
         * @constructor
         * @param {peerInterface.IPeerInfoListMessage=} [p] Properties to set
         */
        function PeerInfoListMessage(p) {
            this.peerInfoList = [];
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PeerInfoListMessage peerInfoList.
         * @member {Array.<peerInterface.IPeerInfoMessage>} peerInfoList
         * @memberof peerInterface.PeerInfoListMessage
         * @instance
         */
        PeerInfoListMessage.prototype.peerInfoList = $util.emptyArray;

        /**
         * Creates a new PeerInfoListMessage instance using the specified properties.
         * @function create
         * @memberof peerInterface.PeerInfoListMessage
         * @static
         * @param {peerInterface.IPeerInfoListMessage=} [properties] Properties to set
         * @returns {peerInterface.PeerInfoListMessage} PeerInfoListMessage instance
         */
        PeerInfoListMessage.create = function create(properties) {
            return new PeerInfoListMessage(properties);
        };

        /**
         * Encodes the specified PeerInfoListMessage message. Does not implicitly {@link peerInterface.PeerInfoListMessage.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.PeerInfoListMessage
         * @static
         * @param {peerInterface.IPeerInfoListMessage} m PeerInfoListMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerInfoListMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.peerInfoList != null && m.peerInfoList.length) {
                for (var i = 0; i < m.peerInfoList.length; ++i)
                    $root.peerInterface.PeerInfoMessage.encode(m.peerInfoList[i], w.uint32(10).fork()).ldelim();
            }
            return w;
        };

        /**
         * Encodes the specified PeerInfoListMessage message, length delimited. Does not implicitly {@link peerInterface.PeerInfoListMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.PeerInfoListMessage
         * @static
         * @param {peerInterface.IPeerInfoListMessage} message PeerInfoListMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerInfoListMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PeerInfoListMessage message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.PeerInfoListMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.PeerInfoListMessage} PeerInfoListMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerInfoListMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.PeerInfoListMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    if (!(m.peerInfoList && m.peerInfoList.length))
                        m.peerInfoList = [];
                    m.peerInfoList.push($root.peerInterface.PeerInfoMessage.decode(r, r.uint32()));
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a PeerInfoListMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.PeerInfoListMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.PeerInfoListMessage} PeerInfoListMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerInfoListMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PeerInfoListMessage;
    })();

    peerInterface.ErrorMessage = (function() {

        /**
         * Properties of an ErrorMessage.
         * @memberof peerInterface
         * @interface IErrorMessage
         * @property {string|null} [error] ErrorMessage error
         */

        /**
         * Constructs a new ErrorMessage.
         * @memberof peerInterface
         * @classdesc Represents an ErrorMessage.
         * @implements IErrorMessage
         * @constructor
         * @param {peerInterface.IErrorMessage=} [p] Properties to set
         */
        function ErrorMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * ErrorMessage error.
         * @member {string} error
         * @memberof peerInterface.ErrorMessage
         * @instance
         */
        ErrorMessage.prototype.error = "";

        /**
         * Creates a new ErrorMessage instance using the specified properties.
         * @function create
         * @memberof peerInterface.ErrorMessage
         * @static
         * @param {peerInterface.IErrorMessage=} [properties] Properties to set
         * @returns {peerInterface.ErrorMessage} ErrorMessage instance
         */
        ErrorMessage.create = function create(properties) {
            return new ErrorMessage(properties);
        };

        /**
         * Encodes the specified ErrorMessage message. Does not implicitly {@link peerInterface.ErrorMessage.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.ErrorMessage
         * @static
         * @param {peerInterface.IErrorMessage} m ErrorMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ErrorMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.error != null && Object.hasOwnProperty.call(m, "error"))
                w.uint32(10).string(m.error);
            return w;
        };

        /**
         * Encodes the specified ErrorMessage message, length delimited. Does not implicitly {@link peerInterface.ErrorMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.ErrorMessage
         * @static
         * @param {peerInterface.IErrorMessage} message ErrorMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ErrorMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an ErrorMessage message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.ErrorMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.ErrorMessage} ErrorMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ErrorMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.ErrorMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.error = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes an ErrorMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.ErrorMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.ErrorMessage} ErrorMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ErrorMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ErrorMessage;
    })();

    /**
     * NatMessageType enum.
     * @name peerInterface.NatMessageType
     * @enum {number}
     * @property {number} ERROR=0 ERROR value
     * @property {number} RELAY_CONNECTION=1 RELAY_CONNECTION value
     * @property {number} PEER_CONNECTION=2 PEER_CONNECTION value
     * @property {number} UDP_ADDRESS=3 UDP_ADDRESS value
     * @property {number} PEER_UDP_ADDRESS=4 PEER_UDP_ADDRESS value
     */
    peerInterface.NatMessageType = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "ERROR"] = 0;
        values[valuesById[1] = "RELAY_CONNECTION"] = 1;
        values[valuesById[2] = "PEER_CONNECTION"] = 2;
        values[valuesById[3] = "UDP_ADDRESS"] = 3;
        values[valuesById[4] = "PEER_UDP_ADDRESS"] = 4;
        return values;
    })();

    peerInterface.NatMessage = (function() {

        /**
         * Properties of a NatMessage.
         * @memberof peerInterface
         * @interface INatMessage
         * @property {peerInterface.NatMessageType|null} [type] NatMessage type
         * @property {boolean|null} [isResponse] NatMessage isResponse
         * @property {Uint8Array|null} [subMessage] NatMessage subMessage
         */

        /**
         * Constructs a new NatMessage.
         * @memberof peerInterface
         * @classdesc Represents a NatMessage.
         * @implements INatMessage
         * @constructor
         * @param {peerInterface.INatMessage=} [p] Properties to set
         */
        function NatMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * NatMessage type.
         * @member {peerInterface.NatMessageType} type
         * @memberof peerInterface.NatMessage
         * @instance
         */
        NatMessage.prototype.type = 0;

        /**
         * NatMessage isResponse.
         * @member {boolean} isResponse
         * @memberof peerInterface.NatMessage
         * @instance
         */
        NatMessage.prototype.isResponse = false;

        /**
         * NatMessage subMessage.
         * @member {Uint8Array} subMessage
         * @memberof peerInterface.NatMessage
         * @instance
         */
        NatMessage.prototype.subMessage = $util.newBuffer([]);

        /**
         * Creates a new NatMessage instance using the specified properties.
         * @function create
         * @memberof peerInterface.NatMessage
         * @static
         * @param {peerInterface.INatMessage=} [properties] Properties to set
         * @returns {peerInterface.NatMessage} NatMessage instance
         */
        NatMessage.create = function create(properties) {
            return new NatMessage(properties);
        };

        /**
         * Encodes the specified NatMessage message. Does not implicitly {@link peerInterface.NatMessage.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.NatMessage
         * @static
         * @param {peerInterface.INatMessage} m NatMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NatMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.type != null && Object.hasOwnProperty.call(m, "type"))
                w.uint32(8).int32(m.type);
            if (m.isResponse != null && Object.hasOwnProperty.call(m, "isResponse"))
                w.uint32(16).bool(m.isResponse);
            if (m.subMessage != null && Object.hasOwnProperty.call(m, "subMessage"))
                w.uint32(26).bytes(m.subMessage);
            return w;
        };

        /**
         * Encodes the specified NatMessage message, length delimited. Does not implicitly {@link peerInterface.NatMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.NatMessage
         * @static
         * @param {peerInterface.INatMessage} message NatMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NatMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a NatMessage message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.NatMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.NatMessage} NatMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NatMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.NatMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.type = r.int32();
                    break;
                case 2:
                    m.isResponse = r.bool();
                    break;
                case 3:
                    m.subMessage = r.bytes();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a NatMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.NatMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.NatMessage} NatMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NatMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return NatMessage;
    })();

    peerInterface.RelayConnectionRequest = (function() {

        /**
         * Properties of a RelayConnectionRequest.
         * @memberof peerInterface
         * @interface IRelayConnectionRequest
         * @property {string|null} [publicKey] RelayConnectionRequest publicKey
         */

        /**
         * Constructs a new RelayConnectionRequest.
         * @memberof peerInterface
         * @classdesc Represents a RelayConnectionRequest.
         * @implements IRelayConnectionRequest
         * @constructor
         * @param {peerInterface.IRelayConnectionRequest=} [p] Properties to set
         */
        function RelayConnectionRequest(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * RelayConnectionRequest publicKey.
         * @member {string} publicKey
         * @memberof peerInterface.RelayConnectionRequest
         * @instance
         */
        RelayConnectionRequest.prototype.publicKey = "";

        /**
         * Creates a new RelayConnectionRequest instance using the specified properties.
         * @function create
         * @memberof peerInterface.RelayConnectionRequest
         * @static
         * @param {peerInterface.IRelayConnectionRequest=} [properties] Properties to set
         * @returns {peerInterface.RelayConnectionRequest} RelayConnectionRequest instance
         */
        RelayConnectionRequest.create = function create(properties) {
            return new RelayConnectionRequest(properties);
        };

        /**
         * Encodes the specified RelayConnectionRequest message. Does not implicitly {@link peerInterface.RelayConnectionRequest.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.RelayConnectionRequest
         * @static
         * @param {peerInterface.IRelayConnectionRequest} m RelayConnectionRequest message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RelayConnectionRequest.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            return w;
        };

        /**
         * Encodes the specified RelayConnectionRequest message, length delimited. Does not implicitly {@link peerInterface.RelayConnectionRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.RelayConnectionRequest
         * @static
         * @param {peerInterface.IRelayConnectionRequest} message RelayConnectionRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RelayConnectionRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RelayConnectionRequest message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.RelayConnectionRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.RelayConnectionRequest} RelayConnectionRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RelayConnectionRequest.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.RelayConnectionRequest();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
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
         * Decodes a RelayConnectionRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.RelayConnectionRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.RelayConnectionRequest} RelayConnectionRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RelayConnectionRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return RelayConnectionRequest;
    })();

    peerInterface.RelayConnectionResponse = (function() {

        /**
         * Properties of a RelayConnectionResponse.
         * @memberof peerInterface
         * @interface IRelayConnectionResponse
         * @property {string|null} [serverAddress] RelayConnectionResponse serverAddress
         */

        /**
         * Constructs a new RelayConnectionResponse.
         * @memberof peerInterface
         * @classdesc Represents a RelayConnectionResponse.
         * @implements IRelayConnectionResponse
         * @constructor
         * @param {peerInterface.IRelayConnectionResponse=} [p] Properties to set
         */
        function RelayConnectionResponse(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * RelayConnectionResponse serverAddress.
         * @member {string} serverAddress
         * @memberof peerInterface.RelayConnectionResponse
         * @instance
         */
        RelayConnectionResponse.prototype.serverAddress = "";

        /**
         * Creates a new RelayConnectionResponse instance using the specified properties.
         * @function create
         * @memberof peerInterface.RelayConnectionResponse
         * @static
         * @param {peerInterface.IRelayConnectionResponse=} [properties] Properties to set
         * @returns {peerInterface.RelayConnectionResponse} RelayConnectionResponse instance
         */
        RelayConnectionResponse.create = function create(properties) {
            return new RelayConnectionResponse(properties);
        };

        /**
         * Encodes the specified RelayConnectionResponse message. Does not implicitly {@link peerInterface.RelayConnectionResponse.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.RelayConnectionResponse
         * @static
         * @param {peerInterface.IRelayConnectionResponse} m RelayConnectionResponse message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RelayConnectionResponse.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.serverAddress != null && Object.hasOwnProperty.call(m, "serverAddress"))
                w.uint32(10).string(m.serverAddress);
            return w;
        };

        /**
         * Encodes the specified RelayConnectionResponse message, length delimited. Does not implicitly {@link peerInterface.RelayConnectionResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.RelayConnectionResponse
         * @static
         * @param {peerInterface.IRelayConnectionResponse} message RelayConnectionResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RelayConnectionResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RelayConnectionResponse message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.RelayConnectionResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.RelayConnectionResponse} RelayConnectionResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RelayConnectionResponse.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.RelayConnectionResponse();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.serverAddress = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a RelayConnectionResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.RelayConnectionResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.RelayConnectionResponse} RelayConnectionResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RelayConnectionResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return RelayConnectionResponse;
    })();

    peerInterface.PeerConnectionRequest = (function() {

        /**
         * Properties of a PeerConnectionRequest.
         * @memberof peerInterface
         * @interface IPeerConnectionRequest
         * @property {string|null} [publicKey] PeerConnectionRequest publicKey
         */

        /**
         * Constructs a new PeerConnectionRequest.
         * @memberof peerInterface
         * @classdesc Represents a PeerConnectionRequest.
         * @implements IPeerConnectionRequest
         * @constructor
         * @param {peerInterface.IPeerConnectionRequest=} [p] Properties to set
         */
        function PeerConnectionRequest(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PeerConnectionRequest publicKey.
         * @member {string} publicKey
         * @memberof peerInterface.PeerConnectionRequest
         * @instance
         */
        PeerConnectionRequest.prototype.publicKey = "";

        /**
         * Creates a new PeerConnectionRequest instance using the specified properties.
         * @function create
         * @memberof peerInterface.PeerConnectionRequest
         * @static
         * @param {peerInterface.IPeerConnectionRequest=} [properties] Properties to set
         * @returns {peerInterface.PeerConnectionRequest} PeerConnectionRequest instance
         */
        PeerConnectionRequest.create = function create(properties) {
            return new PeerConnectionRequest(properties);
        };

        /**
         * Encodes the specified PeerConnectionRequest message. Does not implicitly {@link peerInterface.PeerConnectionRequest.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.PeerConnectionRequest
         * @static
         * @param {peerInterface.IPeerConnectionRequest} m PeerConnectionRequest message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerConnectionRequest.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            return w;
        };

        /**
         * Encodes the specified PeerConnectionRequest message, length delimited. Does not implicitly {@link peerInterface.PeerConnectionRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.PeerConnectionRequest
         * @static
         * @param {peerInterface.IPeerConnectionRequest} message PeerConnectionRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerConnectionRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PeerConnectionRequest message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.PeerConnectionRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.PeerConnectionRequest} PeerConnectionRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerConnectionRequest.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.PeerConnectionRequest();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
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
         * Decodes a PeerConnectionRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.PeerConnectionRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.PeerConnectionRequest} PeerConnectionRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerConnectionRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PeerConnectionRequest;
    })();

    peerInterface.PeerConnectionResponse = (function() {

        /**
         * Properties of a PeerConnectionResponse.
         * @memberof peerInterface
         * @interface IPeerConnectionResponse
         * @property {string|null} [peerAddress] PeerConnectionResponse peerAddress
         */

        /**
         * Constructs a new PeerConnectionResponse.
         * @memberof peerInterface
         * @classdesc Represents a PeerConnectionResponse.
         * @implements IPeerConnectionResponse
         * @constructor
         * @param {peerInterface.IPeerConnectionResponse=} [p] Properties to set
         */
        function PeerConnectionResponse(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PeerConnectionResponse peerAddress.
         * @member {string} peerAddress
         * @memberof peerInterface.PeerConnectionResponse
         * @instance
         */
        PeerConnectionResponse.prototype.peerAddress = "";

        /**
         * Creates a new PeerConnectionResponse instance using the specified properties.
         * @function create
         * @memberof peerInterface.PeerConnectionResponse
         * @static
         * @param {peerInterface.IPeerConnectionResponse=} [properties] Properties to set
         * @returns {peerInterface.PeerConnectionResponse} PeerConnectionResponse instance
         */
        PeerConnectionResponse.create = function create(properties) {
            return new PeerConnectionResponse(properties);
        };

        /**
         * Encodes the specified PeerConnectionResponse message. Does not implicitly {@link peerInterface.PeerConnectionResponse.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.PeerConnectionResponse
         * @static
         * @param {peerInterface.IPeerConnectionResponse} m PeerConnectionResponse message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerConnectionResponse.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.peerAddress != null && Object.hasOwnProperty.call(m, "peerAddress"))
                w.uint32(10).string(m.peerAddress);
            return w;
        };

        /**
         * Encodes the specified PeerConnectionResponse message, length delimited. Does not implicitly {@link peerInterface.PeerConnectionResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.PeerConnectionResponse
         * @static
         * @param {peerInterface.IPeerConnectionResponse} message PeerConnectionResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerConnectionResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PeerConnectionResponse message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.PeerConnectionResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.PeerConnectionResponse} PeerConnectionResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerConnectionResponse.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.PeerConnectionResponse();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.peerAddress = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a PeerConnectionResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.PeerConnectionResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.PeerConnectionResponse} PeerConnectionResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerConnectionResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PeerConnectionResponse;
    })();

    peerInterface.UDPAddressResponse = (function() {

        /**
         * Properties of a UDPAddressResponse.
         * @memberof peerInterface
         * @interface IUDPAddressResponse
         * @property {string|null} [address] UDPAddressResponse address
         */

        /**
         * Constructs a new UDPAddressResponse.
         * @memberof peerInterface
         * @classdesc Represents a UDPAddressResponse.
         * @implements IUDPAddressResponse
         * @constructor
         * @param {peerInterface.IUDPAddressResponse=} [p] Properties to set
         */
        function UDPAddressResponse(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * UDPAddressResponse address.
         * @member {string} address
         * @memberof peerInterface.UDPAddressResponse
         * @instance
         */
        UDPAddressResponse.prototype.address = "";

        /**
         * Creates a new UDPAddressResponse instance using the specified properties.
         * @function create
         * @memberof peerInterface.UDPAddressResponse
         * @static
         * @param {peerInterface.IUDPAddressResponse=} [properties] Properties to set
         * @returns {peerInterface.UDPAddressResponse} UDPAddressResponse instance
         */
        UDPAddressResponse.create = function create(properties) {
            return new UDPAddressResponse(properties);
        };

        /**
         * Encodes the specified UDPAddressResponse message. Does not implicitly {@link peerInterface.UDPAddressResponse.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.UDPAddressResponse
         * @static
         * @param {peerInterface.IUDPAddressResponse} m UDPAddressResponse message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UDPAddressResponse.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.address != null && Object.hasOwnProperty.call(m, "address"))
                w.uint32(10).string(m.address);
            return w;
        };

        /**
         * Encodes the specified UDPAddressResponse message, length delimited. Does not implicitly {@link peerInterface.UDPAddressResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.UDPAddressResponse
         * @static
         * @param {peerInterface.IUDPAddressResponse} message UDPAddressResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UDPAddressResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a UDPAddressResponse message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.UDPAddressResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.UDPAddressResponse} UDPAddressResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UDPAddressResponse.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.UDPAddressResponse();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.address = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a UDPAddressResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.UDPAddressResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.UDPAddressResponse} UDPAddressResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UDPAddressResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return UDPAddressResponse;
    })();

    peerInterface.HolePunchRegisterRequest = (function() {

        /**
         * Properties of a HolePunchRegisterRequest.
         * @memberof peerInterface
         * @interface IHolePunchRegisterRequest
         * @property {string|null} [publicKey] HolePunchRegisterRequest publicKey
         */

        /**
         * Constructs a new HolePunchRegisterRequest.
         * @memberof peerInterface
         * @classdesc Represents a HolePunchRegisterRequest.
         * @implements IHolePunchRegisterRequest
         * @constructor
         * @param {peerInterface.IHolePunchRegisterRequest=} [p] Properties to set
         */
        function HolePunchRegisterRequest(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * HolePunchRegisterRequest publicKey.
         * @member {string} publicKey
         * @memberof peerInterface.HolePunchRegisterRequest
         * @instance
         */
        HolePunchRegisterRequest.prototype.publicKey = "";

        /**
         * Creates a new HolePunchRegisterRequest instance using the specified properties.
         * @function create
         * @memberof peerInterface.HolePunchRegisterRequest
         * @static
         * @param {peerInterface.IHolePunchRegisterRequest=} [properties] Properties to set
         * @returns {peerInterface.HolePunchRegisterRequest} HolePunchRegisterRequest instance
         */
        HolePunchRegisterRequest.create = function create(properties) {
            return new HolePunchRegisterRequest(properties);
        };

        /**
         * Encodes the specified HolePunchRegisterRequest message. Does not implicitly {@link peerInterface.HolePunchRegisterRequest.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.HolePunchRegisterRequest
         * @static
         * @param {peerInterface.IHolePunchRegisterRequest} m HolePunchRegisterRequest message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HolePunchRegisterRequest.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            return w;
        };

        /**
         * Encodes the specified HolePunchRegisterRequest message, length delimited. Does not implicitly {@link peerInterface.HolePunchRegisterRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.HolePunchRegisterRequest
         * @static
         * @param {peerInterface.IHolePunchRegisterRequest} message HolePunchRegisterRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HolePunchRegisterRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a HolePunchRegisterRequest message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.HolePunchRegisterRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.HolePunchRegisterRequest} HolePunchRegisterRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HolePunchRegisterRequest.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.HolePunchRegisterRequest();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
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
         * Decodes a HolePunchRegisterRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.HolePunchRegisterRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.HolePunchRegisterRequest} HolePunchRegisterRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HolePunchRegisterRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return HolePunchRegisterRequest;
    })();

    peerInterface.HolePunchRegisterResponse = (function() {

        /**
         * Properties of a HolePunchRegisterResponse.
         * @memberof peerInterface
         * @interface IHolePunchRegisterResponse
         * @property {string|null} [connectedAddress] HolePunchRegisterResponse connectedAddress
         */

        /**
         * Constructs a new HolePunchRegisterResponse.
         * @memberof peerInterface
         * @classdesc Represents a HolePunchRegisterResponse.
         * @implements IHolePunchRegisterResponse
         * @constructor
         * @param {peerInterface.IHolePunchRegisterResponse=} [p] Properties to set
         */
        function HolePunchRegisterResponse(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * HolePunchRegisterResponse connectedAddress.
         * @member {string} connectedAddress
         * @memberof peerInterface.HolePunchRegisterResponse
         * @instance
         */
        HolePunchRegisterResponse.prototype.connectedAddress = "";

        /**
         * Creates a new HolePunchRegisterResponse instance using the specified properties.
         * @function create
         * @memberof peerInterface.HolePunchRegisterResponse
         * @static
         * @param {peerInterface.IHolePunchRegisterResponse=} [properties] Properties to set
         * @returns {peerInterface.HolePunchRegisterResponse} HolePunchRegisterResponse instance
         */
        HolePunchRegisterResponse.create = function create(properties) {
            return new HolePunchRegisterResponse(properties);
        };

        /**
         * Encodes the specified HolePunchRegisterResponse message. Does not implicitly {@link peerInterface.HolePunchRegisterResponse.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.HolePunchRegisterResponse
         * @static
         * @param {peerInterface.IHolePunchRegisterResponse} m HolePunchRegisterResponse message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HolePunchRegisterResponse.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.connectedAddress != null && Object.hasOwnProperty.call(m, "connectedAddress"))
                w.uint32(10).string(m.connectedAddress);
            return w;
        };

        /**
         * Encodes the specified HolePunchRegisterResponse message, length delimited. Does not implicitly {@link peerInterface.HolePunchRegisterResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.HolePunchRegisterResponse
         * @static
         * @param {peerInterface.IHolePunchRegisterResponse} message HolePunchRegisterResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HolePunchRegisterResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a HolePunchRegisterResponse message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.HolePunchRegisterResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.HolePunchRegisterResponse} HolePunchRegisterResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HolePunchRegisterResponse.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.HolePunchRegisterResponse();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.connectedAddress = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a HolePunchRegisterResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.HolePunchRegisterResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.HolePunchRegisterResponse} HolePunchRegisterResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HolePunchRegisterResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return HolePunchRegisterResponse;
    })();

    peerInterface.PeerUdpAddressRequest = (function() {

        /**
         * Properties of a PeerUdpAddressRequest.
         * @memberof peerInterface
         * @interface IPeerUdpAddressRequest
         * @property {string|null} [publicKey] PeerUdpAddressRequest publicKey
         */

        /**
         * Constructs a new PeerUdpAddressRequest.
         * @memberof peerInterface
         * @classdesc Represents a PeerUdpAddressRequest.
         * @implements IPeerUdpAddressRequest
         * @constructor
         * @param {peerInterface.IPeerUdpAddressRequest=} [p] Properties to set
         */
        function PeerUdpAddressRequest(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PeerUdpAddressRequest publicKey.
         * @member {string} publicKey
         * @memberof peerInterface.PeerUdpAddressRequest
         * @instance
         */
        PeerUdpAddressRequest.prototype.publicKey = "";

        /**
         * Creates a new PeerUdpAddressRequest instance using the specified properties.
         * @function create
         * @memberof peerInterface.PeerUdpAddressRequest
         * @static
         * @param {peerInterface.IPeerUdpAddressRequest=} [properties] Properties to set
         * @returns {peerInterface.PeerUdpAddressRequest} PeerUdpAddressRequest instance
         */
        PeerUdpAddressRequest.create = function create(properties) {
            return new PeerUdpAddressRequest(properties);
        };

        /**
         * Encodes the specified PeerUdpAddressRequest message. Does not implicitly {@link peerInterface.PeerUdpAddressRequest.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.PeerUdpAddressRequest
         * @static
         * @param {peerInterface.IPeerUdpAddressRequest} m PeerUdpAddressRequest message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerUdpAddressRequest.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            return w;
        };

        /**
         * Encodes the specified PeerUdpAddressRequest message, length delimited. Does not implicitly {@link peerInterface.PeerUdpAddressRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.PeerUdpAddressRequest
         * @static
         * @param {peerInterface.IPeerUdpAddressRequest} message PeerUdpAddressRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerUdpAddressRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PeerUdpAddressRequest message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.PeerUdpAddressRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.PeerUdpAddressRequest} PeerUdpAddressRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerUdpAddressRequest.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.PeerUdpAddressRequest();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
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
         * Decodes a PeerUdpAddressRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.PeerUdpAddressRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.PeerUdpAddressRequest} PeerUdpAddressRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerUdpAddressRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PeerUdpAddressRequest;
    })();

    peerInterface.PeerUdpAddressResponse = (function() {

        /**
         * Properties of a PeerUdpAddressResponse.
         * @memberof peerInterface
         * @interface IPeerUdpAddressResponse
         * @property {string|null} [address] PeerUdpAddressResponse address
         */

        /**
         * Constructs a new PeerUdpAddressResponse.
         * @memberof peerInterface
         * @classdesc Represents a PeerUdpAddressResponse.
         * @implements IPeerUdpAddressResponse
         * @constructor
         * @param {peerInterface.IPeerUdpAddressResponse=} [p] Properties to set
         */
        function PeerUdpAddressResponse(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PeerUdpAddressResponse address.
         * @member {string} address
         * @memberof peerInterface.PeerUdpAddressResponse
         * @instance
         */
        PeerUdpAddressResponse.prototype.address = "";

        /**
         * Creates a new PeerUdpAddressResponse instance using the specified properties.
         * @function create
         * @memberof peerInterface.PeerUdpAddressResponse
         * @static
         * @param {peerInterface.IPeerUdpAddressResponse=} [properties] Properties to set
         * @returns {peerInterface.PeerUdpAddressResponse} PeerUdpAddressResponse instance
         */
        PeerUdpAddressResponse.create = function create(properties) {
            return new PeerUdpAddressResponse(properties);
        };

        /**
         * Encodes the specified PeerUdpAddressResponse message. Does not implicitly {@link peerInterface.PeerUdpAddressResponse.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.PeerUdpAddressResponse
         * @static
         * @param {peerInterface.IPeerUdpAddressResponse} m PeerUdpAddressResponse message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerUdpAddressResponse.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.address != null && Object.hasOwnProperty.call(m, "address"))
                w.uint32(10).string(m.address);
            return w;
        };

        /**
         * Encodes the specified PeerUdpAddressResponse message, length delimited. Does not implicitly {@link peerInterface.PeerUdpAddressResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.PeerUdpAddressResponse
         * @static
         * @param {peerInterface.IPeerUdpAddressResponse} message PeerUdpAddressResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerUdpAddressResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PeerUdpAddressResponse message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.PeerUdpAddressResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.PeerUdpAddressResponse} PeerUdpAddressResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerUdpAddressResponse.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.PeerUdpAddressResponse();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.address = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a PeerUdpAddressResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.PeerUdpAddressResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.PeerUdpAddressResponse} PeerUdpAddressResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerUdpAddressResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PeerUdpAddressResponse;
    })();

    return peerInterface;
})();

module.exports = $root;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const protobufjs = __importStar(__webpack_require__(10));
/**
 * Returns a 5 character long random string of lower case letters
 */
function randomString() {
    return Math.random()
        .toString(36)
        .replace(/[^a-z]+/g, '')
        .substr(0, 5);
}
exports.randomString = randomString;
/**
 * Gets the first promise fulfiled
 * @param promiseList List of promises
 */
async function promiseAny(promiseList) {
    return await new Promise((resolve, reject) => {
        const errorList = [];
        for (const promise of promiseList) {
            promise
                .then((p) => {
                resolve(p);
            })
                .catch((_) => null);
            promise.catch((error) => {
                errorList.push(error);
                // check if all have failed
                if (errorList.length == promiseList.length) {
                    reject(errorList);
                }
            });
        }
    });
}
exports.promiseAny = promiseAny;
function protobufToString(message) {
    return protobufjs.util.base64.encode(message, 0, message.length);
}
exports.protobufToString = protobufToString;
function stringToProtobuf(str) {
    const buffer = protobufjs.util.newBuffer(protobufjs.util.base64.length(str));
    protobufjs.util.base64.decode(str, buffer, 0);
    return buffer;
}
exports.stringToProtobuf = stringToProtobuf;
async function sleep(ms) {
    await new Promise((resolve, reject) => {
        setTimeout(() => resolve(), ms);
    });
}
exports.sleep = sleep;


/***/ }),
/* 10 */
/***/ (function(module, exports) {

module.exports = require("protobufjs");

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/


var $protobuf = __webpack_require__(0);

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

    /**
     * AgentMessageType enum.
     * @name agentInterface.AgentMessageType
     * @enum {number}
     * @property {number} ERROR=0 ERROR value
     * @property {number} STOP_AGENT=1 STOP_AGENT value
     * @property {number} STATUS=2 STATUS value
     * @property {number} REGISTER_NODE=3 REGISTER_NODE value
     * @property {number} NEW_NODE=4 NEW_NODE value
     * @property {number} LIST_NODES=5 LIST_NODES value
     * @property {number} DERIVE_KEY=6 DERIVE_KEY value
     * @property {number} SIGN_FILE=7 SIGN_FILE value
     * @property {number} VERIFY_FILE=8 VERIFY_FILE value
     * @property {number} LIST_VAULTS=9 LIST_VAULTS value
     * @property {number} NEW_VAULT=10 NEW_VAULT value
     * @property {number} DESTROY_VAULT=11 DESTROY_VAULT value
     * @property {number} LIST_SECRETS=12 LIST_SECRETS value
     * @property {number} CREATE_SECRET=13 CREATE_SECRET value
     * @property {number} DESTROY_SECRET=14 DESTROY_SECRET value
     * @property {number} GET_SECRET=15 GET_SECRET value
     * @property {number} LIST_KEYS=16 LIST_KEYS value
     * @property {number} GET_KEY=17 GET_KEY value
     * @property {number} DELETE_KEY=18 DELETE_KEY value
     * @property {number} ENCRYPT_FILE=19 ENCRYPT_FILE value
     * @property {number} DECRYPT_FILE=20 DECRYPT_FILE value
     * @property {number} GET_PRIMARY_KEYPAIR=21 GET_PRIMARY_KEYPAIR value
     * @property {number} UPDATE_SECRET=22 UPDATE_SECRET value
     * @property {number} GET_PEER_INFO=23 GET_PEER_INFO value
     * @property {number} ADD_PEER=24 ADD_PEER value
     * @property {number} PULL_VAULT=26 PULL_VAULT value
     * @property {number} PING_PEER=27 PING_PEER value
     * @property {number} FIND_PEER=28 FIND_PEER value
     * @property {number} FIND_SOCIAL_PEER=29 FIND_SOCIAL_PEER value
     * @property {number} LIST_PEERS=30 LIST_PEERS value
     * @property {number} TOGGLE_STEALTH=31 TOGGLE_STEALTH value
     * @property {number} UPDATE_PEER_INFO=32 UPDATE_PEER_INFO value
     * @property {number} REQUEST_RELAY=33 REQUEST_RELAY value
     * @property {number} REQUEST_PUNCH=34 REQUEST_PUNCH value
     * @property {number} SCAN_VAULT_NAMES=35 SCAN_VAULT_NAMES value
     */
    agentInterface.AgentMessageType = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "ERROR"] = 0;
        values[valuesById[1] = "STOP_AGENT"] = 1;
        values[valuesById[2] = "STATUS"] = 2;
        values[valuesById[3] = "REGISTER_NODE"] = 3;
        values[valuesById[4] = "NEW_NODE"] = 4;
        values[valuesById[5] = "LIST_NODES"] = 5;
        values[valuesById[6] = "DERIVE_KEY"] = 6;
        values[valuesById[7] = "SIGN_FILE"] = 7;
        values[valuesById[8] = "VERIFY_FILE"] = 8;
        values[valuesById[9] = "LIST_VAULTS"] = 9;
        values[valuesById[10] = "NEW_VAULT"] = 10;
        values[valuesById[11] = "DESTROY_VAULT"] = 11;
        values[valuesById[12] = "LIST_SECRETS"] = 12;
        values[valuesById[13] = "CREATE_SECRET"] = 13;
        values[valuesById[14] = "DESTROY_SECRET"] = 14;
        values[valuesById[15] = "GET_SECRET"] = 15;
        values[valuesById[16] = "LIST_KEYS"] = 16;
        values[valuesById[17] = "GET_KEY"] = 17;
        values[valuesById[18] = "DELETE_KEY"] = 18;
        values[valuesById[19] = "ENCRYPT_FILE"] = 19;
        values[valuesById[20] = "DECRYPT_FILE"] = 20;
        values[valuesById[21] = "GET_PRIMARY_KEYPAIR"] = 21;
        values[valuesById[22] = "UPDATE_SECRET"] = 22;
        values[valuesById[23] = "GET_PEER_INFO"] = 23;
        values[valuesById[24] = "ADD_PEER"] = 24;
        values[valuesById[26] = "PULL_VAULT"] = 26;
        values[valuesById[27] = "PING_PEER"] = 27;
        values[valuesById[28] = "FIND_PEER"] = 28;
        values[valuesById[29] = "FIND_SOCIAL_PEER"] = 29;
        values[valuesById[30] = "LIST_PEERS"] = 30;
        values[valuesById[31] = "TOGGLE_STEALTH"] = 31;
        values[valuesById[32] = "UPDATE_PEER_INFO"] = 32;
        values[valuesById[33] = "REQUEST_RELAY"] = 33;
        values[valuesById[34] = "REQUEST_PUNCH"] = 34;
        values[valuesById[35] = "SCAN_VAULT_NAMES"] = 35;
        return values;
    })();

    agentInterface.AgentMessage = (function() {

        /**
         * Properties of an AgentMessage.
         * @memberof agentInterface
         * @interface IAgentMessage
         * @property {agentInterface.AgentMessageType|null} [type] AgentMessage type
         * @property {boolean|null} [isResponse] AgentMessage isResponse
         * @property {string|null} [nodePath] AgentMessage nodePath
         * @property {Uint8Array|null} [subMessage] AgentMessage subMessage
         */

        /**
         * Constructs a new AgentMessage.
         * @memberof agentInterface
         * @classdesc Represents an AgentMessage.
         * @implements IAgentMessage
         * @constructor
         * @param {agentInterface.IAgentMessage=} [p] Properties to set
         */
        function AgentMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * AgentMessage type.
         * @member {agentInterface.AgentMessageType} type
         * @memberof agentInterface.AgentMessage
         * @instance
         */
        AgentMessage.prototype.type = 0;

        /**
         * AgentMessage isResponse.
         * @member {boolean} isResponse
         * @memberof agentInterface.AgentMessage
         * @instance
         */
        AgentMessage.prototype.isResponse = false;

        /**
         * AgentMessage nodePath.
         * @member {string} nodePath
         * @memberof agentInterface.AgentMessage
         * @instance
         */
        AgentMessage.prototype.nodePath = "";

        /**
         * AgentMessage subMessage.
         * @member {Uint8Array} subMessage
         * @memberof agentInterface.AgentMessage
         * @instance
         */
        AgentMessage.prototype.subMessage = $util.newBuffer([]);

        /**
         * Creates a new AgentMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.AgentMessage
         * @static
         * @param {agentInterface.IAgentMessage=} [properties] Properties to set
         * @returns {agentInterface.AgentMessage} AgentMessage instance
         */
        AgentMessage.create = function create(properties) {
            return new AgentMessage(properties);
        };

        /**
         * Encodes the specified AgentMessage message. Does not implicitly {@link agentInterface.AgentMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.AgentMessage
         * @static
         * @param {agentInterface.IAgentMessage} m AgentMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AgentMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.type != null && Object.hasOwnProperty.call(m, "type"))
                w.uint32(8).int32(m.type);
            if (m.isResponse != null && Object.hasOwnProperty.call(m, "isResponse"))
                w.uint32(16).bool(m.isResponse);
            if (m.nodePath != null && Object.hasOwnProperty.call(m, "nodePath"))
                w.uint32(26).string(m.nodePath);
            if (m.subMessage != null && Object.hasOwnProperty.call(m, "subMessage"))
                w.uint32(34).bytes(m.subMessage);
            return w;
        };

        /**
         * Encodes the specified AgentMessage message, length delimited. Does not implicitly {@link agentInterface.AgentMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.AgentMessage
         * @static
         * @param {agentInterface.IAgentMessage} message AgentMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AgentMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an AgentMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.AgentMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.AgentMessage} AgentMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AgentMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.AgentMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.type = r.int32();
                    break;
                case 2:
                    m.isResponse = r.bool();
                    break;
                case 3:
                    m.nodePath = r.string();
                    break;
                case 4:
                    m.subMessage = r.bytes();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes an AgentMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.AgentMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.AgentMessage} AgentMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AgentMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return AgentMessage;
    })();

    agentInterface.ErrorMessage = (function() {

        /**
         * Properties of an ErrorMessage.
         * @memberof agentInterface
         * @interface IErrorMessage
         * @property {string|null} [error] ErrorMessage error
         */

        /**
         * Constructs a new ErrorMessage.
         * @memberof agentInterface
         * @classdesc Represents an ErrorMessage.
         * @implements IErrorMessage
         * @constructor
         * @param {agentInterface.IErrorMessage=} [p] Properties to set
         */
        function ErrorMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * ErrorMessage error.
         * @member {string} error
         * @memberof agentInterface.ErrorMessage
         * @instance
         */
        ErrorMessage.prototype.error = "";

        /**
         * Creates a new ErrorMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.ErrorMessage
         * @static
         * @param {agentInterface.IErrorMessage=} [properties] Properties to set
         * @returns {agentInterface.ErrorMessage} ErrorMessage instance
         */
        ErrorMessage.create = function create(properties) {
            return new ErrorMessage(properties);
        };

        /**
         * Encodes the specified ErrorMessage message. Does not implicitly {@link agentInterface.ErrorMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.ErrorMessage
         * @static
         * @param {agentInterface.IErrorMessage} m ErrorMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ErrorMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.error != null && Object.hasOwnProperty.call(m, "error"))
                w.uint32(10).string(m.error);
            return w;
        };

        /**
         * Encodes the specified ErrorMessage message, length delimited. Does not implicitly {@link agentInterface.ErrorMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.ErrorMessage
         * @static
         * @param {agentInterface.IErrorMessage} message ErrorMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ErrorMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an ErrorMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.ErrorMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.ErrorMessage} ErrorMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ErrorMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.ErrorMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.error = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes an ErrorMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.ErrorMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.ErrorMessage} ErrorMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ErrorMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ErrorMessage;
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

    agentInterface.AgentStatusResponseMessage = (function() {

        /**
         * Properties of an AgentStatusResponseMessage.
         * @memberof agentInterface
         * @interface IAgentStatusResponseMessage
         * @property {agentInterface.AgentStatusType|null} [status] AgentStatusResponseMessage status
         */

        /**
         * Constructs a new AgentStatusResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents an AgentStatusResponseMessage.
         * @implements IAgentStatusResponseMessage
         * @constructor
         * @param {agentInterface.IAgentStatusResponseMessage=} [p] Properties to set
         */
        function AgentStatusResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * AgentStatusResponseMessage status.
         * @member {agentInterface.AgentStatusType} status
         * @memberof agentInterface.AgentStatusResponseMessage
         * @instance
         */
        AgentStatusResponseMessage.prototype.status = 0;

        /**
         * Creates a new AgentStatusResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.AgentStatusResponseMessage
         * @static
         * @param {agentInterface.IAgentStatusResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.AgentStatusResponseMessage} AgentStatusResponseMessage instance
         */
        AgentStatusResponseMessage.create = function create(properties) {
            return new AgentStatusResponseMessage(properties);
        };

        /**
         * Encodes the specified AgentStatusResponseMessage message. Does not implicitly {@link agentInterface.AgentStatusResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.AgentStatusResponseMessage
         * @static
         * @param {agentInterface.IAgentStatusResponseMessage} m AgentStatusResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AgentStatusResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.status != null && Object.hasOwnProperty.call(m, "status"))
                w.uint32(8).int32(m.status);
            return w;
        };

        /**
         * Encodes the specified AgentStatusResponseMessage message, length delimited. Does not implicitly {@link agentInterface.AgentStatusResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.AgentStatusResponseMessage
         * @static
         * @param {agentInterface.IAgentStatusResponseMessage} message AgentStatusResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AgentStatusResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an AgentStatusResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.AgentStatusResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.AgentStatusResponseMessage} AgentStatusResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AgentStatusResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.AgentStatusResponseMessage();
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
         * Decodes an AgentStatusResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.AgentStatusResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.AgentStatusResponseMessage} AgentStatusResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AgentStatusResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return AgentStatusResponseMessage;
    })();

    agentInterface.RegisterNodeRequestMessage = (function() {

        /**
         * Properties of a RegisterNodeRequestMessage.
         * @memberof agentInterface
         * @interface IRegisterNodeRequestMessage
         * @property {string|null} [passphrase] RegisterNodeRequestMessage passphrase
         */

        /**
         * Constructs a new RegisterNodeRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a RegisterNodeRequestMessage.
         * @implements IRegisterNodeRequestMessage
         * @constructor
         * @param {agentInterface.IRegisterNodeRequestMessage=} [p] Properties to set
         */
        function RegisterNodeRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * RegisterNodeRequestMessage passphrase.
         * @member {string} passphrase
         * @memberof agentInterface.RegisterNodeRequestMessage
         * @instance
         */
        RegisterNodeRequestMessage.prototype.passphrase = "";

        /**
         * Creates a new RegisterNodeRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.RegisterNodeRequestMessage
         * @static
         * @param {agentInterface.IRegisterNodeRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.RegisterNodeRequestMessage} RegisterNodeRequestMessage instance
         */
        RegisterNodeRequestMessage.create = function create(properties) {
            return new RegisterNodeRequestMessage(properties);
        };

        /**
         * Encodes the specified RegisterNodeRequestMessage message. Does not implicitly {@link agentInterface.RegisterNodeRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.RegisterNodeRequestMessage
         * @static
         * @param {agentInterface.IRegisterNodeRequestMessage} m RegisterNodeRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RegisterNodeRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.passphrase != null && Object.hasOwnProperty.call(m, "passphrase"))
                w.uint32(10).string(m.passphrase);
            return w;
        };

        /**
         * Encodes the specified RegisterNodeRequestMessage message, length delimited. Does not implicitly {@link agentInterface.RegisterNodeRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.RegisterNodeRequestMessage
         * @static
         * @param {agentInterface.IRegisterNodeRequestMessage} message RegisterNodeRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RegisterNodeRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RegisterNodeRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.RegisterNodeRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.RegisterNodeRequestMessage} RegisterNodeRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RegisterNodeRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.RegisterNodeRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
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
         * Decodes a RegisterNodeRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.RegisterNodeRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.RegisterNodeRequestMessage} RegisterNodeRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RegisterNodeRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return RegisterNodeRequestMessage;
    })();

    agentInterface.RegisterNodeResponseMessage = (function() {

        /**
         * Properties of a RegisterNodeResponseMessage.
         * @memberof agentInterface
         * @interface IRegisterNodeResponseMessage
         * @property {boolean|null} [successful] RegisterNodeResponseMessage successful
         */

        /**
         * Constructs a new RegisterNodeResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a RegisterNodeResponseMessage.
         * @implements IRegisterNodeResponseMessage
         * @constructor
         * @param {agentInterface.IRegisterNodeResponseMessage=} [p] Properties to set
         */
        function RegisterNodeResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * RegisterNodeResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.RegisterNodeResponseMessage
         * @instance
         */
        RegisterNodeResponseMessage.prototype.successful = false;

        /**
         * Creates a new RegisterNodeResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.RegisterNodeResponseMessage
         * @static
         * @param {agentInterface.IRegisterNodeResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.RegisterNodeResponseMessage} RegisterNodeResponseMessage instance
         */
        RegisterNodeResponseMessage.create = function create(properties) {
            return new RegisterNodeResponseMessage(properties);
        };

        /**
         * Encodes the specified RegisterNodeResponseMessage message. Does not implicitly {@link agentInterface.RegisterNodeResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.RegisterNodeResponseMessage
         * @static
         * @param {agentInterface.IRegisterNodeResponseMessage} m RegisterNodeResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RegisterNodeResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified RegisterNodeResponseMessage message, length delimited. Does not implicitly {@link agentInterface.RegisterNodeResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.RegisterNodeResponseMessage
         * @static
         * @param {agentInterface.IRegisterNodeResponseMessage} message RegisterNodeResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RegisterNodeResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RegisterNodeResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.RegisterNodeResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.RegisterNodeResponseMessage} RegisterNodeResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RegisterNodeResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.RegisterNodeResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a RegisterNodeResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.RegisterNodeResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.RegisterNodeResponseMessage} RegisterNodeResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RegisterNodeResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return RegisterNodeResponseMessage;
    })();

    agentInterface.NewNodeRequestMessage = (function() {

        /**
         * Properties of a NewNodeRequestMessage.
         * @memberof agentInterface
         * @interface INewNodeRequestMessage
         * @property {string|null} [userId] NewNodeRequestMessage userId
         * @property {string|null} [passphrase] NewNodeRequestMessage passphrase
         * @property {number|null} [nbits] NewNodeRequestMessage nbits
         */

        /**
         * Constructs a new NewNodeRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a NewNodeRequestMessage.
         * @implements INewNodeRequestMessage
         * @constructor
         * @param {agentInterface.INewNodeRequestMessage=} [p] Properties to set
         */
        function NewNodeRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * NewNodeRequestMessage userId.
         * @member {string} userId
         * @memberof agentInterface.NewNodeRequestMessage
         * @instance
         */
        NewNodeRequestMessage.prototype.userId = "";

        /**
         * NewNodeRequestMessage passphrase.
         * @member {string} passphrase
         * @memberof agentInterface.NewNodeRequestMessage
         * @instance
         */
        NewNodeRequestMessage.prototype.passphrase = "";

        /**
         * NewNodeRequestMessage nbits.
         * @member {number} nbits
         * @memberof agentInterface.NewNodeRequestMessage
         * @instance
         */
        NewNodeRequestMessage.prototype.nbits = 0;

        /**
         * Creates a new NewNodeRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.NewNodeRequestMessage
         * @static
         * @param {agentInterface.INewNodeRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.NewNodeRequestMessage} NewNodeRequestMessage instance
         */
        NewNodeRequestMessage.create = function create(properties) {
            return new NewNodeRequestMessage(properties);
        };

        /**
         * Encodes the specified NewNodeRequestMessage message. Does not implicitly {@link agentInterface.NewNodeRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.NewNodeRequestMessage
         * @static
         * @param {agentInterface.INewNodeRequestMessage} m NewNodeRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NewNodeRequestMessage.encode = function encode(m, w) {
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
         * Encodes the specified NewNodeRequestMessage message, length delimited. Does not implicitly {@link agentInterface.NewNodeRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.NewNodeRequestMessage
         * @static
         * @param {agentInterface.INewNodeRequestMessage} message NewNodeRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NewNodeRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a NewNodeRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.NewNodeRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.NewNodeRequestMessage} NewNodeRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NewNodeRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.NewNodeRequestMessage();
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
         * Decodes a NewNodeRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.NewNodeRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.NewNodeRequestMessage} NewNodeRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NewNodeRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return NewNodeRequestMessage;
    })();

    agentInterface.NewNodeResponseMessage = (function() {

        /**
         * Properties of a NewNodeResponseMessage.
         * @memberof agentInterface
         * @interface INewNodeResponseMessage
         * @property {boolean|null} [successful] NewNodeResponseMessage successful
         */

        /**
         * Constructs a new NewNodeResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a NewNodeResponseMessage.
         * @implements INewNodeResponseMessage
         * @constructor
         * @param {agentInterface.INewNodeResponseMessage=} [p] Properties to set
         */
        function NewNodeResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * NewNodeResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.NewNodeResponseMessage
         * @instance
         */
        NewNodeResponseMessage.prototype.successful = false;

        /**
         * Creates a new NewNodeResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.NewNodeResponseMessage
         * @static
         * @param {agentInterface.INewNodeResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.NewNodeResponseMessage} NewNodeResponseMessage instance
         */
        NewNodeResponseMessage.create = function create(properties) {
            return new NewNodeResponseMessage(properties);
        };

        /**
         * Encodes the specified NewNodeResponseMessage message. Does not implicitly {@link agentInterface.NewNodeResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.NewNodeResponseMessage
         * @static
         * @param {agentInterface.INewNodeResponseMessage} m NewNodeResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NewNodeResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified NewNodeResponseMessage message, length delimited. Does not implicitly {@link agentInterface.NewNodeResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.NewNodeResponseMessage
         * @static
         * @param {agentInterface.INewNodeResponseMessage} message NewNodeResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NewNodeResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a NewNodeResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.NewNodeResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.NewNodeResponseMessage} NewNodeResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NewNodeResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.NewNodeResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a NewNodeResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.NewNodeResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.NewNodeResponseMessage} NewNodeResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NewNodeResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return NewNodeResponseMessage;
    })();

    agentInterface.ListNodesRequestMessage = (function() {

        /**
         * Properties of a ListNodesRequestMessage.
         * @memberof agentInterface
         * @interface IListNodesRequestMessage
         * @property {boolean|null} [unlockedOnly] ListNodesRequestMessage unlockedOnly
         */

        /**
         * Constructs a new ListNodesRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a ListNodesRequestMessage.
         * @implements IListNodesRequestMessage
         * @constructor
         * @param {agentInterface.IListNodesRequestMessage=} [p] Properties to set
         */
        function ListNodesRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * ListNodesRequestMessage unlockedOnly.
         * @member {boolean} unlockedOnly
         * @memberof agentInterface.ListNodesRequestMessage
         * @instance
         */
        ListNodesRequestMessage.prototype.unlockedOnly = false;

        /**
         * Creates a new ListNodesRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.ListNodesRequestMessage
         * @static
         * @param {agentInterface.IListNodesRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.ListNodesRequestMessage} ListNodesRequestMessage instance
         */
        ListNodesRequestMessage.create = function create(properties) {
            return new ListNodesRequestMessage(properties);
        };

        /**
         * Encodes the specified ListNodesRequestMessage message. Does not implicitly {@link agentInterface.ListNodesRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.ListNodesRequestMessage
         * @static
         * @param {agentInterface.IListNodesRequestMessage} m ListNodesRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListNodesRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.unlockedOnly != null && Object.hasOwnProperty.call(m, "unlockedOnly"))
                w.uint32(8).bool(m.unlockedOnly);
            return w;
        };

        /**
         * Encodes the specified ListNodesRequestMessage message, length delimited. Does not implicitly {@link agentInterface.ListNodesRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.ListNodesRequestMessage
         * @static
         * @param {agentInterface.IListNodesRequestMessage} message ListNodesRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListNodesRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ListNodesRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.ListNodesRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.ListNodesRequestMessage} ListNodesRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListNodesRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.ListNodesRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.unlockedOnly = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a ListNodesRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.ListNodesRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.ListNodesRequestMessage} ListNodesRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListNodesRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ListNodesRequestMessage;
    })();

    agentInterface.ListNodesResponseMessage = (function() {

        /**
         * Properties of a ListNodesResponseMessage.
         * @memberof agentInterface
         * @interface IListNodesResponseMessage
         * @property {Array.<string>|null} [nodes] ListNodesResponseMessage nodes
         */

        /**
         * Constructs a new ListNodesResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a ListNodesResponseMessage.
         * @implements IListNodesResponseMessage
         * @constructor
         * @param {agentInterface.IListNodesResponseMessage=} [p] Properties to set
         */
        function ListNodesResponseMessage(p) {
            this.nodes = [];
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * ListNodesResponseMessage nodes.
         * @member {Array.<string>} nodes
         * @memberof agentInterface.ListNodesResponseMessage
         * @instance
         */
        ListNodesResponseMessage.prototype.nodes = $util.emptyArray;

        /**
         * Creates a new ListNodesResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.ListNodesResponseMessage
         * @static
         * @param {agentInterface.IListNodesResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.ListNodesResponseMessage} ListNodesResponseMessage instance
         */
        ListNodesResponseMessage.create = function create(properties) {
            return new ListNodesResponseMessage(properties);
        };

        /**
         * Encodes the specified ListNodesResponseMessage message. Does not implicitly {@link agentInterface.ListNodesResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.ListNodesResponseMessage
         * @static
         * @param {agentInterface.IListNodesResponseMessage} m ListNodesResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListNodesResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.nodes != null && m.nodes.length) {
                for (var i = 0; i < m.nodes.length; ++i)
                    w.uint32(10).string(m.nodes[i]);
            }
            return w;
        };

        /**
         * Encodes the specified ListNodesResponseMessage message, length delimited. Does not implicitly {@link agentInterface.ListNodesResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.ListNodesResponseMessage
         * @static
         * @param {agentInterface.IListNodesResponseMessage} message ListNodesResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListNodesResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ListNodesResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.ListNodesResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.ListNodesResponseMessage} ListNodesResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListNodesResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.ListNodesResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    if (!(m.nodes && m.nodes.length))
                        m.nodes = [];
                    m.nodes.push(r.string());
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a ListNodesResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.ListNodesResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.ListNodesResponseMessage} ListNodesResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListNodesResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ListNodesResponseMessage;
    })();

    agentInterface.SignFileRequestMessage = (function() {

        /**
         * Properties of a SignFileRequestMessage.
         * @memberof agentInterface
         * @interface ISignFileRequestMessage
         * @property {string|null} [filePath] SignFileRequestMessage filePath
         * @property {string|null} [privateKeyPath] SignFileRequestMessage privateKeyPath
         * @property {string|null} [passphrase] SignFileRequestMessage passphrase
         */

        /**
         * Constructs a new SignFileRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a SignFileRequestMessage.
         * @implements ISignFileRequestMessage
         * @constructor
         * @param {agentInterface.ISignFileRequestMessage=} [p] Properties to set
         */
        function SignFileRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * SignFileRequestMessage filePath.
         * @member {string} filePath
         * @memberof agentInterface.SignFileRequestMessage
         * @instance
         */
        SignFileRequestMessage.prototype.filePath = "";

        /**
         * SignFileRequestMessage privateKeyPath.
         * @member {string} privateKeyPath
         * @memberof agentInterface.SignFileRequestMessage
         * @instance
         */
        SignFileRequestMessage.prototype.privateKeyPath = "";

        /**
         * SignFileRequestMessage passphrase.
         * @member {string} passphrase
         * @memberof agentInterface.SignFileRequestMessage
         * @instance
         */
        SignFileRequestMessage.prototype.passphrase = "";

        /**
         * Creates a new SignFileRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.SignFileRequestMessage
         * @static
         * @param {agentInterface.ISignFileRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.SignFileRequestMessage} SignFileRequestMessage instance
         */
        SignFileRequestMessage.create = function create(properties) {
            return new SignFileRequestMessage(properties);
        };

        /**
         * Encodes the specified SignFileRequestMessage message. Does not implicitly {@link agentInterface.SignFileRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.SignFileRequestMessage
         * @static
         * @param {agentInterface.ISignFileRequestMessage} m SignFileRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SignFileRequestMessage.encode = function encode(m, w) {
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
         * Encodes the specified SignFileRequestMessage message, length delimited. Does not implicitly {@link agentInterface.SignFileRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.SignFileRequestMessage
         * @static
         * @param {agentInterface.ISignFileRequestMessage} message SignFileRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SignFileRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SignFileRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.SignFileRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.SignFileRequestMessage} SignFileRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SignFileRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.SignFileRequestMessage();
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
         * Decodes a SignFileRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.SignFileRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.SignFileRequestMessage} SignFileRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SignFileRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return SignFileRequestMessage;
    })();

    agentInterface.SignFileResponseMessage = (function() {

        /**
         * Properties of a SignFileResponseMessage.
         * @memberof agentInterface
         * @interface ISignFileResponseMessage
         * @property {string|null} [signaturePath] SignFileResponseMessage signaturePath
         */

        /**
         * Constructs a new SignFileResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a SignFileResponseMessage.
         * @implements ISignFileResponseMessage
         * @constructor
         * @param {agentInterface.ISignFileResponseMessage=} [p] Properties to set
         */
        function SignFileResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * SignFileResponseMessage signaturePath.
         * @member {string} signaturePath
         * @memberof agentInterface.SignFileResponseMessage
         * @instance
         */
        SignFileResponseMessage.prototype.signaturePath = "";

        /**
         * Creates a new SignFileResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.SignFileResponseMessage
         * @static
         * @param {agentInterface.ISignFileResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.SignFileResponseMessage} SignFileResponseMessage instance
         */
        SignFileResponseMessage.create = function create(properties) {
            return new SignFileResponseMessage(properties);
        };

        /**
         * Encodes the specified SignFileResponseMessage message. Does not implicitly {@link agentInterface.SignFileResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.SignFileResponseMessage
         * @static
         * @param {agentInterface.ISignFileResponseMessage} m SignFileResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SignFileResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.signaturePath != null && Object.hasOwnProperty.call(m, "signaturePath"))
                w.uint32(10).string(m.signaturePath);
            return w;
        };

        /**
         * Encodes the specified SignFileResponseMessage message, length delimited. Does not implicitly {@link agentInterface.SignFileResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.SignFileResponseMessage
         * @static
         * @param {agentInterface.ISignFileResponseMessage} message SignFileResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SignFileResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SignFileResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.SignFileResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.SignFileResponseMessage} SignFileResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SignFileResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.SignFileResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.signaturePath = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a SignFileResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.SignFileResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.SignFileResponseMessage} SignFileResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SignFileResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return SignFileResponseMessage;
    })();

    agentInterface.VerifyFileRequestMessage = (function() {

        /**
         * Properties of a VerifyFileRequestMessage.
         * @memberof agentInterface
         * @interface IVerifyFileRequestMessage
         * @property {string|null} [filePath] VerifyFileRequestMessage filePath
         * @property {string|null} [publicKeyPath] VerifyFileRequestMessage publicKeyPath
         */

        /**
         * Constructs a new VerifyFileRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a VerifyFileRequestMessage.
         * @implements IVerifyFileRequestMessage
         * @constructor
         * @param {agentInterface.IVerifyFileRequestMessage=} [p] Properties to set
         */
        function VerifyFileRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * VerifyFileRequestMessage filePath.
         * @member {string} filePath
         * @memberof agentInterface.VerifyFileRequestMessage
         * @instance
         */
        VerifyFileRequestMessage.prototype.filePath = "";

        /**
         * VerifyFileRequestMessage publicKeyPath.
         * @member {string} publicKeyPath
         * @memberof agentInterface.VerifyFileRequestMessage
         * @instance
         */
        VerifyFileRequestMessage.prototype.publicKeyPath = "";

        /**
         * Creates a new VerifyFileRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.VerifyFileRequestMessage
         * @static
         * @param {agentInterface.IVerifyFileRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.VerifyFileRequestMessage} VerifyFileRequestMessage instance
         */
        VerifyFileRequestMessage.create = function create(properties) {
            return new VerifyFileRequestMessage(properties);
        };

        /**
         * Encodes the specified VerifyFileRequestMessage message. Does not implicitly {@link agentInterface.VerifyFileRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.VerifyFileRequestMessage
         * @static
         * @param {agentInterface.IVerifyFileRequestMessage} m VerifyFileRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        VerifyFileRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.filePath != null && Object.hasOwnProperty.call(m, "filePath"))
                w.uint32(10).string(m.filePath);
            if (m.publicKeyPath != null && Object.hasOwnProperty.call(m, "publicKeyPath"))
                w.uint32(18).string(m.publicKeyPath);
            return w;
        };

        /**
         * Encodes the specified VerifyFileRequestMessage message, length delimited. Does not implicitly {@link agentInterface.VerifyFileRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.VerifyFileRequestMessage
         * @static
         * @param {agentInterface.IVerifyFileRequestMessage} message VerifyFileRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        VerifyFileRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a VerifyFileRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.VerifyFileRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.VerifyFileRequestMessage} VerifyFileRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        VerifyFileRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.VerifyFileRequestMessage();
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
         * Decodes a VerifyFileRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.VerifyFileRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.VerifyFileRequestMessage} VerifyFileRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        VerifyFileRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return VerifyFileRequestMessage;
    })();

    agentInterface.VerifyFileResponseMessage = (function() {

        /**
         * Properties of a VerifyFileResponseMessage.
         * @memberof agentInterface
         * @interface IVerifyFileResponseMessage
         * @property {boolean|null} [verified] VerifyFileResponseMessage verified
         */

        /**
         * Constructs a new VerifyFileResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a VerifyFileResponseMessage.
         * @implements IVerifyFileResponseMessage
         * @constructor
         * @param {agentInterface.IVerifyFileResponseMessage=} [p] Properties to set
         */
        function VerifyFileResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * VerifyFileResponseMessage verified.
         * @member {boolean} verified
         * @memberof agentInterface.VerifyFileResponseMessage
         * @instance
         */
        VerifyFileResponseMessage.prototype.verified = false;

        /**
         * Creates a new VerifyFileResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.VerifyFileResponseMessage
         * @static
         * @param {agentInterface.IVerifyFileResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.VerifyFileResponseMessage} VerifyFileResponseMessage instance
         */
        VerifyFileResponseMessage.create = function create(properties) {
            return new VerifyFileResponseMessage(properties);
        };

        /**
         * Encodes the specified VerifyFileResponseMessage message. Does not implicitly {@link agentInterface.VerifyFileResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.VerifyFileResponseMessage
         * @static
         * @param {agentInterface.IVerifyFileResponseMessage} m VerifyFileResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        VerifyFileResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.verified != null && Object.hasOwnProperty.call(m, "verified"))
                w.uint32(8).bool(m.verified);
            return w;
        };

        /**
         * Encodes the specified VerifyFileResponseMessage message, length delimited. Does not implicitly {@link agentInterface.VerifyFileResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.VerifyFileResponseMessage
         * @static
         * @param {agentInterface.IVerifyFileResponseMessage} message VerifyFileResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        VerifyFileResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a VerifyFileResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.VerifyFileResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.VerifyFileResponseMessage} VerifyFileResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        VerifyFileResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.VerifyFileResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.verified = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a VerifyFileResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.VerifyFileResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.VerifyFileResponseMessage} VerifyFileResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        VerifyFileResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return VerifyFileResponseMessage;
    })();

    agentInterface.EncryptFileRequestMessage = (function() {

        /**
         * Properties of an EncryptFileRequestMessage.
         * @memberof agentInterface
         * @interface IEncryptFileRequestMessage
         * @property {string|null} [filePath] EncryptFileRequestMessage filePath
         * @property {string|null} [publicKeyPath] EncryptFileRequestMessage publicKeyPath
         */

        /**
         * Constructs a new EncryptFileRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents an EncryptFileRequestMessage.
         * @implements IEncryptFileRequestMessage
         * @constructor
         * @param {agentInterface.IEncryptFileRequestMessage=} [p] Properties to set
         */
        function EncryptFileRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * EncryptFileRequestMessage filePath.
         * @member {string} filePath
         * @memberof agentInterface.EncryptFileRequestMessage
         * @instance
         */
        EncryptFileRequestMessage.prototype.filePath = "";

        /**
         * EncryptFileRequestMessage publicKeyPath.
         * @member {string} publicKeyPath
         * @memberof agentInterface.EncryptFileRequestMessage
         * @instance
         */
        EncryptFileRequestMessage.prototype.publicKeyPath = "";

        /**
         * Creates a new EncryptFileRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.EncryptFileRequestMessage
         * @static
         * @param {agentInterface.IEncryptFileRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.EncryptFileRequestMessage} EncryptFileRequestMessage instance
         */
        EncryptFileRequestMessage.create = function create(properties) {
            return new EncryptFileRequestMessage(properties);
        };

        /**
         * Encodes the specified EncryptFileRequestMessage message. Does not implicitly {@link agentInterface.EncryptFileRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.EncryptFileRequestMessage
         * @static
         * @param {agentInterface.IEncryptFileRequestMessage} m EncryptFileRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EncryptFileRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.filePath != null && Object.hasOwnProperty.call(m, "filePath"))
                w.uint32(10).string(m.filePath);
            if (m.publicKeyPath != null && Object.hasOwnProperty.call(m, "publicKeyPath"))
                w.uint32(18).string(m.publicKeyPath);
            return w;
        };

        /**
         * Encodes the specified EncryptFileRequestMessage message, length delimited. Does not implicitly {@link agentInterface.EncryptFileRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.EncryptFileRequestMessage
         * @static
         * @param {agentInterface.IEncryptFileRequestMessage} message EncryptFileRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EncryptFileRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an EncryptFileRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.EncryptFileRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.EncryptFileRequestMessage} EncryptFileRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EncryptFileRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.EncryptFileRequestMessage();
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
         * Decodes an EncryptFileRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.EncryptFileRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.EncryptFileRequestMessage} EncryptFileRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EncryptFileRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return EncryptFileRequestMessage;
    })();

    agentInterface.EncryptFileResponseMessage = (function() {

        /**
         * Properties of an EncryptFileResponseMessage.
         * @memberof agentInterface
         * @interface IEncryptFileResponseMessage
         * @property {string|null} [encryptedPath] EncryptFileResponseMessage encryptedPath
         */

        /**
         * Constructs a new EncryptFileResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents an EncryptFileResponseMessage.
         * @implements IEncryptFileResponseMessage
         * @constructor
         * @param {agentInterface.IEncryptFileResponseMessage=} [p] Properties to set
         */
        function EncryptFileResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * EncryptFileResponseMessage encryptedPath.
         * @member {string} encryptedPath
         * @memberof agentInterface.EncryptFileResponseMessage
         * @instance
         */
        EncryptFileResponseMessage.prototype.encryptedPath = "";

        /**
         * Creates a new EncryptFileResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.EncryptFileResponseMessage
         * @static
         * @param {agentInterface.IEncryptFileResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.EncryptFileResponseMessage} EncryptFileResponseMessage instance
         */
        EncryptFileResponseMessage.create = function create(properties) {
            return new EncryptFileResponseMessage(properties);
        };

        /**
         * Encodes the specified EncryptFileResponseMessage message. Does not implicitly {@link agentInterface.EncryptFileResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.EncryptFileResponseMessage
         * @static
         * @param {agentInterface.IEncryptFileResponseMessage} m EncryptFileResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EncryptFileResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.encryptedPath != null && Object.hasOwnProperty.call(m, "encryptedPath"))
                w.uint32(10).string(m.encryptedPath);
            return w;
        };

        /**
         * Encodes the specified EncryptFileResponseMessage message, length delimited. Does not implicitly {@link agentInterface.EncryptFileResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.EncryptFileResponseMessage
         * @static
         * @param {agentInterface.IEncryptFileResponseMessage} message EncryptFileResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EncryptFileResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an EncryptFileResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.EncryptFileResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.EncryptFileResponseMessage} EncryptFileResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EncryptFileResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.EncryptFileResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.encryptedPath = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes an EncryptFileResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.EncryptFileResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.EncryptFileResponseMessage} EncryptFileResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EncryptFileResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return EncryptFileResponseMessage;
    })();

    agentInterface.DecryptFileRequestMessage = (function() {

        /**
         * Properties of a DecryptFileRequestMessage.
         * @memberof agentInterface
         * @interface IDecryptFileRequestMessage
         * @property {string|null} [filePath] DecryptFileRequestMessage filePath
         * @property {string|null} [privateKeyPath] DecryptFileRequestMessage privateKeyPath
         * @property {string|null} [passphrase] DecryptFileRequestMessage passphrase
         */

        /**
         * Constructs a new DecryptFileRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a DecryptFileRequestMessage.
         * @implements IDecryptFileRequestMessage
         * @constructor
         * @param {agentInterface.IDecryptFileRequestMessage=} [p] Properties to set
         */
        function DecryptFileRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * DecryptFileRequestMessage filePath.
         * @member {string} filePath
         * @memberof agentInterface.DecryptFileRequestMessage
         * @instance
         */
        DecryptFileRequestMessage.prototype.filePath = "";

        /**
         * DecryptFileRequestMessage privateKeyPath.
         * @member {string} privateKeyPath
         * @memberof agentInterface.DecryptFileRequestMessage
         * @instance
         */
        DecryptFileRequestMessage.prototype.privateKeyPath = "";

        /**
         * DecryptFileRequestMessage passphrase.
         * @member {string} passphrase
         * @memberof agentInterface.DecryptFileRequestMessage
         * @instance
         */
        DecryptFileRequestMessage.prototype.passphrase = "";

        /**
         * Creates a new DecryptFileRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.DecryptFileRequestMessage
         * @static
         * @param {agentInterface.IDecryptFileRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.DecryptFileRequestMessage} DecryptFileRequestMessage instance
         */
        DecryptFileRequestMessage.create = function create(properties) {
            return new DecryptFileRequestMessage(properties);
        };

        /**
         * Encodes the specified DecryptFileRequestMessage message. Does not implicitly {@link agentInterface.DecryptFileRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.DecryptFileRequestMessage
         * @static
         * @param {agentInterface.IDecryptFileRequestMessage} m DecryptFileRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DecryptFileRequestMessage.encode = function encode(m, w) {
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
         * Encodes the specified DecryptFileRequestMessage message, length delimited. Does not implicitly {@link agentInterface.DecryptFileRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.DecryptFileRequestMessage
         * @static
         * @param {agentInterface.IDecryptFileRequestMessage} message DecryptFileRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DecryptFileRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DecryptFileRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.DecryptFileRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.DecryptFileRequestMessage} DecryptFileRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DecryptFileRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.DecryptFileRequestMessage();
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
         * Decodes a DecryptFileRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.DecryptFileRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.DecryptFileRequestMessage} DecryptFileRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DecryptFileRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return DecryptFileRequestMessage;
    })();

    agentInterface.DecryptFileResponseMessage = (function() {

        /**
         * Properties of a DecryptFileResponseMessage.
         * @memberof agentInterface
         * @interface IDecryptFileResponseMessage
         * @property {string|null} [decryptedPath] DecryptFileResponseMessage decryptedPath
         */

        /**
         * Constructs a new DecryptFileResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a DecryptFileResponseMessage.
         * @implements IDecryptFileResponseMessage
         * @constructor
         * @param {agentInterface.IDecryptFileResponseMessage=} [p] Properties to set
         */
        function DecryptFileResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * DecryptFileResponseMessage decryptedPath.
         * @member {string} decryptedPath
         * @memberof agentInterface.DecryptFileResponseMessage
         * @instance
         */
        DecryptFileResponseMessage.prototype.decryptedPath = "";

        /**
         * Creates a new DecryptFileResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.DecryptFileResponseMessage
         * @static
         * @param {agentInterface.IDecryptFileResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.DecryptFileResponseMessage} DecryptFileResponseMessage instance
         */
        DecryptFileResponseMessage.create = function create(properties) {
            return new DecryptFileResponseMessage(properties);
        };

        /**
         * Encodes the specified DecryptFileResponseMessage message. Does not implicitly {@link agentInterface.DecryptFileResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.DecryptFileResponseMessage
         * @static
         * @param {agentInterface.IDecryptFileResponseMessage} m DecryptFileResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DecryptFileResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.decryptedPath != null && Object.hasOwnProperty.call(m, "decryptedPath"))
                w.uint32(10).string(m.decryptedPath);
            return w;
        };

        /**
         * Encodes the specified DecryptFileResponseMessage message, length delimited. Does not implicitly {@link agentInterface.DecryptFileResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.DecryptFileResponseMessage
         * @static
         * @param {agentInterface.IDecryptFileResponseMessage} message DecryptFileResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DecryptFileResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DecryptFileResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.DecryptFileResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.DecryptFileResponseMessage} DecryptFileResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DecryptFileResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.DecryptFileResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.decryptedPath = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a DecryptFileResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.DecryptFileResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.DecryptFileResponseMessage} DecryptFileResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DecryptFileResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return DecryptFileResponseMessage;
    })();

    agentInterface.ListVaultsRequestMessage = (function() {

        /**
         * Properties of a ListVaultsRequestMessage.
         * @memberof agentInterface
         * @interface IListVaultsRequestMessage
         */

        /**
         * Constructs a new ListVaultsRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a ListVaultsRequestMessage.
         * @implements IListVaultsRequestMessage
         * @constructor
         * @param {agentInterface.IListVaultsRequestMessage=} [p] Properties to set
         */
        function ListVaultsRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * Creates a new ListVaultsRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.ListVaultsRequestMessage
         * @static
         * @param {agentInterface.IListVaultsRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.ListVaultsRequestMessage} ListVaultsRequestMessage instance
         */
        ListVaultsRequestMessage.create = function create(properties) {
            return new ListVaultsRequestMessage(properties);
        };

        /**
         * Encodes the specified ListVaultsRequestMessage message. Does not implicitly {@link agentInterface.ListVaultsRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.ListVaultsRequestMessage
         * @static
         * @param {agentInterface.IListVaultsRequestMessage} m ListVaultsRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListVaultsRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            return w;
        };

        /**
         * Encodes the specified ListVaultsRequestMessage message, length delimited. Does not implicitly {@link agentInterface.ListVaultsRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.ListVaultsRequestMessage
         * @static
         * @param {agentInterface.IListVaultsRequestMessage} message ListVaultsRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListVaultsRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ListVaultsRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.ListVaultsRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.ListVaultsRequestMessage} ListVaultsRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListVaultsRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.ListVaultsRequestMessage();
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
         * Decodes a ListVaultsRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.ListVaultsRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.ListVaultsRequestMessage} ListVaultsRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListVaultsRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ListVaultsRequestMessage;
    })();

    agentInterface.ListVaultsResponseMessage = (function() {

        /**
         * Properties of a ListVaultsResponseMessage.
         * @memberof agentInterface
         * @interface IListVaultsResponseMessage
         * @property {Array.<string>|null} [vaultNames] ListVaultsResponseMessage vaultNames
         */

        /**
         * Constructs a new ListVaultsResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a ListVaultsResponseMessage.
         * @implements IListVaultsResponseMessage
         * @constructor
         * @param {agentInterface.IListVaultsResponseMessage=} [p] Properties to set
         */
        function ListVaultsResponseMessage(p) {
            this.vaultNames = [];
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * ListVaultsResponseMessage vaultNames.
         * @member {Array.<string>} vaultNames
         * @memberof agentInterface.ListVaultsResponseMessage
         * @instance
         */
        ListVaultsResponseMessage.prototype.vaultNames = $util.emptyArray;

        /**
         * Creates a new ListVaultsResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.ListVaultsResponseMessage
         * @static
         * @param {agentInterface.IListVaultsResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.ListVaultsResponseMessage} ListVaultsResponseMessage instance
         */
        ListVaultsResponseMessage.create = function create(properties) {
            return new ListVaultsResponseMessage(properties);
        };

        /**
         * Encodes the specified ListVaultsResponseMessage message. Does not implicitly {@link agentInterface.ListVaultsResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.ListVaultsResponseMessage
         * @static
         * @param {agentInterface.IListVaultsResponseMessage} m ListVaultsResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListVaultsResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultNames != null && m.vaultNames.length) {
                for (var i = 0; i < m.vaultNames.length; ++i)
                    w.uint32(10).string(m.vaultNames[i]);
            }
            return w;
        };

        /**
         * Encodes the specified ListVaultsResponseMessage message, length delimited. Does not implicitly {@link agentInterface.ListVaultsResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.ListVaultsResponseMessage
         * @static
         * @param {agentInterface.IListVaultsResponseMessage} message ListVaultsResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListVaultsResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ListVaultsResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.ListVaultsResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.ListVaultsResponseMessage} ListVaultsResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListVaultsResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.ListVaultsResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    if (!(m.vaultNames && m.vaultNames.length))
                        m.vaultNames = [];
                    m.vaultNames.push(r.string());
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a ListVaultsResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.ListVaultsResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.ListVaultsResponseMessage} ListVaultsResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListVaultsResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ListVaultsResponseMessage;
    })();

    agentInterface.ScanVaultNamesRequestMessage = (function() {

        /**
         * Properties of a ScanVaultNamesRequestMessage.
         * @memberof agentInterface
         * @interface IScanVaultNamesRequestMessage
         * @property {string|null} [publicKey] ScanVaultNamesRequestMessage publicKey
         */

        /**
         * Constructs a new ScanVaultNamesRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a ScanVaultNamesRequestMessage.
         * @implements IScanVaultNamesRequestMessage
         * @constructor
         * @param {agentInterface.IScanVaultNamesRequestMessage=} [p] Properties to set
         */
        function ScanVaultNamesRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * ScanVaultNamesRequestMessage publicKey.
         * @member {string} publicKey
         * @memberof agentInterface.ScanVaultNamesRequestMessage
         * @instance
         */
        ScanVaultNamesRequestMessage.prototype.publicKey = "";

        /**
         * Creates a new ScanVaultNamesRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.ScanVaultNamesRequestMessage
         * @static
         * @param {agentInterface.IScanVaultNamesRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.ScanVaultNamesRequestMessage} ScanVaultNamesRequestMessage instance
         */
        ScanVaultNamesRequestMessage.create = function create(properties) {
            return new ScanVaultNamesRequestMessage(properties);
        };

        /**
         * Encodes the specified ScanVaultNamesRequestMessage message. Does not implicitly {@link agentInterface.ScanVaultNamesRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.ScanVaultNamesRequestMessage
         * @static
         * @param {agentInterface.IScanVaultNamesRequestMessage} m ScanVaultNamesRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ScanVaultNamesRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            return w;
        };

        /**
         * Encodes the specified ScanVaultNamesRequestMessage message, length delimited. Does not implicitly {@link agentInterface.ScanVaultNamesRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.ScanVaultNamesRequestMessage
         * @static
         * @param {agentInterface.IScanVaultNamesRequestMessage} message ScanVaultNamesRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ScanVaultNamesRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ScanVaultNamesRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.ScanVaultNamesRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.ScanVaultNamesRequestMessage} ScanVaultNamesRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ScanVaultNamesRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.ScanVaultNamesRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
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
         * Decodes a ScanVaultNamesRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.ScanVaultNamesRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.ScanVaultNamesRequestMessage} ScanVaultNamesRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ScanVaultNamesRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ScanVaultNamesRequestMessage;
    })();

    agentInterface.ScanVaultNamesResponseMessage = (function() {

        /**
         * Properties of a ScanVaultNamesResponseMessage.
         * @memberof agentInterface
         * @interface IScanVaultNamesResponseMessage
         * @property {Array.<string>|null} [vaultNames] ScanVaultNamesResponseMessage vaultNames
         */

        /**
         * Constructs a new ScanVaultNamesResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a ScanVaultNamesResponseMessage.
         * @implements IScanVaultNamesResponseMessage
         * @constructor
         * @param {agentInterface.IScanVaultNamesResponseMessage=} [p] Properties to set
         */
        function ScanVaultNamesResponseMessage(p) {
            this.vaultNames = [];
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * ScanVaultNamesResponseMessage vaultNames.
         * @member {Array.<string>} vaultNames
         * @memberof agentInterface.ScanVaultNamesResponseMessage
         * @instance
         */
        ScanVaultNamesResponseMessage.prototype.vaultNames = $util.emptyArray;

        /**
         * Creates a new ScanVaultNamesResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.ScanVaultNamesResponseMessage
         * @static
         * @param {agentInterface.IScanVaultNamesResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.ScanVaultNamesResponseMessage} ScanVaultNamesResponseMessage instance
         */
        ScanVaultNamesResponseMessage.create = function create(properties) {
            return new ScanVaultNamesResponseMessage(properties);
        };

        /**
         * Encodes the specified ScanVaultNamesResponseMessage message. Does not implicitly {@link agentInterface.ScanVaultNamesResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.ScanVaultNamesResponseMessage
         * @static
         * @param {agentInterface.IScanVaultNamesResponseMessage} m ScanVaultNamesResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ScanVaultNamesResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultNames != null && m.vaultNames.length) {
                for (var i = 0; i < m.vaultNames.length; ++i)
                    w.uint32(10).string(m.vaultNames[i]);
            }
            return w;
        };

        /**
         * Encodes the specified ScanVaultNamesResponseMessage message, length delimited. Does not implicitly {@link agentInterface.ScanVaultNamesResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.ScanVaultNamesResponseMessage
         * @static
         * @param {agentInterface.IScanVaultNamesResponseMessage} message ScanVaultNamesResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ScanVaultNamesResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ScanVaultNamesResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.ScanVaultNamesResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.ScanVaultNamesResponseMessage} ScanVaultNamesResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ScanVaultNamesResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.ScanVaultNamesResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    if (!(m.vaultNames && m.vaultNames.length))
                        m.vaultNames = [];
                    m.vaultNames.push(r.string());
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a ScanVaultNamesResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.ScanVaultNamesResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.ScanVaultNamesResponseMessage} ScanVaultNamesResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ScanVaultNamesResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ScanVaultNamesResponseMessage;
    })();

    agentInterface.NewVaultRequestMessage = (function() {

        /**
         * Properties of a NewVaultRequestMessage.
         * @memberof agentInterface
         * @interface INewVaultRequestMessage
         * @property {string|null} [vaultName] NewVaultRequestMessage vaultName
         */

        /**
         * Constructs a new NewVaultRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a NewVaultRequestMessage.
         * @implements INewVaultRequestMessage
         * @constructor
         * @param {agentInterface.INewVaultRequestMessage=} [p] Properties to set
         */
        function NewVaultRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * NewVaultRequestMessage vaultName.
         * @member {string} vaultName
         * @memberof agentInterface.NewVaultRequestMessage
         * @instance
         */
        NewVaultRequestMessage.prototype.vaultName = "";

        /**
         * Creates a new NewVaultRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.NewVaultRequestMessage
         * @static
         * @param {agentInterface.INewVaultRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.NewVaultRequestMessage} NewVaultRequestMessage instance
         */
        NewVaultRequestMessage.create = function create(properties) {
            return new NewVaultRequestMessage(properties);
        };

        /**
         * Encodes the specified NewVaultRequestMessage message. Does not implicitly {@link agentInterface.NewVaultRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.NewVaultRequestMessage
         * @static
         * @param {agentInterface.INewVaultRequestMessage} m NewVaultRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NewVaultRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultName != null && Object.hasOwnProperty.call(m, "vaultName"))
                w.uint32(10).string(m.vaultName);
            return w;
        };

        /**
         * Encodes the specified NewVaultRequestMessage message, length delimited. Does not implicitly {@link agentInterface.NewVaultRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.NewVaultRequestMessage
         * @static
         * @param {agentInterface.INewVaultRequestMessage} message NewVaultRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NewVaultRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a NewVaultRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.NewVaultRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.NewVaultRequestMessage} NewVaultRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NewVaultRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.NewVaultRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.vaultName = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a NewVaultRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.NewVaultRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.NewVaultRequestMessage} NewVaultRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NewVaultRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return NewVaultRequestMessage;
    })();

    agentInterface.NewVaultResponseMessage = (function() {

        /**
         * Properties of a NewVaultResponseMessage.
         * @memberof agentInterface
         * @interface INewVaultResponseMessage
         * @property {boolean|null} [successful] NewVaultResponseMessage successful
         */

        /**
         * Constructs a new NewVaultResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a NewVaultResponseMessage.
         * @implements INewVaultResponseMessage
         * @constructor
         * @param {agentInterface.INewVaultResponseMessage=} [p] Properties to set
         */
        function NewVaultResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * NewVaultResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.NewVaultResponseMessage
         * @instance
         */
        NewVaultResponseMessage.prototype.successful = false;

        /**
         * Creates a new NewVaultResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.NewVaultResponseMessage
         * @static
         * @param {agentInterface.INewVaultResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.NewVaultResponseMessage} NewVaultResponseMessage instance
         */
        NewVaultResponseMessage.create = function create(properties) {
            return new NewVaultResponseMessage(properties);
        };

        /**
         * Encodes the specified NewVaultResponseMessage message. Does not implicitly {@link agentInterface.NewVaultResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.NewVaultResponseMessage
         * @static
         * @param {agentInterface.INewVaultResponseMessage} m NewVaultResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NewVaultResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified NewVaultResponseMessage message, length delimited. Does not implicitly {@link agentInterface.NewVaultResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.NewVaultResponseMessage
         * @static
         * @param {agentInterface.INewVaultResponseMessage} message NewVaultResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NewVaultResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a NewVaultResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.NewVaultResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.NewVaultResponseMessage} NewVaultResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NewVaultResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.NewVaultResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a NewVaultResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.NewVaultResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.NewVaultResponseMessage} NewVaultResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NewVaultResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return NewVaultResponseMessage;
    })();

    agentInterface.PullVaultRequestMessage = (function() {

        /**
         * Properties of a PullVaultRequestMessage.
         * @memberof agentInterface
         * @interface IPullVaultRequestMessage
         * @property {string|null} [vaultName] PullVaultRequestMessage vaultName
         * @property {string|null} [publicKey] PullVaultRequestMessage publicKey
         */

        /**
         * Constructs a new PullVaultRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a PullVaultRequestMessage.
         * @implements IPullVaultRequestMessage
         * @constructor
         * @param {agentInterface.IPullVaultRequestMessage=} [p] Properties to set
         */
        function PullVaultRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PullVaultRequestMessage vaultName.
         * @member {string} vaultName
         * @memberof agentInterface.PullVaultRequestMessage
         * @instance
         */
        PullVaultRequestMessage.prototype.vaultName = "";

        /**
         * PullVaultRequestMessage publicKey.
         * @member {string} publicKey
         * @memberof agentInterface.PullVaultRequestMessage
         * @instance
         */
        PullVaultRequestMessage.prototype.publicKey = "";

        /**
         * Creates a new PullVaultRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.PullVaultRequestMessage
         * @static
         * @param {agentInterface.IPullVaultRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.PullVaultRequestMessage} PullVaultRequestMessage instance
         */
        PullVaultRequestMessage.create = function create(properties) {
            return new PullVaultRequestMessage(properties);
        };

        /**
         * Encodes the specified PullVaultRequestMessage message. Does not implicitly {@link agentInterface.PullVaultRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.PullVaultRequestMessage
         * @static
         * @param {agentInterface.IPullVaultRequestMessage} m PullVaultRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PullVaultRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultName != null && Object.hasOwnProperty.call(m, "vaultName"))
                w.uint32(10).string(m.vaultName);
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(18).string(m.publicKey);
            return w;
        };

        /**
         * Encodes the specified PullVaultRequestMessage message, length delimited. Does not implicitly {@link agentInterface.PullVaultRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.PullVaultRequestMessage
         * @static
         * @param {agentInterface.IPullVaultRequestMessage} message PullVaultRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PullVaultRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PullVaultRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.PullVaultRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.PullVaultRequestMessage} PullVaultRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PullVaultRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.PullVaultRequestMessage();
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
         * Decodes a PullVaultRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.PullVaultRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.PullVaultRequestMessage} PullVaultRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PullVaultRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PullVaultRequestMessage;
    })();

    agentInterface.PullVaultResponseMessage = (function() {

        /**
         * Properties of a PullVaultResponseMessage.
         * @memberof agentInterface
         * @interface IPullVaultResponseMessage
         * @property {boolean|null} [successful] PullVaultResponseMessage successful
         */

        /**
         * Constructs a new PullVaultResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a PullVaultResponseMessage.
         * @implements IPullVaultResponseMessage
         * @constructor
         * @param {agentInterface.IPullVaultResponseMessage=} [p] Properties to set
         */
        function PullVaultResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PullVaultResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.PullVaultResponseMessage
         * @instance
         */
        PullVaultResponseMessage.prototype.successful = false;

        /**
         * Creates a new PullVaultResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.PullVaultResponseMessage
         * @static
         * @param {agentInterface.IPullVaultResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.PullVaultResponseMessage} PullVaultResponseMessage instance
         */
        PullVaultResponseMessage.create = function create(properties) {
            return new PullVaultResponseMessage(properties);
        };

        /**
         * Encodes the specified PullVaultResponseMessage message. Does not implicitly {@link agentInterface.PullVaultResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.PullVaultResponseMessage
         * @static
         * @param {agentInterface.IPullVaultResponseMessage} m PullVaultResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PullVaultResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified PullVaultResponseMessage message, length delimited. Does not implicitly {@link agentInterface.PullVaultResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.PullVaultResponseMessage
         * @static
         * @param {agentInterface.IPullVaultResponseMessage} message PullVaultResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PullVaultResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PullVaultResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.PullVaultResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.PullVaultResponseMessage} PullVaultResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PullVaultResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.PullVaultResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a PullVaultResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.PullVaultResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.PullVaultResponseMessage} PullVaultResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PullVaultResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PullVaultResponseMessage;
    })();

    agentInterface.DestroyVaultRequestMessage = (function() {

        /**
         * Properties of a DestroyVaultRequestMessage.
         * @memberof agentInterface
         * @interface IDestroyVaultRequestMessage
         * @property {string|null} [vaultName] DestroyVaultRequestMessage vaultName
         */

        /**
         * Constructs a new DestroyVaultRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a DestroyVaultRequestMessage.
         * @implements IDestroyVaultRequestMessage
         * @constructor
         * @param {agentInterface.IDestroyVaultRequestMessage=} [p] Properties to set
         */
        function DestroyVaultRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * DestroyVaultRequestMessage vaultName.
         * @member {string} vaultName
         * @memberof agentInterface.DestroyVaultRequestMessage
         * @instance
         */
        DestroyVaultRequestMessage.prototype.vaultName = "";

        /**
         * Creates a new DestroyVaultRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.DestroyVaultRequestMessage
         * @static
         * @param {agentInterface.IDestroyVaultRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.DestroyVaultRequestMessage} DestroyVaultRequestMessage instance
         */
        DestroyVaultRequestMessage.create = function create(properties) {
            return new DestroyVaultRequestMessage(properties);
        };

        /**
         * Encodes the specified DestroyVaultRequestMessage message. Does not implicitly {@link agentInterface.DestroyVaultRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.DestroyVaultRequestMessage
         * @static
         * @param {agentInterface.IDestroyVaultRequestMessage} m DestroyVaultRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DestroyVaultRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultName != null && Object.hasOwnProperty.call(m, "vaultName"))
                w.uint32(10).string(m.vaultName);
            return w;
        };

        /**
         * Encodes the specified DestroyVaultRequestMessage message, length delimited. Does not implicitly {@link agentInterface.DestroyVaultRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.DestroyVaultRequestMessage
         * @static
         * @param {agentInterface.IDestroyVaultRequestMessage} message DestroyVaultRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DestroyVaultRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DestroyVaultRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.DestroyVaultRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.DestroyVaultRequestMessage} DestroyVaultRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DestroyVaultRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.DestroyVaultRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.vaultName = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a DestroyVaultRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.DestroyVaultRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.DestroyVaultRequestMessage} DestroyVaultRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DestroyVaultRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return DestroyVaultRequestMessage;
    })();

    agentInterface.DestroyVaultResponseMessage = (function() {

        /**
         * Properties of a DestroyVaultResponseMessage.
         * @memberof agentInterface
         * @interface IDestroyVaultResponseMessage
         * @property {boolean|null} [successful] DestroyVaultResponseMessage successful
         */

        /**
         * Constructs a new DestroyVaultResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a DestroyVaultResponseMessage.
         * @implements IDestroyVaultResponseMessage
         * @constructor
         * @param {agentInterface.IDestroyVaultResponseMessage=} [p] Properties to set
         */
        function DestroyVaultResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * DestroyVaultResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.DestroyVaultResponseMessage
         * @instance
         */
        DestroyVaultResponseMessage.prototype.successful = false;

        /**
         * Creates a new DestroyVaultResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.DestroyVaultResponseMessage
         * @static
         * @param {agentInterface.IDestroyVaultResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.DestroyVaultResponseMessage} DestroyVaultResponseMessage instance
         */
        DestroyVaultResponseMessage.create = function create(properties) {
            return new DestroyVaultResponseMessage(properties);
        };

        /**
         * Encodes the specified DestroyVaultResponseMessage message. Does not implicitly {@link agentInterface.DestroyVaultResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.DestroyVaultResponseMessage
         * @static
         * @param {agentInterface.IDestroyVaultResponseMessage} m DestroyVaultResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DestroyVaultResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified DestroyVaultResponseMessage message, length delimited. Does not implicitly {@link agentInterface.DestroyVaultResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.DestroyVaultResponseMessage
         * @static
         * @param {agentInterface.IDestroyVaultResponseMessage} message DestroyVaultResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DestroyVaultResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DestroyVaultResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.DestroyVaultResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.DestroyVaultResponseMessage} DestroyVaultResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DestroyVaultResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.DestroyVaultResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a DestroyVaultResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.DestroyVaultResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.DestroyVaultResponseMessage} DestroyVaultResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DestroyVaultResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return DestroyVaultResponseMessage;
    })();

    agentInterface.ListSecretsRequestMessage = (function() {

        /**
         * Properties of a ListSecretsRequestMessage.
         * @memberof agentInterface
         * @interface IListSecretsRequestMessage
         * @property {string|null} [vaultName] ListSecretsRequestMessage vaultName
         */

        /**
         * Constructs a new ListSecretsRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a ListSecretsRequestMessage.
         * @implements IListSecretsRequestMessage
         * @constructor
         * @param {agentInterface.IListSecretsRequestMessage=} [p] Properties to set
         */
        function ListSecretsRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * ListSecretsRequestMessage vaultName.
         * @member {string} vaultName
         * @memberof agentInterface.ListSecretsRequestMessage
         * @instance
         */
        ListSecretsRequestMessage.prototype.vaultName = "";

        /**
         * Creates a new ListSecretsRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.ListSecretsRequestMessage
         * @static
         * @param {agentInterface.IListSecretsRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.ListSecretsRequestMessage} ListSecretsRequestMessage instance
         */
        ListSecretsRequestMessage.create = function create(properties) {
            return new ListSecretsRequestMessage(properties);
        };

        /**
         * Encodes the specified ListSecretsRequestMessage message. Does not implicitly {@link agentInterface.ListSecretsRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.ListSecretsRequestMessage
         * @static
         * @param {agentInterface.IListSecretsRequestMessage} m ListSecretsRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListSecretsRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultName != null && Object.hasOwnProperty.call(m, "vaultName"))
                w.uint32(10).string(m.vaultName);
            return w;
        };

        /**
         * Encodes the specified ListSecretsRequestMessage message, length delimited. Does not implicitly {@link agentInterface.ListSecretsRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.ListSecretsRequestMessage
         * @static
         * @param {agentInterface.IListSecretsRequestMessage} message ListSecretsRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListSecretsRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ListSecretsRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.ListSecretsRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.ListSecretsRequestMessage} ListSecretsRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListSecretsRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.ListSecretsRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.vaultName = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a ListSecretsRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.ListSecretsRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.ListSecretsRequestMessage} ListSecretsRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListSecretsRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ListSecretsRequestMessage;
    })();

    agentInterface.ListSecretsResponseMessage = (function() {

        /**
         * Properties of a ListSecretsResponseMessage.
         * @memberof agentInterface
         * @interface IListSecretsResponseMessage
         * @property {Array.<string>|null} [secretNames] ListSecretsResponseMessage secretNames
         */

        /**
         * Constructs a new ListSecretsResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a ListSecretsResponseMessage.
         * @implements IListSecretsResponseMessage
         * @constructor
         * @param {agentInterface.IListSecretsResponseMessage=} [p] Properties to set
         */
        function ListSecretsResponseMessage(p) {
            this.secretNames = [];
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * ListSecretsResponseMessage secretNames.
         * @member {Array.<string>} secretNames
         * @memberof agentInterface.ListSecretsResponseMessage
         * @instance
         */
        ListSecretsResponseMessage.prototype.secretNames = $util.emptyArray;

        /**
         * Creates a new ListSecretsResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.ListSecretsResponseMessage
         * @static
         * @param {agentInterface.IListSecretsResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.ListSecretsResponseMessage} ListSecretsResponseMessage instance
         */
        ListSecretsResponseMessage.create = function create(properties) {
            return new ListSecretsResponseMessage(properties);
        };

        /**
         * Encodes the specified ListSecretsResponseMessage message. Does not implicitly {@link agentInterface.ListSecretsResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.ListSecretsResponseMessage
         * @static
         * @param {agentInterface.IListSecretsResponseMessage} m ListSecretsResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListSecretsResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.secretNames != null && m.secretNames.length) {
                for (var i = 0; i < m.secretNames.length; ++i)
                    w.uint32(10).string(m.secretNames[i]);
            }
            return w;
        };

        /**
         * Encodes the specified ListSecretsResponseMessage message, length delimited. Does not implicitly {@link agentInterface.ListSecretsResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.ListSecretsResponseMessage
         * @static
         * @param {agentInterface.IListSecretsResponseMessage} message ListSecretsResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListSecretsResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ListSecretsResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.ListSecretsResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.ListSecretsResponseMessage} ListSecretsResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListSecretsResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.ListSecretsResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    if (!(m.secretNames && m.secretNames.length))
                        m.secretNames = [];
                    m.secretNames.push(r.string());
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a ListSecretsResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.ListSecretsResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.ListSecretsResponseMessage} ListSecretsResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListSecretsResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ListSecretsResponseMessage;
    })();

    agentInterface.CreateSecretRequestMessage = (function() {

        /**
         * Properties of a CreateSecretRequestMessage.
         * @memberof agentInterface
         * @interface ICreateSecretRequestMessage
         * @property {string|null} [vaultName] CreateSecretRequestMessage vaultName
         * @property {string|null} [secretName] CreateSecretRequestMessage secretName
         * @property {string|null} [secretPath] CreateSecretRequestMessage secretPath
         * @property {Uint8Array|null} [secretContent] CreateSecretRequestMessage secretContent
         */

        /**
         * Constructs a new CreateSecretRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a CreateSecretRequestMessage.
         * @implements ICreateSecretRequestMessage
         * @constructor
         * @param {agentInterface.ICreateSecretRequestMessage=} [p] Properties to set
         */
        function CreateSecretRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * CreateSecretRequestMessage vaultName.
         * @member {string} vaultName
         * @memberof agentInterface.CreateSecretRequestMessage
         * @instance
         */
        CreateSecretRequestMessage.prototype.vaultName = "";

        /**
         * CreateSecretRequestMessage secretName.
         * @member {string} secretName
         * @memberof agentInterface.CreateSecretRequestMessage
         * @instance
         */
        CreateSecretRequestMessage.prototype.secretName = "";

        /**
         * CreateSecretRequestMessage secretPath.
         * @member {string} secretPath
         * @memberof agentInterface.CreateSecretRequestMessage
         * @instance
         */
        CreateSecretRequestMessage.prototype.secretPath = "";

        /**
         * CreateSecretRequestMessage secretContent.
         * @member {Uint8Array} secretContent
         * @memberof agentInterface.CreateSecretRequestMessage
         * @instance
         */
        CreateSecretRequestMessage.prototype.secretContent = $util.newBuffer([]);

        /**
         * Creates a new CreateSecretRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.CreateSecretRequestMessage
         * @static
         * @param {agentInterface.ICreateSecretRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.CreateSecretRequestMessage} CreateSecretRequestMessage instance
         */
        CreateSecretRequestMessage.create = function create(properties) {
            return new CreateSecretRequestMessage(properties);
        };

        /**
         * Encodes the specified CreateSecretRequestMessage message. Does not implicitly {@link agentInterface.CreateSecretRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.CreateSecretRequestMessage
         * @static
         * @param {agentInterface.ICreateSecretRequestMessage} m CreateSecretRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CreateSecretRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultName != null && Object.hasOwnProperty.call(m, "vaultName"))
                w.uint32(10).string(m.vaultName);
            if (m.secretName != null && Object.hasOwnProperty.call(m, "secretName"))
                w.uint32(18).string(m.secretName);
            if (m.secretPath != null && Object.hasOwnProperty.call(m, "secretPath"))
                w.uint32(26).string(m.secretPath);
            if (m.secretContent != null && Object.hasOwnProperty.call(m, "secretContent"))
                w.uint32(34).bytes(m.secretContent);
            return w;
        };

        /**
         * Encodes the specified CreateSecretRequestMessage message, length delimited. Does not implicitly {@link agentInterface.CreateSecretRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.CreateSecretRequestMessage
         * @static
         * @param {agentInterface.ICreateSecretRequestMessage} message CreateSecretRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CreateSecretRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a CreateSecretRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.CreateSecretRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.CreateSecretRequestMessage} CreateSecretRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CreateSecretRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.CreateSecretRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.vaultName = r.string();
                    break;
                case 2:
                    m.secretName = r.string();
                    break;
                case 3:
                    m.secretPath = r.string();
                    break;
                case 4:
                    m.secretContent = r.bytes();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a CreateSecretRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.CreateSecretRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.CreateSecretRequestMessage} CreateSecretRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CreateSecretRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return CreateSecretRequestMessage;
    })();

    agentInterface.CreateSecretResponseMessage = (function() {

        /**
         * Properties of a CreateSecretResponseMessage.
         * @memberof agentInterface
         * @interface ICreateSecretResponseMessage
         * @property {boolean|null} [successful] CreateSecretResponseMessage successful
         */

        /**
         * Constructs a new CreateSecretResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a CreateSecretResponseMessage.
         * @implements ICreateSecretResponseMessage
         * @constructor
         * @param {agentInterface.ICreateSecretResponseMessage=} [p] Properties to set
         */
        function CreateSecretResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * CreateSecretResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.CreateSecretResponseMessage
         * @instance
         */
        CreateSecretResponseMessage.prototype.successful = false;

        /**
         * Creates a new CreateSecretResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.CreateSecretResponseMessage
         * @static
         * @param {agentInterface.ICreateSecretResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.CreateSecretResponseMessage} CreateSecretResponseMessage instance
         */
        CreateSecretResponseMessage.create = function create(properties) {
            return new CreateSecretResponseMessage(properties);
        };

        /**
         * Encodes the specified CreateSecretResponseMessage message. Does not implicitly {@link agentInterface.CreateSecretResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.CreateSecretResponseMessage
         * @static
         * @param {agentInterface.ICreateSecretResponseMessage} m CreateSecretResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CreateSecretResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified CreateSecretResponseMessage message, length delimited. Does not implicitly {@link agentInterface.CreateSecretResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.CreateSecretResponseMessage
         * @static
         * @param {agentInterface.ICreateSecretResponseMessage} message CreateSecretResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CreateSecretResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a CreateSecretResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.CreateSecretResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.CreateSecretResponseMessage} CreateSecretResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CreateSecretResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.CreateSecretResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a CreateSecretResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.CreateSecretResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.CreateSecretResponseMessage} CreateSecretResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CreateSecretResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return CreateSecretResponseMessage;
    })();

    agentInterface.DestroySecretRequestMessage = (function() {

        /**
         * Properties of a DestroySecretRequestMessage.
         * @memberof agentInterface
         * @interface IDestroySecretRequestMessage
         * @property {string|null} [vaultName] DestroySecretRequestMessage vaultName
         * @property {string|null} [secretName] DestroySecretRequestMessage secretName
         */

        /**
         * Constructs a new DestroySecretRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a DestroySecretRequestMessage.
         * @implements IDestroySecretRequestMessage
         * @constructor
         * @param {agentInterface.IDestroySecretRequestMessage=} [p] Properties to set
         */
        function DestroySecretRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * DestroySecretRequestMessage vaultName.
         * @member {string} vaultName
         * @memberof agentInterface.DestroySecretRequestMessage
         * @instance
         */
        DestroySecretRequestMessage.prototype.vaultName = "";

        /**
         * DestroySecretRequestMessage secretName.
         * @member {string} secretName
         * @memberof agentInterface.DestroySecretRequestMessage
         * @instance
         */
        DestroySecretRequestMessage.prototype.secretName = "";

        /**
         * Creates a new DestroySecretRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.DestroySecretRequestMessage
         * @static
         * @param {agentInterface.IDestroySecretRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.DestroySecretRequestMessage} DestroySecretRequestMessage instance
         */
        DestroySecretRequestMessage.create = function create(properties) {
            return new DestroySecretRequestMessage(properties);
        };

        /**
         * Encodes the specified DestroySecretRequestMessage message. Does not implicitly {@link agentInterface.DestroySecretRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.DestroySecretRequestMessage
         * @static
         * @param {agentInterface.IDestroySecretRequestMessage} m DestroySecretRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DestroySecretRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultName != null && Object.hasOwnProperty.call(m, "vaultName"))
                w.uint32(10).string(m.vaultName);
            if (m.secretName != null && Object.hasOwnProperty.call(m, "secretName"))
                w.uint32(18).string(m.secretName);
            return w;
        };

        /**
         * Encodes the specified DestroySecretRequestMessage message, length delimited. Does not implicitly {@link agentInterface.DestroySecretRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.DestroySecretRequestMessage
         * @static
         * @param {agentInterface.IDestroySecretRequestMessage} message DestroySecretRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DestroySecretRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DestroySecretRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.DestroySecretRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.DestroySecretRequestMessage} DestroySecretRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DestroySecretRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.DestroySecretRequestMessage();
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
         * Decodes a DestroySecretRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.DestroySecretRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.DestroySecretRequestMessage} DestroySecretRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DestroySecretRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return DestroySecretRequestMessage;
    })();

    agentInterface.DestroySecretResponseMessage = (function() {

        /**
         * Properties of a DestroySecretResponseMessage.
         * @memberof agentInterface
         * @interface IDestroySecretResponseMessage
         * @property {boolean|null} [successful] DestroySecretResponseMessage successful
         */

        /**
         * Constructs a new DestroySecretResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a DestroySecretResponseMessage.
         * @implements IDestroySecretResponseMessage
         * @constructor
         * @param {agentInterface.IDestroySecretResponseMessage=} [p] Properties to set
         */
        function DestroySecretResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * DestroySecretResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.DestroySecretResponseMessage
         * @instance
         */
        DestroySecretResponseMessage.prototype.successful = false;

        /**
         * Creates a new DestroySecretResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.DestroySecretResponseMessage
         * @static
         * @param {agentInterface.IDestroySecretResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.DestroySecretResponseMessage} DestroySecretResponseMessage instance
         */
        DestroySecretResponseMessage.create = function create(properties) {
            return new DestroySecretResponseMessage(properties);
        };

        /**
         * Encodes the specified DestroySecretResponseMessage message. Does not implicitly {@link agentInterface.DestroySecretResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.DestroySecretResponseMessage
         * @static
         * @param {agentInterface.IDestroySecretResponseMessage} m DestroySecretResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DestroySecretResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified DestroySecretResponseMessage message, length delimited. Does not implicitly {@link agentInterface.DestroySecretResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.DestroySecretResponseMessage
         * @static
         * @param {agentInterface.IDestroySecretResponseMessage} message DestroySecretResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DestroySecretResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DestroySecretResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.DestroySecretResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.DestroySecretResponseMessage} DestroySecretResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DestroySecretResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.DestroySecretResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a DestroySecretResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.DestroySecretResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.DestroySecretResponseMessage} DestroySecretResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DestroySecretResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return DestroySecretResponseMessage;
    })();

    agentInterface.GetSecretRequestMessage = (function() {

        /**
         * Properties of a GetSecretRequestMessage.
         * @memberof agentInterface
         * @interface IGetSecretRequestMessage
         * @property {string|null} [vaultName] GetSecretRequestMessage vaultName
         * @property {string|null} [secretName] GetSecretRequestMessage secretName
         */

        /**
         * Constructs a new GetSecretRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a GetSecretRequestMessage.
         * @implements IGetSecretRequestMessage
         * @constructor
         * @param {agentInterface.IGetSecretRequestMessage=} [p] Properties to set
         */
        function GetSecretRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * GetSecretRequestMessage vaultName.
         * @member {string} vaultName
         * @memberof agentInterface.GetSecretRequestMessage
         * @instance
         */
        GetSecretRequestMessage.prototype.vaultName = "";

        /**
         * GetSecretRequestMessage secretName.
         * @member {string} secretName
         * @memberof agentInterface.GetSecretRequestMessage
         * @instance
         */
        GetSecretRequestMessage.prototype.secretName = "";

        /**
         * Creates a new GetSecretRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.GetSecretRequestMessage
         * @static
         * @param {agentInterface.IGetSecretRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.GetSecretRequestMessage} GetSecretRequestMessage instance
         */
        GetSecretRequestMessage.create = function create(properties) {
            return new GetSecretRequestMessage(properties);
        };

        /**
         * Encodes the specified GetSecretRequestMessage message. Does not implicitly {@link agentInterface.GetSecretRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.GetSecretRequestMessage
         * @static
         * @param {agentInterface.IGetSecretRequestMessage} m GetSecretRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetSecretRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultName != null && Object.hasOwnProperty.call(m, "vaultName"))
                w.uint32(10).string(m.vaultName);
            if (m.secretName != null && Object.hasOwnProperty.call(m, "secretName"))
                w.uint32(18).string(m.secretName);
            return w;
        };

        /**
         * Encodes the specified GetSecretRequestMessage message, length delimited. Does not implicitly {@link agentInterface.GetSecretRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.GetSecretRequestMessage
         * @static
         * @param {agentInterface.IGetSecretRequestMessage} message GetSecretRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetSecretRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetSecretRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.GetSecretRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.GetSecretRequestMessage} GetSecretRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetSecretRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.GetSecretRequestMessage();
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
         * Decodes a GetSecretRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.GetSecretRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.GetSecretRequestMessage} GetSecretRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetSecretRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return GetSecretRequestMessage;
    })();

    agentInterface.GetSecretResponseMessage = (function() {

        /**
         * Properties of a GetSecretResponseMessage.
         * @memberof agentInterface
         * @interface IGetSecretResponseMessage
         * @property {Uint8Array|null} [secret] GetSecretResponseMessage secret
         */

        /**
         * Constructs a new GetSecretResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a GetSecretResponseMessage.
         * @implements IGetSecretResponseMessage
         * @constructor
         * @param {agentInterface.IGetSecretResponseMessage=} [p] Properties to set
         */
        function GetSecretResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * GetSecretResponseMessage secret.
         * @member {Uint8Array} secret
         * @memberof agentInterface.GetSecretResponseMessage
         * @instance
         */
        GetSecretResponseMessage.prototype.secret = $util.newBuffer([]);

        /**
         * Creates a new GetSecretResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.GetSecretResponseMessage
         * @static
         * @param {agentInterface.IGetSecretResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.GetSecretResponseMessage} GetSecretResponseMessage instance
         */
        GetSecretResponseMessage.create = function create(properties) {
            return new GetSecretResponseMessage(properties);
        };

        /**
         * Encodes the specified GetSecretResponseMessage message. Does not implicitly {@link agentInterface.GetSecretResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.GetSecretResponseMessage
         * @static
         * @param {agentInterface.IGetSecretResponseMessage} m GetSecretResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetSecretResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.secret != null && Object.hasOwnProperty.call(m, "secret"))
                w.uint32(10).bytes(m.secret);
            return w;
        };

        /**
         * Encodes the specified GetSecretResponseMessage message, length delimited. Does not implicitly {@link agentInterface.GetSecretResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.GetSecretResponseMessage
         * @static
         * @param {agentInterface.IGetSecretResponseMessage} message GetSecretResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetSecretResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetSecretResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.GetSecretResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.GetSecretResponseMessage} GetSecretResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetSecretResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.GetSecretResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.secret = r.bytes();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a GetSecretResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.GetSecretResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.GetSecretResponseMessage} GetSecretResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetSecretResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return GetSecretResponseMessage;
    })();

    agentInterface.DeriveKeyRequestMessage = (function() {

        /**
         * Properties of a DeriveKeyRequestMessage.
         * @memberof agentInterface
         * @interface IDeriveKeyRequestMessage
         * @property {string|null} [vaultName] DeriveKeyRequestMessage vaultName
         * @property {string|null} [keyName] DeriveKeyRequestMessage keyName
         * @property {string|null} [passphrase] DeriveKeyRequestMessage passphrase
         */

        /**
         * Constructs a new DeriveKeyRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a DeriveKeyRequestMessage.
         * @implements IDeriveKeyRequestMessage
         * @constructor
         * @param {agentInterface.IDeriveKeyRequestMessage=} [p] Properties to set
         */
        function DeriveKeyRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * DeriveKeyRequestMessage vaultName.
         * @member {string} vaultName
         * @memberof agentInterface.DeriveKeyRequestMessage
         * @instance
         */
        DeriveKeyRequestMessage.prototype.vaultName = "";

        /**
         * DeriveKeyRequestMessage keyName.
         * @member {string} keyName
         * @memberof agentInterface.DeriveKeyRequestMessage
         * @instance
         */
        DeriveKeyRequestMessage.prototype.keyName = "";

        /**
         * DeriveKeyRequestMessage passphrase.
         * @member {string} passphrase
         * @memberof agentInterface.DeriveKeyRequestMessage
         * @instance
         */
        DeriveKeyRequestMessage.prototype.passphrase = "";

        /**
         * Creates a new DeriveKeyRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.DeriveKeyRequestMessage
         * @static
         * @param {agentInterface.IDeriveKeyRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.DeriveKeyRequestMessage} DeriveKeyRequestMessage instance
         */
        DeriveKeyRequestMessage.create = function create(properties) {
            return new DeriveKeyRequestMessage(properties);
        };

        /**
         * Encodes the specified DeriveKeyRequestMessage message. Does not implicitly {@link agentInterface.DeriveKeyRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.DeriveKeyRequestMessage
         * @static
         * @param {agentInterface.IDeriveKeyRequestMessage} m DeriveKeyRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DeriveKeyRequestMessage.encode = function encode(m, w) {
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
         * Encodes the specified DeriveKeyRequestMessage message, length delimited. Does not implicitly {@link agentInterface.DeriveKeyRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.DeriveKeyRequestMessage
         * @static
         * @param {agentInterface.IDeriveKeyRequestMessage} message DeriveKeyRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DeriveKeyRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DeriveKeyRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.DeriveKeyRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.DeriveKeyRequestMessage} DeriveKeyRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeriveKeyRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.DeriveKeyRequestMessage();
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
         * Decodes a DeriveKeyRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.DeriveKeyRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.DeriveKeyRequestMessage} DeriveKeyRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeriveKeyRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return DeriveKeyRequestMessage;
    })();

    agentInterface.DeriveKeyResponseMessage = (function() {

        /**
         * Properties of a DeriveKeyResponseMessage.
         * @memberof agentInterface
         * @interface IDeriveKeyResponseMessage
         * @property {boolean|null} [successful] DeriveKeyResponseMessage successful
         */

        /**
         * Constructs a new DeriveKeyResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a DeriveKeyResponseMessage.
         * @implements IDeriveKeyResponseMessage
         * @constructor
         * @param {agentInterface.IDeriveKeyResponseMessage=} [p] Properties to set
         */
        function DeriveKeyResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * DeriveKeyResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.DeriveKeyResponseMessage
         * @instance
         */
        DeriveKeyResponseMessage.prototype.successful = false;

        /**
         * Creates a new DeriveKeyResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.DeriveKeyResponseMessage
         * @static
         * @param {agentInterface.IDeriveKeyResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.DeriveKeyResponseMessage} DeriveKeyResponseMessage instance
         */
        DeriveKeyResponseMessage.create = function create(properties) {
            return new DeriveKeyResponseMessage(properties);
        };

        /**
         * Encodes the specified DeriveKeyResponseMessage message. Does not implicitly {@link agentInterface.DeriveKeyResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.DeriveKeyResponseMessage
         * @static
         * @param {agentInterface.IDeriveKeyResponseMessage} m DeriveKeyResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DeriveKeyResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified DeriveKeyResponseMessage message, length delimited. Does not implicitly {@link agentInterface.DeriveKeyResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.DeriveKeyResponseMessage
         * @static
         * @param {agentInterface.IDeriveKeyResponseMessage} message DeriveKeyResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DeriveKeyResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DeriveKeyResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.DeriveKeyResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.DeriveKeyResponseMessage} DeriveKeyResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeriveKeyResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.DeriveKeyResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a DeriveKeyResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.DeriveKeyResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.DeriveKeyResponseMessage} DeriveKeyResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeriveKeyResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return DeriveKeyResponseMessage;
    })();

    agentInterface.ListKeysRequestMessage = (function() {

        /**
         * Properties of a ListKeysRequestMessage.
         * @memberof agentInterface
         * @interface IListKeysRequestMessage
         */

        /**
         * Constructs a new ListKeysRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a ListKeysRequestMessage.
         * @implements IListKeysRequestMessage
         * @constructor
         * @param {agentInterface.IListKeysRequestMessage=} [p] Properties to set
         */
        function ListKeysRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * Creates a new ListKeysRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.ListKeysRequestMessage
         * @static
         * @param {agentInterface.IListKeysRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.ListKeysRequestMessage} ListKeysRequestMessage instance
         */
        ListKeysRequestMessage.create = function create(properties) {
            return new ListKeysRequestMessage(properties);
        };

        /**
         * Encodes the specified ListKeysRequestMessage message. Does not implicitly {@link agentInterface.ListKeysRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.ListKeysRequestMessage
         * @static
         * @param {agentInterface.IListKeysRequestMessage} m ListKeysRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListKeysRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            return w;
        };

        /**
         * Encodes the specified ListKeysRequestMessage message, length delimited. Does not implicitly {@link agentInterface.ListKeysRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.ListKeysRequestMessage
         * @static
         * @param {agentInterface.IListKeysRequestMessage} message ListKeysRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListKeysRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ListKeysRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.ListKeysRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.ListKeysRequestMessage} ListKeysRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListKeysRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.ListKeysRequestMessage();
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
         * Decodes a ListKeysRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.ListKeysRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.ListKeysRequestMessage} ListKeysRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListKeysRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ListKeysRequestMessage;
    })();

    agentInterface.ListKeysResponseMessage = (function() {

        /**
         * Properties of a ListKeysResponseMessage.
         * @memberof agentInterface
         * @interface IListKeysResponseMessage
         * @property {Array.<string>|null} [keyNames] ListKeysResponseMessage keyNames
         */

        /**
         * Constructs a new ListKeysResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a ListKeysResponseMessage.
         * @implements IListKeysResponseMessage
         * @constructor
         * @param {agentInterface.IListKeysResponseMessage=} [p] Properties to set
         */
        function ListKeysResponseMessage(p) {
            this.keyNames = [];
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * ListKeysResponseMessage keyNames.
         * @member {Array.<string>} keyNames
         * @memberof agentInterface.ListKeysResponseMessage
         * @instance
         */
        ListKeysResponseMessage.prototype.keyNames = $util.emptyArray;

        /**
         * Creates a new ListKeysResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.ListKeysResponseMessage
         * @static
         * @param {agentInterface.IListKeysResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.ListKeysResponseMessage} ListKeysResponseMessage instance
         */
        ListKeysResponseMessage.create = function create(properties) {
            return new ListKeysResponseMessage(properties);
        };

        /**
         * Encodes the specified ListKeysResponseMessage message. Does not implicitly {@link agentInterface.ListKeysResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.ListKeysResponseMessage
         * @static
         * @param {agentInterface.IListKeysResponseMessage} m ListKeysResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListKeysResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.keyNames != null && m.keyNames.length) {
                for (var i = 0; i < m.keyNames.length; ++i)
                    w.uint32(10).string(m.keyNames[i]);
            }
            return w;
        };

        /**
         * Encodes the specified ListKeysResponseMessage message, length delimited. Does not implicitly {@link agentInterface.ListKeysResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.ListKeysResponseMessage
         * @static
         * @param {agentInterface.IListKeysResponseMessage} message ListKeysResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListKeysResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ListKeysResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.ListKeysResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.ListKeysResponseMessage} ListKeysResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListKeysResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.ListKeysResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    if (!(m.keyNames && m.keyNames.length))
                        m.keyNames = [];
                    m.keyNames.push(r.string());
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a ListKeysResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.ListKeysResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.ListKeysResponseMessage} ListKeysResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListKeysResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ListKeysResponseMessage;
    })();

    agentInterface.GetKeyRequestMessage = (function() {

        /**
         * Properties of a GetKeyRequestMessage.
         * @memberof agentInterface
         * @interface IGetKeyRequestMessage
         * @property {string|null} [keyName] GetKeyRequestMessage keyName
         */

        /**
         * Constructs a new GetKeyRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a GetKeyRequestMessage.
         * @implements IGetKeyRequestMessage
         * @constructor
         * @param {agentInterface.IGetKeyRequestMessage=} [p] Properties to set
         */
        function GetKeyRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * GetKeyRequestMessage keyName.
         * @member {string} keyName
         * @memberof agentInterface.GetKeyRequestMessage
         * @instance
         */
        GetKeyRequestMessage.prototype.keyName = "";

        /**
         * Creates a new GetKeyRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.GetKeyRequestMessage
         * @static
         * @param {agentInterface.IGetKeyRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.GetKeyRequestMessage} GetKeyRequestMessage instance
         */
        GetKeyRequestMessage.create = function create(properties) {
            return new GetKeyRequestMessage(properties);
        };

        /**
         * Encodes the specified GetKeyRequestMessage message. Does not implicitly {@link agentInterface.GetKeyRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.GetKeyRequestMessage
         * @static
         * @param {agentInterface.IGetKeyRequestMessage} m GetKeyRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetKeyRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.keyName != null && Object.hasOwnProperty.call(m, "keyName"))
                w.uint32(10).string(m.keyName);
            return w;
        };

        /**
         * Encodes the specified GetKeyRequestMessage message, length delimited. Does not implicitly {@link agentInterface.GetKeyRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.GetKeyRequestMessage
         * @static
         * @param {agentInterface.IGetKeyRequestMessage} message GetKeyRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetKeyRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetKeyRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.GetKeyRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.GetKeyRequestMessage} GetKeyRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetKeyRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.GetKeyRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.keyName = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a GetKeyRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.GetKeyRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.GetKeyRequestMessage} GetKeyRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetKeyRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return GetKeyRequestMessage;
    })();

    agentInterface.GetKeyResponseMessage = (function() {

        /**
         * Properties of a GetKeyResponseMessage.
         * @memberof agentInterface
         * @interface IGetKeyResponseMessage
         * @property {string|null} [keyName] GetKeyResponseMessage keyName
         * @property {string|null} [keyContent] GetKeyResponseMessage keyContent
         */

        /**
         * Constructs a new GetKeyResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a GetKeyResponseMessage.
         * @implements IGetKeyResponseMessage
         * @constructor
         * @param {agentInterface.IGetKeyResponseMessage=} [p] Properties to set
         */
        function GetKeyResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * GetKeyResponseMessage keyName.
         * @member {string} keyName
         * @memberof agentInterface.GetKeyResponseMessage
         * @instance
         */
        GetKeyResponseMessage.prototype.keyName = "";

        /**
         * GetKeyResponseMessage keyContent.
         * @member {string} keyContent
         * @memberof agentInterface.GetKeyResponseMessage
         * @instance
         */
        GetKeyResponseMessage.prototype.keyContent = "";

        /**
         * Creates a new GetKeyResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.GetKeyResponseMessage
         * @static
         * @param {agentInterface.IGetKeyResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.GetKeyResponseMessage} GetKeyResponseMessage instance
         */
        GetKeyResponseMessage.create = function create(properties) {
            return new GetKeyResponseMessage(properties);
        };

        /**
         * Encodes the specified GetKeyResponseMessage message. Does not implicitly {@link agentInterface.GetKeyResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.GetKeyResponseMessage
         * @static
         * @param {agentInterface.IGetKeyResponseMessage} m GetKeyResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetKeyResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.keyName != null && Object.hasOwnProperty.call(m, "keyName"))
                w.uint32(10).string(m.keyName);
            if (m.keyContent != null && Object.hasOwnProperty.call(m, "keyContent"))
                w.uint32(18).string(m.keyContent);
            return w;
        };

        /**
         * Encodes the specified GetKeyResponseMessage message, length delimited. Does not implicitly {@link agentInterface.GetKeyResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.GetKeyResponseMessage
         * @static
         * @param {agentInterface.IGetKeyResponseMessage} message GetKeyResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetKeyResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetKeyResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.GetKeyResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.GetKeyResponseMessage} GetKeyResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetKeyResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.GetKeyResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.keyName = r.string();
                    break;
                case 2:
                    m.keyContent = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a GetKeyResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.GetKeyResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.GetKeyResponseMessage} GetKeyResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetKeyResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return GetKeyResponseMessage;
    })();

    agentInterface.GetPrimaryKeyPairRequestMessage = (function() {

        /**
         * Properties of a GetPrimaryKeyPairRequestMessage.
         * @memberof agentInterface
         * @interface IGetPrimaryKeyPairRequestMessage
         * @property {boolean|null} [includePrivateKey] GetPrimaryKeyPairRequestMessage includePrivateKey
         */

        /**
         * Constructs a new GetPrimaryKeyPairRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a GetPrimaryKeyPairRequestMessage.
         * @implements IGetPrimaryKeyPairRequestMessage
         * @constructor
         * @param {agentInterface.IGetPrimaryKeyPairRequestMessage=} [p] Properties to set
         */
        function GetPrimaryKeyPairRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * GetPrimaryKeyPairRequestMessage includePrivateKey.
         * @member {boolean} includePrivateKey
         * @memberof agentInterface.GetPrimaryKeyPairRequestMessage
         * @instance
         */
        GetPrimaryKeyPairRequestMessage.prototype.includePrivateKey = false;

        /**
         * Creates a new GetPrimaryKeyPairRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.GetPrimaryKeyPairRequestMessage
         * @static
         * @param {agentInterface.IGetPrimaryKeyPairRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.GetPrimaryKeyPairRequestMessage} GetPrimaryKeyPairRequestMessage instance
         */
        GetPrimaryKeyPairRequestMessage.create = function create(properties) {
            return new GetPrimaryKeyPairRequestMessage(properties);
        };

        /**
         * Encodes the specified GetPrimaryKeyPairRequestMessage message. Does not implicitly {@link agentInterface.GetPrimaryKeyPairRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.GetPrimaryKeyPairRequestMessage
         * @static
         * @param {agentInterface.IGetPrimaryKeyPairRequestMessage} m GetPrimaryKeyPairRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetPrimaryKeyPairRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.includePrivateKey != null && Object.hasOwnProperty.call(m, "includePrivateKey"))
                w.uint32(8).bool(m.includePrivateKey);
            return w;
        };

        /**
         * Encodes the specified GetPrimaryKeyPairRequestMessage message, length delimited. Does not implicitly {@link agentInterface.GetPrimaryKeyPairRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.GetPrimaryKeyPairRequestMessage
         * @static
         * @param {agentInterface.IGetPrimaryKeyPairRequestMessage} message GetPrimaryKeyPairRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetPrimaryKeyPairRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetPrimaryKeyPairRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.GetPrimaryKeyPairRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.GetPrimaryKeyPairRequestMessage} GetPrimaryKeyPairRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetPrimaryKeyPairRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.GetPrimaryKeyPairRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.includePrivateKey = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a GetPrimaryKeyPairRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.GetPrimaryKeyPairRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.GetPrimaryKeyPairRequestMessage} GetPrimaryKeyPairRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetPrimaryKeyPairRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return GetPrimaryKeyPairRequestMessage;
    })();

    agentInterface.GetPrimaryKeyPairResponseMessage = (function() {

        /**
         * Properties of a GetPrimaryKeyPairResponseMessage.
         * @memberof agentInterface
         * @interface IGetPrimaryKeyPairResponseMessage
         * @property {string|null} [publicKey] GetPrimaryKeyPairResponseMessage publicKey
         * @property {string|null} [privateKey] GetPrimaryKeyPairResponseMessage privateKey
         */

        /**
         * Constructs a new GetPrimaryKeyPairResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a GetPrimaryKeyPairResponseMessage.
         * @implements IGetPrimaryKeyPairResponseMessage
         * @constructor
         * @param {agentInterface.IGetPrimaryKeyPairResponseMessage=} [p] Properties to set
         */
        function GetPrimaryKeyPairResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * GetPrimaryKeyPairResponseMessage publicKey.
         * @member {string} publicKey
         * @memberof agentInterface.GetPrimaryKeyPairResponseMessage
         * @instance
         */
        GetPrimaryKeyPairResponseMessage.prototype.publicKey = "";

        /**
         * GetPrimaryKeyPairResponseMessage privateKey.
         * @member {string} privateKey
         * @memberof agentInterface.GetPrimaryKeyPairResponseMessage
         * @instance
         */
        GetPrimaryKeyPairResponseMessage.prototype.privateKey = "";

        /**
         * Creates a new GetPrimaryKeyPairResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.GetPrimaryKeyPairResponseMessage
         * @static
         * @param {agentInterface.IGetPrimaryKeyPairResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.GetPrimaryKeyPairResponseMessage} GetPrimaryKeyPairResponseMessage instance
         */
        GetPrimaryKeyPairResponseMessage.create = function create(properties) {
            return new GetPrimaryKeyPairResponseMessage(properties);
        };

        /**
         * Encodes the specified GetPrimaryKeyPairResponseMessage message. Does not implicitly {@link agentInterface.GetPrimaryKeyPairResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.GetPrimaryKeyPairResponseMessage
         * @static
         * @param {agentInterface.IGetPrimaryKeyPairResponseMessage} m GetPrimaryKeyPairResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetPrimaryKeyPairResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            if (m.privateKey != null && Object.hasOwnProperty.call(m, "privateKey"))
                w.uint32(18).string(m.privateKey);
            return w;
        };

        /**
         * Encodes the specified GetPrimaryKeyPairResponseMessage message, length delimited. Does not implicitly {@link agentInterface.GetPrimaryKeyPairResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.GetPrimaryKeyPairResponseMessage
         * @static
         * @param {agentInterface.IGetPrimaryKeyPairResponseMessage} message GetPrimaryKeyPairResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetPrimaryKeyPairResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetPrimaryKeyPairResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.GetPrimaryKeyPairResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.GetPrimaryKeyPairResponseMessage} GetPrimaryKeyPairResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetPrimaryKeyPairResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.GetPrimaryKeyPairResponseMessage();
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
         * Decodes a GetPrimaryKeyPairResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.GetPrimaryKeyPairResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.GetPrimaryKeyPairResponseMessage} GetPrimaryKeyPairResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetPrimaryKeyPairResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return GetPrimaryKeyPairResponseMessage;
    })();

    agentInterface.UpdateSecretRequestMessage = (function() {

        /**
         * Properties of an UpdateSecretRequestMessage.
         * @memberof agentInterface
         * @interface IUpdateSecretRequestMessage
         * @property {string|null} [vaultName] UpdateSecretRequestMessage vaultName
         * @property {string|null} [secretName] UpdateSecretRequestMessage secretName
         * @property {string|null} [secretPath] UpdateSecretRequestMessage secretPath
         * @property {Uint8Array|null} [secretContent] UpdateSecretRequestMessage secretContent
         */

        /**
         * Constructs a new UpdateSecretRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents an UpdateSecretRequestMessage.
         * @implements IUpdateSecretRequestMessage
         * @constructor
         * @param {agentInterface.IUpdateSecretRequestMessage=} [p] Properties to set
         */
        function UpdateSecretRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * UpdateSecretRequestMessage vaultName.
         * @member {string} vaultName
         * @memberof agentInterface.UpdateSecretRequestMessage
         * @instance
         */
        UpdateSecretRequestMessage.prototype.vaultName = "";

        /**
         * UpdateSecretRequestMessage secretName.
         * @member {string} secretName
         * @memberof agentInterface.UpdateSecretRequestMessage
         * @instance
         */
        UpdateSecretRequestMessage.prototype.secretName = "";

        /**
         * UpdateSecretRequestMessage secretPath.
         * @member {string} secretPath
         * @memberof agentInterface.UpdateSecretRequestMessage
         * @instance
         */
        UpdateSecretRequestMessage.prototype.secretPath = "";

        /**
         * UpdateSecretRequestMessage secretContent.
         * @member {Uint8Array} secretContent
         * @memberof agentInterface.UpdateSecretRequestMessage
         * @instance
         */
        UpdateSecretRequestMessage.prototype.secretContent = $util.newBuffer([]);

        /**
         * Creates a new UpdateSecretRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.UpdateSecretRequestMessage
         * @static
         * @param {agentInterface.IUpdateSecretRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.UpdateSecretRequestMessage} UpdateSecretRequestMessage instance
         */
        UpdateSecretRequestMessage.create = function create(properties) {
            return new UpdateSecretRequestMessage(properties);
        };

        /**
         * Encodes the specified UpdateSecretRequestMessage message. Does not implicitly {@link agentInterface.UpdateSecretRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.UpdateSecretRequestMessage
         * @static
         * @param {agentInterface.IUpdateSecretRequestMessage} m UpdateSecretRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UpdateSecretRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultName != null && Object.hasOwnProperty.call(m, "vaultName"))
                w.uint32(10).string(m.vaultName);
            if (m.secretName != null && Object.hasOwnProperty.call(m, "secretName"))
                w.uint32(18).string(m.secretName);
            if (m.secretPath != null && Object.hasOwnProperty.call(m, "secretPath"))
                w.uint32(26).string(m.secretPath);
            if (m.secretContent != null && Object.hasOwnProperty.call(m, "secretContent"))
                w.uint32(34).bytes(m.secretContent);
            return w;
        };

        /**
         * Encodes the specified UpdateSecretRequestMessage message, length delimited. Does not implicitly {@link agentInterface.UpdateSecretRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.UpdateSecretRequestMessage
         * @static
         * @param {agentInterface.IUpdateSecretRequestMessage} message UpdateSecretRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UpdateSecretRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an UpdateSecretRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.UpdateSecretRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.UpdateSecretRequestMessage} UpdateSecretRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UpdateSecretRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.UpdateSecretRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.vaultName = r.string();
                    break;
                case 2:
                    m.secretName = r.string();
                    break;
                case 3:
                    m.secretPath = r.string();
                    break;
                case 4:
                    m.secretContent = r.bytes();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes an UpdateSecretRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.UpdateSecretRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.UpdateSecretRequestMessage} UpdateSecretRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UpdateSecretRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return UpdateSecretRequestMessage;
    })();

    agentInterface.UpdateSecretResponseMessage = (function() {

        /**
         * Properties of an UpdateSecretResponseMessage.
         * @memberof agentInterface
         * @interface IUpdateSecretResponseMessage
         * @property {boolean|null} [successful] UpdateSecretResponseMessage successful
         */

        /**
         * Constructs a new UpdateSecretResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents an UpdateSecretResponseMessage.
         * @implements IUpdateSecretResponseMessage
         * @constructor
         * @param {agentInterface.IUpdateSecretResponseMessage=} [p] Properties to set
         */
        function UpdateSecretResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * UpdateSecretResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.UpdateSecretResponseMessage
         * @instance
         */
        UpdateSecretResponseMessage.prototype.successful = false;

        /**
         * Creates a new UpdateSecretResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.UpdateSecretResponseMessage
         * @static
         * @param {agentInterface.IUpdateSecretResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.UpdateSecretResponseMessage} UpdateSecretResponseMessage instance
         */
        UpdateSecretResponseMessage.create = function create(properties) {
            return new UpdateSecretResponseMessage(properties);
        };

        /**
         * Encodes the specified UpdateSecretResponseMessage message. Does not implicitly {@link agentInterface.UpdateSecretResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.UpdateSecretResponseMessage
         * @static
         * @param {agentInterface.IUpdateSecretResponseMessage} m UpdateSecretResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UpdateSecretResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified UpdateSecretResponseMessage message, length delimited. Does not implicitly {@link agentInterface.UpdateSecretResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.UpdateSecretResponseMessage
         * @static
         * @param {agentInterface.IUpdateSecretResponseMessage} message UpdateSecretResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UpdateSecretResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an UpdateSecretResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.UpdateSecretResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.UpdateSecretResponseMessage} UpdateSecretResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UpdateSecretResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.UpdateSecretResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes an UpdateSecretResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.UpdateSecretResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.UpdateSecretResponseMessage} UpdateSecretResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UpdateSecretResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return UpdateSecretResponseMessage;
    })();

    agentInterface.DeleteKeyRequestMessage = (function() {

        /**
         * Properties of a DeleteKeyRequestMessage.
         * @memberof agentInterface
         * @interface IDeleteKeyRequestMessage
         * @property {string|null} [keyName] DeleteKeyRequestMessage keyName
         */

        /**
         * Constructs a new DeleteKeyRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a DeleteKeyRequestMessage.
         * @implements IDeleteKeyRequestMessage
         * @constructor
         * @param {agentInterface.IDeleteKeyRequestMessage=} [p] Properties to set
         */
        function DeleteKeyRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * DeleteKeyRequestMessage keyName.
         * @member {string} keyName
         * @memberof agentInterface.DeleteKeyRequestMessage
         * @instance
         */
        DeleteKeyRequestMessage.prototype.keyName = "";

        /**
         * Creates a new DeleteKeyRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.DeleteKeyRequestMessage
         * @static
         * @param {agentInterface.IDeleteKeyRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.DeleteKeyRequestMessage} DeleteKeyRequestMessage instance
         */
        DeleteKeyRequestMessage.create = function create(properties) {
            return new DeleteKeyRequestMessage(properties);
        };

        /**
         * Encodes the specified DeleteKeyRequestMessage message. Does not implicitly {@link agentInterface.DeleteKeyRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.DeleteKeyRequestMessage
         * @static
         * @param {agentInterface.IDeleteKeyRequestMessage} m DeleteKeyRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DeleteKeyRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.keyName != null && Object.hasOwnProperty.call(m, "keyName"))
                w.uint32(10).string(m.keyName);
            return w;
        };

        /**
         * Encodes the specified DeleteKeyRequestMessage message, length delimited. Does not implicitly {@link agentInterface.DeleteKeyRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.DeleteKeyRequestMessage
         * @static
         * @param {agentInterface.IDeleteKeyRequestMessage} message DeleteKeyRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DeleteKeyRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DeleteKeyRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.DeleteKeyRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.DeleteKeyRequestMessage} DeleteKeyRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeleteKeyRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.DeleteKeyRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.keyName = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a DeleteKeyRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.DeleteKeyRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.DeleteKeyRequestMessage} DeleteKeyRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeleteKeyRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return DeleteKeyRequestMessage;
    })();

    agentInterface.DeleteKeyResponseMessage = (function() {

        /**
         * Properties of a DeleteKeyResponseMessage.
         * @memberof agentInterface
         * @interface IDeleteKeyResponseMessage
         * @property {boolean|null} [successful] DeleteKeyResponseMessage successful
         */

        /**
         * Constructs a new DeleteKeyResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a DeleteKeyResponseMessage.
         * @implements IDeleteKeyResponseMessage
         * @constructor
         * @param {agentInterface.IDeleteKeyResponseMessage=} [p] Properties to set
         */
        function DeleteKeyResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * DeleteKeyResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.DeleteKeyResponseMessage
         * @instance
         */
        DeleteKeyResponseMessage.prototype.successful = false;

        /**
         * Creates a new DeleteKeyResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.DeleteKeyResponseMessage
         * @static
         * @param {agentInterface.IDeleteKeyResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.DeleteKeyResponseMessage} DeleteKeyResponseMessage instance
         */
        DeleteKeyResponseMessage.create = function create(properties) {
            return new DeleteKeyResponseMessage(properties);
        };

        /**
         * Encodes the specified DeleteKeyResponseMessage message. Does not implicitly {@link agentInterface.DeleteKeyResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.DeleteKeyResponseMessage
         * @static
         * @param {agentInterface.IDeleteKeyResponseMessage} m DeleteKeyResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DeleteKeyResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified DeleteKeyResponseMessage message, length delimited. Does not implicitly {@link agentInterface.DeleteKeyResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.DeleteKeyResponseMessage
         * @static
         * @param {agentInterface.IDeleteKeyResponseMessage} message DeleteKeyResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DeleteKeyResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DeleteKeyResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.DeleteKeyResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.DeleteKeyResponseMessage} DeleteKeyResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeleteKeyResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.DeleteKeyResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a DeleteKeyResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.DeleteKeyResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.DeleteKeyResponseMessage} DeleteKeyResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeleteKeyResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return DeleteKeyResponseMessage;
    })();

    agentInterface.PeerInfoRequestMessage = (function() {

        /**
         * Properties of a PeerInfoRequestMessage.
         * @memberof agentInterface
         * @interface IPeerInfoRequestMessage
         * @property {boolean|null} [current] PeerInfoRequestMessage current
         * @property {string|null} [publicKey] PeerInfoRequestMessage publicKey
         */

        /**
         * Constructs a new PeerInfoRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a PeerInfoRequestMessage.
         * @implements IPeerInfoRequestMessage
         * @constructor
         * @param {agentInterface.IPeerInfoRequestMessage=} [p] Properties to set
         */
        function PeerInfoRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PeerInfoRequestMessage current.
         * @member {boolean} current
         * @memberof agentInterface.PeerInfoRequestMessage
         * @instance
         */
        PeerInfoRequestMessage.prototype.current = false;

        /**
         * PeerInfoRequestMessage publicKey.
         * @member {string} publicKey
         * @memberof agentInterface.PeerInfoRequestMessage
         * @instance
         */
        PeerInfoRequestMessage.prototype.publicKey = "";

        /**
         * Creates a new PeerInfoRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.PeerInfoRequestMessage
         * @static
         * @param {agentInterface.IPeerInfoRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.PeerInfoRequestMessage} PeerInfoRequestMessage instance
         */
        PeerInfoRequestMessage.create = function create(properties) {
            return new PeerInfoRequestMessage(properties);
        };

        /**
         * Encodes the specified PeerInfoRequestMessage message. Does not implicitly {@link agentInterface.PeerInfoRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.PeerInfoRequestMessage
         * @static
         * @param {agentInterface.IPeerInfoRequestMessage} m PeerInfoRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerInfoRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.current != null && Object.hasOwnProperty.call(m, "current"))
                w.uint32(8).bool(m.current);
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(18).string(m.publicKey);
            return w;
        };

        /**
         * Encodes the specified PeerInfoRequestMessage message, length delimited. Does not implicitly {@link agentInterface.PeerInfoRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.PeerInfoRequestMessage
         * @static
         * @param {agentInterface.IPeerInfoRequestMessage} message PeerInfoRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerInfoRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PeerInfoRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.PeerInfoRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.PeerInfoRequestMessage} PeerInfoRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerInfoRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.PeerInfoRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.current = r.bool();
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
         * Decodes a PeerInfoRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.PeerInfoRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.PeerInfoRequestMessage} PeerInfoRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerInfoRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PeerInfoRequestMessage;
    })();

    agentInterface.PeerInfoResponseMessage = (function() {

        /**
         * Properties of a PeerInfoResponseMessage.
         * @memberof agentInterface
         * @interface IPeerInfoResponseMessage
         * @property {string|null} [publicKey] PeerInfoResponseMessage publicKey
         * @property {string|null} [peerAddress] PeerInfoResponseMessage peerAddress
         * @property {string|null} [relayPublicKey] PeerInfoResponseMessage relayPublicKey
         */

        /**
         * Constructs a new PeerInfoResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a PeerInfoResponseMessage.
         * @implements IPeerInfoResponseMessage
         * @constructor
         * @param {agentInterface.IPeerInfoResponseMessage=} [p] Properties to set
         */
        function PeerInfoResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PeerInfoResponseMessage publicKey.
         * @member {string} publicKey
         * @memberof agentInterface.PeerInfoResponseMessage
         * @instance
         */
        PeerInfoResponseMessage.prototype.publicKey = "";

        /**
         * PeerInfoResponseMessage peerAddress.
         * @member {string} peerAddress
         * @memberof agentInterface.PeerInfoResponseMessage
         * @instance
         */
        PeerInfoResponseMessage.prototype.peerAddress = "";

        /**
         * PeerInfoResponseMessage relayPublicKey.
         * @member {string} relayPublicKey
         * @memberof agentInterface.PeerInfoResponseMessage
         * @instance
         */
        PeerInfoResponseMessage.prototype.relayPublicKey = "";

        /**
         * Creates a new PeerInfoResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.PeerInfoResponseMessage
         * @static
         * @param {agentInterface.IPeerInfoResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.PeerInfoResponseMessage} PeerInfoResponseMessage instance
         */
        PeerInfoResponseMessage.create = function create(properties) {
            return new PeerInfoResponseMessage(properties);
        };

        /**
         * Encodes the specified PeerInfoResponseMessage message. Does not implicitly {@link agentInterface.PeerInfoResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.PeerInfoResponseMessage
         * @static
         * @param {agentInterface.IPeerInfoResponseMessage} m PeerInfoResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerInfoResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            if (m.peerAddress != null && Object.hasOwnProperty.call(m, "peerAddress"))
                w.uint32(18).string(m.peerAddress);
            if (m.relayPublicKey != null && Object.hasOwnProperty.call(m, "relayPublicKey"))
                w.uint32(26).string(m.relayPublicKey);
            return w;
        };

        /**
         * Encodes the specified PeerInfoResponseMessage message, length delimited. Does not implicitly {@link agentInterface.PeerInfoResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.PeerInfoResponseMessage
         * @static
         * @param {agentInterface.IPeerInfoResponseMessage} message PeerInfoResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerInfoResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PeerInfoResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.PeerInfoResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.PeerInfoResponseMessage} PeerInfoResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerInfoResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.PeerInfoResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.publicKey = r.string();
                    break;
                case 2:
                    m.peerAddress = r.string();
                    break;
                case 3:
                    m.relayPublicKey = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a PeerInfoResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.PeerInfoResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.PeerInfoResponseMessage} PeerInfoResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerInfoResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PeerInfoResponseMessage;
    })();

    agentInterface.AddPeerRequestMessage = (function() {

        /**
         * Properties of an AddPeerRequestMessage.
         * @memberof agentInterface
         * @interface IAddPeerRequestMessage
         * @property {string|null} [publicKey] AddPeerRequestMessage publicKey
         * @property {string|null} [peerAddress] AddPeerRequestMessage peerAddress
         * @property {string|null} [relayPublicKey] AddPeerRequestMessage relayPublicKey
         */

        /**
         * Constructs a new AddPeerRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents an AddPeerRequestMessage.
         * @implements IAddPeerRequestMessage
         * @constructor
         * @param {agentInterface.IAddPeerRequestMessage=} [p] Properties to set
         */
        function AddPeerRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * AddPeerRequestMessage publicKey.
         * @member {string} publicKey
         * @memberof agentInterface.AddPeerRequestMessage
         * @instance
         */
        AddPeerRequestMessage.prototype.publicKey = "";

        /**
         * AddPeerRequestMessage peerAddress.
         * @member {string} peerAddress
         * @memberof agentInterface.AddPeerRequestMessage
         * @instance
         */
        AddPeerRequestMessage.prototype.peerAddress = "";

        /**
         * AddPeerRequestMessage relayPublicKey.
         * @member {string} relayPublicKey
         * @memberof agentInterface.AddPeerRequestMessage
         * @instance
         */
        AddPeerRequestMessage.prototype.relayPublicKey = "";

        /**
         * Creates a new AddPeerRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.AddPeerRequestMessage
         * @static
         * @param {agentInterface.IAddPeerRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.AddPeerRequestMessage} AddPeerRequestMessage instance
         */
        AddPeerRequestMessage.create = function create(properties) {
            return new AddPeerRequestMessage(properties);
        };

        /**
         * Encodes the specified AddPeerRequestMessage message. Does not implicitly {@link agentInterface.AddPeerRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.AddPeerRequestMessage
         * @static
         * @param {agentInterface.IAddPeerRequestMessage} m AddPeerRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AddPeerRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            if (m.peerAddress != null && Object.hasOwnProperty.call(m, "peerAddress"))
                w.uint32(18).string(m.peerAddress);
            if (m.relayPublicKey != null && Object.hasOwnProperty.call(m, "relayPublicKey"))
                w.uint32(26).string(m.relayPublicKey);
            return w;
        };

        /**
         * Encodes the specified AddPeerRequestMessage message, length delimited. Does not implicitly {@link agentInterface.AddPeerRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.AddPeerRequestMessage
         * @static
         * @param {agentInterface.IAddPeerRequestMessage} message AddPeerRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AddPeerRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an AddPeerRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.AddPeerRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.AddPeerRequestMessage} AddPeerRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AddPeerRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.AddPeerRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.publicKey = r.string();
                    break;
                case 2:
                    m.peerAddress = r.string();
                    break;
                case 3:
                    m.relayPublicKey = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes an AddPeerRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.AddPeerRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.AddPeerRequestMessage} AddPeerRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AddPeerRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return AddPeerRequestMessage;
    })();

    agentInterface.AddPeerResponseMessage = (function() {

        /**
         * Properties of an AddPeerResponseMessage.
         * @memberof agentInterface
         * @interface IAddPeerResponseMessage
         * @property {boolean|null} [successful] AddPeerResponseMessage successful
         */

        /**
         * Constructs a new AddPeerResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents an AddPeerResponseMessage.
         * @implements IAddPeerResponseMessage
         * @constructor
         * @param {agentInterface.IAddPeerResponseMessage=} [p] Properties to set
         */
        function AddPeerResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * AddPeerResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.AddPeerResponseMessage
         * @instance
         */
        AddPeerResponseMessage.prototype.successful = false;

        /**
         * Creates a new AddPeerResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.AddPeerResponseMessage
         * @static
         * @param {agentInterface.IAddPeerResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.AddPeerResponseMessage} AddPeerResponseMessage instance
         */
        AddPeerResponseMessage.create = function create(properties) {
            return new AddPeerResponseMessage(properties);
        };

        /**
         * Encodes the specified AddPeerResponseMessage message. Does not implicitly {@link agentInterface.AddPeerResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.AddPeerResponseMessage
         * @static
         * @param {agentInterface.IAddPeerResponseMessage} m AddPeerResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AddPeerResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified AddPeerResponseMessage message, length delimited. Does not implicitly {@link agentInterface.AddPeerResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.AddPeerResponseMessage
         * @static
         * @param {agentInterface.IAddPeerResponseMessage} message AddPeerResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AddPeerResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an AddPeerResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.AddPeerResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.AddPeerResponseMessage} AddPeerResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AddPeerResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.AddPeerResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes an AddPeerResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.AddPeerResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.AddPeerResponseMessage} AddPeerResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AddPeerResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return AddPeerResponseMessage;
    })();

    agentInterface.PingPeerRequestMessage = (function() {

        /**
         * Properties of a PingPeerRequestMessage.
         * @memberof agentInterface
         * @interface IPingPeerRequestMessage
         * @property {string|null} [publicKey] PingPeerRequestMessage publicKey
         * @property {number|null} [timeout] PingPeerRequestMessage timeout
         */

        /**
         * Constructs a new PingPeerRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a PingPeerRequestMessage.
         * @implements IPingPeerRequestMessage
         * @constructor
         * @param {agentInterface.IPingPeerRequestMessage=} [p] Properties to set
         */
        function PingPeerRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PingPeerRequestMessage publicKey.
         * @member {string} publicKey
         * @memberof agentInterface.PingPeerRequestMessage
         * @instance
         */
        PingPeerRequestMessage.prototype.publicKey = "";

        /**
         * PingPeerRequestMessage timeout.
         * @member {number} timeout
         * @memberof agentInterface.PingPeerRequestMessage
         * @instance
         */
        PingPeerRequestMessage.prototype.timeout = 0;

        /**
         * Creates a new PingPeerRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.PingPeerRequestMessage
         * @static
         * @param {agentInterface.IPingPeerRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.PingPeerRequestMessage} PingPeerRequestMessage instance
         */
        PingPeerRequestMessage.create = function create(properties) {
            return new PingPeerRequestMessage(properties);
        };

        /**
         * Encodes the specified PingPeerRequestMessage message. Does not implicitly {@link agentInterface.PingPeerRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.PingPeerRequestMessage
         * @static
         * @param {agentInterface.IPingPeerRequestMessage} m PingPeerRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PingPeerRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            if (m.timeout != null && Object.hasOwnProperty.call(m, "timeout"))
                w.uint32(16).int32(m.timeout);
            return w;
        };

        /**
         * Encodes the specified PingPeerRequestMessage message, length delimited. Does not implicitly {@link agentInterface.PingPeerRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.PingPeerRequestMessage
         * @static
         * @param {agentInterface.IPingPeerRequestMessage} message PingPeerRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PingPeerRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PingPeerRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.PingPeerRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.PingPeerRequestMessage} PingPeerRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PingPeerRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.PingPeerRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.publicKey = r.string();
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
         * Decodes a PingPeerRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.PingPeerRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.PingPeerRequestMessage} PingPeerRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PingPeerRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PingPeerRequestMessage;
    })();

    agentInterface.PingPeerResponseMessage = (function() {

        /**
         * Properties of a PingPeerResponseMessage.
         * @memberof agentInterface
         * @interface IPingPeerResponseMessage
         * @property {boolean|null} [successful] PingPeerResponseMessage successful
         */

        /**
         * Constructs a new PingPeerResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a PingPeerResponseMessage.
         * @implements IPingPeerResponseMessage
         * @constructor
         * @param {agentInterface.IPingPeerResponseMessage=} [p] Properties to set
         */
        function PingPeerResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PingPeerResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.PingPeerResponseMessage
         * @instance
         */
        PingPeerResponseMessage.prototype.successful = false;

        /**
         * Creates a new PingPeerResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.PingPeerResponseMessage
         * @static
         * @param {agentInterface.IPingPeerResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.PingPeerResponseMessage} PingPeerResponseMessage instance
         */
        PingPeerResponseMessage.create = function create(properties) {
            return new PingPeerResponseMessage(properties);
        };

        /**
         * Encodes the specified PingPeerResponseMessage message. Does not implicitly {@link agentInterface.PingPeerResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.PingPeerResponseMessage
         * @static
         * @param {agentInterface.IPingPeerResponseMessage} m PingPeerResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PingPeerResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified PingPeerResponseMessage message, length delimited. Does not implicitly {@link agentInterface.PingPeerResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.PingPeerResponseMessage
         * @static
         * @param {agentInterface.IPingPeerResponseMessage} message PingPeerResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PingPeerResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PingPeerResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.PingPeerResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.PingPeerResponseMessage} PingPeerResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PingPeerResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.PingPeerResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a PingPeerResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.PingPeerResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.PingPeerResponseMessage} PingPeerResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PingPeerResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PingPeerResponseMessage;
    })();

    agentInterface.FindPeerRequestMessage = (function() {

        /**
         * Properties of a FindPeerRequestMessage.
         * @memberof agentInterface
         * @interface IFindPeerRequestMessage
         * @property {string|null} [publicKey] FindPeerRequestMessage publicKey
         * @property {number|null} [timeout] FindPeerRequestMessage timeout
         */

        /**
         * Constructs a new FindPeerRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a FindPeerRequestMessage.
         * @implements IFindPeerRequestMessage
         * @constructor
         * @param {agentInterface.IFindPeerRequestMessage=} [p] Properties to set
         */
        function FindPeerRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * FindPeerRequestMessage publicKey.
         * @member {string} publicKey
         * @memberof agentInterface.FindPeerRequestMessage
         * @instance
         */
        FindPeerRequestMessage.prototype.publicKey = "";

        /**
         * FindPeerRequestMessage timeout.
         * @member {number} timeout
         * @memberof agentInterface.FindPeerRequestMessage
         * @instance
         */
        FindPeerRequestMessage.prototype.timeout = 0;

        /**
         * Creates a new FindPeerRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.FindPeerRequestMessage
         * @static
         * @param {agentInterface.IFindPeerRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.FindPeerRequestMessage} FindPeerRequestMessage instance
         */
        FindPeerRequestMessage.create = function create(properties) {
            return new FindPeerRequestMessage(properties);
        };

        /**
         * Encodes the specified FindPeerRequestMessage message. Does not implicitly {@link agentInterface.FindPeerRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.FindPeerRequestMessage
         * @static
         * @param {agentInterface.IFindPeerRequestMessage} m FindPeerRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FindPeerRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            if (m.timeout != null && Object.hasOwnProperty.call(m, "timeout"))
                w.uint32(16).int32(m.timeout);
            return w;
        };

        /**
         * Encodes the specified FindPeerRequestMessage message, length delimited. Does not implicitly {@link agentInterface.FindPeerRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.FindPeerRequestMessage
         * @static
         * @param {agentInterface.IFindPeerRequestMessage} message FindPeerRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FindPeerRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a FindPeerRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.FindPeerRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.FindPeerRequestMessage} FindPeerRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FindPeerRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.FindPeerRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.publicKey = r.string();
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
         * Decodes a FindPeerRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.FindPeerRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.FindPeerRequestMessage} FindPeerRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FindPeerRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return FindPeerRequestMessage;
    })();

    agentInterface.FindPeerResponseMessage = (function() {

        /**
         * Properties of a FindPeerResponseMessage.
         * @memberof agentInterface
         * @interface IFindPeerResponseMessage
         * @property {boolean|null} [successful] FindPeerResponseMessage successful
         */

        /**
         * Constructs a new FindPeerResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a FindPeerResponseMessage.
         * @implements IFindPeerResponseMessage
         * @constructor
         * @param {agentInterface.IFindPeerResponseMessage=} [p] Properties to set
         */
        function FindPeerResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * FindPeerResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.FindPeerResponseMessage
         * @instance
         */
        FindPeerResponseMessage.prototype.successful = false;

        /**
         * Creates a new FindPeerResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.FindPeerResponseMessage
         * @static
         * @param {agentInterface.IFindPeerResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.FindPeerResponseMessage} FindPeerResponseMessage instance
         */
        FindPeerResponseMessage.create = function create(properties) {
            return new FindPeerResponseMessage(properties);
        };

        /**
         * Encodes the specified FindPeerResponseMessage message. Does not implicitly {@link agentInterface.FindPeerResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.FindPeerResponseMessage
         * @static
         * @param {agentInterface.IFindPeerResponseMessage} m FindPeerResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FindPeerResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified FindPeerResponseMessage message, length delimited. Does not implicitly {@link agentInterface.FindPeerResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.FindPeerResponseMessage
         * @static
         * @param {agentInterface.IFindPeerResponseMessage} message FindPeerResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FindPeerResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a FindPeerResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.FindPeerResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.FindPeerResponseMessage} FindPeerResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FindPeerResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.FindPeerResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a FindPeerResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.FindPeerResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.FindPeerResponseMessage} FindPeerResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FindPeerResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return FindPeerResponseMessage;
    })();

    agentInterface.FindSocialPeerRequestMessage = (function() {

        /**
         * Properties of a FindSocialPeerRequestMessage.
         * @memberof agentInterface
         * @interface IFindSocialPeerRequestMessage
         * @property {string|null} [handle] FindSocialPeerRequestMessage handle
         * @property {string|null} [service] FindSocialPeerRequestMessage service
         * @property {number|null} [timeout] FindSocialPeerRequestMessage timeout
         */

        /**
         * Constructs a new FindSocialPeerRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a FindSocialPeerRequestMessage.
         * @implements IFindSocialPeerRequestMessage
         * @constructor
         * @param {agentInterface.IFindSocialPeerRequestMessage=} [p] Properties to set
         */
        function FindSocialPeerRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * FindSocialPeerRequestMessage handle.
         * @member {string} handle
         * @memberof agentInterface.FindSocialPeerRequestMessage
         * @instance
         */
        FindSocialPeerRequestMessage.prototype.handle = "";

        /**
         * FindSocialPeerRequestMessage service.
         * @member {string} service
         * @memberof agentInterface.FindSocialPeerRequestMessage
         * @instance
         */
        FindSocialPeerRequestMessage.prototype.service = "";

        /**
         * FindSocialPeerRequestMessage timeout.
         * @member {number} timeout
         * @memberof agentInterface.FindSocialPeerRequestMessage
         * @instance
         */
        FindSocialPeerRequestMessage.prototype.timeout = 0;

        /**
         * Creates a new FindSocialPeerRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.FindSocialPeerRequestMessage
         * @static
         * @param {agentInterface.IFindSocialPeerRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.FindSocialPeerRequestMessage} FindSocialPeerRequestMessage instance
         */
        FindSocialPeerRequestMessage.create = function create(properties) {
            return new FindSocialPeerRequestMessage(properties);
        };

        /**
         * Encodes the specified FindSocialPeerRequestMessage message. Does not implicitly {@link agentInterface.FindSocialPeerRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.FindSocialPeerRequestMessage
         * @static
         * @param {agentInterface.IFindSocialPeerRequestMessage} m FindSocialPeerRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FindSocialPeerRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.handle != null && Object.hasOwnProperty.call(m, "handle"))
                w.uint32(10).string(m.handle);
            if (m.service != null && Object.hasOwnProperty.call(m, "service"))
                w.uint32(18).string(m.service);
            if (m.timeout != null && Object.hasOwnProperty.call(m, "timeout"))
                w.uint32(24).int32(m.timeout);
            return w;
        };

        /**
         * Encodes the specified FindSocialPeerRequestMessage message, length delimited. Does not implicitly {@link agentInterface.FindSocialPeerRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.FindSocialPeerRequestMessage
         * @static
         * @param {agentInterface.IFindSocialPeerRequestMessage} message FindSocialPeerRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FindSocialPeerRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a FindSocialPeerRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.FindSocialPeerRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.FindSocialPeerRequestMessage} FindSocialPeerRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FindSocialPeerRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.FindSocialPeerRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.handle = r.string();
                    break;
                case 2:
                    m.service = r.string();
                    break;
                case 3:
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
         * Decodes a FindSocialPeerRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.FindSocialPeerRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.FindSocialPeerRequestMessage} FindSocialPeerRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FindSocialPeerRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return FindSocialPeerRequestMessage;
    })();

    agentInterface.FindSocialPeerResponseMessage = (function() {

        /**
         * Properties of a FindSocialPeerResponseMessage.
         * @memberof agentInterface
         * @interface IFindSocialPeerResponseMessage
         * @property {boolean|null} [successful] FindSocialPeerResponseMessage successful
         */

        /**
         * Constructs a new FindSocialPeerResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a FindSocialPeerResponseMessage.
         * @implements IFindSocialPeerResponseMessage
         * @constructor
         * @param {agentInterface.IFindSocialPeerResponseMessage=} [p] Properties to set
         */
        function FindSocialPeerResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * FindSocialPeerResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.FindSocialPeerResponseMessage
         * @instance
         */
        FindSocialPeerResponseMessage.prototype.successful = false;

        /**
         * Creates a new FindSocialPeerResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.FindSocialPeerResponseMessage
         * @static
         * @param {agentInterface.IFindSocialPeerResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.FindSocialPeerResponseMessage} FindSocialPeerResponseMessage instance
         */
        FindSocialPeerResponseMessage.create = function create(properties) {
            return new FindSocialPeerResponseMessage(properties);
        };

        /**
         * Encodes the specified FindSocialPeerResponseMessage message. Does not implicitly {@link agentInterface.FindSocialPeerResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.FindSocialPeerResponseMessage
         * @static
         * @param {agentInterface.IFindSocialPeerResponseMessage} m FindSocialPeerResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FindSocialPeerResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified FindSocialPeerResponseMessage message, length delimited. Does not implicitly {@link agentInterface.FindSocialPeerResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.FindSocialPeerResponseMessage
         * @static
         * @param {agentInterface.IFindSocialPeerResponseMessage} message FindSocialPeerResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FindSocialPeerResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a FindSocialPeerResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.FindSocialPeerResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.FindSocialPeerResponseMessage} FindSocialPeerResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FindSocialPeerResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.FindSocialPeerResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a FindSocialPeerResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.FindSocialPeerResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.FindSocialPeerResponseMessage} FindSocialPeerResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FindSocialPeerResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return FindSocialPeerResponseMessage;
    })();

    agentInterface.ListPeersRequestMessage = (function() {

        /**
         * Properties of a ListPeersRequestMessage.
         * @memberof agentInterface
         * @interface IListPeersRequestMessage
         */

        /**
         * Constructs a new ListPeersRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a ListPeersRequestMessage.
         * @implements IListPeersRequestMessage
         * @constructor
         * @param {agentInterface.IListPeersRequestMessage=} [p] Properties to set
         */
        function ListPeersRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * Creates a new ListPeersRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.ListPeersRequestMessage
         * @static
         * @param {agentInterface.IListPeersRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.ListPeersRequestMessage} ListPeersRequestMessage instance
         */
        ListPeersRequestMessage.create = function create(properties) {
            return new ListPeersRequestMessage(properties);
        };

        /**
         * Encodes the specified ListPeersRequestMessage message. Does not implicitly {@link agentInterface.ListPeersRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.ListPeersRequestMessage
         * @static
         * @param {agentInterface.IListPeersRequestMessage} m ListPeersRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListPeersRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            return w;
        };

        /**
         * Encodes the specified ListPeersRequestMessage message, length delimited. Does not implicitly {@link agentInterface.ListPeersRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.ListPeersRequestMessage
         * @static
         * @param {agentInterface.IListPeersRequestMessage} message ListPeersRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListPeersRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ListPeersRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.ListPeersRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.ListPeersRequestMessage} ListPeersRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListPeersRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.ListPeersRequestMessage();
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
         * Decodes a ListPeersRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.ListPeersRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.ListPeersRequestMessage} ListPeersRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListPeersRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ListPeersRequestMessage;
    })();

    agentInterface.ListPeersResponseMessage = (function() {

        /**
         * Properties of a ListPeersResponseMessage.
         * @memberof agentInterface
         * @interface IListPeersResponseMessage
         * @property {Array.<string>|null} [publicKeys] ListPeersResponseMessage publicKeys
         */

        /**
         * Constructs a new ListPeersResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a ListPeersResponseMessage.
         * @implements IListPeersResponseMessage
         * @constructor
         * @param {agentInterface.IListPeersResponseMessage=} [p] Properties to set
         */
        function ListPeersResponseMessage(p) {
            this.publicKeys = [];
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * ListPeersResponseMessage publicKeys.
         * @member {Array.<string>} publicKeys
         * @memberof agentInterface.ListPeersResponseMessage
         * @instance
         */
        ListPeersResponseMessage.prototype.publicKeys = $util.emptyArray;

        /**
         * Creates a new ListPeersResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.ListPeersResponseMessage
         * @static
         * @param {agentInterface.IListPeersResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.ListPeersResponseMessage} ListPeersResponseMessage instance
         */
        ListPeersResponseMessage.create = function create(properties) {
            return new ListPeersResponseMessage(properties);
        };

        /**
         * Encodes the specified ListPeersResponseMessage message. Does not implicitly {@link agentInterface.ListPeersResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.ListPeersResponseMessage
         * @static
         * @param {agentInterface.IListPeersResponseMessage} m ListPeersResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListPeersResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKeys != null && m.publicKeys.length) {
                for (var i = 0; i < m.publicKeys.length; ++i)
                    w.uint32(10).string(m.publicKeys[i]);
            }
            return w;
        };

        /**
         * Encodes the specified ListPeersResponseMessage message, length delimited. Does not implicitly {@link agentInterface.ListPeersResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.ListPeersResponseMessage
         * @static
         * @param {agentInterface.IListPeersResponseMessage} message ListPeersResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListPeersResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ListPeersResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.ListPeersResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.ListPeersResponseMessage} ListPeersResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListPeersResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.ListPeersResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    if (!(m.publicKeys && m.publicKeys.length))
                        m.publicKeys = [];
                    m.publicKeys.push(r.string());
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a ListPeersResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.ListPeersResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.ListPeersResponseMessage} ListPeersResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListPeersResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ListPeersResponseMessage;
    })();

    agentInterface.ToggleStealthRequestMessage = (function() {

        /**
         * Properties of a ToggleStealthRequestMessage.
         * @memberof agentInterface
         * @interface IToggleStealthRequestMessage
         * @property {boolean|null} [active] ToggleStealthRequestMessage active
         */

        /**
         * Constructs a new ToggleStealthRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a ToggleStealthRequestMessage.
         * @implements IToggleStealthRequestMessage
         * @constructor
         * @param {agentInterface.IToggleStealthRequestMessage=} [p] Properties to set
         */
        function ToggleStealthRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * ToggleStealthRequestMessage active.
         * @member {boolean} active
         * @memberof agentInterface.ToggleStealthRequestMessage
         * @instance
         */
        ToggleStealthRequestMessage.prototype.active = false;

        /**
         * Creates a new ToggleStealthRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.ToggleStealthRequestMessage
         * @static
         * @param {agentInterface.IToggleStealthRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.ToggleStealthRequestMessage} ToggleStealthRequestMessage instance
         */
        ToggleStealthRequestMessage.create = function create(properties) {
            return new ToggleStealthRequestMessage(properties);
        };

        /**
         * Encodes the specified ToggleStealthRequestMessage message. Does not implicitly {@link agentInterface.ToggleStealthRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.ToggleStealthRequestMessage
         * @static
         * @param {agentInterface.IToggleStealthRequestMessage} m ToggleStealthRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ToggleStealthRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.active != null && Object.hasOwnProperty.call(m, "active"))
                w.uint32(8).bool(m.active);
            return w;
        };

        /**
         * Encodes the specified ToggleStealthRequestMessage message, length delimited. Does not implicitly {@link agentInterface.ToggleStealthRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.ToggleStealthRequestMessage
         * @static
         * @param {agentInterface.IToggleStealthRequestMessage} message ToggleStealthRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ToggleStealthRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ToggleStealthRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.ToggleStealthRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.ToggleStealthRequestMessage} ToggleStealthRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ToggleStealthRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.ToggleStealthRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.active = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a ToggleStealthRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.ToggleStealthRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.ToggleStealthRequestMessage} ToggleStealthRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ToggleStealthRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ToggleStealthRequestMessage;
    })();

    agentInterface.ToggleStealthResponseMessage = (function() {

        /**
         * Properties of a ToggleStealthResponseMessage.
         * @memberof agentInterface
         * @interface IToggleStealthResponseMessage
         * @property {boolean|null} [successful] ToggleStealthResponseMessage successful
         */

        /**
         * Constructs a new ToggleStealthResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a ToggleStealthResponseMessage.
         * @implements IToggleStealthResponseMessage
         * @constructor
         * @param {agentInterface.IToggleStealthResponseMessage=} [p] Properties to set
         */
        function ToggleStealthResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * ToggleStealthResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.ToggleStealthResponseMessage
         * @instance
         */
        ToggleStealthResponseMessage.prototype.successful = false;

        /**
         * Creates a new ToggleStealthResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.ToggleStealthResponseMessage
         * @static
         * @param {agentInterface.IToggleStealthResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.ToggleStealthResponseMessage} ToggleStealthResponseMessage instance
         */
        ToggleStealthResponseMessage.create = function create(properties) {
            return new ToggleStealthResponseMessage(properties);
        };

        /**
         * Encodes the specified ToggleStealthResponseMessage message. Does not implicitly {@link agentInterface.ToggleStealthResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.ToggleStealthResponseMessage
         * @static
         * @param {agentInterface.IToggleStealthResponseMessage} m ToggleStealthResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ToggleStealthResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified ToggleStealthResponseMessage message, length delimited. Does not implicitly {@link agentInterface.ToggleStealthResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.ToggleStealthResponseMessage
         * @static
         * @param {agentInterface.IToggleStealthResponseMessage} message ToggleStealthResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ToggleStealthResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ToggleStealthResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.ToggleStealthResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.ToggleStealthResponseMessage} ToggleStealthResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ToggleStealthResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.ToggleStealthResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a ToggleStealthResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.ToggleStealthResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.ToggleStealthResponseMessage} ToggleStealthResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ToggleStealthResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return ToggleStealthResponseMessage;
    })();

    agentInterface.UpdatePeerInfoRequestMessage = (function() {

        /**
         * Properties of an UpdatePeerInfoRequestMessage.
         * @memberof agentInterface
         * @interface IUpdatePeerInfoRequestMessage
         * @property {string|null} [publicKey] UpdatePeerInfoRequestMessage publicKey
         * @property {boolean|null} [currentNode] UpdatePeerInfoRequestMessage currentNode
         * @property {string|null} [peerHost] UpdatePeerInfoRequestMessage peerHost
         * @property {number|null} [peerPort] UpdatePeerInfoRequestMessage peerPort
         * @property {string|null} [relayPublicKey] UpdatePeerInfoRequestMessage relayPublicKey
         */

        /**
         * Constructs a new UpdatePeerInfoRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents an UpdatePeerInfoRequestMessage.
         * @implements IUpdatePeerInfoRequestMessage
         * @constructor
         * @param {agentInterface.IUpdatePeerInfoRequestMessage=} [p] Properties to set
         */
        function UpdatePeerInfoRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * UpdatePeerInfoRequestMessage publicKey.
         * @member {string} publicKey
         * @memberof agentInterface.UpdatePeerInfoRequestMessage
         * @instance
         */
        UpdatePeerInfoRequestMessage.prototype.publicKey = "";

        /**
         * UpdatePeerInfoRequestMessage currentNode.
         * @member {boolean} currentNode
         * @memberof agentInterface.UpdatePeerInfoRequestMessage
         * @instance
         */
        UpdatePeerInfoRequestMessage.prototype.currentNode = false;

        /**
         * UpdatePeerInfoRequestMessage peerHost.
         * @member {string} peerHost
         * @memberof agentInterface.UpdatePeerInfoRequestMessage
         * @instance
         */
        UpdatePeerInfoRequestMessage.prototype.peerHost = "";

        /**
         * UpdatePeerInfoRequestMessage peerPort.
         * @member {number} peerPort
         * @memberof agentInterface.UpdatePeerInfoRequestMessage
         * @instance
         */
        UpdatePeerInfoRequestMessage.prototype.peerPort = 0;

        /**
         * UpdatePeerInfoRequestMessage relayPublicKey.
         * @member {string} relayPublicKey
         * @memberof agentInterface.UpdatePeerInfoRequestMessage
         * @instance
         */
        UpdatePeerInfoRequestMessage.prototype.relayPublicKey = "";

        /**
         * Creates a new UpdatePeerInfoRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.UpdatePeerInfoRequestMessage
         * @static
         * @param {agentInterface.IUpdatePeerInfoRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.UpdatePeerInfoRequestMessage} UpdatePeerInfoRequestMessage instance
         */
        UpdatePeerInfoRequestMessage.create = function create(properties) {
            return new UpdatePeerInfoRequestMessage(properties);
        };

        /**
         * Encodes the specified UpdatePeerInfoRequestMessage message. Does not implicitly {@link agentInterface.UpdatePeerInfoRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.UpdatePeerInfoRequestMessage
         * @static
         * @param {agentInterface.IUpdatePeerInfoRequestMessage} m UpdatePeerInfoRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UpdatePeerInfoRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            if (m.currentNode != null && Object.hasOwnProperty.call(m, "currentNode"))
                w.uint32(16).bool(m.currentNode);
            if (m.peerHost != null && Object.hasOwnProperty.call(m, "peerHost"))
                w.uint32(26).string(m.peerHost);
            if (m.peerPort != null && Object.hasOwnProperty.call(m, "peerPort"))
                w.uint32(32).int32(m.peerPort);
            if (m.relayPublicKey != null && Object.hasOwnProperty.call(m, "relayPublicKey"))
                w.uint32(42).string(m.relayPublicKey);
            return w;
        };

        /**
         * Encodes the specified UpdatePeerInfoRequestMessage message, length delimited. Does not implicitly {@link agentInterface.UpdatePeerInfoRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.UpdatePeerInfoRequestMessage
         * @static
         * @param {agentInterface.IUpdatePeerInfoRequestMessage} message UpdatePeerInfoRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UpdatePeerInfoRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an UpdatePeerInfoRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.UpdatePeerInfoRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.UpdatePeerInfoRequestMessage} UpdatePeerInfoRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UpdatePeerInfoRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.UpdatePeerInfoRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.publicKey = r.string();
                    break;
                case 2:
                    m.currentNode = r.bool();
                    break;
                case 3:
                    m.peerHost = r.string();
                    break;
                case 4:
                    m.peerPort = r.int32();
                    break;
                case 5:
                    m.relayPublicKey = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes an UpdatePeerInfoRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.UpdatePeerInfoRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.UpdatePeerInfoRequestMessage} UpdatePeerInfoRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UpdatePeerInfoRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return UpdatePeerInfoRequestMessage;
    })();

    agentInterface.UpdatePeerInfoResponseMessage = (function() {

        /**
         * Properties of an UpdatePeerInfoResponseMessage.
         * @memberof agentInterface
         * @interface IUpdatePeerInfoResponseMessage
         * @property {boolean|null} [successful] UpdatePeerInfoResponseMessage successful
         */

        /**
         * Constructs a new UpdatePeerInfoResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents an UpdatePeerInfoResponseMessage.
         * @implements IUpdatePeerInfoResponseMessage
         * @constructor
         * @param {agentInterface.IUpdatePeerInfoResponseMessage=} [p] Properties to set
         */
        function UpdatePeerInfoResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * UpdatePeerInfoResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.UpdatePeerInfoResponseMessage
         * @instance
         */
        UpdatePeerInfoResponseMessage.prototype.successful = false;

        /**
         * Creates a new UpdatePeerInfoResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.UpdatePeerInfoResponseMessage
         * @static
         * @param {agentInterface.IUpdatePeerInfoResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.UpdatePeerInfoResponseMessage} UpdatePeerInfoResponseMessage instance
         */
        UpdatePeerInfoResponseMessage.create = function create(properties) {
            return new UpdatePeerInfoResponseMessage(properties);
        };

        /**
         * Encodes the specified UpdatePeerInfoResponseMessage message. Does not implicitly {@link agentInterface.UpdatePeerInfoResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.UpdatePeerInfoResponseMessage
         * @static
         * @param {agentInterface.IUpdatePeerInfoResponseMessage} m UpdatePeerInfoResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UpdatePeerInfoResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified UpdatePeerInfoResponseMessage message, length delimited. Does not implicitly {@link agentInterface.UpdatePeerInfoResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.UpdatePeerInfoResponseMessage
         * @static
         * @param {agentInterface.IUpdatePeerInfoResponseMessage} message UpdatePeerInfoResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UpdatePeerInfoResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an UpdatePeerInfoResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.UpdatePeerInfoResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.UpdatePeerInfoResponseMessage} UpdatePeerInfoResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UpdatePeerInfoResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.UpdatePeerInfoResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes an UpdatePeerInfoResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.UpdatePeerInfoResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.UpdatePeerInfoResponseMessage} UpdatePeerInfoResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UpdatePeerInfoResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return UpdatePeerInfoResponseMessage;
    })();

    agentInterface.RequestRelayRequestMessage = (function() {

        /**
         * Properties of a RequestRelayRequestMessage.
         * @memberof agentInterface
         * @interface IRequestRelayRequestMessage
         * @property {string|null} [publicKey] RequestRelayRequestMessage publicKey
         */

        /**
         * Constructs a new RequestRelayRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a RequestRelayRequestMessage.
         * @implements IRequestRelayRequestMessage
         * @constructor
         * @param {agentInterface.IRequestRelayRequestMessage=} [p] Properties to set
         */
        function RequestRelayRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * RequestRelayRequestMessage publicKey.
         * @member {string} publicKey
         * @memberof agentInterface.RequestRelayRequestMessage
         * @instance
         */
        RequestRelayRequestMessage.prototype.publicKey = "";

        /**
         * Creates a new RequestRelayRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.RequestRelayRequestMessage
         * @static
         * @param {agentInterface.IRequestRelayRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.RequestRelayRequestMessage} RequestRelayRequestMessage instance
         */
        RequestRelayRequestMessage.create = function create(properties) {
            return new RequestRelayRequestMessage(properties);
        };

        /**
         * Encodes the specified RequestRelayRequestMessage message. Does not implicitly {@link agentInterface.RequestRelayRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.RequestRelayRequestMessage
         * @static
         * @param {agentInterface.IRequestRelayRequestMessage} m RequestRelayRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RequestRelayRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            return w;
        };

        /**
         * Encodes the specified RequestRelayRequestMessage message, length delimited. Does not implicitly {@link agentInterface.RequestRelayRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.RequestRelayRequestMessage
         * @static
         * @param {agentInterface.IRequestRelayRequestMessage} message RequestRelayRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RequestRelayRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RequestRelayRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.RequestRelayRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.RequestRelayRequestMessage} RequestRelayRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RequestRelayRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.RequestRelayRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
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
         * Decodes a RequestRelayRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.RequestRelayRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.RequestRelayRequestMessage} RequestRelayRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RequestRelayRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return RequestRelayRequestMessage;
    })();

    agentInterface.RequestRelayResponseMessage = (function() {

        /**
         * Properties of a RequestRelayResponseMessage.
         * @memberof agentInterface
         * @interface IRequestRelayResponseMessage
         * @property {boolean|null} [successful] RequestRelayResponseMessage successful
         */

        /**
         * Constructs a new RequestRelayResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a RequestRelayResponseMessage.
         * @implements IRequestRelayResponseMessage
         * @constructor
         * @param {agentInterface.IRequestRelayResponseMessage=} [p] Properties to set
         */
        function RequestRelayResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * RequestRelayResponseMessage successful.
         * @member {boolean} successful
         * @memberof agentInterface.RequestRelayResponseMessage
         * @instance
         */
        RequestRelayResponseMessage.prototype.successful = false;

        /**
         * Creates a new RequestRelayResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.RequestRelayResponseMessage
         * @static
         * @param {agentInterface.IRequestRelayResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.RequestRelayResponseMessage} RequestRelayResponseMessage instance
         */
        RequestRelayResponseMessage.create = function create(properties) {
            return new RequestRelayResponseMessage(properties);
        };

        /**
         * Encodes the specified RequestRelayResponseMessage message. Does not implicitly {@link agentInterface.RequestRelayResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.RequestRelayResponseMessage
         * @static
         * @param {agentInterface.IRequestRelayResponseMessage} m RequestRelayResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RequestRelayResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.successful != null && Object.hasOwnProperty.call(m, "successful"))
                w.uint32(8).bool(m.successful);
            return w;
        };

        /**
         * Encodes the specified RequestRelayResponseMessage message, length delimited. Does not implicitly {@link agentInterface.RequestRelayResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.RequestRelayResponseMessage
         * @static
         * @param {agentInterface.IRequestRelayResponseMessage} message RequestRelayResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RequestRelayResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RequestRelayResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.RequestRelayResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.RequestRelayResponseMessage} RequestRelayResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RequestRelayResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.RequestRelayResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.successful = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a RequestRelayResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.RequestRelayResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.RequestRelayResponseMessage} RequestRelayResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RequestRelayResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return RequestRelayResponseMessage;
    })();

    agentInterface.RequestPunchRequestMessage = (function() {

        /**
         * Properties of a RequestPunchRequestMessage.
         * @memberof agentInterface
         * @interface IRequestPunchRequestMessage
         * @property {string|null} [publicKey] RequestPunchRequestMessage publicKey
         */

        /**
         * Constructs a new RequestPunchRequestMessage.
         * @memberof agentInterface
         * @classdesc Represents a RequestPunchRequestMessage.
         * @implements IRequestPunchRequestMessage
         * @constructor
         * @param {agentInterface.IRequestPunchRequestMessage=} [p] Properties to set
         */
        function RequestPunchRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * RequestPunchRequestMessage publicKey.
         * @member {string} publicKey
         * @memberof agentInterface.RequestPunchRequestMessage
         * @instance
         */
        RequestPunchRequestMessage.prototype.publicKey = "";

        /**
         * Creates a new RequestPunchRequestMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.RequestPunchRequestMessage
         * @static
         * @param {agentInterface.IRequestPunchRequestMessage=} [properties] Properties to set
         * @returns {agentInterface.RequestPunchRequestMessage} RequestPunchRequestMessage instance
         */
        RequestPunchRequestMessage.create = function create(properties) {
            return new RequestPunchRequestMessage(properties);
        };

        /**
         * Encodes the specified RequestPunchRequestMessage message. Does not implicitly {@link agentInterface.RequestPunchRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.RequestPunchRequestMessage
         * @static
         * @param {agentInterface.IRequestPunchRequestMessage} m RequestPunchRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RequestPunchRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
                w.uint32(10).string(m.publicKey);
            return w;
        };

        /**
         * Encodes the specified RequestPunchRequestMessage message, length delimited. Does not implicitly {@link agentInterface.RequestPunchRequestMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.RequestPunchRequestMessage
         * @static
         * @param {agentInterface.IRequestPunchRequestMessage} message RequestPunchRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RequestPunchRequestMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RequestPunchRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.RequestPunchRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.RequestPunchRequestMessage} RequestPunchRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RequestPunchRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.RequestPunchRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
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
         * Decodes a RequestPunchRequestMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.RequestPunchRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.RequestPunchRequestMessage} RequestPunchRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RequestPunchRequestMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return RequestPunchRequestMessage;
    })();

    agentInterface.RequestPunchResponseMessage = (function() {

        /**
         * Properties of a RequestPunchResponseMessage.
         * @memberof agentInterface
         * @interface IRequestPunchResponseMessage
         * @property {string|null} [address] RequestPunchResponseMessage address
         */

        /**
         * Constructs a new RequestPunchResponseMessage.
         * @memberof agentInterface
         * @classdesc Represents a RequestPunchResponseMessage.
         * @implements IRequestPunchResponseMessage
         * @constructor
         * @param {agentInterface.IRequestPunchResponseMessage=} [p] Properties to set
         */
        function RequestPunchResponseMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * RequestPunchResponseMessage address.
         * @member {string} address
         * @memberof agentInterface.RequestPunchResponseMessage
         * @instance
         */
        RequestPunchResponseMessage.prototype.address = "";

        /**
         * Creates a new RequestPunchResponseMessage instance using the specified properties.
         * @function create
         * @memberof agentInterface.RequestPunchResponseMessage
         * @static
         * @param {agentInterface.IRequestPunchResponseMessage=} [properties] Properties to set
         * @returns {agentInterface.RequestPunchResponseMessage} RequestPunchResponseMessage instance
         */
        RequestPunchResponseMessage.create = function create(properties) {
            return new RequestPunchResponseMessage(properties);
        };

        /**
         * Encodes the specified RequestPunchResponseMessage message. Does not implicitly {@link agentInterface.RequestPunchResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agentInterface.RequestPunchResponseMessage
         * @static
         * @param {agentInterface.IRequestPunchResponseMessage} m RequestPunchResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RequestPunchResponseMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.address != null && Object.hasOwnProperty.call(m, "address"))
                w.uint32(10).string(m.address);
            return w;
        };

        /**
         * Encodes the specified RequestPunchResponseMessage message, length delimited. Does not implicitly {@link agentInterface.RequestPunchResponseMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof agentInterface.RequestPunchResponseMessage
         * @static
         * @param {agentInterface.IRequestPunchResponseMessage} message RequestPunchResponseMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RequestPunchResponseMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RequestPunchResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agentInterface.RequestPunchResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agentInterface.RequestPunchResponseMessage} RequestPunchResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RequestPunchResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agentInterface.RequestPunchResponseMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.address = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a RequestPunchResponseMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof agentInterface.RequestPunchResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {agentInterface.RequestPunchResponseMessage} RequestPunchResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RequestPunchResponseMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return RequestPunchResponseMessage;
    })();

    return agentInterface;
})();

module.exports = $root;


/***/ })
/******/ ]);
});
//# sourceMappingURL=browser-client.js.map