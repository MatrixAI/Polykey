(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["cli"] = factory();
	else
		root["cli"] = factory();
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
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(__webpack_require__(3));
const chalk_1 = __importDefault(__webpack_require__(4));
const commander_1 = __webpack_require__(1);
const Agent_1 = __importDefault(__webpack_require__(5));
const Crypto_1 = __importDefault(__webpack_require__(7));
const Vaults_1 = __importDefault(__webpack_require__(8));
const Secrets_1 = __importDefault(__webpack_require__(9));
const Keys_1 = __importDefault(__webpack_require__(12));
/*******************************************/
// Error handler
function actionErrorHanlder(error) {
    console.error(chalk_1.default.red(error.message));
}
function actionRunner(fn) {
    return (...args) => fn(...args).catch(actionErrorHanlder);
}
exports.actionRunner = actionRunner;
function resolveTilde(filePath) {
    if (filePath[0] === '~' && (filePath[1] === '/' || filePath.length === 1)) {
        filePath = filePath.replace('~', os_1.default.homedir());
    }
    return filePath;
}
exports.resolveTilde = resolveTilde;
/*******************************************/
// Logger
var PKMessageType;
(function (PKMessageType) {
    PKMessageType[PKMessageType["SUCCESS"] = 0] = "SUCCESS";
    PKMessageType[PKMessageType["INFO"] = 1] = "INFO";
    PKMessageType[PKMessageType["WARNING"] = 2] = "WARNING";
    PKMessageType[PKMessageType["none"] = 3] = "none";
})(PKMessageType || (PKMessageType = {}));
exports.PKMessageType = PKMessageType;
function pkLogger(message, type) {
    switch (type) {
        case PKMessageType.SUCCESS:
            console.log(chalk_1.default.green(message));
            break;
        case PKMessageType.INFO:
            console.log(chalk_1.default.blue(message));
            break;
        case PKMessageType.WARNING:
            console.log(chalk_1.default.yellow(message));
            break;
        default:
            console.log(message);
            break;
    }
}
exports.pkLogger = pkLogger;
function determineNodePath(options) {
    var _a;
    const nodePath = (_a = options.nodePath) !== null && _a !== void 0 ? _a : process.env.KEYNODE_PATH;
    if (!nodePath) {
        throw Error('no keynode path given, you can set it as an environment variable with "export KEYNODE_PATH=\'<path>\'"');
    }
    return resolveTilde(nodePath);
}
exports.determineNodePath = determineNodePath;
/*******************************************/
const polykey = new commander_1.program.Command();
polykey
    .version(__webpack_require__(13).version, '--version', 'output the current version')
    .addCommand(Keys_1.default())
    .addCommand(Secrets_1.default())
    .addCommand(Vaults_1.default())
    .addCommand(Crypto_1.default())
    .addCommand(Agent_1.default());
module.exports = function (argv) {
    polykey.parse(argv);
};


/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = require("commander");

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = require("../lib/polykey.js");

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = require("os");

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = require("chalk");

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(__webpack_require__(6));
const commander_1 = __importDefault(__webpack_require__(1));
const Polykey_1 = __webpack_require__(2);
const _1 = __webpack_require__(0);
function makeStartAgentCommand() {
    return new commander_1.default.Command('start')
        .description('start the agent')
        .option('-d, --daemon', 'start the agent as a daemon process')
        .action(_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        // Tell agent to stop
        const status = await client.getAgentStatus();
        if (status == 'online') {
            _1.pkLogger('agent is already running', _1.PKMessageType.INFO);
        }
        else {
            const daemon = options.daemon;
            const pid = await Polykey_1.PolykeyAgent.startAgent(daemon);
            _1.pkLogger(`agent has started with pid of ${pid}`, _1.PKMessageType.SUCCESS);
        }
        process.exit();
    }));
}
function makeRestartAgentCommand() {
    return new commander_1.default.Command('restart')
        .description('restart the agent')
        .option('-d, --daemon', 'start the agent as a daemon process')
        .action(_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        // Tell agent to stop
        client.stopAgent();
        const daemon = options.daemon;
        const pid = await Polykey_1.PolykeyAgent.startAgent(daemon);
        _1.pkLogger(`agent has restarted with pid of ${pid}`, _1.PKMessageType.SUCCESS);
        process.exit();
    }));
}
function makeAgentStatusCommand() {
    return new commander_1.default.Command('status').description('retrieve the status of the agent').action(_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        _1.pkLogger(`agent status is: '${status}'`, _1.PKMessageType.INFO);
        process.exit();
    }));
}
function makeStopAgentCommand() {
    return new commander_1.default.Command('stop')
        .description('stop the agent')
        .option('-f, --force', 'forcibly stop the agent')
        .action(_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status == 'stopped') {
            _1.pkLogger('agent is already stopped', _1.PKMessageType.INFO);
        }
        else {
            const force = options.force ? true : false;
            // Tell agent to stop
            client.stopAgent();
            if (force) {
                fs_1.default.unlinkSync(Polykey_1.PolykeyAgent.SocketPath);
            }
            const status = await client.getAgentStatus();
            if (status != 'online') {
                _1.pkLogger('agent has successfully stopped', _1.PKMessageType.SUCCESS);
            }
            else {
                throw Error('agent failed to stop');
            }
        }
        process.exit();
    }));
}
function makeListNodesCommand() {
    return new commander_1.default.Command('list')
        .alias('ls')
        .description('list all the nodes controlled by the node')
        .option('-u, --unlocked-only, only list the nodes that are unlocked')
        .action(_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const unlockedOnly = options.unlockedOnly ? true : false;
        const nodes = await client.listNodes(unlockedOnly);
        if (nodes.length == 0) {
            _1.pkLogger('no nodes were listed', _1.PKMessageType.INFO);
        }
        else {
            for (const node of nodes) {
                _1.pkLogger(node, _1.PKMessageType.INFO);
            }
        }
        process.exit();
    }));
}
function makeNewNodeCommand() {
    return new commander_1.default.Command('create')
        .description('create a new polykey node')
        .option('-k, --node-path <nodePath>', 'provide the polykey path. defaults to ~/.polykey')
        .requiredOption('-n, --full-name <fullName>', 'provide your full name for key pair generation')
        .requiredOption('-e, --email <email>', 'provide a valid email address for key pair generation')
        .requiredOption('-p, --private-passphrase <privatePassphrase>', 'provide the passphrase to the private key')
        .option('-b, --number-of-bits <numberOfBits>', 'number of bits to use for key pair generation')
        .option('-v, --verbose', 'increase verbosity by one level')
        .action(_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = _1.determineNodePath(options);
        const fullName = options.fullName;
        const email = options.email;
        const privatePassphrase = options.privatePassphrase;
        const numberOfBits = parseInt(options.numberOfBits);
        const successful = await client.newNode(nodePath, fullName, email, privatePassphrase, numberOfBits);
        if (successful) {
            _1.pkLogger(`node was successfully generated at: '${nodePath}'`, _1.PKMessageType.SUCCESS);
        }
        else {
            throw Error('something went wrong with node creation');
        }
        process.exit();
    }));
}
function makeLoadNodeCommand() {
    return new commander_1.default.Command('load')
        .description('load an existing polykey node')
        .option('-k, --node-path <nodePath>', 'provide the polykey path. defaults to ~/.polykey')
        .requiredOption('-p, --private-passphrase <privatePassphrase>', 'provide the passphrase to the private key')
        .action(_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = _1.determineNodePath(options);
        const privatePassphrase = options.privatePassphrase;
        const successful = await client.registerNode(nodePath, privatePassphrase);
        if (successful) {
            _1.pkLogger(`node was successfully loaded at: '${nodePath}'`, _1.PKMessageType.SUCCESS);
        }
        else {
            throw Error('something went wrong when loading node');
        }
        process.exit();
    }));
}
function makeAgentCommand() {
    return new commander_1.default.Command('agent')
        .description('control the polykey agent')
        .addCommand(makeStartAgentCommand())
        .addCommand(makeRestartAgentCommand())
        .addCommand(makeAgentStatusCommand())
        .addCommand(makeStopAgentCommand())
        .addCommand(makeListNodesCommand())
        .addCommand(makeNewNodeCommand())
        .addCommand(makeLoadNodeCommand());
}
exports.default = makeAgentCommand;


/***/ }),
/* 6 */
/***/ (function(module, exports) {

module.exports = require("fs");

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(__webpack_require__(1));
const Polykey_1 = __webpack_require__(2);
const _1 = __webpack_require__(0);
function makeSignCommand() {
    return new commander_1.default.Command('sign')
        .description('signing operations [files]')
        .option('--node-path <nodePath>', 'node path')
        .option('-k, --signing-key <signingKey>', 'path to private key that will be used to sign files')
        .option('-p, --key-passphrase <keyPassphrase>', 'passphrase to unlock the provided signing key')
        .arguments('file(s) to be signed')
        .action(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != 'online') {
            throw Error(`agent status is: ${status}`);
        }
        const nodePath = _1.determineNodePath(options);
        const signingKeyPath = options.signingKey;
        const keyPassphrase = options.keyPassphrase;
        if ((signingKeyPath || keyPassphrase) && !(signingKeyPath && keyPassphrase)) {
            throw Error('signing key and passphrase must be specified together');
        }
        const filePathList = options.args.values();
        if (filePathList.length == 0) {
            throw Error('no files provided');
        }
        for (const filePath of filePathList) {
            try {
                const signaturePath = await client.signFile(nodePath, filePath, signingKeyPath, keyPassphrase);
                _1.pkLogger(`file '${filePath}' successfully signed at '${signaturePath}'`, _1.PKMessageType.SUCCESS);
            }
            catch (err) {
                throw Error(`failed to sign '${filePath}': ${err}`);
            }
        }
    });
}
function makeVerifyCommand() {
    return new commander_1.default.Command('verify')
        .description('verification operations')
        .option('--node-path <nodePath>', 'node path')
        .option('-k, --public-key <publicKey>', 'path to public key that will be used to verify files, defaults to primary key')
        .option('-s, --detach-sig <detachSig>', 'path to detached signature for file, defaults to [filename].sig')
        .requiredOption('-f, --verified-file <verifiedFile>', 'file to be verified')
        .action(_1.actionRunner(async (options) => {
        var _a;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != 'online') {
            throw Error(`agent status is: ${status}`);
        }
        const nodePath = _1.determineNodePath(options);
        const publicKey = options.publicKey;
        const filePath = options.signedFile;
        const signaturePath = (_a = options.detachSig) !== null && _a !== void 0 ? _a : filePath + '.sig';
        const verified = await client.verifyFile(nodePath, filePath, signaturePath);
        if (verified) {
            _1.pkLogger(`file '${filePath}' was successfully verified`, _1.PKMessageType.SUCCESS);
        }
        else {
            _1.pkLogger(`file '${filePath}' was not verified`, _1.PKMessageType.WARNING);
        }
    }));
}
function makeEncryptCommand() {
    return new commander_1.default.Command('encrypt')
        .description('encryption operations')
        .option('--node-path <nodePath>', 'node path')
        .option('-k, --public-key <publicKey>', 'path to public key that will be used to encrypt files, defaults to primary key')
        .requiredOption('-f, --file-path <filePath>', 'file to be encrypted')
        .action(_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != 'online') {
            throw Error(`agent status is: ${status}`);
        }
        const nodePath = _1.determineNodePath(options);
        const publicKey = options.publicKey;
        const filePath = options.filePath;
        try {
            const encryptedPath = await client.encryptFile(nodePath, filePath, publicKey);
            _1.pkLogger(`file successfully encrypted: '${encryptedPath}'`, _1.PKMessageType.SUCCESS);
        }
        catch (err) {
            throw Error(`failed to encrypt '${filePath}': ${err}`);
        }
    }));
}
function makeDecryptCommand() {
    return new commander_1.default.Command('decrypt')
        .description('decryption operations')
        .option('--node-path <nodePath>', 'node path')
        .option('-k, --private-key <privateKey>', 'path to private key that will be used to decrypt files, defaults to primary key')
        .option('-p, --key-passphrase <keyPassphrase>', 'passphrase to unlock the provided private key')
        .requiredOption('-f, --file-path <filePath>', 'file to be decrypted')
        .action(_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != 'online') {
            throw Error(`agent status is: ${status}`);
        }
        const nodePath = _1.determineNodePath(options);
        const privateKey = options.privateKey;
        const keyPassphrase = options.keyPassphrase;
        const filePath = options.filePath;
        try {
            const decryptedPath = await client.decryptFile(nodePath, filePath, privateKey, keyPassphrase);
            _1.pkLogger(`file successfully decrypted: '${decryptedPath}'`, _1.PKMessageType.SUCCESS);
        }
        catch (err) {
            throw Error(`failed to decrypt '${filePath}': ${err}`);
        }
    }));
}
function makeCryptoCommand() {
    return new commander_1.default.Command('crypto')
        .description('crypto operations')
        .addCommand(makeVerifyCommand())
        .addCommand(makeSignCommand())
        .addCommand(makeEncryptCommand())
        .addCommand(makeDecryptCommand());
}
exports.default = makeCryptoCommand;


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(__webpack_require__(1));
const _1 = __webpack_require__(0);
const Polykey_1 = __webpack_require__(2);
function makeListVaultsCommand() {
    return new commander_1.default.Command('list')
        .description('list all available vaults')
        .alias('ls')
        .option('--node-path <nodePath>', 'node path')
        .option('-v, --verbose', 'increase verbosity level by one')
        .action(_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != 'online') {
            throw Error(`agent status is: ${status}`);
        }
        const nodePath = _1.determineNodePath(options);
        const vaultNames = await client.listVaults(nodePath);
        if (vaultNames === undefined || vaultNames.length == 0) {
            _1.pkLogger('no vaults found', _1.PKMessageType.INFO);
        }
        else {
            vaultNames.forEach((vaultName, index) => {
                _1.pkLogger(`${index + 1}: ${vaultName}`, _1.PKMessageType.INFO);
            });
        }
    }));
}
function makeAddVaultCommand() {
    return new commander_1.default.Command('new')
        .description('create new vault(s)')
        .option('--node-path <nodePath>', 'node path')
        .arguments('vault name(s)')
        .action(_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = _1.determineNodePath(options);
        const vaultNames = options.args.values();
        for (const vaultName of vaultNames) {
            await client.newVault(nodePath, vaultName);
            _1.pkLogger(`vault created at '${nodePath}/${vaultName}'`, _1.PKMessageType.SUCCESS);
        }
    }));
}
function makeDeleteVaultCommand() {
    return new commander_1.default.Command('delete')
        .alias('del')
        .description('delete an existing vault')
        .option('-n, --vault-name <vaultName>', 'name of vault')
        .option('-v, --verbose', 'increase verbosity by one level')
        .arguments('name of vault to remove')
        .action(_1.actionRunner(async (options) => {
        var _a;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = _1.determineNodePath(options);
        const verbose = (_a = options.verbose) !== null && _a !== void 0 ? _a : false;
        const vaultNames = options.args.values();
        if (!vaultNames) {
            throw Error('error: did not receive any vault name');
        }
        for (const vaultName of vaultNames) {
            const successful = await client.destroyVault(nodePath, vaultName);
            _1.pkLogger(`vault '${vaultName}' destroyed ${successful ? 'un-' : ''}successfully`, _1.PKMessageType.SUCCESS);
        }
    }));
}
function makeVaultsCommand() {
    return new commander_1.default.Command('vaults')
        .description('manipulate vaults')
        .addCommand(makeListVaultsCommand())
        .addCommand(makeAddVaultCommand())
        .addCommand(makeDeleteVaultCommand());
}
exports.default = makeVaultsCommand;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const process_1 = __importDefault(__webpack_require__(10));
const commander_1 = __importDefault(__webpack_require__(1));
const child_process_1 = __webpack_require__(11);
const Polykey_1 = __webpack_require__(2);
const _1 = __webpack_require__(0);
const pathRegex = /^([a-zA-Z0-9_ -]+)(?::)([a-zA-Z0-9_ -]+)(?:=)?([a-zA-Z_][a-zA-Z0-9_]+)?$/;
function makeListSecretsCommand() {
    return new commander_1.default.Command('list')
        .description('list all available secrets for a given vault')
        .alias('ls')
        .option('--node-path <nodePath>', 'node path')
        .option('--verbose', 'increase verbosity level by one')
        .arguments('vault name(s) to list')
        .action(_1.actionRunner(async (options) => {
        var _a;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = _1.determineNodePath(options);
        const isVerbose = (_a = options.verbose) !== null && _a !== void 0 ? _a : false;
        const vaultNames = Array.from(options.args.values());
        if (!vaultNames.length) {
            throw Error('no vault names provided');
        }
        for (const vaultName of vaultNames) {
            // Get list of secrets from pk
            const secretNames = await client.listSecrets(nodePath, vaultName);
            // List secrets
            if (secretNames.length == 0 && isVerbose) {
                _1.pkLogger(`no secrets found for vault '${vaultName}'`, _1.PKMessageType.INFO);
            }
            else {
                if (isVerbose) {
                    _1.pkLogger(`secrets contained within the ${vaultName} vault:`, _1.PKMessageType.INFO);
                }
                secretNames.forEach((secretName) => {
                    _1.pkLogger(`${vaultName}:${secretName}`, _1.PKMessageType.INFO);
                });
            }
        }
    }));
}
function makeNewSecretCommand() {
    return new commander_1.default.Command('new')
        .description('create a secret within a given vault')
        .option('--node-path <nodePath>', 'node path')
        .arguments("secret path of the format '<vaultName>:<secretName>'")
        .requiredOption('-f, --file-path <filePath>', 'path to the secret to be added')
        .option('--verbose', 'increase verbosity level by one')
        .action(_1.actionRunner(async (options) => {
        var _a;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = _1.determineNodePath(options);
        const isVerbose = (_a = options.verbose) !== null && _a !== void 0 ? _a : false;
        const secretPath = Array.from(options.args.values());
        if (secretPath.length < 1 || (secretPath.length == 1 && !pathRegex.test(secretPath[0]))) {
            throw Error("please specify a new secret name using the format: '<existingVaultName>:<secretName>'");
        }
        else if (secretPath.length > 1) {
            throw Error('you can only add one secret at a time');
        }
        const firstEntry = secretPath[0];
        const [_, vaultName, secretName] = firstEntry.match(pathRegex);
        const filePath = options.filePath;
        try {
            // Add the secret
            const successful = await client.createSecret(nodePath, vaultName, secretName, filePath);
            _1.pkLogger(`secret '${secretName}' was ${successful ? '' : 'un-'}sucessfully added to vault '${vaultName}'`, _1.PKMessageType.SUCCESS);
        }
        catch (err) {
            throw Error(`Error when adding secret: ${err.message}`);
        }
    }));
}
function makeUpdateSecretCommand() {
    return new commander_1.default.Command('update')
        .description('update a secret within a given vault')
        .option('--node-path <nodePath>', 'node path')
        .arguments("secret path of the format '<vaultName>:<secretName>'")
        .requiredOption('-f, --file-path <filePath>', 'path to the new secret')
        .option('--verbose', 'increase verbosity level by one')
        .action(_1.actionRunner(async (options) => {
        var _a;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = _1.determineNodePath(options);
        const isVerbose = (_a = options.verbose) !== null && _a !== void 0 ? _a : false;
        const secretPath = Array.from(options.args.values());
        if (secretPath.length < 1 || (secretPath.length == 1 && !pathRegex.test(secretPath[0]))) {
            throw Error("please specify the secret using the format: '<vaultName>:<secretName>'");
        }
        else if (secretPath.length > 1) {
            throw Error('you can only update one secret at a time');
        }
        const firstEntry = secretPath[0];
        const [_, vaultName, secretName] = firstEntry.match(pathRegex);
        const filePath = options.filePath;
        try {
            // Update the secret
            const successful = await client.updateSecret(nodePath, vaultName, secretName, filePath);
            _1.pkLogger(`secret '${secretName}' was ${successful ? '' : 'un-'}sucessfully updated in vault '${vaultName}'`, successful ? _1.PKMessageType.SUCCESS : _1.PKMessageType.WARNING);
        }
        catch (err) {
            throw Error(`Error when updating secret: ${err.message}`);
        }
    }));
}
function makeDeleteSecretCommand() {
    return new commander_1.default.Command('delete')
        .alias('del')
        .description('delete a secret from a given vault')
        .arguments("secret path of the format '<vaultName>:<secretName>'")
        .option('--verbose', 'increase verbosity level by one')
        .action(_1.actionRunner(async (options) => {
        var _a;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = _1.determineNodePath(options);
        const isVerbose = (_a = options.verbose) !== null && _a !== void 0 ? _a : false;
        const secretPath = Array.from(options.args.values());
        if (secretPath.length < 1 || (secretPath.length == 1 && !pathRegex.test(secretPath[0]))) {
            throw Error("please specify the secret using the format: '<vaultName>:<secretName>'");
        }
        else if (secretPath.length > 1) {
            throw Error('you can only delete one secret at a time');
        }
        const firstEntry = secretPath[0];
        const [_, vaultName, secretName] = firstEntry.match(pathRegex);
        try {
            // Remove secret
            const successful = await client.destroySecret(nodePath, vaultName, secretName);
            _1.pkLogger(`secret '${secretName}' was ${successful ? '' : 'un-'}sucessfully removed from vault '${vaultName}'`, _1.PKMessageType.SUCCESS);
        }
        catch (err) {
            throw Error(`Error when removing secret: ${err.message}`);
        }
    }));
}
function makeGetSecretCommand() {
    return new commander_1.default.Command('get')
        .description('retrieve a secret from a given vault')
        .arguments("secret path of the format '<vaultName>:<secretName>'")
        .option('-e, --env', 'wrap the secret in an environment variable declaration')
        .action(_1.actionRunner(async (options) => {
        var _a, _b;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = _1.determineNodePath(options);
        const isEnv = (_a = options.env) !== null && _a !== void 0 ? _a : false;
        const isVerbose = (_b = options.verbose) !== null && _b !== void 0 ? _b : false;
        const secretPath = Array.from(options.args.values());
        if (secretPath.length < 1 || (secretPath.length == 1 && !pathRegex.test(secretPath[0]))) {
            throw Error("please specify the secret using the format: '<vaultName>:<secretName>'");
        }
        else if (secretPath.length > 1) {
            throw Error('you can only get one secret at a time');
        }
        const firstEntry = secretPath[0];
        const [_, vaultName, secretName] = firstEntry.match(pathRegex);
        try {
            // Retrieve secret
            const secret = await client.getSecret(nodePath, vaultName, secretName);
            if (isEnv) {
                _1.pkLogger(`export ${secretName.toUpperCase().replace('-', '_')}='${secret.toString()}'`, _1.PKMessageType.none);
            }
            else {
                _1.pkLogger(secret.toString(), _1.PKMessageType.none);
            }
        }
        catch (err) {
            throw Error(`Error when retrieving secret: ${err.message}`);
        }
    }));
}
function makeSecretEnvCommand() {
    return new commander_1.default.Command('env')
        .storeOptionsAsProperties(false)
        .description('run a modified environment with injected secrets')
        .option('--command <command>', 'In the environment of the derivation, run the shell command cmd. This command is executed in an interactive shell. (Use --run to use a non-interactive shell instead.)')
        .option('--run <run>', 'Like --command, but executes the command in a non-interactive shell. This means (among other things) that if you hit Ctrl-C while the command is running, the shell exits.')
        .arguments("secrets to inject into env, of the format '<vaultName>:<secretName>'. you can also control what the environment variable will be called using '<vaultName>:<secretName>=<variableName>', defaults to upper, snake case of the original secret name.")
        .action(_1.actionRunner(async (cmd) => {
        var _a;
        const options = cmd.opts();
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = _1.determineNodePath(options);
        const isVerbose = (_a = options.verbose) !== null && _a !== void 0 ? _a : false;
        const command = options.command;
        const run = options.run;
        const secretPathList = Array.from(cmd.args.values());
        if (secretPathList.length < 1) {
            throw Error("please specify at least one secret");
        }
        // Parse secret paths in list
        const parsedPathList = [];
        for (const path of secretPathList) {
            if (!pathRegex.test(path)) {
                throw Error(`secret path was not of the format '<vaultName>:<secretName>[=<variableName>]': ${path}`);
            }
            const [_, vaultName, secretName, variableName] = path.match(pathRegex);
            parsedPathList.push({
                vaultName,
                secretName,
                variableName: variableName !== null && variableName !== void 0 ? variableName : secretName.toUpperCase().replace('-', '_')
            });
        }
        const secretEnv = { ...process_1.default.env };
        try {
            // Get all the secrets
            for (const obj of parsedPathList) {
                const secret = await client.getSecret(nodePath, obj.vaultName, obj.secretName);
                secretEnv[obj.variableName] = secret.toString();
            }
        }
        catch (err) {
            throw Error(`Error when retrieving secret: ${err.message}`);
        }
        try {
            const shellPath = process_1.default.env.SHELL;
            const args = [];
            if (command && run) {
                throw Error('only one of --command or --run can be specified');
            }
            else if (command) {
                args.push('-i');
                args.push('-c');
                args.push(`"${command}"`);
            }
            else if (run) {
                args.push('-c');
                args.push(`"${run}"`);
            }
            const shell = child_process_1.spawn(shellPath, args, {
                stdio: 'inherit',
                env: secretEnv,
                shell: true
            });
            shell.on('close', (code) => {
                if (code != 0) {
                    _1.pkLogger(`polykey: environment terminated with code: ${code}`, _1.PKMessageType.WARNING);
                }
            });
        }
        catch (err) {
            throw Error(`Error when running environment: ${err.message}`);
        }
    }));
}
function makeSecretsCommand() {
    return new commander_1.default.Command('secrets')
        .description('manipulate secrets for a given vault')
        .addCommand(makeListSecretsCommand())
        .addCommand(makeNewSecretCommand())
        .addCommand(makeUpdateSecretCommand())
        .addCommand(makeDeleteSecretCommand())
        .addCommand(makeGetSecretCommand())
        .addCommand(makeSecretEnvCommand());
}
exports.default = makeSecretsCommand;


/***/ }),
/* 10 */
/***/ (function(module, exports) {

module.exports = require("process");

/***/ }),
/* 11 */
/***/ (function(module, exports) {

module.exports = require("child_process");

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(__webpack_require__(1));
const Polykey_1 = __webpack_require__(2);
const _1 = __webpack_require__(0);
function makeNewKeyCommand() {
    return new commander_1.default.Command('new')
        .description('derive a new symmetric key')
        .option('--node-path <nodePath>', 'node path')
        .requiredOption('-n, --key-name <keyName>', 'the name of the new key')
        .requiredOption('-p, --key-passphrase <keyPassphrase>', 'the passphrase for the new key')
        .action(_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = _1.determineNodePath(options);
        const keyName = options.keyName;
        const keyPassphrase = options.keyPassphrase;
        await client.deriveKey(nodePath, keyName, keyPassphrase);
        _1.pkLogger(`'${keyName}' was added to the Key Manager`, _1.PKMessageType.SUCCESS);
    }));
}
function makeDeleteKeyCommand() {
    return new commander_1.default.Command('delete')
        .description('delete a symmetric key from the key manager')
        .option('--node-path <nodePath>', 'node path')
        .requiredOption('-n, --key-name <keyName>', 'the name of the symmetric key to be deleted')
        .action(_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = _1.determineNodePath(options);
        const keyName = options.keyName;
        const successful = await client.deleteKey(nodePath, keyName);
        _1.pkLogger(`key '${keyName}' was ${successful ? '' : 'un-'}sucessfully deleted`, successful ? _1.PKMessageType.SUCCESS : _1.PKMessageType.INFO);
    }));
}
function makeListKeysCommand() {
    return new commander_1.default.Command('list')
        .alias('ls')
        .description('list all symmetric keys in the keynode')
        .option('--node-path <nodePath>', 'node path')
        .action(_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = _1.determineNodePath(options);
        const keyNames = await client.listKeys(nodePath);
        for (const name of keyNames) {
            _1.pkLogger(name, _1.PKMessageType.INFO);
        }
    }));
}
function makeGetKeyCommand() {
    return new commander_1.default.Command('get')
        .description('get the contents of a specific symmetric key')
        .option('--node-path <nodePath>', 'node path')
        .requiredOption('-n, --key-name <keyName>', 'the name of the new key')
        .action(_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = _1.determineNodePath(options);
        const keyName = options.keyName;
        const keyContent = await client.getKey(nodePath, keyName);
        _1.pkLogger(keyContent, _1.PKMessageType.INFO);
    }));
}
function makeListPrimaryKeyPairCommand() {
    return new commander_1.default.Command('primary')
        .description('get the contents of the primary keypair')
        .option('--node-path <nodePath>', 'node path')
        .option('-p, --private-key', 'include private key')
        .option('-j, --output-json', 'output in JSON format')
        .action(_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = _1.determineNodePath(options);
        const privateKey = options.privateKey;
        const outputJson = options.outputJson;
        const keypair = await client.getPrimaryKeyPair(nodePath, privateKey);
        if (outputJson) {
            _1.pkLogger(JSON.stringify(keypair), _1.PKMessageType.INFO);
        }
        else {
            _1.pkLogger("Public Key:", _1.PKMessageType.SUCCESS);
            _1.pkLogger(keypair.publicKey, _1.PKMessageType.INFO);
            if (privateKey) {
                _1.pkLogger("Private Key:", _1.PKMessageType.SUCCESS);
                _1.pkLogger(keypair.privateKey, _1.PKMessageType.INFO);
            }
        }
    }));
}
function makeKeyManagerCommand() {
    return new commander_1.default.Command('keys')
        .description('manipulate keys')
        .addCommand(makeNewKeyCommand())
        .addCommand(makeDeleteKeyCommand())
        .addCommand(makeListKeysCommand())
        .addCommand(makeGetKeyCommand())
        .addCommand(makeListPrimaryKeyPairCommand());
}
exports.default = makeKeyManagerCommand;


/***/ }),
/* 13 */
/***/ (function(module, exports) {

module.exports = require("../../package.json");

/***/ })
/******/ ]);
});