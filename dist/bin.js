(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["bin"] = factory();
	else
		root["bin"] = factory();
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
/******/ 	return __webpack_require__(__webpack_require__.s = 31);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Peer_1 = __webpack_require__(7);
const utils_1 = __webpack_require__(11);
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
/* 1 */
/***/ (function(module, exports) {

module.exports = require("path");

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = require("commander");

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = require("fs");

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(__webpack_require__(8));
const PeerInfo_1 = __importDefault(__webpack_require__(0));
exports.PeerInfo = PeerInfo_1.default;
const KeyManager_1 = __importDefault(__webpack_require__(34));
exports.KeyManager = KeyManager_1.default;
const PeerManager_1 = __importDefault(__webpack_require__(37));
exports.PeerManager = PeerManager_1.default;
const VaultManager_1 = __importDefault(__webpack_require__(48));
exports.VaultManager = VaultManager_1.default;
const PolykeyAgent_1 = __importDefault(__webpack_require__(65));
exports.PolykeyAgent = PolykeyAgent_1.default;
const PolykeyClient_1 = __importDefault(__webpack_require__(29));
exports.PolykeyClient = PolykeyClient_1.default;
class Polykey {
    constructor(polykeyPath = `${os_1.default.homedir()}/.polykey`, fileSystem, keyManager, peerManager, vaultManager) {
        this.polykeyPath = polykeyPath;
        // Set key manager
        this.keyManager = keyManager !== null && keyManager !== void 0 ? keyManager : new KeyManager_1.default(this.polykeyPath, fileSystem);
        // Initialize peer store and peer discovery classes
        this.peerManager = peerManager !== null && peerManager !== void 0 ? peerManager : new PeerManager_1.default(this.polykeyPath, fileSystem, this.keyManager);
        // Set or Initialize vaultManager
        this.vaultManager = vaultManager !== null && vaultManager !== void 0 ? vaultManager : new VaultManager_1.default(this.polykeyPath, fileSystem, this.keyManager, this.peerManager);
    }
}
exports.default = Polykey;


/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = require("../proto/js/Agent");

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(__webpack_require__(8));
const chalk_1 = __importDefault(__webpack_require__(68));
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
function determineNodePath(nodePath) {
    const resolvedNodePath = nodePath !== null && nodePath !== void 0 ? nodePath : process.env.KEYNODE_PATH;
    if (!resolvedNodePath) {
        throw Error('no keynode path given, you can set it as an environment variable with "export KEYNODE_PATH=\'<path>\'"');
    }
    return resolveTilde(resolvedNodePath);
}
exports.determineNodePath = determineNodePath;


/***/ }),
/* 7 */
/***/ (function(module, exports) {

module.exports = require("../proto/js/Peer");

/***/ }),
/* 8 */
/***/ (function(module, exports) {

module.exports = require("os");

/***/ }),
/* 9 */
/***/ (function(module, exports) {

module.exports = require("events");

/***/ }),
/* 10 */
/***/ (function(module, exports) {

module.exports = require("net");

/***/ }),
/* 11 */
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
const protobufjs = __importStar(__webpack_require__(33));
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
/* 12 */
/***/ (function(module, exports) {

module.exports = require("../proto/compiled/Peer_pb");

/***/ }),
/* 13 */
/***/ (function(module, exports) {

module.exports = require("readable-stream");

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dgram_1 = __importDefault(__webpack_require__(16));
const cyclist_1 = __importDefault(__webpack_require__(41));
const events_1 = __webpack_require__(9);
const readable_stream_1 = __webpack_require__(13);
const PeerInfo_1 = __webpack_require__(0);
const EXTENSION = 0;
const VERSION = 1;
const UINT16 = 0xffff;
const ID_MASK = 0xf << 4;
const MTU = 1400;
const PACKET_DATA = 0 << 4;
const PACKET_FIN = 1 << 4;
const PACKET_STATE = 2 << 4;
const PACKET_RESET = 3 << 4;
const PACKET_SYN = 4 << 4;
const MIN_PACKET_SIZE = 20;
const DEFAULT_WINDOW_SIZE = 1 << 18;
const CLOSE_GRACE = 5000;
const BUFFER_SIZE = 512;
const uint32 = function (n) {
    return n >>> 0;
};
const uint16 = function (n) {
    return n & UINT16;
};
const timestamp = (function () {
    const offset = process.hrtime();
    const then = Date.now() * 1000;
    return function () {
        const diff = process.hrtime(offset);
        return uint32(then + 1000000 * diff[0] + ((diff[1] / 1000) | 0));
    };
})();
const bufferToPacket = function (buffer) {
    const packet = {
        id: buffer[0] & ID_MASK,
        connection: buffer.readUInt16BE(2),
        timestamp: buffer.readUInt32BE(4),
        timediff: buffer.readUInt32BE(8),
        window: buffer.readUInt32BE(12),
        seq: buffer.readUInt16BE(16),
        ack: buffer.readUInt16BE(18),
        data: buffer.length > 20 ? buffer.slice(20) : null,
    };
    return packet;
};
const packetToBuffer = function (packet) {
    const buffer = Buffer.alloc(20 + (packet.data ? packet.data.length : 0));
    buffer[0] = packet.id | VERSION;
    buffer[1] = EXTENSION;
    buffer.writeUInt16BE(packet.connection, 2);
    buffer.writeUInt32BE(packet.timestamp, 4);
    buffer.writeUInt32BE(packet.timediff, 8);
    buffer.writeUInt32BE(packet.window, 12);
    buffer.writeUInt16BE(packet.seq, 16);
    buffer.writeUInt16BE(packet.ack, 18);
    if (packet.data) {
        packet.data.copy(buffer, 20);
    }
    return buffer;
};
const createPacket = function (connection, id, data) {
    return {
        id: id,
        connection: id === PACKET_SYN ? connection._recvId : connection._sendId,
        seq: connection._seq,
        ack: connection._ack,
        timestamp: timestamp(),
        timediff: 0,
        window: DEFAULT_WINDOW_SIZE,
        data: data,
        sent: 0,
    };
};
class MTPConnection extends readable_stream_1.Duplex {
    constructor(port, host, socket, syn) {
        super();
        this.remoteAddress = new PeerInfo_1.Address(host, port);
        if (isNaN(port)) {
            throw Error('port cannot be NaN');
        }
        this.port = port;
        this.host = host;
        this.socket = socket;
        this._outgoing = cyclist_1.default(BUFFER_SIZE);
        this._incoming = cyclist_1.default(BUFFER_SIZE);
        this._closed = false;
        this._inflightPackets = 0;
        this._closed = false;
        this._alive = false;
        if (syn) {
            this._connecting = false;
            this._recvId = uint16(syn.connection + 1);
            this._sendId = syn.connection;
            this._seq = (Math.random() * UINT16) | 0;
            this._ack = syn.seq;
            this._synack = createPacket(this, PACKET_STATE, null);
            this._transmit(this._synack);
        }
        else {
            this._connecting = true;
            this._recvId = 0; // tmp value for v8 opt
            this._sendId = 0; // tmp value for v8 opt
            this._seq = (Math.random() * UINT16) | 0;
            this._ack = 0;
            this._synack = undefined;
            socket.on('listening', () => {
                this._recvId = socket.address().port; // using the port gives us system wide clash protection
                this._sendId = uint16(this._recvId + 1);
                this._sendOutgoing(createPacket(this, PACKET_SYN, null));
            });
            socket.on('error', (err) => {
                this.emit('error', err);
            });
            socket.bind();
        }
        const resend = setInterval(this._resend.bind(this), 500);
        const keepAlive = setInterval(this._keepAlive.bind(this), 10 * 1000);
        let tick = 0;
        const closed = () => {
            if (++tick === 2) {
                this._closing();
            }
        };
        const sendFin = () => {
            if (this._connecting) {
                return this.once('connect', sendFin);
            }
            this._sendOutgoing(createPacket(this, PACKET_FIN, null));
            this.once('flush', closed);
        };
        this.once('finish', sendFin);
        this.once('close', () => {
            if (!syn) {
                setTimeout(socket.close.bind(socket), CLOSE_GRACE);
            }
            clearInterval(resend);
            clearInterval(keepAlive);
        });
        this.once('end', () => {
            process.nextTick(closed);
        });
    }
    get RecvID() {
        return this._recvId;
    }
    destroy(err, callback) {
        this.end();
        return this;
    }
    address() {
        return new PeerInfo_1.Address(this.host, this.port);
    }
    _read() {
        // do nothing...
    }
    _write(data, enc, callback) {
        if (this._connecting) {
            return this._writeOnce('connect', data, enc, callback);
        }
        while (this._writable()) {
            const payload = this._payload(data);
            this._sendOutgoing(createPacket(this, PACKET_DATA, payload));
            if (payload.length === data.length) {
                return callback();
            }
            data = data.slice(payload.length);
        }
        this._writeOnce('flush', data, enc, callback);
    }
    _writeOnce(event, data, enc, callback) {
        this.once(event, () => {
            this._write(data, enc, callback);
        });
    }
    _writable() {
        return this._inflightPackets < BUFFER_SIZE - 1;
    }
    _payload(data) {
        if (data.length > MTU) {
            return data.slice(0, MTU);
        }
        return data;
    }
    _resend() {
        const offset = this._seq - this._inflightPackets;
        const first = this._outgoing.get(offset);
        if (!first) {
            return;
        }
        const timeout = 500000;
        const now = timestamp();
        if (uint32(first.sent - now) < timeout) {
            return;
        }
        for (let i = 0; i < this._inflightPackets; i++) {
            const packet = this._outgoing.get(offset + i);
            if (uint32(packet.sent - now) >= timeout) {
                this._transmit(packet);
            }
        }
    }
    _keepAlive() {
        if (this._alive) {
            return (this._alive = false);
        }
        this._sendAck();
    }
    _closing() {
        if (this._closed) {
            return;
        }
        this._closed = true;
        process.nextTick(this.emit.bind(this, 'close'));
    }
    // packet handling
    _recvAck(ack) {
        const offset = this._seq - this._inflightPackets;
        const acked = uint16(ack - offset) + 1;
        if (acked >= BUFFER_SIZE) {
            return; // sanity check
        }
        for (let i = 0; i < acked; i++) {
            this._outgoing.del(offset + i);
            this._inflightPackets--;
        }
        if (!this._inflightPackets) {
            this.emit('flush');
        }
    }
    _recvIncoming(packet) {
        if (this._closed) {
            return;
        }
        if (packet.id === PACKET_SYN && this._connecting) {
            this._transmit(this._synack);
            return;
        }
        if (packet.id === PACKET_RESET) {
            this.push(null);
            this.end();
            this._closing();
            return;
        }
        if (this._connecting) {
            if (packet.id !== PACKET_STATE) {
                return this._incoming.put(packet.seq, packet);
            }
            this._ack = uint16(packet.seq - 1);
            this._recvAck(packet.ack);
            this._connecting = false;
            this.emit('connect');
            packet = this._incoming.del(packet.seq);
            if (!packet) {
                return;
            }
        }
        if (uint16(packet.seq - this._ack) >= BUFFER_SIZE) {
            return this._sendAck(); // old packet
        }
        this._recvAck(packet.ack); // TODO: other calcs as well
        if (packet.id === PACKET_STATE) {
            return;
        }
        this._incoming.put(packet.seq, packet);
        while ((packet = this._incoming.del(this._ack + 1))) {
            this._ack = uint16(this._ack + 1);
            if (packet.id === PACKET_DATA) {
                this.push(packet.data);
            }
            if (packet.id === PACKET_FIN) {
                this.push(null);
            }
        }
        this._sendAck();
    }
    _sendAck() {
        this._transmit(createPacket(this, PACKET_STATE, null)); // TODO: make this delayed
    }
    _sendOutgoing(packet) {
        this._outgoing.put(packet.seq, packet);
        this._seq = uint16(this._seq + 1);
        this._inflightPackets++;
        this._transmit(packet);
    }
    _transmit(packet) {
        try {
            packet.sent = packet.sent === 0 ? packet.timestamp : timestamp();
            const message = packetToBuffer(packet);
            this._alive = true;
            this.socket.send(message, 0, message.length, this.port, this.host);
        }
        catch (error) { }
    }
}
exports.MTPConnection = MTPConnection;
class UTPServer extends events_1.EventEmitter {
    constructor() {
        super();
        this._connections = {};
    }
    address() {
        return PeerInfo_1.Address.fromAddressInfo(this._socket.address());
    }
    listenSocket(socket, onlistening) {
        this._socket = socket;
        const connections = this._connections;
        socket.on('message', (message, rinfo) => {
            if (message.length < MIN_PACKET_SIZE) {
                return;
            }
            const packet = bufferToPacket(message);
            const id = rinfo.address + ':' + (packet.id === PACKET_SYN ? uint16(packet.connection + 1) : packet.connection);
            if (connections[id]) {
                return connections[id]._recvIncoming(packet);
            }
            if (packet.id !== PACKET_SYN || this._closed) {
                return;
            }
            connections[id] = new MTPConnection(rinfo.port, rinfo.address, socket, packet);
            connections[id].on('close', () => {
                delete connections[id];
            });
            this.emit('connection', connections[id]);
        });
        socket.once('listening', () => {
            this.emit('listening');
        });
        if (onlistening) {
            this.once('listening', onlistening);
        }
    }
    listen(connection, onlistening) {
        this.listenSocket(connection.socket, onlistening);
    }
    listenPort(port, onlistening) {
        const socket = dgram_1.default.createSocket('udp4');
        this.listenSocket(socket, onlistening);
        socket.bind(port);
    }
    close(cb) {
        let openConnections = 0;
        this._closed = true;
        function onClose() {
            if (--openConnections === 0) {
                if (this._socket) {
                    this._socket.close();
                }
                if (cb) {
                    cb();
                }
            }
        }
        for (const id in this._connections) {
            if (this._connections[id]._closed) {
                continue;
            }
            openConnections++;
            this._connections[id].once('close', onClose);
            this._connections[id].end();
        }
    }
}
exports.UTPServer = UTPServer;
function createServer(onconnection) {
    const server = new UTPServer();
    if (onconnection) {
        server.on('connection', onconnection);
    }
    return server;
}
exports.createServer = createServer;
function connect(port, host) {
    const socket = dgram_1.default.createSocket('udp4');
    const connection = new MTPConnection(port, host || '127.0.0.1', socket, undefined);
    socket.on('message', (message) => {
        if (message.length < MIN_PACKET_SIZE) {
            return;
        }
        const packet = bufferToPacket(message);
        if (packet.id === PACKET_SYN) {
            return;
        }
        if (packet.connection !== connection.RecvID) {
            return;
        }
        connection._recvIncoming(packet);
    });
    return connection;
}
exports.connect = connect;


/***/ }),
/* 15 */
/***/ (function(module, exports) {

module.exports = require("crypto");

/***/ }),
/* 16 */
/***/ (function(module, exports) {

module.exports = require("dgram");

/***/ }),
/* 17 */
/***/ (function(module, exports) {

module.exports = require("@grpc/grpc-js");

/***/ }),
/* 18 */
/***/ (function(module, exports) {

module.exports = require("../proto/compiled/Peer_grpc_pb");

/***/ }),
/* 19 */
/***/ (function(module, exports) {

module.exports = require("isomorphic-git");

/***/ }),
/* 20 */
/***/ (function(module, exports) {

module.exports = require("encryptedfs");

/***/ }),
/* 21 */
/***/ (function(module, exports) {

module.exports = require("virtualfs");

/***/ }),
/* 22 */
/***/ (function(module, exports) {

module.exports = require("../proto/js/Git");

/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
pkt-line Format
---------------

Much (but not all) of the payload is described around pkt-lines.

A pkt-line is a variable length binary string.  The first four bytes
of the line, the pkt-len, indicates the total length of the line,
in hexadecimal.  The pkt-len includes the 4 bytes used to contain
the length's hexadecimal representation.

A pkt-line MAY contain binary data, so implementors MUST ensure
pkt-line parsing/formatting routines are 8-bit clean.

A non-binary line SHOULD BE terminated by an LF, which if present
MUST be included in the total length. Receivers MUST treat pkt-lines
with non-binary data the same whether or not they contain the trailing
LF (stripping the LF if present, and not complaining when it is
missing).

The maximum length of a pkt-line's data component is 65516 bytes.
Implementations MUST NOT send pkt-line whose length exceeds 65520
(65516 bytes of payload + 4 bytes of length data).

Implementations SHOULD NOT send an empty pkt-line ("0004").

A pkt-line with a length field of 0 ("0000"), called a flush-pkt,
is a special case and MUST be handled differently than an empty
pkt-line ("0004").

----
  pkt-line     =  data-pkt / flush-pkt

  data-pkt     =  pkt-len pkt-payload
  pkt-len      =  4*(HEXDIG)
  pkt-payload  =  (pkt-len - 4)*(OCTET)

  flush-pkt    = "0000"
----

Examples (as C-style strings):

----
  pkt-line          actual value
  ---------------------------------
  "0006a\n"         "a\n"
  "0005a"           "a"
  "000bfoobar\n"    "foobar\n"
  "0004"            ""
----
*/
Object.defineProperty(exports, "__esModule", { value: true });
function padHex(b, n) {
    const s = n.toString(16);
    return '0'.repeat(b - s.length) + s;
}
// I'm really using this more as a namespace.
// There's not a lot of "state" in a pkt-line
class GitPktLine {
    static flush() {
        return Buffer.from('0000', 'utf8');
    }
    static encode(line) {
        if (typeof line === 'string') {
            line = Buffer.from(line);
        }
        const length = line.length + 4;
        const hexlength = padHex(4, length);
        return Buffer.concat([Buffer.from(hexlength, 'utf8'), line]);
    }
    static streamReader(stream) {
        return async function read() {
            try {
                let length = await stream.slice(4);
                if (length === null)
                    return true;
                length = parseInt(length.toString('utf8'), 16);
                if (length === 0)
                    return null;
                let buffer = await stream.slice(length - 4);
                if (buffer === null)
                    return true;
                return buffer;
            }
            catch (err) {
                console.log('error', err);
                return true;
            }
        };
    }
}
exports.default = GitPktLine;


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// This is a convenience wrapper for reading and writing files in the 'refs' directory.
const path_1 = __importDefault(__webpack_require__(1));
const GitPackedRefs_1 = __importDefault(__webpack_require__(53));
// @see https://git-scm.com/docs/git-rev-parse.html#_specifying_revisions
const refpaths = (ref) => [
    `${ref}`,
    `refs/${ref}`,
    `refs/tags/${ref}`,
    `refs/heads/${ref}`,
    `refs/remotes/${ref}`,
    `refs/remotes/${ref}/HEAD`,
];
function compareRefNames(a, b) {
    // https://stackoverflow.com/a/40355107/2168416
    const _a = a.replace(/\^\{\}$/, '');
    const _b = b.replace(/\^\{\}$/, '');
    const tmp = -(_a < _b) || +(_a > _b);
    if (tmp === 0) {
        return a.endsWith('^{}') ? 1 : -1;
    }
    return tmp;
}
// @see https://git-scm.com/docs/gitrepository-layout
const GIT_FILES = ['config', 'description', 'index', 'shallow', 'commondir'];
// This function is used to get all the files in the refs folder for listRefs function
async function recursiveDirectoryWalk(dir, fileSystem) {
    return new Promise((resolve, reject) => {
        let results = [];
        fileSystem.promises
            .readdir(dir)
            .then(async (list) => {
            var pending = list.length;
            if (!pending)
                return resolve(results);
            list.forEach(async function (file) {
                file = path_1.default.resolve(dir, file);
                fileSystem.promises.stat(file).then(async (stat) => {
                    if (stat && stat.isDirectory()) {
                        const res = await recursiveDirectoryWalk(file, fileSystem);
                        results = results.concat(res);
                        if (!--pending)
                            resolve(results);
                    }
                    else {
                        results.push(file);
                        if (!--pending)
                            resolve(results);
                    }
                });
            });
        })
            .catch((err) => {
            if (err)
                return reject(err);
        });
    });
}
class GitRefManager {
    static async packedRefs(fileSystem, gitdir) {
        const text = fileSystem.readFileSync(`${gitdir}/packed-refs`, { encoding: 'utf8' });
        const packed = GitPackedRefs_1.default.from(text);
        return packed.refs;
    }
    // List all the refs that match the `filepath` prefix
    static async listRefs(fileSystem, gitdir, filepath) {
        const packedMap = GitRefManager.packedRefs(fileSystem, gitdir);
        let files = [];
        try {
            files = await recursiveDirectoryWalk(`${gitdir}/${filepath}`, fileSystem);
            files = files.map((x) => x.replace(`${gitdir}/${filepath}/`, ''));
        }
        catch (err) {
            files = [];
        }
        for (let key of (await packedMap).keys()) {
            // filter by prefix
            if (key.startsWith(filepath)) {
                // remove prefix
                key = key.replace(filepath + '/', '');
                // Don't include duplicates; the loose files have precedence anyway
                if (!files.includes(key)) {
                    files.push(key);
                }
            }
        }
        // since we just appended things onto an array, we need to sort them now
        files.sort(compareRefNames);
        return files;
    }
    static async resolve(fileSystem, gitdir, ref, depth) {
        if (depth !== undefined) {
            depth--;
            if (depth === -1) {
                return ref;
            }
        }
        // Is it a ref pointer?
        if (ref.startsWith('ref: ')) {
            ref = ref.slice('ref: '.length);
            return GitRefManager.resolve(fileSystem, gitdir, ref, depth);
        }
        // Is it a complete and valid SHA?
        if (ref.length === 40 && /[0-9a-f]{40}/.test(ref)) {
            return ref;
        }
        // We need to alternate between the file system and the packed-refs
        const packedMap = await GitRefManager.packedRefs(fileSystem, gitdir);
        // Look in all the proper paths, in this order
        const allpaths = refpaths(ref).filter((p) => !GIT_FILES.includes(p)); // exclude git system files (#709)
        for (const ref of allpaths) {
            const sha = fileSystem.readFileSync(`${gitdir}/${ref}`, { encoding: 'utf8' }).toString() || packedMap.get(ref);
            if (sha) {
                return GitRefManager.resolve(fileSystem, gitdir, sha.trim(), depth);
            }
        }
        // Do we give up?
        throw Error('RefNotFound');
    }
}
exports.default = GitRefManager;


/***/ }),
/* 25 */
/***/ (function(module, exports) {

module.exports = require("pako");

/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// The amount of work that went into crafting these cases to handle
// -0 (just so we don't lose that information when parsing and reconstructing)
// but can also default to +0 was extraordinary.
Object.defineProperty(exports, "__esModule", { value: true });
function simpleSign(n) {
    return Math.sign(n) || (Object.is(n, -0) ? -1 : 1);
}
function negateExceptForZero(n) {
    return n === 0 ? n : -n;
}
function formatTimezoneOffset(minutes) {
    let sign = simpleSign(negateExceptForZero(minutes));
    minutes = Math.abs(minutes);
    let hours = Math.floor(minutes / 60);
    minutes -= hours * 60;
    let strHours = String(hours);
    let strMinutes = String(minutes);
    if (strHours.length < 2)
        strHours = '0' + strHours;
    if (strMinutes.length < 2)
        strMinutes = '0' + strMinutes;
    return (sign === -1 ? '-' : '+') + strHours + strMinutes;
}
function parseTimezoneOffset(offset) {
    let [, sign, hours, minutes] = offset.match(/(\+|-)(\d\d)(\d\d)/);
    minutes = (sign === '+' ? 1 : -1) * (Number(hours) * 60 + Number(minutes));
    return negateExceptForZero(minutes);
}
function parseAuthor(author) {
    let [, name, email, timestamp, offset] = author.match(/^(.*) <(.*)> (.*) (.*)$/);
    return {
        name: name,
        email: email,
        timestamp: Number(timestamp),
        timezoneOffset: parseTimezoneOffset(offset),
    };
}
function normalize(str) {
    // remove all <CR>
    str = str.replace(/\r/g, '');
    // no extra newlines up front
    str = str.replace(/^\n+/, '');
    // and a single newline at the end
    str = str.replace(/\n+$/, '') + '\n';
    return str;
}
function indent(str) {
    return (str
        .trim()
        .split('\n')
        .map((x) => ' ' + x)
        .join('\n') + '\n');
}
function outdent(str) {
    return str
        .split('\n')
        .map((x) => x.replace(/^ /, ''))
        .join('\n');
}
// TODO: Make all functions have static async signature?
class GitCommit {
    constructor(commit) {
        if (typeof commit === 'string') {
            this._commit = commit;
        }
        else if (Buffer.isBuffer(commit)) {
            this._commit = commit.toString('utf8');
        }
        else if (typeof commit === 'object') {
            this._commit = GitCommit.render(commit);
        }
        else {
            throw new Error('invalid type passed to GitCommit constructor');
        }
    }
    static fromPayloadSignature({ payload, signature }) {
        let headers = GitCommit.justHeaders(payload);
        let message = GitCommit.justMessage(payload);
        let commit = normalize(headers + '\ngpgsig' + indent(signature) + '\n' + message);
        return new GitCommit(commit);
    }
    static from(commit) {
        return new GitCommit(commit);
    }
    toObject() {
        return Buffer.from(this._commit, 'utf8');
    }
    // Todo: allow setting the headers and message
    headers() {
        return this.parseHeaders();
    }
    // Todo: allow setting the headers and message
    message() {
        return GitCommit.justMessage(this._commit);
    }
    parse() {
        return Object.assign({ message: this.message() }, this.headers());
    }
    static justMessage(commit) {
        return normalize(commit.slice(commit.indexOf('\n\n') + 2));
    }
    static justHeaders(commit) {
        return commit.slice(0, commit.indexOf('\n\n'));
    }
    parseHeaders() {
        let headers = GitCommit.justHeaders(this._commit).split('\n');
        let hs = [];
        for (let h of headers) {
            if (h[0] === ' ') {
                // combine with previous header (without space indent)
                hs[hs.length - 1] += '\n' + h.slice(1);
            }
            else {
                hs.push(h);
            }
        }
        let obj = {
            parent: [],
        };
        for (let h of hs) {
            let key = h.slice(0, h.indexOf(' '));
            let value = h.slice(h.indexOf(' ') + 1);
            if (Array.isArray(obj[key])) {
                obj[key].push(value);
            }
            else {
                obj[key] = value;
            }
        }
        if (obj.author) {
            obj.author = parseAuthor(obj.author);
        }
        if (obj.committer) {
            obj.committer = parseAuthor(obj.committer);
        }
        return obj;
    }
    static renderHeaders(obj) {
        let headers = '';
        if (obj.tree) {
            headers += `tree ${obj.tree}\n`;
        }
        else {
            headers += `tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904\n`; // the null tree
        }
        if (obj.parent) {
            if (obj.parent.length === undefined) {
                throw new Error(`commit 'parent' property should be an array`);
            }
            for (let p of obj.parent) {
                headers += `parent ${p}\n`;
            }
        }
        let author = obj.author;
        headers += `author ${author.name} <${author.email}> ${author.timestamp} ${formatTimezoneOffset(author.timezoneOffset)}\n`;
        let committer = obj.committer || obj.author;
        headers += `committer ${committer.name} <${committer.email}> ${committer.timestamp} ${formatTimezoneOffset(committer.timezoneOffset)}\n`;
        if (obj.gpgsig) {
            headers += 'gpgsig' + indent(obj.gpgsig);
        }
        return headers;
    }
    static render(obj) {
        return GitCommit.renderHeaders(obj) + '\n' + normalize(obj.message);
    }
    render() {
        return this._commit;
    }
    withoutSignature() {
        let commit = normalize(this._commit);
        if (commit.indexOf('\ngpgsig') === -1)
            return commit;
        let headers = commit.slice(0, commit.indexOf('\ngpgsig'));
        let message = commit.slice(commit.indexOf('-----END PGP SIGNATURE-----\n') + '-----END PGP SIGNATURE-----\n'.length);
        return normalize(headers + '\n' + message);
    }
    isolateSignature() {
        let signature = this._commit.slice(this._commit.indexOf('-----BEGIN PGP SIGNATURE-----'), this._commit.indexOf('-----END PGP SIGNATURE-----') + '-----END PGP SIGNATURE-----'.length);
        return outdent(signature);
    }
}
exports.default = GitCommit;


/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(__webpack_require__(3));
const pako_1 = __importDefault(__webpack_require__(25));
const path_1 = __importDefault(__webpack_require__(1));
const GitObject_1 = __importDefault(__webpack_require__(58));
const PackfileCache = new Map();
class GitObjectManager {
    static async read(fileSystem, gitdir, oid, format = 'content') {
        // Look for it in the loose object directory.
        let file = fileSystem.readFileSync(`${gitdir}/objects/${oid.slice(0, 2)}/${oid.slice(2)}`);
        let source = `./objects/${oid.slice(0, 2)}/${oid.slice(2)}`;
        // Check to see if it's in a packfile.
        if (!file) {
            // Curry the current read method so that the packfile un-deltification
            // process can acquire external ref-deltas.
            const getExternalRefDelta = (oid) => GitObjectManager.read(fileSystem, gitdir, oid);
            // Iterate through all the .pack files
            let list = fs_1.default.readdirSync(path_1.default.join(gitdir, '/objects/pack'));
            list = list.filter((x) => x.endsWith('.pack'));
            for (let filename of list) {
                // Try to get the packfile from the in-memory cache
                let p = PackfileCache.get(filename);
                // If the packfile DOES have the oid we're looking for...
                if (p.offsets.has(oid)) {
                    // Make sure the packfile is loaded in memory
                    if (!p.pack) {
                        const pack = fileSystem.readFileSync(`${gitdir}/objects/pack/${filename}`);
                        await p.load({ pack });
                    }
                    // Get the resolved git object from the packfile
                    let result = await p.read({ oid, getExternalRefDelta });
                    result.source = `./objects/pack/${filename}`;
                    return result;
                }
            }
        }
        // Check to see if it's in shallow commits.
        if (!file) {
            let text = fileSystem.readFileSync(`${gitdir}/shallow`, { encoding: 'utf8' });
            if (text !== null && text.includes(oid)) {
                throw new Error(`ReadShallowObjectFail: ${oid}`);
            }
        }
        // Finally
        if (!file) {
            throw new Error(`ReadObjectFail: ${oid}`);
        }
        if (format === 'deflated') {
            return { format: 'deflated', object: file, source };
        }
        let buffer = Buffer.from(pako_1.default.inflate(file));
        if (format === 'wrapped') {
            return { format: 'wrapped', object: buffer, source };
        }
        let { type, object } = GitObject_1.default.unwrap({ oid, buffer });
        if (format === 'content')
            return { type, format: 'content', object, source };
    }
}
exports.default = GitObjectManager;


/***/ }),
/* 28 */
/***/ (function(module, exports) {

module.exports = require("process");

/***/ }),
/* 29 */
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
const PeerInfo_1 = __importStar(__webpack_require__(0));
const Agent_1 = __webpack_require__(5);
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


/***/ }),
/* 30 */
/***/ (function(module, exports) {

module.exports = require("child_process");

/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __webpack_require__(2);
const agent_1 = __importDefault(__webpack_require__(32));
const peers_1 = __importDefault(__webpack_require__(69));
const crypto_1 = __importDefault(__webpack_require__(73));
const vaults_1 = __importDefault(__webpack_require__(74));
const secrets_1 = __importDefault(__webpack_require__(75));
const keys_1 = __importDefault(__webpack_require__(76));
/*******************************************/
const polykey = new commander_1.program.Command();
polykey
    .version(__webpack_require__(77).version, '--version', 'output the current version')
    .addCommand(keys_1.default())
    .addCommand(secrets_1.default())
    .addCommand(vaults_1.default())
    .addCommand(peers_1.default())
    .addCommand(crypto_1.default())
    .addCommand(agent_1.default());
module.exports = function (argv) {
    polykey.parse(argv);
};


/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(__webpack_require__(3));
const commander_1 = __importDefault(__webpack_require__(2));
const Polykey_1 = __webpack_require__(4);
const utils_1 = __webpack_require__(6);
const Agent_1 = __webpack_require__(5);
function makeStartAgentCommand() {
    return new commander_1.default.Command('start')
        .description('start the agent')
        .option('-d, --daemon', 'start the agent as a daemon process')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        // Tell agent to stop
        const status = await client.getAgentStatus();
        if (status == Agent_1.agentInterface.AgentStatusType.ONLINE) {
            utils_1.pkLogger('agent is already running', utils_1.PKMessageType.INFO);
        }
        else {
            const pid = await Polykey_1.PolykeyAgent.startAgent(options.daemon);
            utils_1.pkLogger(`agent has started with pid of ${pid}`, utils_1.PKMessageType.SUCCESS);
        }
    }));
}
function makeRestartAgentCommand() {
    return new commander_1.default.Command('restart')
        .description('restart the agent')
        .option('-d, --daemon', 'start the agent as a daemon process')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        // Tell agent to stop
        client.stopAgent();
        const pid = await Polykey_1.PolykeyAgent.startAgent(options.daemon);
        utils_1.pkLogger(`agent has restarted with pid of ${pid}`, utils_1.PKMessageType.SUCCESS);
    }));
}
function makeAgentStatusCommand() {
    return new commander_1.default.Command('status').description('retrieve the status of the agent').action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        utils_1.pkLogger(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`, utils_1.PKMessageType.INFO);
    }));
}
function makeStopAgentCommand() {
    return new commander_1.default.Command('stop')
        .description('stop the agent')
        .option('-f, --force', 'forcibly stop the agent')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status == Agent_1.agentInterface.AgentStatusType.OFFLINE) {
            utils_1.pkLogger('agent is already stopped', utils_1.PKMessageType.INFO);
        }
        else {
            // Tell agent to stop
            await client.stopAgent();
            if (options.force ? true : false) {
                fs_1.default.unlinkSync(Polykey_1.PolykeyAgent.SocketPath);
            }
            const status = await client.getAgentStatus();
            if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
                utils_1.pkLogger('agent has successfully stopped', utils_1.PKMessageType.SUCCESS);
            }
            else {
                throw Error('agent failed to stop');
            }
        }
    }));
}
function makeListNodesCommand() {
    return new commander_1.default.Command('list')
        .alias('ls')
        .description('list all the nodes controlled by the node')
        .option('-u, --unlocked-only, only list the nodes that are unlocked')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodes = await client.listNodes(options.unlockedOnly ? true : false);
        if (nodes.length == 0) {
            utils_1.pkLogger('no nodes were listed', utils_1.PKMessageType.INFO);
        }
        else {
            for (const node of nodes) {
                utils_1.pkLogger(node, utils_1.PKMessageType.INFO);
            }
        }
    }));
}
function makeNewNodeCommand() {
    return new commander_1.default.Command('create')
        .description('create a new polykey node')
        .option('-k, --node-path <nodePath>', 'provide the polykey path. defaults to ~/.polykey')
        .requiredOption('-ui, --user-id <userId>', 'provide an identifier for the keypair to be generated')
        .requiredOption('-pp, --private-passphrase <privatePassphrase>', 'provide the passphrase to the private key')
        .option('-nb, --number-of-bits <numberOfBits>', 'number of bits to use for key pair generation')
        .option('-v, --verbose', 'increase verbosity by one level')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const successful = await client.newNode(utils_1.determineNodePath(options.nodePath), options.userId, options.privatePassphrase, parseInt(options.numberOfBits));
        if (successful) {
            utils_1.pkLogger(`node was successfully generated at: '${nodePath}'`, utils_1.PKMessageType.SUCCESS);
        }
        else {
            throw Error('something went wrong with node creation');
        }
    }));
}
function makeLoadNodeCommand() {
    return new commander_1.default.Command('load')
        .description('load an existing polykey node')
        .option('-k, --node-path <nodePath>', 'provide the polykey path. defaults to ~/.polykey')
        .requiredOption('-pp, --private-passphrase <privatePassphrase>', 'provide the passphrase to the private key')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const successful = await client.registerNode(nodePath, options.privatePassphrase);
        if (successful) {
            utils_1.pkLogger(`node was successfully loaded at: '${nodePath}'`, utils_1.PKMessageType.SUCCESS);
        }
        else {
            throw Error('something went wrong when loading node');
        }
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
/* 33 */
/***/ (function(module, exports) {

module.exports = require("protobufjs");

/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(__webpack_require__(8));
const fs_1 = __importDefault(__webpack_require__(3));
const path_1 = __importDefault(__webpack_require__(1));
const kbpgp_1 = __importDefault(__webpack_require__(35));
const crypto_1 = __importDefault(__webpack_require__(15));
const util_1 = __webpack_require__(36);
class KeyManager {
    constructor(polyKeyPath = `${os_1.default.homedir()}/.polykey`, fileSystem, useWebWorkers = false, workerPool) {
        this.primaryKeyPair = { private: null, public: null };
        this.metadata = {
            privateKeyPath: null,
            publicKeyPath: null,
            pkiKeyPath: null,
            pkiCertPath: null,
            caCertPath: null,
        };
        /////////
        // PKI //
        /////////
        this.pkiInfo = { key: null, cert: null, caCert: null };
        this.useWebWorkers = useWebWorkers;
        this.workerPool = workerPool;
        this.derivedKeys = new Map();
        this.fileSystem = fileSystem;
        // Load key manager metadata
        this.polykeyPath = polyKeyPath;
        this.keypairPath = path_1.default.join(polyKeyPath, '.keys');
        if (!this.fileSystem.existsSync(this.keypairPath)) {
            this.fileSystem.mkdirSync(this.keypairPath, { recursive: true });
        }
        this.metadataPath = path_1.default.join(this.keypairPath, 'metadata');
        this.derivedKeysPath = path_1.default.join(this.keypairPath, 'derived-keys');
        this.loadMetadata();
        // Load keys if they were provided
        if (this.metadata.privateKeyPath && this.metadata.publicKeyPath) {
            // Load files into memory
            this.loadKeyPair(this.metadata.publicKeyPath, this.metadata.privateKeyPath);
        }
        /////////
        // PKI //
        /////////
        // Load pki keys and certs
        if (this.metadata.pkiKeyPath) {
            this.pkiInfo.key = fs_1.default.readFileSync(this.metadata.pkiKeyPath);
        }
        if (this.metadata.pkiCertPath) {
            this.pkiInfo.cert = fs_1.default.readFileSync(this.metadata.pkiCertPath);
        }
        if (this.metadata.caCertPath) {
            this.pkiInfo.caCert = fs_1.default.readFileSync(this.metadata.caCertPath);
        }
        this.loadPKIInfo(this.pkiInfo.key, this.pkiInfo.cert, this.pkiInfo.caCert, true);
    }
    get identityLoaded() {
        return this.primaryIdentity ? true : false;
    }
    /**
     * Generates a new assymetric key pair (publicKey and privateKey).
     * @param name Name of keypair owner
     * @param email Email of keypair owner
     * @param passphrase Passphrase to lock the keypair
     * @param nbits Size of the new keypair
     * @param replacePrimary If true, the generated keypair becomes the new primary identity of the key manager
     * @param progressCallback A progress hook for keypair generation
     */
    async generateKeyPair(userId, passphrase, nbits = 4096, replacePrimary = false, progressCallback) {
        // kbpgp doesn't seem to work for small nbits so set a minimum of 1024
        if (nbits < 1024) {
            throw Error('nbits must be greater than 1024 for keypair generation');
        }
        // Define options
        const flags = kbpgp_1.default['const'].openpgp;
        const params = {
            asp: progressCallback ? new kbpgp_1.default.ASP({ progress_hook: progressCallback }) : undefined,
            userid: userId,
            primary: {
                nbits: nbits,
                flags: flags.certify_keys | flags.sign_data | flags.auth | flags.encrypt_comm | flags.encrypt_storage,
                expire_in: 0,
            },
            subkeys: [],
        };
        const identity = await util_1.promisify(kbpgp_1.default.KeyManager.generate)(params);
        await util_1.promisify(identity.sign.bind(identity))({});
        // Export pub key first
        const publicKey = await util_1.promisify(identity.export_pgp_public.bind(identity))({});
        // Finally export priv key
        const privateKey = await util_1.promisify(identity.export_pgp_private.bind(identity))({ passphrase: passphrase });
        // Resolve to parent promise
        const keypair = { private: privateKey, public: publicKey };
        if (replacePrimary) {
            // Set the new keypair
            this.primaryKeyPair = keypair;
            // Set the new identity
            this.primaryIdentity = identity;
            // Overwrite in memory
            const privateKeyPath = path_1.default.join(this.keypairPath, 'private_key');
            const publicKeyPath = path_1.default.join(this.keypairPath, 'public_key');
            await this.fileSystem.promises.writeFile(privateKeyPath, keypair.private);
            await this.fileSystem.promises.writeFile(publicKeyPath, keypair.public);
            // Set metadata
            this.metadata.privateKeyPath = privateKeyPath;
            this.metadata.publicKeyPath = publicKeyPath;
            this.writeMetadata();
        }
        return keypair;
    }
    /**
     * Get the primary keypair
     */
    getKeyPair() {
        return this.primaryKeyPair;
    }
    /**
     * Determines whether public key is loaded or not
     */
    hasPublicKey() {
        return this.primaryKeyPair.public ? true : false;
    }
    /**
     * Get the public key of the primary keypair
     */
    getPublicKey() {
        if (!this.primaryKeyPair.public) {
            throw Error('Public key does not exist in memory');
        }
        return this.primaryKeyPair.public;
    }
    /**
     * Get the private key of the primary keypair
     */
    getPrivateKey() {
        if (!this.primaryKeyPair.private) {
            throw Error('Private key does not exist in memory');
        }
        return this.primaryKeyPair.private;
    }
    /**
     * Loads the keypair into the key manager as the primary identity
     * @param publicKey Public Key
     * @param privateKey Private Key
     */
    loadKeyPair(publicKey, privateKey) {
        this.loadPrivateKey(privateKey);
        this.loadPublicKey(publicKey);
    }
    /**
     * Loads the private key into the primary keypair
     * @param privateKey Private Key
     */
    loadPrivateKey(privateKey) {
        let keyBuffer;
        if (typeof privateKey === 'string') {
            keyBuffer = this.fileSystem.readFileSync(privateKey);
            this.metadata.privateKeyPath = privateKey;
            this.writeMetadata();
        }
        else {
            keyBuffer = privateKey;
        }
        this.primaryKeyPair.private = keyBuffer.toString();
    }
    /**
     * Loads the public key into the primary keypair
     * @param publicKey Public Key
     */
    loadPublicKey(publicKey) {
        let keyBuffer;
        if (typeof publicKey === 'string') {
            keyBuffer = this.fileSystem.readFileSync(publicKey);
            this.metadata.publicKeyPath = publicKey;
            this.writeMetadata();
        }
        else {
            keyBuffer = publicKey;
        }
        this.primaryKeyPair.public = keyBuffer.toString();
    }
    /**
     * Loads the primary identity into the key manager from the existing keypair
     * @param passphrase Passphrase to unlock the private key
     */
    async unlockIdentity(passphrase) {
        const publicKey = this.getPublicKey();
        const privateKey = this.getPrivateKey();
        const identity = await util_1.promisify(kbpgp_1.default.KeyManager.import_from_armored_pgp)({ armored: publicKey });
        await util_1.promisify(identity.merge_pgp_private.bind(identity))({ armored: privateKey });
        if (identity.is_pgp_locked.bind(identity)()) {
            await util_1.promisify(identity.unlock_pgp.bind(identity))({ passphrase: passphrase });
        }
        this.primaryIdentity = identity;
    }
    /**
     * Export the primary private key to a specified location
     * @param path Destination path
     */
    exportPrivateKey(path) {
        this.fileSystem.writeFileSync(path, this.primaryKeyPair.private);
        this.metadata.privateKeyPath = path;
        this.writeMetadata();
    }
    /**
     * Export the primary public key to a specified location
     * @param path Destination path
     */
    exportPublicKey(path) {
        this.fileSystem.writeFileSync(path, this.primaryKeyPair.public);
        this.metadata.publicKeyPath = path;
        this.writeMetadata();
    }
    /**
     * Asynchronously Generates a new symmetric key and stores it in the key manager
     * @param name Unique name of the generated key
     * @param passphrase Passphrase to derive the key from
     * @param storeKey Whether to store the key in the key manager
     */
    async generateKey(name, passphrase, storeKey = true) {
        const salt = crypto_1.default.randomBytes(32);
        const key = await util_1.promisify(crypto_1.default.pbkdf2)(passphrase, salt, 10000, 256 / 8, 'sha256');
        if (storeKey) {
            this.derivedKeys[name] = key;
            await this.writeMetadata();
        }
        return key;
    }
    /**
     * Deletes a derived symmetric key from the key manager
     * @param name Name of the key to be deleted
     */
    async deleteKey(name) {
        const successful = delete this.derivedKeys[name];
        await this.writeMetadata();
        return successful;
    }
    /**
     * List all keys in the current keymanager
     */
    listKeys() {
        return Object.keys(this.derivedKeys);
    }
    /**
     * Synchronously imports an existing key from file or Buffer
     * @param name Unique name of the imported key
     * @param key Key to be imported
     */
    importKeySync(name, key) {
        if (typeof key === 'string') {
            this.derivedKeys[name] = this.fileSystem.readFileSync(key);
        }
        else {
            this.derivedKeys[name] = key;
        }
    }
    /**
     * Asynchronously imports an existing key from file or Buffer
     * @param name Unique name of the imported key
     * @param key Key to be imported
     */
    async importKey(name, key) {
        if (typeof key === 'string') {
            this.derivedKeys[name] = await this.fileSystem.promises.readFile(key);
        }
        else {
            this.derivedKeys[name] = key;
        }
    }
    /**
     * Synchronously exports an existing key from file or Buffer
     * @param name Name of the key to be exported
     * @param dest Destination path
     * @param createPath If set to true, the path is recursively created
     */
    exportKeySync(name, dest, createPath) {
        if (!this.derivedKeys.has(name)) {
            throw Error(`There is no key loaded for name: ${name}`);
        }
        if (createPath) {
            this.fileSystem.mkdirSync(path_1.default.dirname(dest), { recursive: true });
        }
        this.fileSystem.writeFileSync(dest, this.derivedKeys[name]);
    }
    /**
     * Asynchronously exports an existing key from file or Buffer
     * @param name Name of the key to be exported
     * @param dest Destination path
     * @param createPath If set to true, the path is recursively created
     */
    async exportKey(name, dest, createPath) {
        if (!this.derivedKeys.has(name)) {
            throw Error(`There is no key loaded for name: ${name}`);
        }
        if (createPath) {
            await this.fileSystem.promises.mkdir(path_1.default.dirname(dest), { recursive: true });
        }
        await this.fileSystem.promises.writeFile(dest, this.derivedKeys[name]);
    }
    /**
     * Loads an identity from the given public key
     * @param publicKey Buffer containing the public key
     */
    async getIdentityFromPublicKey(publicKey) {
        const identity = await util_1.promisify(kbpgp_1.default.KeyManager.import_from_armored_pgp)({ armored: publicKey });
        return identity;
    }
    /**
     * Loads an identity from the given private key
     * @param publicKey Buffer containing the public key
     */
    async getIdentityFromPrivateKey(privateKey, passphrase) {
        const identity = await util_1.promisify(kbpgp_1.default.KeyManager.import_from_armored_pgp)({ armored: privateKey });
        if (identity.is_pgp_locked()) {
            await util_1.promisify(identity.unlock_pgp.bind(identity))({ passphrase });
        }
        return identity;
    }
    /**
     * Signs the given data with the provided key or the primary key if none is specified
     * @param data Buffer or file containing the data to be signed
     * @param privateKey Buffer containing the key to sign with. Defaults to primary private key if no key is given.
     * @param keyPassphrase Required if privateKey is provided.
     */
    async signData(data, privateKey, keyPassphrase) {
        let resolvedIdentity;
        if (privateKey) {
            if (!keyPassphrase) {
                throw Error('passphrase for private key was not provided');
            }
            resolvedIdentity = await this.getIdentityFromPrivateKey(privateKey, keyPassphrase);
        }
        else if (this.primaryIdentity) {
            resolvedIdentity = this.primaryIdentity;
        }
        else {
            throw Error('key pair is not loaded');
        }
        if (this.useWebWorkers && this.workerPool) {
            const workerResponse = await this.workerPool.queue(async (workerCrypto) => {
                return await workerCrypto.signData(data, resolvedIdentity);
            });
            return workerResponse;
        }
        else {
            const params = {
                msg: data.toString(),
                sign_with: resolvedIdentity,
            };
            const result_string = await util_1.promisify(kbpgp_1.default.box)(params);
            return Buffer.from(result_string);
        }
    }
    /**
     * Signs the given file with the provided key or the primary key if none is specified
     * @param filePath Path to file containing the data to be signed
     * @param privateKey The key to sign with. Defaults to primary public key if no key is given.
     * @param keyPassphrase Required if privateKey is provided.
     */
    async signFile(filePath, privateKey, keyPassphrase) {
        // Get key if provided
        let keyBuffer;
        if (privateKey) {
            if (typeof privateKey === 'string') {
                // Path
                // Read in from fs
                keyBuffer = this.fileSystem.readFileSync(privateKey);
            }
            else {
                // Buffer
                keyBuffer = privateKey;
            }
        }
        // Read file into buffer
        const buffer = this.fileSystem.readFileSync(filePath);
        // Sign the buffer
        const signedBuffer = await this.signData(buffer, keyBuffer, keyPassphrase);
        // Write buffer to signed file
        const signedPath = `${filePath}.sig`;
        this.fileSystem.writeFileSync(signedPath, signedBuffer);
        return signedPath;
    }
    /**
     * Verifies the given data with the provided key or the primary key if none is specified
     * @param data Buffer or file containing the data to be verified
     * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
     */
    async verifyData(data, publicKey) {
        const ring = new kbpgp_1.default.keyring.KeyRing();
        let resolvedIdentity;
        if (publicKey) {
            resolvedIdentity = await this.getIdentityFromPublicKey(publicKey);
        }
        else if (this.primaryIdentity) {
            resolvedIdentity = this.primaryIdentity;
        }
        else {
            throw Error('key pair is not loaded');
        }
        ring.add_key_manager(resolvedIdentity);
        if (this.useWebWorkers && this.workerPool) {
            const workerResponse = await this.workerPool.queue(async (workerCrypto) => {
                return await workerCrypto.verifyData(data, resolvedIdentity);
            });
            return workerResponse;
        }
        else {
            const params = {
                armored: data,
                keyfetch: ring,
            };
            const literals = await util_1.promisify(kbpgp_1.default.unbox)(params);
            // get the verified message
            const verifiedMessage = Buffer.from(literals[0].toString());
            // Get the identity that signed the data if any
            let dataSigner = literals[0].get_data_signer();
            // Retrieve the key manager associated with that data signer
            let verifiedKM;
            if (dataSigner) {
                verifiedKM = dataSigner.get_key_manager();
            }
            if (!verifiedKM) {
                throw Error('data could not be verified: could not determine data signer');
            }
            // If we know the pgp finger print then we say the data is verified.
            // Otherwise it is unverified.
            const actualFingerprint = verifiedKM.get_pgp_fingerprint().toString('hex');
            const expectedFingerprint = resolvedIdentity.get_pgp_fingerprint().toString('hex');
            if (actualFingerprint == expectedFingerprint) {
                return verifiedMessage;
            }
            else {
                throw Error('data could not be verified: actual and expected data signer pgp fingerprint mismatch');
            }
        }
    }
    /**
     * Verifies the given file with the provided key or the primary key if none is specified
     * @param filePath Path to file containing the data to be verified
     * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
     */
    async verifyFile(filePath, publicKey) {
        // Get key if provided
        let keyBuffer;
        if (publicKey) {
            if (typeof publicKey === 'string') {
                // Path
                // Read in from fs
                keyBuffer = this.fileSystem.readFileSync(publicKey);
            }
            else {
                // Buffer
                keyBuffer = publicKey;
            }
        }
        // Read in file buffer and signature
        const signatureBuffer = this.fileSystem.readFileSync(filePath);
        const verifiedMessage = await this.verifyData(signatureBuffer, keyBuffer);
        this.fileSystem.writeFileSync(filePath, verifiedMessage);
        return true;
    }
    /**
     * Encrypts the given data for a specific public key
     * @param data The data to be encrypted
     * @param publicKey The key to encrypt for
     */
    async encryptData(data, publicKey) {
        let resolvedIdentity;
        if (publicKey) {
            resolvedIdentity = await this.getIdentityFromPublicKey(publicKey);
        }
        else if (this.primaryIdentity) {
            resolvedIdentity = this.primaryIdentity;
        }
        else {
            throw Error(`Identity could not be resolved for encrypting`);
        }
        if (this.useWebWorkers && this.workerPool) {
            const workerResponse = await this.workerPool.queue(async (workerCrypto) => {
                return await workerCrypto.encryptData(data, resolvedIdentity);
            });
            return workerResponse;
        }
        else {
            const params = {
                msg: data,
                encrypt_for: resolvedIdentity,
            };
            const result_string = await util_1.promisify(kbpgp_1.default.box)(params);
            return Buffer.from(result_string);
        }
    }
    /**
     * Encrypts the given file for a specific public key
     * @param filePath Path to file containing the data to be encrypted
     * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
     */
    async encryptFile(filePath, publicKey) {
        // Get key if provided
        let keyBuffer;
        if (publicKey) {
            if (typeof publicKey === 'string') {
                // Read in from fs
                keyBuffer = this.fileSystem.readFileSync(publicKey);
            }
            else {
                // Buffer
                keyBuffer = publicKey;
            }
        }
        // Read file into buffer
        const buffer = this.fileSystem.readFileSync(filePath);
        // Encrypt the buffer
        const encryptedBuffer = await this.encryptData(buffer, keyBuffer);
        // Write buffer to encrypted file
        this.fileSystem.writeFileSync(filePath, encryptedBuffer);
        return filePath;
    }
    /**
     * Decrypts the given data with the provided key or the primary key if none is given
     * @param data The data to be decrypted
     * @param privateKey The key to decrypt with. Defaults to primary private key if no key is given.
     * @param keyPassphrase Required if privateKey is provided.
     */
    async decryptData(data, privateKey, keyPassphrase) {
        var ring = new kbpgp_1.default.keyring.KeyRing();
        let resolvedIdentity;
        if (privateKey) {
            if (keyPassphrase) {
                resolvedIdentity = await this.getIdentityFromPrivateKey(privateKey, keyPassphrase);
            }
            else {
                throw Error('A key passphrase must be supplied if a privateKey is specified');
            }
        }
        else if (this.primaryIdentity) {
            resolvedIdentity = this.primaryIdentity;
        }
        else {
            throw Error('no identity available for decrypting');
        }
        if (this.useWebWorkers && this.workerPool) {
            const workerResponse = await this.workerPool.queue(async (workerCrypto) => {
                return await workerCrypto.decryptData(data, resolvedIdentity);
            });
            return workerResponse;
        }
        else {
            ring.add_key_manager(resolvedIdentity);
            const params = {
                armored: data.toString(),
                keyfetch: ring,
            };
            const literals = await util_1.promisify(kbpgp_1.default.unbox)(params);
            const decryptedData = Buffer.from(literals[0].toString());
            return decryptedData;
        }
    }
    /**
     * Decrypts the given file with the provided key or the primary key if none is given
     * @param filePath Path to file containing the data to be decrypted
     * @param privateKey The key to decrypt with. Defaults to primary private key if no key is given.
     * @param keyPassphrase Required if privateKey is provided.
     */
    async decryptFile(filePath, privateKey, keyPassphrase) {
        // Get key if provided
        let keyBuffer;
        if (privateKey) {
            if (typeof privateKey === 'string') {
                // Read in from fs
                keyBuffer = this.fileSystem.readFileSync(privateKey);
            }
            else {
                // Buffer
                keyBuffer = privateKey;
            }
        }
        // Read in file buffer
        const fileBuffer = this.fileSystem.readFileSync(filePath);
        // Decrypt file buffer
        const decryptedData = await this.decryptData(fileBuffer, keyBuffer, keyPassphrase);
        // Write buffer to decrypted file
        this.fileSystem.writeFileSync(filePath, decryptedData);
        return filePath;
    }
    /////////
    // PKI //
    /////////
    get PKIInfo() {
        return this.pkiInfo;
    }
    loadPKIInfo(key, cert, caCert, writeToFile = false) {
        if (key) {
            this.pkiInfo.key = key;
        }
        if (cert) {
            this.pkiInfo.cert = cert;
        }
        if (caCert) {
            this.pkiInfo.caCert = caCert;
        }
        if (writeToFile) {
            // Store in the metadata path folder
            const storagePath = path_1.default.dirname(this.metadataPath);
            if (key) {
                this.metadata.pkiKeyPath = path_1.default.join(storagePath, 'pki_private_key');
                fs_1.default.writeFileSync(this.metadata.pkiKeyPath, key);
            }
            if (cert) {
                this.metadata.pkiCertPath = path_1.default.join(storagePath, 'pki_cert');
                fs_1.default.writeFileSync(this.metadata.pkiCertPath, cert);
            }
            if (caCert) {
                this.metadata.caCertPath = path_1.default.join(storagePath, 'ca_cert');
                fs_1.default.writeFileSync(this.metadata.caCertPath, caCert);
            }
        }
    }
    /* ============ HELPERS =============== */
    /**
     * Get the key for a given name
     * @param name The unique name of the desired key
     */
    getKey(name) {
        return this.derivedKeys[name];
    }
    /**
     * Determines if the Key Manager has a certain key
     * @param name The unique name of the desired key
     */
    hasKey(name) {
        if (this.derivedKeys[name]) {
            return true;
        }
        return false;
    }
    async writeMetadata() {
        const metadata = JSON.stringify(this.metadata);
        this.fileSystem.writeFileSync(this.metadataPath, metadata);
        // Store the keys if identity is loaded
        if (this.identityLoaded) {
            const derivedKeys = JSON.stringify(this.derivedKeys);
            const encryptedMetadata = await this.encryptData(Buffer.from(derivedKeys));
            await this.fileSystem.promises.writeFile(this.derivedKeysPath, encryptedMetadata);
        }
    }
    async loadMetadata() {
        // Check if file exists
        if (this.fileSystem.existsSync(this.metadataPath)) {
            const metadata = this.fileSystem.readFileSync(this.metadataPath).toString();
            this.metadata = JSON.parse(metadata);
            if (this.identityLoaded && this.fileSystem.existsSync(this.derivedKeysPath)) {
                const encryptedMetadata = this.fileSystem.readFileSync(this.derivedKeysPath);
                const metadata = (await this.decryptData(encryptedMetadata)).toString();
                const derivedKeys = JSON.parse(metadata);
                for (const key of Object.keys(derivedKeys)) {
                    this.derivedKeys[key] = Buffer.from(derivedKeys[key]);
                }
            }
        }
    }
}
exports.default = KeyManager;


/***/ }),
/* 35 */
/***/ (function(module, exports) {

module.exports = require("kbpgp");

/***/ }),
/* 36 */
/***/ (function(module, exports) {

module.exports = require("util");

/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(__webpack_require__(8));
const path_1 = __importDefault(__webpack_require__(1));
const TurnClient_1 = __importDefault(__webpack_require__(38));
const Peer_1 = __webpack_require__(7);
const PeerInfo_1 = __importDefault(__webpack_require__(0));
const PeerServer_1 = __importDefault(__webpack_require__(43));
const PeerConnection_1 = __importDefault(__webpack_require__(46));
const MulticastBroadcaster_1 = __importDefault(__webpack_require__(47));
const keybaseDiscovery = {
    name: 'Keybase',
    findUser: async (handle, service) => {
        const url = `https://keybase.io/_/api/1.0/user/lookup.json?${service}=${handle}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const pubKey = data.them[0].public_keys.primary.bundle;
            return pubKey;
        }
        catch (err) {
            throw Error(`User was not found: ${err.message}`);
        }
    },
};
class PeerManager {
    constructor(polykeyPath = `${os_1.default.homedir()}/.polykey`, fileSystem, keyManager, peerInfo, socialDiscoveryServices = []) {
        this.fileSystem = fileSystem;
        this.peerStore = new Map();
        this.fileSystem.mkdirSync(polykeyPath, { recursive: true });
        this.peerInfoMetadataPath = path_1.default.join(polykeyPath, '.peerInfo');
        this.peerStoreMetadataPath = path_1.default.join(polykeyPath, '.peerStore');
        // Set given variables
        this.keyManager = keyManager;
        this.socialDiscoveryServices = socialDiscoveryServices;
        // Load metadata with peer info
        this.loadMetadata();
        // Load peer store and local peer info
        if (peerInfo) {
            this.peerInfo = peerInfo;
            this.writeMetadata();
        }
        else if (this.keyManager.hasPublicKey()) {
            this.peerInfo = new PeerInfo_1.default(this.keyManager.getPublicKey());
        }
        this.socialDiscoveryServices = [];
        this.socialDiscoveryServices.push(keybaseDiscovery);
        for (const service of socialDiscoveryServices) {
            this.socialDiscoveryServices.push(service);
        }
        this.multicastBroadcaster = new MulticastBroadcaster_1.default(this, this.keyManager);
        ////////////
        // Server //
        ////////////
        this.peerServer = new PeerServer_1.default(this, this.keyManager);
        this.peerConnections = new Map();
        /////////////////
        // TURN Client //
        /////////////////
        this.turnClient = new TurnClient_1.default(this);
    }
    toggleStealthMode(active) {
        if (!this.stealthMode && active) {
            this.multicastBroadcaster.stopBroadcasting();
        }
        else if (this.stealthMode && !active) {
            this.multicastBroadcaster.startListening();
        }
        this.stealthMode = active;
    }
    setGitHandler(handler) {
        this.peerServer.handleGitRequest = handler;
    }
    setNatHandler(handler) {
        this.peerServer.handleNatRequest = handler;
    }
    ////////////////
    // Peer store //
    ////////////////
    /**
     * Add a peer's info to the peerStore
     * @param peerInfo Info of the peer to be added
     */
    addPeer(peerInfo) {
        const publicKey = PeerInfo_1.default.formatPublicKey(peerInfo.publicKey);
        if (this.hasPeer(publicKey)) {
            throw Error('peer already exists in peer store');
        }
        this.peerStore.set(publicKey, peerInfo.deepCopy());
        this.writeMetadata();
    }
    /**
     * Update a peer's info in the peerStore
     * @param peerInfo Info of the peer to be updated
     */
    updatePeer(peerInfo) {
        const publicKey = PeerInfo_1.default.formatPublicKey(peerInfo.publicKey);
        if (!this.hasPeer(publicKey)) {
            throw Error('peer does not exist in peer store');
        }
        this.peerStore.set(publicKey, peerInfo.deepCopy());
        this.writeMetadata();
    }
    /**
     * Retrieves a peer for the given public key
     * @param publicKey Public key of the desired peer
     */
    getPeer(publicKey) {
        var _a, _b;
        return (_b = (_a = this.peerStore.get(PeerInfo_1.default.formatPublicKey(publicKey))) === null || _a === void 0 ? void 0 : _a.deepCopy()) !== null && _b !== void 0 ? _b : null;
    }
    /**
     * Determines if the peerStore contains the desired peer
     * @param publicKey Public key of the desired peer
     */
    hasPeer(publicKey) {
        return this.peerStore.has(PeerInfo_1.default.formatPublicKey(publicKey));
    }
    /**
     * List all peer public keys in the peer store
     */
    listPeers() {
        return Array.from(this.peerStore.values()).map((p) => p.publicKey);
    }
    //////////////////////
    // Social discovery //
    //////////////////////
    /**
     * Finds an existing peer using multicast peer discovery
     * @param publicKey Public key of the desired peer
     */
    async findPublicKey(publicKey, timeout) {
        return new Promise((resolve, reject) => {
            this.multicastBroadcaster.startListening();
            this.multicastBroadcaster.on('found', (foundPublicKey) => {
                if (PeerInfo_1.default.formatPublicKey(foundPublicKey) == PeerInfo_1.default.formatPublicKey(publicKey)) {
                    resolve(true);
                }
            });
            setTimeout(() => reject(Error('peer discovery timed out')), timeout && timeout != 0 ? timeout : 5e4);
        });
    }
    /**
     * Finds an existing peer given a social service and handle
     * @param handle Username or handle of the user (e.g. @john-smith)
     * @param service Service on which to search for the user (e.g. github)
     */
    async findSocialUser(handle, service, timeout) {
        const tasks = this.socialDiscoveryServices.map((s) => s.findUser(handle, service));
        const pubKeyOrFail = await Promise.race(tasks);
        if (!pubKeyOrFail) {
            throw Error('Could not find public key from services');
        }
        return await this.findPublicKey(pubKeyOrFail, timeout);
    }
    ///////////////////////
    // Peers Connections //
    ///////////////////////
    /**
     * Get a secure connection to the peer
     * @param publicKey Public key of an existing peer or address of new peer
     */
    connectToPeer(publicKey) {
        // Throw error if trying to connect to self
        if (publicKey == this.peerInfo.publicKey) {
            throw Error('Cannot connect to self');
        }
        const existingSocket = this.peerConnections.get(publicKey);
        if (existingSocket) {
            return existingSocket;
        }
        // try to create a connection to the address
        const peerConnection = new PeerConnection_1.default(publicKey, this.keyManager, this);
        this.peerConnections.set(publicKey, peerConnection);
        return peerConnection;
    }
    async pingPeer(publicKey, timeout) {
        const peerConnection = this.connectToPeer(publicKey);
        return await peerConnection.pingPeer(timeout);
    }
    /* ============ HELPERS =============== */
    writeMetadata() {
        var _a, _b;
        // write peer info
        const peerInfo = this.peerInfo;
        const metadata = Peer_1.peerInterface.PeerInfoMessage.encodeDelimited({
            publicKey: peerInfo.publicKey,
            peerAddress: (_a = peerInfo.peerAddress) === null || _a === void 0 ? void 0 : _a.toString(),
            relayPublicKey: peerInfo.relayPublicKey,
        }).finish();
        this.fileSystem.writeFileSync(this.peerInfoMetadataPath, metadata);
        // write peer store
        const peerInfoList = [];
        for (const [publicKey, peerInfo] of this.peerStore) {
            peerInfoList.push(new Peer_1.peerInterface.PeerInfoMessage({
                publicKey: peerInfo.publicKey,
                peerAddress: (_b = peerInfo.peerAddress) === null || _b === void 0 ? void 0 : _b.toString(),
                relayPublicKey: peerInfo.relayPublicKey,
            }));
        }
        const peerStoreMetadata = Peer_1.peerInterface.PeerInfoListMessage.encodeDelimited({ peerInfoList }).finish();
        this.fileSystem.writeFileSync(this.peerStoreMetadataPath, peerStoreMetadata);
    }
    loadMetadata() {
        var _a, _b;
        // load peer info if path exists
        if (this.fileSystem.existsSync(this.peerInfoMetadataPath)) {
            const metadata = this.fileSystem.readFileSync(this.peerInfoMetadataPath);
            const { publicKey, peerAddress, relayPublicKey } = Peer_1.peerInterface.PeerInfoMessage.decodeDelimited(metadata);
            this.peerInfo = new PeerInfo_1.default(publicKey, peerAddress, relayPublicKey);
        }
        // load peer store if path exists
        if (this.fileSystem.existsSync(this.peerStoreMetadataPath)) {
            const metadata = this.fileSystem.readFileSync(this.peerStoreMetadataPath);
            const { peerInfoList } = Peer_1.peerInterface.PeerInfoListMessage.decodeDelimited(metadata);
            for (const peerInfoMessage of peerInfoList) {
                const peerInfo = new PeerInfo_1.default(peerInfoMessage.publicKey, (_a = peerInfoMessage.peerAddress) !== null && _a !== void 0 ? _a : undefined, (_b = peerInfoMessage.relayPublicKey) !== null && _b !== void 0 ? _b : undefined);
                this.peerStore.set(peerInfo.publicKey, peerInfo);
            }
        }
    }
}
exports.default = PeerManager;


/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// adapted from https://github.com/advance512/nat-traversal
const net_1 = __importDefault(__webpack_require__(10));
const events_1 = __webpack_require__(9);
const PeerInfo_1 = __webpack_require__(0);
const Peer_1 = __webpack_require__(7);
const Peer_pb_1 = __webpack_require__(12);
const UDPHolePunchClient_1 = __importDefault(__webpack_require__(39));
let socketPipeId = 1;
class SocketPipe extends events_1.EventEmitter {
    constructor(localAddress, relayAddress) {
        super();
        this.id = socketPipeId;
        socketPipeId += 1;
        this.localAddress = localAddress;
        this.relayAddress = relayAddress;
        this.targetSocketPending = true;
        this.buffer = [];
        console.log(`[client-relay:${this.id}] Created new pending SocketPipe.`);
        this.openRelayEnd();
    }
    openRelayEnd() {
        console.log(`[client-relay:${this.id}] Socket pipe will TCP connection to connect to relay server.`);
        this.relaySocket = net_1.default.connect(this.relayAddress.port, this.relayAddress.host, () => {
            console.log(`[client-relay:${this.id}] Created new TCP connection.`);
            // Configure socket for keeping connections alive
            this.relaySocket.setKeepAlive(true, 120 * 1000);
        });
        // We have a relay socket - now register its handlers
        // On data
        this.relaySocket.on('data', (data) => {
            // Got data - do we have a target socket?
            if (this.targetSocket === undefined) {
                // Create a target socket for the relay socket - connecting to the target
                this.openTargetEnd();
                this.emit('pair');
            }
            // Is the target socket still connecting? If so, are we buffering data?
            if (this.targetSocketPending) {
                // Store the data until we have a target socket
                this.buffer[this.buffer.length] = data;
            }
            else {
                try {
                    // Or just pass it directly
                    this.targetSocket.write(data);
                }
                catch (ex) {
                    console.error(`[client-relay:${this.id}] Error writing to target socket: `, ex);
                }
            }
        });
        // On closing
        this.relaySocket.on('close', (hadError) => {
            if (hadError) {
                console.error(`[client-relay:${this.id}] Relay socket closed with error.`);
            }
            if (this.targetSocket !== undefined) {
                // Destroy the other socket
                this.targetSocket.destroy();
            }
            else {
                // Signal we are closing - server closed the connection
                this.emit('close');
            }
        });
        this.relaySocket.on('error', (error) => {
            console.error(`[client-relay:${this.id}] Error with relay socket: `, error);
        });
    }
    openTargetEnd() {
        console.log(`[client-relay:${this.id}] Authorized by relay server. Creating new connection to target ${this.localAddress.toString()}...`);
        console.log(`[client-target:${this.id}] Socket pipe will TCP connection to connect to target server.`);
        // Or use TCP
        this.targetSocket = net_1.default.connect(this.localAddress.port, this.localAddress.host, () => {
            console.log(`[client-target:${this.id}] Successfully connected to target ${this.localAddress.toString()}.`);
            // Configure socket for keeping connections alive
            this.targetSocket.setKeepAlive(true, 120 * 1000);
            // Connected, not pending anymore
            this.targetSocketPending = false;
            // And if we have any buffered data, forward it
            try {
                for (const bufferItem of this.buffer) {
                    this.targetSocket.write(bufferItem);
                }
            }
            catch (ex) {
                console.error(`[client-target:${this.id}] Error writing to target socket: `, ex);
            }
            // Clear the array
            this.buffer.length = 0;
        });
        // Got data from the target socket?
        this.targetSocket.on('data', (data) => {
            try {
                // Forward it!
                this.relaySocket.write(data);
            }
            catch (ex) {
                console.error(`target:${this.id}] Error writing to target socket: `, ex);
            }
        });
        this.targetSocket.on('error', (hadError) => {
            if (hadError) {
                console.error(`[target:${this.id}] Target socket was closed with error: `, hadError);
            }
            this.terminate();
        });
    }
    terminate() {
        console.log(`[client-relay:${this.id}] Terminating socket pipe...`);
        this.removeAllListeners();
        this.relaySocket.destroy();
    }
}
class TurnClient {
    // default is to support up to 10 connections at once, change this with 'numSockets' parameter
    constructor(peerManager) {
        this.peerManager = peerManager;
        // create udp hole punch client
        this.udpHolePunchClient = new UDPHolePunchClient_1.default(this.peerManager);
        this.socketPipes = [];
    }
    async sendMessage(type, publicKey, message) {
        const peerConnection = this.peerManager.connectToPeer(publicKey);
        const encodedMessage = Peer_1.peerInterface.NatMessage.encodeDelimited({
            type,
            isResponse: false,
            subMessage: message,
        }).finish();
        const responseMessage = await peerConnection.sendPeerRequest(Peer_pb_1.SubServiceType.NAT_TRAVERSAL, encodedMessage);
        const { type: responseType, isResponse, subMessage } = Peer_1.peerInterface.NatMessage.decodeDelimited(responseMessage);
        return subMessage;
    }
    async requestPeerConnection(peerPublicKey, relayPublicKey) {
        var _a;
        const requestMessage = Peer_1.peerInterface.PeerConnectionRequest.encodeDelimited({ publicKey: peerPublicKey }).finish();
        const responseMessage = await this.sendMessage(Peer_1.peerInterface.NatMessageType.PEER_CONNECTION, relayPublicKey, requestMessage);
        const { peerAddress } = Peer_1.peerInterface.PeerConnectionResponse.decodeDelimited(responseMessage);
        if (!peerAddress) {
            throw Error('relay does not know of requested peer');
        }
        const address = PeerInfo_1.Address.parse(peerAddress);
        const relayPeerInfo = this.peerManager.getPeer(relayPublicKey);
        address.updateHost((_a = relayPeerInfo === null || relayPeerInfo === void 0 ? void 0 : relayPeerInfo.peerAddress) === null || _a === void 0 ? void 0 : _a.host);
        return address;
    }
    async requestRelayConnection(relayPublicKey) {
        var _a, _b, _c;
        const requestMessage = Peer_1.peerInterface.RelayConnectionRequest.encodeDelimited({
            publicKey: this.peerManager.peerInfo.publicKey,
        }).finish();
        const responseMessage = await this.sendMessage(Peer_1.peerInterface.NatMessageType.RELAY_CONNECTION, relayPublicKey, requestMessage);
        const { serverAddress } = Peer_1.peerInterface.RelayConnectionResponse.decodeDelimited(responseMessage);
        const incoming = PeerInfo_1.Address.parse(serverAddress);
        console.log(incoming);
        incoming.host = (_c = (_b = (_a = this.peerManager.getPeer(relayPublicKey)) === null || _a === void 0 ? void 0 : _a.peerAddress) === null || _b === void 0 ? void 0 : _b.host) !== null && _c !== void 0 ? _c : incoming.host;
        // add relay node to turn server address
        this.peerManager.peerInfo.relayPublicKey = relayPublicKey;
        // Create pending socketPipes
        this.createSocketPipe(incoming);
    }
    async requestLocalHolePunchAddress(relayPublicKey) {
        // request hole punch
        const udpAddress = await this.requestUDPAddress(relayPublicKey);
        const localUdpAddress = await this.udpHolePunchClient.requestHolePunch(udpAddress, this.peerManager.peerInfo.peerAddress);
        // add to peer info as relay node
        this.peerManager.peerInfo.relayPublicKey = relayPublicKey;
        return localUdpAddress;
    }
    async requestHolePunchConnection(relayPublicKey, peerPublicKey) {
        const peerUDPAddress = await this.requestPeerUDPAddress(relayPublicKey, peerPublicKey);
        return this.udpHolePunchClient.createPipeServer(peerUDPAddress);
    }
    // returns the address for a local tcp server that is routed via UTP
    async requestPeerUDPAddress(relayPublicKey, peerPublicKey) {
        const requestMessage = Peer_1.peerInterface.PeerUdpAddressRequest.encodeDelimited({ publicKey: peerPublicKey }).finish();
        const responseMessage = await this.sendMessage(Peer_1.peerInterface.NatMessageType.PEER_UDP_ADDRESS, relayPublicKey, requestMessage);
        const { address } = Peer_1.peerInterface.PeerUdpAddressResponse.decodeDelimited(responseMessage);
        return PeerInfo_1.Address.parse(address);
    }
    async requestUDPAddress(relayPublicKey) {
        const responseMessage = await this.sendMessage(Peer_1.peerInterface.NatMessageType.UDP_ADDRESS, relayPublicKey);
        const { address } = Peer_1.peerInterface.UDPAddressResponse.decodeDelimited(responseMessage);
        return PeerInfo_1.Address.parse(address);
    }
    async createSocketPipe(relayAddress) {
        const localAddress = this.peerManager.peerInfo.peerAddress;
        // wait for local address
        while (!localAddress) {
            await new Promise((resolve, reject) => setTimeout(() => resolve(), 1000));
        }
        // Create a new socketPipe
        const socketPipe = new SocketPipe(localAddress, relayAddress);
        this.socketPipes.push(socketPipe);
        socketPipe.on('pair', () => {
            // Create a new pending socketPipe
            this.createSocketPipe(relayAddress);
        });
        socketPipe.on('close', () => {
            // Server closed the connection
            // Remove paired pipe
            this.removeSocketPipe(socketPipe);
            // Create a new replacement socketPipe, that is pending and waiting, if required
            setTimeout(() => {
                if (this.terminating) {
                    return;
                }
                // Create a new pending socketPipe
                this.createSocketPipe(relayAddress);
            }, 5000);
        });
    }
    removeSocketPipe(socketPipe) {
        // SocketPipe closed - is it still stored by us?
        const i = this.socketPipes.indexOf(socketPipe);
        // If so, remove it
        if (i !== -1) {
            this.socketPipes.splice(i, 1);
        }
        socketPipe.terminate();
    }
    terminate() {
        this.terminating = true;
        for (const socketPipe of this.socketPipes) {
            socketPipe.terminate();
        }
    }
}
exports.default = TurnClient;


/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// based on https://github.com/SamDecrock/node-udp-hole-punching
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(__webpack_require__(10));
const PeerInfo_1 = __webpack_require__(0);
const Peer_1 = __webpack_require__(7);
const UDPToTCPSocketPipe_1 = __importDefault(__webpack_require__(40));
const TCPToUDPSocketPipe_1 = __importDefault(__webpack_require__(42));
const MicroTransportProtocol_1 = __webpack_require__(14);
class UDPHolePunchClient {
    constructor(peerManager) {
        this.outgoingSocketPipes = new Map();
        this.incomingSocketPipes = new Map();
        this.peerManager = peerManager;
    }
    async requestHolePunch(address, peerServerAddress) {
        const relayConnection = MicroTransportProtocol_1.connect(address.port, address.host);
        // const relayConnection = connect(address.port, address.host)
        const relayServer = MicroTransportProtocol_1.createServer((conn) => {
            const socketPipe = new TCPToUDPSocketPipe_1.default(peerServerAddress, conn);
            this.outgoingSocketPipes.set(socketPipe.id, socketPipe);
        });
        await new Promise((resolve, reject) => {
            relayServer.listen(relayConnection, () => {
                console.log(`relay connection listening on: ${relayServer.address().host}:${relayServer.address().port}`);
                resolve();
            });
        });
        const request = Peer_1.peerInterface.HolePunchRegisterRequest.encodeDelimited({
            publicKey: this.peerManager.peerInfo.publicKey,
        }).finish();
        relayConnection.write(request);
        const connectedAddress = await new Promise((resolve, reject) => {
            let buf = [];
            relayConnection.on('data', (data) => {
                buf.push(data);
                try {
                    const { connectedAddress } = Peer_1.peerInterface.HolePunchRegisterResponse.decodeDelimited(Buffer.concat(buf));
                    resolve(PeerInfo_1.Address.parse(connectedAddress));
                }
                catch (error) { }
            });
        });
        return connectedAddress;
    }
    // returns the address for a local tcp server that is routed via UTP
    async createPipeServer(peerUDPAddress) {
        console.log('connecting to', peerUDPAddress);
        // create a TCP server and bind it to a random port
        const server = net_1.default.createServer((socket) => {
            // create a new socket pipe
            const socketPipe = new UDPToTCPSocketPipe_1.default(socket, peerUDPAddress);
            this.incomingSocketPipes.set(socketPipe.id, socketPipe);
        });
        return await new Promise((resolve, reject) => {
            server.listen(0, () => {
                console.log('TCP server routing to UDP server');
                resolve(PeerInfo_1.Address.fromAddressInfo(server.address()));
            });
        });
    }
}
exports.default = UDPHolePunchClient;


/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __webpack_require__(9);
const MicroTransportProtocol_1 = __webpack_require__(14);
let socketPipeId = 0;
class UDPToTCPSocketPipe extends events_1.EventEmitter {
    constructor(tcpSocket, udpAddress) {
        super();
        this.id = socketPipeId;
        socketPipeId += 1;
        this.udpAddress = udpAddress;
        this.tcpSocket = tcpSocket;
        this.targetSocketPending = true;
        this.buffer = [];
        console.log(`[udp-tcp-relay:${this.id}] Created new pending SocketPipe.`);
        this.openRelayEnd();
    }
    openRelayEnd() {
        console.log(`[udp-tcp-relay:${this.id}] Socket pipe will TCP connection to connect to relay server.`);
        // We have a relay socket - now register its handlers
        // On data
        this.tcpSocket.on('data', (data) => {
            // Got data - do we have a target socket?
            if (this.udpSocket === undefined) {
                // Create a target socket for the relay socket - connecting to the target
                this.openTargetEnd();
                this.emit('pair');
            }
            // Is the target socket still connecting? If so, are we buffering data?
            if (this.targetSocketPending) {
                // Store the data until we have a target socket
                this.buffer[this.buffer.length] = data;
            }
            else {
                try {
                    // Or just pass it directly
                    this.udpSocket.write(data);
                }
                catch (ex) {
                    console.error(`[udp-tcp-relay:${this.id}] Error writing to target socket: `, ex);
                }
            }
        });
        // On closing
        this.tcpSocket.on('close', (hadError) => {
            if (hadError) {
                console.error(`[udp-tcp-relay:${this.id}] Relay socket closed with error.`);
            }
            if (this.udpSocket !== undefined) {
                // Destroy the other socket
                this.udpSocket.destroy();
            }
            else {
                // Signal we are closing - server closed the connection
                this.emit('close');
            }
        });
        this.tcpSocket.on('error', (error) => {
            console.error(`[udp-tcp-relay:${this.id}] Error with relay socket: `, error);
        });
    }
    openTargetEnd() {
        console.log(`[udp-tcp-relay:${this.id}] Authorized by relay server. Creating new connection to target ${this.udpAddress.toString()}...`);
        console.log(`[udp-tcp-target:${this.id}] Socket pipe will TCP connection to connect to target server.`);
        // connect udp socket
        this.udpSocket = MicroTransportProtocol_1.connect(this.udpAddress.port, this.udpAddress.host);
        console.log(`[udp-tcp-target:${this.id}] Successfully connected to target ${this.udpAddress.toString()}.`);
        // Connected, not pending anymore
        this.targetSocketPending = false;
        // And if we have any buffered data, forward it
        try {
            for (const bufferItem of this.buffer) {
                this.udpSocket.write(bufferItem);
            }
        }
        catch (ex) {
            console.error(`[udp-tcp-target:${this.id}] Error writing to target socket: `, ex);
        }
        // Clear the array
        this.buffer.length = 0;
        // Got data from the target socket?
        this.udpSocket.on('data', (data) => {
            try {
                // Forward it!
                if (!this.tcpSocket.destroyed) {
                    this.tcpSocket.write(data);
                }
            }
            catch (ex) {
                console.error(`target:${this.id}] Error writing to target socket: `, ex);
            }
        });
        this.udpSocket.on('error', (hadError) => {
            if (hadError) {
                console.error(`[target:${this.id}] Target socket was closed with error: `, hadError);
            }
            this.terminate();
        });
    }
    terminate() {
        console.log(`[udp-tcp-relay:${this.id}] Terminating socket pipe...`);
        this.removeAllListeners();
        this.tcpSocket.destroy();
    }
}
exports.default = UDPToTCPSocketPipe;


/***/ }),
/* 41 */
/***/ (function(module, exports) {

module.exports = require("cyclist");

/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(__webpack_require__(10));
const events_1 = __webpack_require__(9);
let socketPipeId = 1;
class TCPToUDPSocketPipe extends events_1.EventEmitter {
    constructor(localAddress, relaySocket) {
        super();
        this.id = socketPipeId;
        socketPipeId += 1;
        this.localAddress = localAddress;
        if (localAddress == undefined) {
            throw Error('localAddress cannot be undefined');
        }
        this.udpSocket = relaySocket;
        this.targetSocketPending = true;
        this.buffer = [];
        console.log(`[tcp-udp-relay:${this.id}] Created new pending SocketPipe.`);
        this.openRelayEnd();
    }
    openRelayEnd() {
        console.log(`[tcp-udp-relay:${this.id}] Socket pipe will TCP connection to connect to relay server.`);
        // We have a relay socket - now register its handlers
        // On data
        this.udpSocket.on('data', (data) => {
            // Got data - do we have a target socket?
            if (this.tcpSocket === undefined) {
                // Create a target socket for the relay socket - connecting to the target
                this.openTargetEnd();
                this.emit('pair');
            }
            // Is the target socket still connecting? If so, are we buffering data?
            if (this.targetSocketPending) {
                // Store the data until we have a target socket
                this.buffer[this.buffer.length] = data;
            }
            else {
                try {
                    // Or just pass it directly
                    this.tcpSocket.write(data);
                }
                catch (ex) {
                    console.error(`[tcp-udp-relay:${this.id}] Error writing to target socket: `, ex);
                }
            }
        });
        // On closing
        this.udpSocket.on('close', (hadError) => {
            if (hadError) {
                console.error(`[tcp-udp-relay:${this.id}] Relay socket closed with error.`);
            }
            if (this.tcpSocket !== undefined) {
                // Destroy the other socket
                this.tcpSocket.destroy();
            }
            else {
                // Signal we are closing - server closed the connection
                this.emit('close');
            }
        });
        this.udpSocket.on('error', (error) => {
            console.error(`[tcp-udp-relay:${this.id}] Error with relay socket: `, error);
        });
    }
    openTargetEnd() {
        console.log(`[tcp-udp-relay:${this.id}] Authorized by relay server. Creating new connection to target ${this.localAddress.toString()}...`);
        console.log(`[tcp-udp-target:${this.id}] Socket pipe will TCP connection to connect to target server.`);
        // Or use TCP
        this.tcpSocket = net_1.default.connect(this.localAddress.port, this.localAddress.host, () => {
            console.log(`[tcp-udp-target:${this.id}] Successfully connected to target ${this.localAddress.toString()}.`);
            // Configure socket for keeping connections alive
            this.tcpSocket.setKeepAlive(true, 120 * 1000);
            // Connected, not pending anymore
            this.targetSocketPending = false;
            // And if we have any buffered data, forward it
            try {
                for (const bufferItem of this.buffer) {
                    this.tcpSocket.write(bufferItem);
                }
            }
            catch (ex) {
                console.error(`[tcp-udp-target:${this.id}] Error writing to target socket: `, ex);
            }
            // Clear the array
            this.buffer.length = 0;
        });
        // Got data from the target socket?
        this.tcpSocket.on('data', (data) => {
            try {
                // Forward it!
                this.udpSocket.write(data);
            }
            catch (ex) {
                console.error(`target:${this.id}] Error writing to target socket: `, ex);
            }
        });
        this.tcpSocket.on('error', (hadError) => {
            if (hadError) {
                console.error(`[target:${this.id}] Target socket was closed with error: `, hadError);
            }
            this.terminate();
        });
    }
    terminate() {
        console.log(`[tcp-udp-relay:${this.id}] Terminating socket pipe...`);
        this.removeAllListeners();
        this.udpSocket.destroy();
    }
}
exports.default = TCPToUDPSocketPipe;


/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PeerInfo_1 = __webpack_require__(0);
const grpc = __importStar(__webpack_require__(17));
const TurnServer_1 = __importDefault(__webpack_require__(44));
const utils_1 = __webpack_require__(11);
const Peer_grpc_pb_1 = __webpack_require__(18);
const Peer_pb_1 = __webpack_require__(12);
class PeerServer {
    constructor(peerManager, keyManager) {
        var _a, _b, _c;
        this.started = false;
        this.peerManager = peerManager;
        this.keyManager = keyManager;
        /////////////////
        // GRPC Server //
        /////////////////
        this.server = new grpc.Server();
        this.server.addService(Peer_grpc_pb_1.PeerService, {
            messagePeer: this.messagePeer.bind(this),
        });
        // Create the server credentials. SSL only if ca cert exists
        const pkiInfo = this.keyManager.PKIInfo;
        if (pkiInfo.caCert && pkiInfo.cert && pkiInfo.key) {
            this.credentials = grpc.ServerCredentials.createSsl(pkiInfo.caCert, [
                {
                    private_key: pkiInfo.key,
                    cert_chain: pkiInfo.cert,
                },
            ], true);
        }
        else {
            this.credentials = grpc.ServerCredentials.createInsecure();
        }
        const port = (_c = (_a = process.env.PK_PORT) !== null && _a !== void 0 ? _a : (_b = this.peerManager.peerInfo.peerAddress) === null || _b === void 0 ? void 0 : _b.port) !== null && _c !== void 0 ? _c : 0;
        this.server.bindAsync(`0.0.0.0:${port}`, this.credentials, async (err, boundPort) => {
            if (err) {
                throw err;
            }
            else {
                const address = new PeerInfo_1.Address('0.0.0.0', boundPort);
                this.server.start();
                this.peerManager.peerInfo.peerAddress = address;
                console.log(`Peer Server running on: ${address}`);
                this.started = true;
                this.turnServer = new TurnServer_1.default(this.peerManager);
            }
        });
    }
    async messagePeer(call, callback) {
        const peerRequest = call.request;
        const { publickey: publickey, type, submessage } = peerRequest.toObject();
        // if we don't know publicKey, end connection
        if (!this.peerManager.hasPeer(publickey)) {
            throw Error('unknown public key');
        }
        // verify and decrypt request
        const verifiedMessage = await this.keyManager.verifyData(Buffer.from(submessage), Buffer.from(publickey));
        const decryptedMessage = await this.keyManager.decryptData(verifiedMessage);
        const request = utils_1.stringToProtobuf(decryptedMessage.toString());
        let response;
        switch (type) {
            case Peer_pb_1.SubServiceType.PING_PEER:
                response = await this.handlePing(request);
                break;
            case Peer_pb_1.SubServiceType.GIT:
                response = await this.handleGitRequest(request, publickey);
                break;
            case Peer_pb_1.SubServiceType.NAT_TRAVERSAL:
                response = await this.handleNatRequest(request);
                break;
            default:
                throw Error('peer message type not identified');
        }
        // encrypt and sign response
        const encryptedResponse = await this.keyManager.encryptData(Buffer.from(utils_1.protobufToString(response)), Buffer.from(publickey));
        const signedResponse = await this.keyManager.signData(encryptedResponse);
        const subMessage = signedResponse.toString();
        // composes peer message
        const peerResponse = new Peer_pb_1.PeerMessage();
        peerResponse.setPublickey(this.peerManager.peerInfo.publicKey);
        peerResponse.setType(type);
        peerResponse.setSubmessage(subMessage);
        // return peer response
        callback(null, peerResponse);
    }
    async handlePing(request) {
        const challenge = Buffer.from(request).toString();
        return request;
    }
}
exports.default = PeerServer;


/***/ }),
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// adapted from https://github.com/advance512/nat-traversal
const PeerInfo_1 = __webpack_require__(0);
const events_1 = __webpack_require__(9);
const net_1 = __importDefault(__webpack_require__(10));
const Peer_1 = __webpack_require__(7);
const UDPHolePunchServer_1 = __importDefault(__webpack_require__(45));
class SocketPipe extends events_1.EventEmitter {
    constructor(serverSocket, id) {
        super();
        this.id = id;
        this.serverSocket = serverSocket;
        this.bufferQueue = [];
        // Configure socket for keeping connections alive
        this.serverSocket.setKeepAlive(true, 120 * 1000);
        // New data
        this.serverSocket.on('data', (data) => {
            // if outgoing socket is connected, write data
            this.bufferQueue.push(data);
            if (this.clientSocket) {
                this.writeBuffer();
            }
        });
        this.serverSocket.on('close', (hadError) => {
            if (hadError) {
                console.error(`[${this}] Socket was closed due to error.`);
            }
            // Destroy the paired socket too
            if (this.clientSocket !== undefined) {
                this.clientSocket.destroy();
            }
            // Mark this socketPipe is closing
            this.emit('close');
        });
        this.serverSocket.on('error', (err) => {
            console.error(`Socket error: ${err}`);
        });
    }
    terminate() {
        this.serverSocket.destroy();
    }
    activate(outgoingSocket) {
        if (this.clientSocket) {
            throw new Error(`[${this}] Attempted to pair socket more than once.`);
        }
        console.log(`[socket-pipe: ${this.id}] Socket pipe activated!`);
        this.clientSocket = outgoingSocket;
        // Configure socket for keeping connections alive
        this.clientSocket.setKeepAlive(true, 120 * 1000);
        // If we have any data in the buffer, write it
        this.writeBuffer();
    }
    writeBuffer() {
        while (this.bufferQueue.length > 0) {
            const buffer = this.bufferQueue.shift();
            this.clientSocket.write(buffer);
        }
    }
}
class EndpointServer extends events_1.EventEmitter {
    constructor(edgeType) {
        super();
        this.pendingSocketPipes = [];
        this.activeSocketPipes = [];
        this.edgeType = edgeType;
    }
    async start(port = 0) {
        await new Promise((resolve, reject) => {
            console.log(`[${this.edgeType}] endpoint server Will listen to incoming TCP connections.`);
            this.server = net_1.default
                .createServer((socket) => {
                console.log(`[endpoint-server: ${this.edgeType}] Incoming TCP connection from ${socket.remoteAddress}:${socket.remotePort}`);
                this.createSocketPipe(socket);
            })
                .listen(port, '0.0.0.0', () => {
                this.address = PeerInfo_1.Address.fromAddressInfo(this.server.address());
                console.log(`[${this.edgeType}] Listening on adress ${this.address.toString()}...`);
                resolve();
            });
        });
    }
    async createSocketPipe(incomingSocket) {
        const id = Math.max(0, ...this.activeSocketPipes.map((v) => v.id), ...this.pendingSocketPipes.map((v) => v.id)) + 1;
        const newSocketPipe = new SocketPipe(incomingSocket, id);
        console.log(`[${this.edgeType}-server-socket-pipe: ${newSocketPipe.id}] SocketPipe authorized.`);
        this.emit('new', newSocketPipe);
        newSocketPipe.on('close', () => {
            console.log(`[${this.edgeType}-server-socket-pipe: ${newSocketPipe.id}] SocketPipe closed connection`);
            this.removeSocketPipe(newSocketPipe);
        });
        return;
    }
    activateSocketPipe(pairServer, connectingSocketPipe) {
        // Do we have a pending socketPipe waiting?
        if (this.hasPendingSocketPipes()) {
            // Get the current pending socketPipe
            const pendingSocketPipe = this.getPendingSocketPipe();
            console.log(`[${this.edgeType}-server] Activating pending SocketPipe: connecting SocketPipes ${this.edgeType}-${pendingSocketPipe.id} and ${pairServer.edgeType}-${connectingSocketPipe.id}`);
            // Pair the connecting socketPipe with the pending socketPipe, allow data flow in one direction
            connectingSocketPipe.activate(pendingSocketPipe.serverSocket);
            this.addActiveSocketPipe(pendingSocketPipe);
            // And vice versa, for the second direction
            pendingSocketPipe.activate(connectingSocketPipe.serverSocket);
            pairServer.addActiveSocketPipe(connectingSocketPipe);
        }
        else {
            console.log(`[${this.edgeType}-server-socket-pipe: ${pairServer.edgeType}-${connectingSocketPipe.id}] SocketPipe will be pending until a parallel connection occurs`);
            // If we don't then our new connecting socketPipe is now pending and waiting for another connecting socketPipe
            pairServer.addPendingSocketPipe(connectingSocketPipe);
        }
    }
    getPendingSocketPipe() {
        const pendingSocketPipe = this.pendingSocketPipes[0];
        this.pendingSocketPipes.splice(0, 1);
        return pendingSocketPipe;
    }
    addActiveSocketPipe(socketPipe) {
        this.activeSocketPipes.push(socketPipe);
    }
    addPendingSocketPipe(socketPipe) {
        this.pendingSocketPipes.push(socketPipe);
    }
    removeSocketPipe(newSocketPipe) {
        let i = this.pendingSocketPipes.indexOf(newSocketPipe);
        if (i !== -1) {
            this.pendingSocketPipes.splice(i, 1);
        }
        else {
            i = this.activeSocketPipes.indexOf(newSocketPipe);
            if (i !== -1) {
                this.activeSocketPipes.splice(i, 1);
            }
        }
    }
    hasPendingSocketPipes() {
        return this.pendingSocketPipes.length > 0;
    }
    terminate() {
        console.log(`[${this.edgeType}] Terminating SocketListener.`);
        this.server.close();
        for (const socketPipe of this.pendingSocketPipes) {
            socketPipe.terminate();
        }
        for (const socketPipe of this.activeSocketPipes) {
            socketPipe.terminate();
        }
        this.server.unref();
    }
}
class TurnServer {
    constructor(peerManager) {
        // public key -> {incoming, outgoing}
        this.connectionMap = new Map();
        this.peerManager = peerManager;
        this.peerManager.setNatHandler(this.handleNatMessage.bind(this));
        this.udpHolePunchServer = new UDPHolePunchServer_1.default(this.peerManager);
    }
    async handleNatMessage(request) {
        const { type, subMessage } = Peer_1.peerInterface.NatMessage.decodeDelimited(request);
        let response;
        switch (type) {
            case Peer_1.peerInterface.NatMessageType.PEER_CONNECTION:
                response = await this.handlePeerConnectionRequest(subMessage);
                break;
            case Peer_1.peerInterface.NatMessageType.RELAY_CONNECTION:
                response = await this.handleRelayConnectionRequest(subMessage);
                break;
            case Peer_1.peerInterface.NatMessageType.UDP_ADDRESS:
                response = await this.handleUDPAddressRequest();
                break;
            case Peer_1.peerInterface.NatMessageType.PEER_UDP_ADDRESS:
                response = await this.handlePeerUDPAddressRequest(subMessage);
                break;
            default:
                throw Error(`type not supported: ${type}`);
        }
        const encodedResponse = Peer_1.peerInterface.NatMessage.encodeDelimited({
            type,
            isResponse: true,
            subMessage: response,
        }).finish();
        return encodedResponse;
    }
    async handlePeerConnectionRequest(request) {
        var _a, _b;
        const { publicKey } = Peer_1.peerInterface.PeerConnectionRequest.decodeDelimited(request);
        const peerAddress = (_b = (_a = this.connectionMap.get(publicKey)) === null || _a === void 0 ? void 0 : _a.client.address.toString()) !== null && _b !== void 0 ? _b : '';
        const responseMessage = Peer_1.peerInterface.PeerConnectionResponse.encodeDelimited({ peerAddress }).finish();
        return responseMessage;
    }
    async handleRelayConnectionRequest(request) {
        const { publicKey } = Peer_1.peerInterface.RelayConnectionRequest.decodeDelimited(request);
        let server;
        let client;
        server = new EndpointServer('server');
        server.on('new', (connectingSocketPipe) => {
            client.activateSocketPipe(server, connectingSocketPipe);
        });
        await server.start();
        client = new EndpointServer('client');
        client.on('new', (connectingSocketPipe) => {
            server.activateSocketPipe(client, connectingSocketPipe);
        });
        await client.start();
        this.connectionMap.set(publicKey, { server, client });
        // send back response message
        const serverAddress = server.address.toString();
        const responseMessage = Peer_1.peerInterface.RelayConnectionResponse.encodeDelimited({ serverAddress }).finish();
        return responseMessage;
    }
    async handleUDPAddressRequest() {
        // send back response message
        const address = this.udpHolePunchServer.server.address().toString();
        const responseMessage = Peer_1.peerInterface.UDPAddressResponse.encodeDelimited({ address }).finish();
        return responseMessage;
    }
    async handlePeerUDPAddressRequest(request) {
        const { publicKey } = Peer_1.peerInterface.PeerUdpAddressRequest.decodeDelimited(request);
        // send back response message
        const address = this.udpHolePunchServer.getAddress(publicKey);
        const responseMessage = Peer_1.peerInterface.PeerUdpAddressResponse.encodeDelimited({ address }).finish();
        return responseMessage;
    }
    terminate() {
        this.connectionMap.forEach(({ server, client }) => {
            server.terminate();
            client.terminate();
        });
        this.relayServer.close();
    }
}
exports.default = TurnServer;


/***/ }),
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PeerInfo_1 = __importDefault(__webpack_require__(0));
const Peer_1 = __webpack_require__(7);
const MicroTransportProtocol_1 = __webpack_require__(14);
class UDPHolePunchServer {
    constructor(peerManager) {
        // publicKey -> Server
        this.clientList = new Map();
        this.peerManager = peerManager;
        this.server = MicroTransportProtocol_1.createServer((conn) => {
            this.handleConnection(conn);
        });
        this.server.listenPort(0, () => {
            console.log(`UDP Server listening on ` + this.server.address().host + ':' + this.server.address().port);
        });
    }
    getAddress(publicKey) {
        var _a;
        return (_a = this.clientList.get(PeerInfo_1.default.formatPublicKey(publicKey))) === null || _a === void 0 ? void 0 : _a.remoteAddress.toString();
    }
    handleConnection(conn) {
        let buf = [];
        conn.on('data', (data) => {
            buf.push(data);
            // try decoding
            try {
                const { publicKey } = Peer_1.peerInterface.HolePunchRegisterRequest.decodeDelimited(Buffer.concat(buf));
                const remote = conn.remoteAddress;
                this.clientList.set(PeerInfo_1.default.formatPublicKey(publicKey), MicroTransportProtocol_1.connect(remote.port, remote.host));
                const response = Peer_1.peerInterface.HolePunchRegisterResponse.encodeDelimited({
                    connectedAddress: remote.toString(),
                }).finish();
                conn.write(response);
            }
            catch (error) { }
        });
    }
}
exports.default = UDPHolePunchServer;


/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const PeerInfo_1 = __importDefault(__webpack_require__(0));
const crypto_1 = __webpack_require__(15);
const grpc = __importStar(__webpack_require__(17));
const utils_1 = __webpack_require__(11);
const Peer_grpc_pb_1 = __webpack_require__(18);
const Peer_pb_1 = __webpack_require__(12);
class PeerConnection {
    constructor(publicKey, keyManager, peerManager) {
        this.connected = false;
        this.publicKey = publicKey;
        this.keyManager = keyManager;
        this.peerManager = peerManager;
        const pkiInfo = keyManager.PKIInfo;
        if (pkiInfo.caCert && pkiInfo.cert && pkiInfo.key) {
            this.credentials = grpc.credentials.createSsl(pkiInfo.caCert, pkiInfo.key, pkiInfo.cert);
        }
        else {
            this.credentials = grpc.credentials.createInsecure();
        }
    }
    async connectDirectly() {
        // try to create a direct connection
        if (this.getPeerInfo().peerAddress) {
            // direct connection attempt
            const address = this.getPeerInfo().peerAddress;
            const peerClient = new Peer_grpc_pb_1.PeerClient(address.toString(), this.credentials);
            this.connected = true;
            return peerClient;
        }
        else if (!this.getPeerInfo().peerAddress) {
            throw Error('peer does not have a connected address');
        }
        else {
            throw Error('peer is already connected');
        }
    }
    async connectHolePunch() {
        // try to hole punch to peer via relay peer
        if (!this.connected && this.getPeerInfo().relayPublicKey) {
            // connect to relay and ask it to create a relay
            console.log('requesting udp hole punch connection');
            const connectedAddress = await this.peerManager.turnClient.requestHolePunchConnection(this.getPeerInfo().relayPublicKey, this.getPeerInfo().publicKey);
            const peerClient = new Peer_grpc_pb_1.PeerClient(connectedAddress.toString(), this.credentials);
            this.connected = true;
            return peerClient;
        }
        else if (!this.getPeerInfo().relayPublicKey) {
            throw Error('peer does not have relay public key specified');
        }
        else {
            throw Error('peer is already connected');
        }
    }
    async connectRelay() {
        // try to relay to peer via relay peer
        if (!this.connected && this.getPeerInfo().relayPublicKey) {
            // turn relay
            // connect to relay and ask it to create a relay
            const connectedAddress = await this.peerManager.turnClient.requestPeerConnection(this.getPeerInfo().publicKey, this.getPeerInfo().relayPublicKey);
            const peerClient = new Peer_grpc_pb_1.PeerClient(connectedAddress.toString(), this.credentials);
            this.connected = true;
            return peerClient;
        }
        else if (!this.getPeerInfo().relayPublicKey) {
            throw Error('peer does not have relay public key specified');
        }
        else {
            throw Error('peer is already connected');
        }
    }
    async connect() {
        // connect if not already connected
        if (!this.connected) {
            try {
                this.peerClient = await utils_1.promiseAny([this.connectDirectly(), this.connectHolePunch(), this.connectRelay()]);
            }
            catch (error) {
                console.log(error);
            }
        }
        // try a ping
        if (this.connected && (await this.sendPingRequest(5000))) {
            return;
        }
        else {
            this.connected = false;
            // still not connected
            throw Error('could not connect to peer');
        }
    }
    getPeerInfo() {
        if (!this.peerManager.hasPeer(this.publicKey)) {
            throw Error('peer does not exist in peer store');
        }
        return this.peerManager.getPeer(this.publicKey);
    }
    async sendPingRequest(timeout) {
        // eslint-disable-next-line
        return await new Promise(async (resolve, reject) => {
            try {
                if (timeout) {
                    setTimeout(() => reject('ping timed out'), timeout);
                }
                const challenge = crypto_1.randomBytes(16).toString('base64');
                // encode request
                const peerRequest = await this.encodeRequest(Peer_pb_1.SubServiceType.PING_PEER, utils_1.stringToProtobuf(challenge));
                // send request
                const peerResponse = await new Promise((resolve, reject) => {
                    this.peerClient.messagePeer(peerRequest, (err, response) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(response);
                        }
                    });
                });
                // decode response
                const { type: responseType, response } = await this.decodeResponse(peerResponse);
                const challengeResponse = utils_1.protobufToString(response);
                resolve(challenge == challengeResponse);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async pingPeer(timeout) {
        // connect to peer
        await this.connect();
        // send ping request
        return await this.sendPingRequest(timeout);
    }
    async sendPeerRequest(type, request) {
        // connect to peer
        await this.connect();
        // encode request
        const peerRequest = await this.encodeRequest(type, request);
        const peerResponse = await new Promise((resolve, reject) => {
            this.peerClient.messagePeer(peerRequest, (err, response) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(response);
                }
            });
        });
        // decode response
        const { type: responseType, response } = await this.decodeResponse(peerResponse);
        // return response
        return response;
    }
    // ======== Helper Methods ======== //
    async encodeRequest(type, request) {
        // encrypt message
        const requestString = utils_1.protobufToString(request);
        const encryptedMessage = await this.keyManager.encryptData(Buffer.from(requestString), Buffer.from(this.publicKey));
        // sign message
        const signedMessage = await this.keyManager.signData(encryptedMessage);
        const subMessage = signedMessage.toString();
        // encode and send message
        const peerRequest = new Peer_pb_1.PeerMessage();
        peerRequest.setPublickey(this.peerManager.peerInfo.publicKey);
        peerRequest.setType(type);
        peerRequest.setSubmessage(subMessage);
        return peerRequest;
    }
    async decodeResponse(response) {
        const { publickey, type: responseType, submessage } = response.toObject();
        // decode peerResponse
        if (PeerInfo_1.default.formatPublicKey(this.getPeerInfo().publicKey) != PeerInfo_1.default.formatPublicKey(publickey)) {
            // drop packet
            throw Error('response public key does not match request public key');
        }
        // verify response
        const verifiedResponse = await this.keyManager.verifyData(Buffer.from(submessage), Buffer.from(publickey));
        // decrypt response
        const decryptedResponse = await this.keyManager.decryptData(verifiedResponse);
        const responseBuffer = utils_1.stringToProtobuf(decryptedResponse.toString());
        return { type: responseType, response: responseBuffer };
    }
}
exports.default = PeerConnection;


/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const dgram_1 = __importDefault(__webpack_require__(16));
const PeerInfo_1 = __importDefault(__webpack_require__(0));
const events_1 = __webpack_require__(9);
const Peer_1 = __webpack_require__(7);
const utils_1 = __webpack_require__(11);
// This module is based heavily on libp2p's mDNS module:
// https://github.com/libp2p/js-libp2p-mdns
// It is supposed to discover peers on the local network
// This module was also generated with the help of:
// https://nrempel.com/using-udp-multicast-with-node-js/
//
// """
// In computer networking, the multicast DNS (mDNS) protocol
// resolves hostnames to IP addresses within small networks
// that do not include a local name server
// """
const UDP_MULTICAST_PORT = parseInt((_a = process.env.UDP_MULTICAST_PORT) !== null && _a !== void 0 ? _a : '5353');
const UDP_MULTICAST_ADDR = (_b = process.env.UDP_MULTICAST_ADDR) !== null && _b !== void 0 ? _b : '224.0.0.251';
class MulticastBroadcaster extends events_1.EventEmitter {
    constructor(peerManager, keyManager) {
        super();
        this.interval = 1e3;
        this.broadcastInterval = null;
        this.peerManager = peerManager;
        this.keyManager = keyManager;
        // Create socket
        this.socket = dgram_1.default.createSocket({ type: 'udp4', reuseAddr: true });
        this.socket.bind(UDP_MULTICAST_PORT);
        // Set up listener
        this.socket.on('listening', (() => {
            this.socket.addMembership(UDP_MULTICAST_ADDR);
            const address = this.socket.address();
            // Start the broadcasting process
            this.startBroadcasting();
        }).bind(this));
    }
    startListening() {
        if (!this.socket.listenerCount('message')) {
            // Handle messages
            this.socket.on('message', this.handleBroadcastMessage.bind(this));
        }
    }
    stopBroadcasting() {
        if (this.broadcastInterval) {
            clearInterval(this.broadcastInterval);
        }
    }
    startBroadcasting() {
        const broadcast = async () => {
            var _a;
            if (!this.keyManager.identityLoaded) {
                return;
            }
            const peerInfo = this.peerManager.peerInfo;
            const encodedPeerInfo = Peer_1.peerInterface.PeerInfoMessage.encodeDelimited({
                publicKey: peerInfo.publicKey,
                peerAddress: (_a = peerInfo.peerAddress) === null || _a === void 0 ? void 0 : _a.toString(),
                relayPublicKey: peerInfo.relayPublicKey,
            }).finish();
            // sign it for authenticity
            const signedPeerInfo = await this.keyManager.signData(Buffer.from(utils_1.protobufToString(encodedPeerInfo)));
            const encodedPeerMessage = Peer_1.peerInterface.PeerMessage.encodeDelimited({
                type: Peer_1.peerInterface.SubServiceType.PING_PEER,
                publicKey: this.peerManager.peerInfo.publicKey,
                subMessage: signedPeerInfo.toString(),
            }).finish();
            this.socket.send(encodedPeerMessage, 0, encodedPeerMessage.length, UDP_MULTICAST_PORT, UDP_MULTICAST_ADDR);
        };
        // Immediately start a query, then do it every interval.
        broadcast();
        this.broadcastInterval = setInterval(broadcast, this.interval);
    }
    async handleBroadcastMessage(request, rinfo) {
        try {
            const { publicKey: signingKey, type, subMessage } = Peer_1.peerInterface.PeerMessage.decodeDelimited(request);
            // only relevant if peer public key exists in store and type is of PING
            if (!this.peerManager.hasPeer(signingKey)) {
                throw Error('peer does not exist in store');
            }
            else if (this.peerManager.peerInfo.publicKey == signingKey) {
                throw Error('peer message is from self');
            }
            else if (!(type == Peer_1.peerInterface.SubServiceType.PING_PEER)) {
                throw Error(`peer message is not of type PING, type is: ${Peer_1.peerInterface.SubServiceType[type]}`);
            }
            // verify the subMessage
            const verifiedMessage = await this.keyManager.verifyData(subMessage, Buffer.from(signingKey));
            const encodedMessage = utils_1.stringToProtobuf(verifiedMessage.toString());
            const { publicKey, peerAddress, relayPublicKey } = Peer_1.peerInterface.PeerInfoMessage.decodeDelimited(encodedMessage);
            // construct a peer info object
            const peerInfo = new PeerInfo_1.default(publicKey, peerAddress, relayPublicKey);
            // update the peer store
            this.peerManager.updatePeer(peerInfo);
            this.emit('found', publicKey);
        }
        catch (err) {
            // Couldn't decode message
            // We don't want the multicast discovery to error on every message it coudln't decode!
        }
    }
}
exports.default = MulticastBroadcaster;


/***/ }),
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(__webpack_require__(8));
const path_1 = __importDefault(__webpack_require__(1));
const isomorphic_git_1 = __importDefault(__webpack_require__(19));
const Vault_1 = __importDefault(__webpack_require__(49));
const encryptedfs_1 = __webpack_require__(20);
const GitBackend_1 = __importDefault(__webpack_require__(51));
const GitFrontend_1 = __importDefault(__webpack_require__(63));
class VaultManager {
    constructor(polykeyPath = `${os_1.default.homedir()}/.polykey`, fileSystem, keyManager, peerManager) {
        this.polykeyPath = polykeyPath;
        this.fileSystem = fileSystem;
        this.keyManager = keyManager;
        this.peerManager = peerManager;
        this.metadataPath = path_1.default.join(polykeyPath, '.vaultKeys');
        // Make polykeyPath if it doesn't exist
        this.fileSystem.mkdirSync(this.polykeyPath, { recursive: true });
        // Initialize stateful variables
        this.vaults = new Map();
        this.vaultKeys = new Map();
        this.gitBackend = new GitBackend_1.default(polykeyPath, ((repoName) => this.getVault(repoName).EncryptedFS).bind(this), this.getVaultNames.bind(this));
        this.gitFrontend = new GitFrontend_1.default(peerManager);
        this.peerManager.setGitHandler(this.gitBackend.handleGitMessage.bind(this.gitBackend));
        // Read in vault keys
        this.loadMetadata();
    }
    getVaultNames(publicKey) {
        const vaultNames = Object.keys(this.vaults);
        if (publicKey) {
            const allowedVaultNames = [];
            for (const vaultName of vaultNames) {
                if (this.getVault(vaultName).peerCanAccess(publicKey)) {
                    allowedVaultNames.push(vaultName);
                }
            }
            return allowedVaultNames;
        }
        else {
            return vaultNames;
        }
    }
    /**
     * Get a vault from the vault manager
     * @param vaultName Name of desired vault
     */
    getVault(vaultName) {
        if (this.vaults.has(vaultName)) {
            const vault = this.vaults.get(vaultName);
            return vault;
        }
        else if (this.vaultKeys.has(vaultName)) {
            // vault not in map, create new instance
            this.validateVault(vaultName);
            const vaultKey = this.vaultKeys.get(vaultName);
            const vault = new Vault_1.default(vaultName, vaultKey, this.polykeyPath, this.gitFrontend);
            this.vaults.set(vaultName, vault);
            return vault;
        }
        else {
            throw Error(`vault does not exist in memory: '${vaultName}'`);
        }
    }
    /**
     * Get a vault from the vault manager
     * @param vaultName Unique name of new vault
     * @param key Optional key to use for the vault encryption, otherwise it is generated
     */
    async createVault(vaultName, key) {
        if (this.vaultExists(vaultName)) {
            throw Error('Vault already exists!');
        }
        try {
            const vaultPath = path_1.default.join(this.polykeyPath, vaultName);
            // Directory not present, create one
            this.fileSystem.mkdirSync(vaultPath, { recursive: true });
            // Create key if not provided
            let vaultKey;
            if (!key) {
                // Generate new key
                vaultKey = await this.keyManager.generateKey(`${vaultName}-Key`, this.keyManager.getPrivateKey(), false);
            }
            else {
                // Assign key if it is provided
                vaultKey = key;
            }
            this.vaultKeys.set(vaultName, vaultKey);
            this.writeMetadata();
            // Create vault
            const vault = new Vault_1.default(vaultName, vaultKey, this.polykeyPath, this.gitFrontend);
            // Init repository for vault
            const efs = vault.EncryptedFS;
            const fileSystem = { promises: efs.promises };
            await isomorphic_git_1.default.init({
                fs: fileSystem,
                dir: vaultPath,
            });
            // Initial commit
            await isomorphic_git_1.default.commit({
                fs: fileSystem,
                dir: vaultPath,
                author: {
                    name: vaultName,
                },
                message: 'init commit',
            });
            // Write packed-refs file because isomorphic git goes searching for it
            // and apparently its not autogenerated
            efs.writeFileSync(path_1.default.join(vaultPath, '.git', 'packed-refs'), '# pack-refs with: peeled fully-peeled sorted');
            // Set vault
            this.vaults.set(vaultName, vault);
            return this.getVault(vaultName);
        }
        catch (err) {
            // Delete vault dir and garbage collect
            this.destroyVault(vaultName);
            throw err;
        }
    }
    /**
     * Get a vault from the vault manager
     * @param vaultName Name of vault to be cloned
     * @param address Address of polykey node that owns vault to be cloned
     * @param getSocket Function to get an active connection to provided address
     */
    async cloneVault(vaultName, publicKey) {
        // Confirm it doesn't exist locally already
        if (this.vaultExists(vaultName)) {
            throw Error('Vault name already exists locally, try pulling instead');
        }
        const vaultUrl = `http://0.0.0.0/${vaultName}`;
        // First check if it exists on remote
        const gitRequest = this.gitFrontend.connectToPeerGit(publicKey);
        const info = await isomorphic_git_1.default.getRemoteInfo({
            http: gitRequest,
            url: vaultUrl,
        });
        if (!info.refs) {
            throw Error(`Peer does not have vault: '${vaultName}'`);
        }
        // Create new efs first
        // Generate new key
        const vaultKey = await this.keyManager.generateKey(`${vaultName}-Key`, this.keyManager.getPrivateKey());
        // Set filesystem
        const vfsInstance = new (__webpack_require__(21).VirtualFS)();
        const newEfs = new encryptedfs_1.EncryptedFS(vaultKey, vfsInstance, vfsInstance, this.fileSystem, process);
        // Clone vault from address
        await isomorphic_git_1.default.clone({
            fs: { promises: newEfs.promises },
            http: gitRequest,
            dir: path_1.default.join(this.polykeyPath, vaultName),
            url: vaultUrl,
            ref: 'master',
            singleBranch: true,
        });
        // Finally return the vault
        const vault = new Vault_1.default(vaultName, vaultKey, this.polykeyPath, this.gitFrontend);
        this.vaults.set(vaultName, vault);
        return vault;
    }
    async scanVaultNames(publicKey) {
        const gitRequest = this.gitFrontend.connectToPeerGit(publicKey);
        const vaultNameList = await gitRequest.scanVaults();
        return vaultNameList;
    }
    /**
     * Determines whether the vault exists
     * @param vaultName Name of desired vault
     */
    vaultExists(vaultName) {
        const vaultPath = path_1.default.join(this.polykeyPath, vaultName);
        const vaultExists = this.fileSystem.existsSync(vaultPath);
        return vaultExists;
    }
    /**
     * [WARNING] Destroys a certain vault and all its secrets
     * @param vaultName Name of vault to be destroyed
     */
    destroyVault(vaultName) {
        // this is convenience function for removing all tags
        // and triggering garbage collection
        // destruction is a better word as we should ensure all traces is removed
        const vaultPath = path_1.default.join(this.polykeyPath, vaultName);
        // Remove directory on file system
        if (this.fileSystem.existsSync(vaultPath)) {
            this.fileSystem.rmdirSync(vaultPath, { recursive: true });
        }
        // Remove from maps
        this.vaults.delete(vaultName);
        this.vaultKeys.delete(vaultName);
        // Write to metadata file
        this.writeMetadata();
        const vaultPathExists = this.fileSystem.existsSync(vaultPath);
        if (vaultPathExists) {
            throw Error('Vault folder could not be destroyed!');
        }
    }
    /**
     * List the names of all vaults in memory
     */
    listVaults() {
        return Array.from(this.vaults.keys());
    }
    /* ============ HELPERS =============== */
    validateVault(vaultName) {
        if (!this.vaults.has(vaultName)) {
            throw Error(`vault does not exist in memory: '${vaultName}'`);
        }
        if (!this.vaultKeys.has(vaultName)) {
            throw Error(`vault key does not exist in memory: '${vaultName}'`);
        }
        const vaultPath = path_1.default.join(this.polykeyPath, vaultName);
        if (!this.fileSystem.existsSync(vaultPath)) {
            throw Error(`vault directory does not exist: '${vaultPath}'`);
        }
    }
    async writeMetadata() {
        const metadata = JSON.stringify([...this.vaultKeys]);
        const encryptedMetadata = await this.keyManager.encryptData(Buffer.from(metadata));
        await this.fileSystem.promises.writeFile(this.metadataPath, encryptedMetadata);
    }
    async loadMetadata() {
        // Check if file exists
        if (this.fileSystem.existsSync(this.metadataPath) && this.keyManager.identityLoaded) {
            const encryptedMetadata = this.fileSystem.readFileSync(this.metadataPath);
            const metadata = (await this.keyManager.decryptData(encryptedMetadata)).toString();
            for (const [key, value] of new Map(JSON.parse(metadata))) {
                this.vaultKeys.set(key, Buffer.from(value));
            }
            // Initialize vaults in memory
            for (const [vaultName, vaultKey] of this.vaultKeys.entries()) {
                const vaultPath = path_1.default.join(this.polykeyPath, vaultName);
                if (this.fileSystem.existsSync(vaultPath)) {
                    const vault = new Vault_1.default(vaultName, vaultKey, this.polykeyPath, this.gitFrontend);
                    this.vaults.set(vaultName, vault);
                }
            }
        }
    }
}
exports.default = VaultManager;


/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(__webpack_require__(3));
const path_1 = __importDefault(__webpack_require__(1));
const isomorphic_git_1 = __importDefault(__webpack_require__(19));
const async_mutex_1 = __webpack_require__(50);
const encryptedfs_1 = __webpack_require__(20);
class Vault {
    constructor(name, symKey, baseDir, gitFrontend) {
        // Concurrency
        this.mutex = new async_mutex_1.Mutex();
        // how do we create pub/priv key pair?
        // do we use the same gpg pub/priv keypair
        this.key = symKey;
        // Set filesystem
        const vfsInstance = new (__webpack_require__(21).VirtualFS)();
        this.efs = new encryptedfs_1.EncryptedFS(this.key, vfsInstance, vfsInstance, fs_1.default, process);
        this.name = name;
        this.vaultPath = path_1.default.join(baseDir, name);
        // make the vault directory
        this.efs.mkdirSync(this.vaultPath, { recursive: true });
        this.secrets = new Map();
        this.loadSecrets();
        this.gitFrontend = gitFrontend;
        // Load metadata
        this.metadataPath = path_1.default.join(this.vaultPath, '.vault', 'metadata');
        this.loadMetadata();
    }
    /**
     * Returns the Encrypted File System used for vault operations
     */
    get EncryptedFS() {
        return this.efs;
    }
    /**
     * Determines whether a secret exists in the vault
     * @param secretName Name of desired secret
     */
    secretExists(secretName) {
        const secretPath = path_1.default.join(this.vaultPath, secretName);
        return this.secrets.has(secretName) && this.efs.existsSync(secretPath);
    }
    /**
     * Adds a secret to the vault
     * @param secretName Name of new secret
     * @param secret Content of new secret
     */
    async addSecret(secretName, secret) {
        const release = await this.mutex.acquire();
        try {
            // Check if secret already exists
            if (this.secrets.has(secretName)) {
                throw Error('Secret already exists, try updating it instead.');
            }
            const writePath = path_1.default.join(this.vaultPath, secretName);
            // Write secret
            await this.efs.promises.writeFile(writePath, secret, {});
            // Update secrets map
            this.secrets.set(secretName, secret);
            // Auto commit message
            await this.commitChanges(`Add secret: ${secretName}`, secretName, 'added');
        }
        catch (error) {
            release();
            throw error;
        }
        finally {
            release();
        }
    }
    /**
     * Updates a secret in the vault
     * @param secretName Name of secret to be updated
     * @param secret Content of updated secret
     */
    async updateSecret(secretName, secret) {
        const release = await this.mutex.acquire();
        try {
            // Check if secret already exists
            if (!this.secrets.has(secretName)) {
                throw Error('Secret does not exist, try adding it instead.');
            }
            const writePath = path_1.default.join(this.vaultPath, secretName);
            // Write secret
            await this.efs.promises.writeFile(writePath, secret, {});
            // Update secrets map
            this.secrets.set(secretName, secret);
            // Auto commit message
            await this.commitChanges(`Update secret: ${secretName}`, secretName, 'modified');
        }
        catch (error) {
            release();
            throw error;
        }
        finally {
            release();
        }
    }
    /**
     * Get a secret from the vault
     * @param secretName Name of secret to be retrieved
     */
    getSecret(secretName) {
        if (this.secrets.has(secretName)) {
            const secret = this.secrets.get(secretName);
            if (secret) {
                return secret;
            }
            else {
                const secretPath = path_1.default.join(this.vaultPath, secretName);
                // TODO: this should be async
                const secretBuf = this.efs.readFileSync(secretPath, {});
                this.secrets.set(secretName, secretBuf);
                return secretBuf;
            }
        }
        throw Error('Secret: ' + secretName + ' does not exist');
    }
    /**
     * [WARNING] Removes a secret from the vault
     * @param secretName Name of secret to be removed
     */
    async removeSecret(secretName) {
        const release = await this.mutex.acquire();
        try {
            if (this.secrets.has(secretName)) {
                const successful = this.secrets.delete(secretName);
                // Remove from fs
                await this.efs.promises.unlink(path_1.default.join(this.vaultPath, secretName));
                // Auto commit message
                await this.commitChanges(`Remove secret: ${secretName}`, secretName, 'removed');
                if (successful) {
                    return;
                }
                throw Error('Secret: ' + secretName + ' was not removed');
            }
            throw Error('Secret: ' + secretName + ' does not exist');
        }
        catch (error) {
            release();
            throw error;
        }
        finally {
            release();
        }
    }
    /**
     * Lists all the secrets currently in the vault
     */
    listSecrets() {
        let secrets = Array.from(this.secrets.keys());
        return secrets;
    }
    tagVault() { }
    untagVault() { }
    /////////////
    // Sharing //
    /////////////
    /**
     * Allows a particular public key to access the vault
     * @param publicKey Public key to share with
     */
    shareVault(publicKey) {
        if (this.sharedPubKeys.has(name)) {
            throw Error('Vault is already shared with given public key');
        }
        this.sharedPubKeys.add(publicKey);
        // Write metadata
        this.writeMetadata();
    }
    /**
     * Removes access to the vault for a particular public key
     * @param publicKey Public key to unshare with
     */
    unshareVault(publicKey) {
        if (!this.sharedPubKeys.has(publicKey)) {
            throw Error('Vault is not shared with given public key');
        }
        this.sharedPubKeys.delete(publicKey);
        // Write metadata
        this.writeMetadata();
    }
    /**
     * Determines if a particular public key can access the vault
     * @param publicKey Public key to check
     */
    peerCanAccess(publicKey) {
        // return this.sharedPubKeys.has(publicKey)
        return true;
    }
    /**
     * Pulls the vault from a specific address
     * @param publicKey Public key of polykey node that owns vault to be pulled
     */
    async pullVault(publicKey) {
        const release = await this.mutex.acquire();
        try {
            // Strangely enough this is needed for pulls along with ref set to 'HEAD'
            // In isogit's documentation, this is just to get the currentBranch name
            // But it solves a bug whereby if not used, git.pull complains that it can't
            // find the master branch or HEAD
            await isomorphic_git_1.default.currentBranch({
                fs: { promises: this.efs.promises },
                dir: this.vaultPath,
                fullname: true,
            });
            // First pull
            const gitClient = this.gitFrontend.connectToPeerGit(publicKey);
            await isomorphic_git_1.default.pull({
                fs: { promises: this.efs.promises },
                http: gitClient,
                dir: this.vaultPath,
                url: 'http://' + '0.0.0.0:0' + '/' + this.name,
                ref: 'HEAD',
                singleBranch: true,
                author: {
                    name: this.name,
                },
            });
            // Load any new secrets
            this.loadSecrets();
        }
        catch (error) {
            release();
            throw error;
        }
        finally {
            release();
        }
    }
    async getVaultHistory(depth) {
        const logs = await isomorphic_git_1.default.log({
            fs: { promises: this.efs.promises },
            dir: this.vaultPath,
            depth,
        });
        return logs.map((commit) => {
            return commit.commit.message;
        });
    }
    // ============== Helper methods ============== //
    writeMetadata() {
        // mkdir first
        this.efs.mkdirSync(path_1.default.dirname(this.metadataPath), { recursive: true });
        // Create and write metadata
        const metadata = {
            sharedPubKeys: Array.from(this.sharedPubKeys.keys()),
        };
        this.efs.writeFileSync(this.metadataPath, JSON.stringify(metadata));
    }
    loadMetadata() {
        if (this.efs.existsSync(this.metadataPath)) {
            const fileContents = this.efs.readFileSync(this.metadataPath).toString();
            const metadata = JSON.parse(fileContents);
            this.sharedPubKeys = new Set(metadata.sharedPubKeys);
        }
        else {
            // Need to create it
            this.sharedPubKeys = new Set();
            this.writeMetadata();
        }
    }
    async commitChanges(message, secretName, action) {
        if (action == 'removed') {
            await isomorphic_git_1.default.remove({
                fs: { promises: this.efs.promises },
                dir: this.vaultPath,
                filepath: secretName,
            });
        }
        else {
            await isomorphic_git_1.default.add({
                fs: { promises: this.efs.promises },
                dir: this.vaultPath,
                filepath: secretName,
            });
        }
        return await isomorphic_git_1.default.commit({
            fs: { promises: this.efs.promises },
            dir: this.vaultPath,
            author: {
                name: this.name,
            },
            message: message,
        });
    }
    loadSecrets() {
        const secrets = fs_1.default.readdirSync(this.vaultPath, undefined);
        // Remove all secrets first
        this.secrets.clear();
        // Load secrets
        for (const secret of secrets.filter((s) => s[0] != '.')) {
            this.secrets.set(secret, null);
        }
    }
}
exports.default = Vault;


/***/ }),
/* 50 */
/***/ (function(module, exports) {

module.exports = require("async-mutex");

/***/ }),
/* 51 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(__webpack_require__(1));
const Git_1 = __webpack_require__(22);
const readable_stream_1 = __webpack_require__(13);
const uploadPack_1 = __importDefault(__webpack_require__(52));
const GitSideBand_1 = __importDefault(__webpack_require__(54));
const packObjects_1 = __importDefault(__webpack_require__(56));
// Here is the protocol git outlines for sending pack files over http:
// https://git-scm.com/docs/pack-protocol/2.17.0
// https://github.com/git/git/blob/master/Documentation/technical/pack-protocol.txt
// This should be consulted in developing our upload pack implementation
// This git backend (as well as HttpDuplex class) is heavily inspired by node-git-server:
// https://github.com/gabrielcsapo/node-git-server
// We need someway to notify other agents about what vaults we have based on some type of authorisation because they don't explicitly know about them
class GitBackend {
    constructor(repoDirectoryPath, getFileSystem, getVaultNames) {
        this.repoDirectoryPath = repoDirectoryPath;
        this.getFileSystem = getFileSystem;
        this.getVaultNames = getVaultNames;
    }
    async handleGitMessage(request, publicKey) {
        const { type, subMessage } = Git_1.gitInterface.GitMessage.decodeDelimited(request);
        let response;
        switch (type) {
            case Git_1.gitInterface.GitMessageType.INFO:
                {
                    const { vaultName } = Git_1.gitInterface.InfoRequest.decodeDelimited(subMessage);
                    response = Git_1.gitInterface.InfoReply.encodeDelimited({
                        vaultName,
                        body: await this.handleInfoRequest(vaultName),
                    }).finish();
                }
                break;
            case Git_1.gitInterface.GitMessageType.PACK:
                {
                    const { vaultName, body } = Git_1.gitInterface.PackRequest.decodeDelimited(subMessage);
                    response = Git_1.gitInterface.PackReply.encodeDelimited({
                        vaultName,
                        body: await this.handlePackRequest(vaultName, Buffer.from(body)),
                    }).finish();
                }
                break;
            case Git_1.gitInterface.GitMessageType.VAULT_NAMES:
                {
                    response = Git_1.gitInterface.VaultNamesReply.encodeDelimited({
                        vaultNameList: await this.handleVaultNamesRequest(publicKey),
                    }).finish();
                }
                break;
            default: {
                throw Error('git message type not supported');
            }
        }
        // encode a git response
        const gitResponse = Git_1.gitInterface.GitMessage.encodeDelimited({ type, subMessage: response }).finish();
        return gitResponse;
    }
    async handleInfoRequest(repoName) {
        // Only handle upload-pack for now
        const service = 'upload-pack';
        const fileSystem = this.getFileSystem(repoName);
        const responseBuffers = [];
        if (!fileSystem.existsSync(path_1.default.join(this.repoDirectoryPath, repoName))) {
            throw Error(`repository does not exist: '${repoName}'`);
        }
        responseBuffers.push(Buffer.from(this.createGitPacketLine('# service=git-' + service + '\n')));
        responseBuffers.push(Buffer.from('0000'));
        const buffers = await uploadPack_1.default(fileSystem, path_1.default.join(this.repoDirectoryPath, repoName), undefined, true);
        const buffersToWrite = buffers !== null && buffers !== void 0 ? buffers : [];
        responseBuffers.push(...buffersToWrite);
        return Buffer.concat(responseBuffers);
    }
    async handlePackRequest(repoName, body) {
        // eslint-disable-next-line
        return new Promise(async (resolve, reject) => {
            const responseBuffers = [];
            const fileSystem = this.getFileSystem(repoName);
            // Check if repo exists
            if (!fileSystem.existsSync(path_1.default.join(this.repoDirectoryPath, repoName))) {
                throw Error(`repository does not exist: '${repoName}'`);
            }
            if (body.toString().slice(4, 8) == 'want') {
                const wantedObjectId = body.toString().slice(9, 49);
                const packResult = await packObjects_1.default(fileSystem, path_1.default.join(this.repoDirectoryPath, repoName), [wantedObjectId], undefined);
                // This the 'wait for more data' line as I understand it
                responseBuffers.push(Buffer.from('0008NAK\n'));
                // This is to get the side band stuff working
                const readable = new readable_stream_1.PassThrough();
                const progressStream = new readable_stream_1.PassThrough();
                const sideBand = GitSideBand_1.default.mux('side-band-64', readable, packResult.packstream, progressStream, []);
                sideBand.on('data', (data) => {
                    responseBuffers.push(data);
                });
                sideBand.on('end', () => {
                    resolve(Buffer.concat(responseBuffers));
                });
                sideBand.on('error', (err) => {
                    reject(err);
                });
                // Write progress to the client
                progressStream.write(Buffer.from('0014progress is at 50%\n'));
                progressStream.end();
            }
        });
    }
    async handleVaultNamesRequest(publicKey) {
        return this.getVaultNames(publicKey);
    }
    // ============ Helper functions ============ //
    createGitPacketLine(line) {
        const hexPrefix = (4 + line.length).toString(16);
        return Array(4 - hexPrefix.length + 1).join('0') + hexPrefix + line;
    }
}
exports.default = GitBackend;


/***/ }),
/* 52 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(__webpack_require__(1));
const GitPktLine_1 = __importDefault(__webpack_require__(23));
const GitRefManager_1 = __importDefault(__webpack_require__(24));
async function writeRefsAdResponse({ capabilities, refs, symrefs }) {
    const stream = [];
    // Compose capabilities string
    let syms = '';
    for (const [key, value] of Object.entries(symrefs)) {
        syms += `symref=${key}:${value} `;
    }
    let caps = `\x00${[...capabilities].join(' ')} ${syms}agent=git/isomorphic-git@1.4.0`;
    // stream.write(GitPktLine.encode(`# service=${service}\n`))
    // stream.write(GitPktLine.flush())
    // Note: In the edge case of a brand new repo, zero refs (and zero capabilities)
    // are returned.
    for (const [key, value] of Object.entries(refs)) {
        stream.push(GitPktLine_1.default.encode(`${value} ${key}${caps}\n`));
        caps = '';
    }
    stream.push(GitPktLine_1.default.flush());
    return stream;
}
async function uploadPack(fileSystem, dir, gitdir = path_1.default.join(dir, '.git'), advertiseRefs = false) {
    try {
        if (advertiseRefs) {
            // Send a refs advertisement
            const capabilities = ['side-band-64k'];
            let keys = await GitRefManager_1.default.listRefs(fileSystem, gitdir, 'refs');
            keys = keys.map((ref) => `refs/${ref}`);
            const refs = {};
            keys.unshift('HEAD'); // HEAD must be the first in the list
            for (const key of keys) {
                refs[key] = await GitRefManager_1.default.resolve(fileSystem, gitdir, key);
            }
            const symrefs = {};
            symrefs['HEAD'] = await GitRefManager_1.default.resolve(fileSystem, gitdir, 'HEAD', 2);
            return writeRefsAdResponse({
                capabilities,
                refs,
                symrefs,
            });
        }
    }
    catch (err) {
        err.caller = 'git.uploadPack';
        throw err;
    }
}
exports.default = uploadPack;


/***/ }),
/* 53 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class GitPackedRefs {
    constructor(text) {
        this.refs = new Map();
        this.parsedConfig = [];
        if (text) {
            let key;
            this.parsedConfig = text
                .trim()
                .split('\n')
                .map((line) => {
                if (/^\s*#/.test(line)) {
                    return { line: line, comment: true };
                }
                const i = line.indexOf(' ');
                if (line.startsWith('^')) {
                    // This is a oid for the commit associated with the annotated tag immediately preceding this line.
                    // Trim off the '^'
                    const value = line.slice(1);
                    // The tagname^{} syntax is based on the output of `git show-ref --tags -d`
                    this.refs.set(key + '^{}', value);
                    return { line: line, ref: key, peeled: value };
                }
                else {
                    // This is an oid followed by the ref name
                    const value = line.slice(0, i);
                    key = line.slice(i + 1);
                    this.refs.set(key, value);
                    return { line: line, ref: key, oid: value };
                }
            });
        }
        return this;
    }
    static from(text) {
        return new GitPackedRefs(text);
    }
}
exports.default = GitPackedRefs;


/***/ }),
/* 54 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
If 'side-band' or 'side-band-64k' capabilities have been specified by
the client, the server will send the packfile data multiplexed.

Each packet starting with the packet-line length of the amount of data
that follows, followed by a single byte specifying the sideband the
following data is coming in on.

In 'side-band' mode, it will send up to 999 data bytes plus 1 control
code, for a total of up to 1000 bytes in a pkt-line.  In 'side-band-64k'
mode it will send up to 65519 data bytes plus 1 control code, for a
total of up to 65520 bytes in a pkt-line.

The sideband byte will be a '1', '2' or a '3'. Sideband '1' will contain
packfile data, sideband '2' will be used for progress information that the
client will generally print to stderr and sideband '3' is used for error
information.

If no 'side-band' capability was specified, the server will stream the
entire packfile without multiplexing.
*/
const buffer_1 = __webpack_require__(55);
const readable_stream_1 = __webpack_require__(13);
const GitPktLine_1 = __importDefault(__webpack_require__(23));
function splitBuffer(buffer, maxBytes) {
    const result = [];
    let index = 0;
    while (index < buffer.length) {
        const buf = buffer.slice(index, index + maxBytes);
        result.push(buf);
        index += buf.length;
    }
    result.push(buffer.slice(index));
    return result;
}
class GitSideBand {
    static demux(input) {
        let read = GitPktLine_1.default.streamReader(input);
        // And now for the ridiculous side-band or side-band-64k protocol
        let packetlines = new readable_stream_1.PassThrough();
        let packfile = new readable_stream_1.PassThrough();
        let progress = new readable_stream_1.PassThrough();
        // TODO: Use a proper through stream?
        const nextBit = async function () {
            let line = await read();
            // Skip over flush packets
            if (line === null)
                return nextBit();
            // A made up convention to signal there's no more to read.
            if (line === true) {
                packetlines.end();
                progress.end();
                packfile.end();
                return;
            }
            // Examine first byte to determine which output "stream" to use
            switch (line[0]) {
                case 1: // pack data
                    packfile.write(line.slice(1));
                    break;
                case 2: // progress message
                    progress.write(line.slice(1));
                    break;
                case 3: // fatal error message just before stream aborts
                    // eslint-disable-next-line
                    const error = line.slice(1);
                    progress.write(error);
                    packfile.destroy(new Error(error.toString('utf8')));
                    return;
                default:
                    // Not part of the side-band-64k protocol
                    packetlines.write(line.slice(0));
            }
            // Careful not to blow up the stack.
            // I think Promises in a tail-call position should be OK.
            nextBit();
        };
        nextBit();
        return {
            packetlines,
            packfile,
            progress,
        };
    }
    static mux(protocol, // 'side-band' or 'side-band-64k'
    packetlines, packfile, progress, error) {
        const MAX_PACKET_LENGTH = protocol === 'side-band-64k' ? 999 : 65519;
        let output = new readable_stream_1.PassThrough();
        packetlines.on('data', (data) => {
            if (data === null) {
                output.write(GitPktLine_1.default.flush());
            }
            else {
                output.write(GitPktLine_1.default.encode(data));
            }
        });
        let packfileWasEmpty = true;
        let packfileEnded = false;
        let progressEnded = false;
        let errorEnded = true;
        let goodbye = buffer_1.Buffer.concat([GitPktLine_1.default.encode(buffer_1.Buffer.from('010A', 'hex')), GitPktLine_1.default.flush()]);
        packfile
            .on('data', (data) => {
            packfileWasEmpty = false;
            const buffers = splitBuffer(data, MAX_PACKET_LENGTH);
            for (const buffer of buffers) {
                output.write(GitPktLine_1.default.encode(buffer_1.Buffer.concat([buffer_1.Buffer.from('01', 'hex'), buffer])));
            }
        })
            .on('end', () => {
            packfileEnded = true;
            if (!packfileWasEmpty)
                output.write(goodbye);
            if (progressEnded && errorEnded)
                output.end();
        });
        progress
            .on('data', (data) => {
            const buffers = splitBuffer(data, MAX_PACKET_LENGTH);
            for (const buffer of buffers) {
                output.write(GitPktLine_1.default.encode(buffer_1.Buffer.concat([buffer_1.Buffer.from('02', 'hex'), buffer])));
            }
        })
            .on('end', () => {
            progressEnded = true;
            if (packfileEnded && errorEnded)
                output.end();
        });
        // error
        //   .on('data', data => {
        //     const buffers = splitBuffer(data, MAX_PACKET_LENGTH)
        //     for (const buffer of buffers) {
        //       output.write(
        //         GitPktLine.encode(Buffer.concat([Buffer.from('03', 'hex'), buffer]))
        //       )
        //     }
        //   })
        //   .on('end', () => {
        //     errorEnded = true
        //     if (progressEnded && packfileEnded) output.end()
        //   })
        return output;
    }
}
exports.default = GitSideBand;


/***/ }),
/* 55 */
/***/ (function(module, exports) {

module.exports = require("buffer");

/***/ }),
/* 56 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pako_1 = __importDefault(__webpack_require__(25));
const path_1 = __importDefault(__webpack_require__(1));
const log_1 = __importDefault(__webpack_require__(57));
const GitTree_1 = __importDefault(__webpack_require__(61));
const sha_js_1 = __importDefault(__webpack_require__(62));
const GitCommit_1 = __importDefault(__webpack_require__(26));
const readable_stream_1 = __webpack_require__(13);
const GitObjectManager_1 = __importDefault(__webpack_require__(27));
const types = {
    commit: 0b0010000,
    tree: 0b0100000,
    blob: 0b0110000,
    tag: 0b1000000,
    ofs_delta: 0b1100000,
    ref_delta: 0b1110000,
};
/**
 * Create a packfile stream
 *
 * @link https://isomorphic-git.github.io/docs/packObjects.html
 */
async function packObjects(fileSystem, dir, refs, depth, haves) {
    const gitdir = path_1.default.join(dir, '.git');
    let oids = new Set();
    let shallows = new Set();
    let unshallows = new Set();
    let acks = [];
    haves = haves ? haves : [];
    const emitter = undefined;
    const since = undefined;
    for (const ref of refs) {
        try {
            let commits = await log_1.default(fileSystem, dir, gitdir, emitter, ref, depth, since);
            let oldshallows = [];
            for (let i = 0; i < commits.length; i++) {
                let commit = commits[i];
                if (haves.includes(commit.oid)) {
                    acks.push({
                        oid: ref,
                    });
                    break;
                }
                oids.add(commit.oid);
                if (i === commits.length - 1) {
                    if (!oldshallows.includes(commit.oid) && (depth !== undefined || since !== undefined)) {
                        console.log('make it shallow', commit.oid);
                        shallows.add(commit.oid);
                    }
                }
                else if (oldshallows.includes(commit.oid)) {
                    console.log('make it unshallow', commit.oid);
                    unshallows.add(commit.oid);
                }
            }
        }
        catch (err) {
            console.log(err);
            // oh well.
        }
    }
    let objects = await listObjects(fileSystem, dir, gitdir, Array.from(oids));
    let packstream = new readable_stream_1.PassThrough();
    pack(fileSystem, dir, undefined, [...objects], packstream);
    return { packstream, shallows, unshallows, acks };
}
async function listObjects(fileSystem, dir, gitdir = path_1.default.join(dir, '.git'), oids) {
    let commits = new Set();
    let trees = new Set();
    let blobs = new Set();
    // We don't do the purest simplest recursion, because we can
    // avoid reading Blob objects entirely since the Tree objects
    // tell us which oids are Blobs and which are Trees. And we
    // do not need to recurse through commit parents.
    async function walk(oid) {
        let { type, object } = await GitObjectManager_1.default.read(fileSystem, gitdir, oid);
        if (type === 'commit') {
            commits.add(oid);
            let commit = GitCommit_1.default.from(object);
            let tree = commit.headers().tree;
            await walk(tree);
        }
        else if (type === 'tree') {
            trees.add(oid);
            let tree = GitTree_1.default.from(object);
            for (let entry of tree) {
                if (entry.type === 'blob') {
                    blobs.add(entry.oid);
                }
                // only recurse for trees
                if (entry.type === 'tree') {
                    await walk(entry.oid);
                }
            }
        }
    }
    // Let's go walking!
    for (let oid of oids) {
        await walk(oid);
    }
    return [...commits, ...trees, ...blobs];
}
exports.listObjects = listObjects;
async function pack(fileSystem, dir, gitdir = path_1.default.join(dir, '.git'), oids, outputStream) {
    let hash = sha_js_1.default('sha1');
    function write(chunk, enc = undefined) {
        if (enc) {
            outputStream.write(chunk, enc);
        }
        else {
            outputStream.write(chunk);
        }
        hash.update(chunk, enc);
    }
    function writeObject(object, stype) {
        let lastFour;
        let multibyte;
        let length;
        // Object type is encoded in bits 654
        let type = types[stype];
        if (type === undefined)
            throw Error('Unrecognized type: ' + stype);
        // The length encoding get complicated.
        length = object.length;
        // Whether the next byte is part of the variable-length encoded number
        // is encoded in bit 7
        multibyte = length > 0b1111 ? 0b10000000 : 0b0;
        // Last four bits of length is encoded in bits 3210
        lastFour = length & 0b1111;
        // Discard those bits
        length = length >>> 4;
        // The first byte is then (1-bit multibyte?), (3-bit type), (4-bit least sig 4-bits of length)
        let byte = (multibyte | type | lastFour).toString(16);
        write(byte, 'hex');
        // Now we keep chopping away at length 7-bits at a time until its zero,
        // writing out the bytes in what amounts to little-endian order.
        while (multibyte) {
            multibyte = length > 0b01111111 ? 0b10000000 : 0b0;
            byte = multibyte | (length & 0b01111111);
            const unpaddedChunk = byte.toString(16);
            const paddedChunk = '0'.repeat(2 - unpaddedChunk.length) + unpaddedChunk;
            write(paddedChunk, 'hex');
            length = length >>> 7;
        }
        // Lastly, we can compress and write the object.
        write(Buffer.from(pako_1.default.deflate(object)));
    }
    write('PACK');
    write('00000002', 'hex');
    // Write a 4 byte (32-bit) int
    const unpaddedChunk = oids.length.toString(16);
    const paddedChunk = '0'.repeat(8 - unpaddedChunk.length) + unpaddedChunk;
    write(paddedChunk, 'hex');
    for (let oid of oids) {
        let { type, object } = await GitObjectManager_1.default.read(fileSystem, gitdir, oid);
        writeObject(object, type);
    }
    // Write SHA1 checksum
    let digest = hash.digest();
    outputStream.end(digest);
    return outputStream;
}
exports.pack = pack;
exports.default = packObjects;


/***/ }),
/* 57 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __webpack_require__(1);
const GitCommit_1 = __importDefault(__webpack_require__(26));
const GitObjectManager_1 = __importDefault(__webpack_require__(27));
const GitRefManager_1 = __importDefault(__webpack_require__(24));
async function logCommit(fileSystem, gitdir, oid, signing) {
    try {
        let { type, object } = await GitObjectManager_1.default.read(fileSystem, gitdir, oid);
        if (type !== 'commit') {
            throw new Error('expected type to be commit');
        }
        const commit = GitCommit_1.default.from(object);
        const result = Object.assign({ oid }, commit.parse());
        if (signing) {
            result.payload = commit.withoutSignature();
        }
        return result;
    }
    catch (err) {
        return {
            oid,
            error: err,
        };
    }
}
exports.logCommit = logCommit;
function compareAge(a, b) {
    return a.committer.timestamp - b.committer.timestamp;
}
/**
 * Get commit descriptions from the git history
 *
 * @link https://isomorphic-git.github.io/docs/log.html
 */
async function log(fileSystem, dir, gitdir = path.join(dir, '.git'), ref = 'HEAD', depth, since, // Date
signing = false) {
    try {
        let sinceTimestamp = since === undefined ? undefined : Math.floor(since.valueOf() / 1000);
        // TODO: In the future, we may want to have an API where we return a
        // async iterator that emits commits.
        let commits = [];
        let oid = await GitRefManager_1.default.resolve(fileSystem, gitdir, ref);
        let tips = [await logCommit(fileSystem, gitdir, oid, signing)];
        // eslint-disable-next-line
        while (true) {
            let commit = tips.pop();
            // Stop the loop if we encounter an error
            if (commit.error) {
                commits.push(commit);
                break;
            }
            // Stop the log if we've hit the age limit
            if (sinceTimestamp !== undefined && commit.committer.timestamp <= sinceTimestamp) {
                break;
            }
            commits.push(commit);
            // Stop the loop if we have enough commits now.
            if (depth !== undefined && commits.length === depth)
                break;
            // Add the parents of this commit to the queue
            // Note: for the case of a commit with no parents, it will concat an empty array, having no net effect.
            for (const oid of commit.parent) {
                let commit = await logCommit(fileSystem, gitdir, oid, signing);
                if (!tips.map((commit) => commit.oid).includes(commit.oid)) {
                    tips.push(commit);
                }
            }
            // Stop the loop if there are no more commit parents
            if (tips.length === 0)
                break;
            // Process tips in order by age
            tips.sort(compareAge);
        }
        return commits;
    }
    catch (err) {
        err.caller = 'git.log';
        throw err;
    }
}
exports.default = log;


/***/ }),
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const shasum_1 = __importDefault(__webpack_require__(59));
class GitObject {
    static hash({ type, object }) {
        let buffer = Buffer.concat([Buffer.from(`${type} ${object.byteLength.toString()}\0`), Buffer.from(object)]);
        let oid = shasum_1.default(buffer);
        return oid;
    }
    static wrap({ type, object }) {
        let buffer = Buffer.concat([Buffer.from(`${type} ${object.byteLength.toString()}\0`), object]);
        let oid = shasum_1.default(buffer);
        return {
            oid,
            buffer,
        };
    }
    static unwrap({ oid, buffer }) {
        if (oid) {
            let sha = shasum_1.default(buffer);
            if (sha !== oid) {
                throw new Error(`SHA check failed! Expected ${oid}, computed ${sha}`);
            }
        }
        let s = buffer.indexOf(32); // first space
        let i = buffer.indexOf(0); // first null value
        let type = buffer.slice(0, s).toString('utf8'); // get type of object
        let length = buffer.slice(s + 1, i).toString('utf8'); // get type of object
        let actualLength = buffer.length - (i + 1);
        // verify length
        if (parseInt(length) !== actualLength) {
            throw new Error(`Length mismatch: expected ${length} bytes but got ${actualLength} instead.`);
        }
        return {
            type,
            object: Buffer.from(buffer.slice(i + 1)),
        };
    }
}
exports.default = GitObject;


/***/ }),
/* 59 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sha1_1 = __importDefault(__webpack_require__(60));
// This is modeled after @dominictarr's "shasum" module,
// but without the 'json-stable-stringify' dependency and
// extra type-casting features.
function shasum(buffer) {
    return new sha1_1.default().update(buffer).digest('hex');
}
exports.default = shasum;


/***/ }),
/* 60 */
/***/ (function(module, exports) {

module.exports = require("sha.js/sha1");

/***/ }),
/* 61 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*::
type TreeEntry = {
  mode: string,
  path: string,
  oid: string,
  type?: string
}
*/
Object.defineProperty(exports, "__esModule", { value: true });
function parseBuffer(buffer) {
    let _entries = [];
    let cursor = 0;
    while (cursor < buffer.length) {
        let space = buffer.indexOf(32, cursor);
        if (space === -1) {
            throw new Error(`GitTree: Error parsing buffer at byte location ${cursor}: Could not find the next space character.`);
        }
        let nullchar = buffer.indexOf(0, cursor);
        if (nullchar === -1) {
            throw new Error(`GitTree: Error parsing buffer at byte location ${cursor}: Could not find the next null character.`);
        }
        let mode = buffer.slice(cursor, space).toString('utf8');
        if (mode === '40000')
            mode = '040000'; // makes it line up neater in printed output
        let type = mode === '040000' ? 'tree' : 'blob';
        let path = buffer.slice(space + 1, nullchar).toString('utf8');
        let oid = buffer.slice(nullchar + 1, nullchar + 21).toString('hex');
        cursor = nullchar + 21;
        _entries.push({ mode, path, oid, type });
    }
    return _entries;
}
function limitModeToAllowed(mode) {
    if (typeof mode === 'number') {
        mode = mode.toString(8);
    }
    // tree
    if (mode.match(/^0?4.*/))
        return '40000'; // Directory
    if (mode.match(/^1006.*/))
        return '100644'; // Regular non-executable file
    if (mode.match(/^1007.*/))
        return '100755'; // Regular executable file
    if (mode.match(/^120.*/))
        return '120000'; // Symbolic link
    if (mode.match(/^160.*/))
        return '160000'; // Commit (git submodule reference)
    throw new Error(`Could not understand file mode: ${mode}`);
}
function nudgeIntoShape(entry) {
    if (!entry.oid && entry.sha) {
        entry.oid = entry.sha; // Github
    }
    entry.mode = limitModeToAllowed(entry.mode); // index
    if (!entry.type) {
        entry.type = 'blob'; // index
    }
    return entry;
}
class GitTree {
    constructor(entries) {
        if (Buffer.isBuffer(entries)) {
            this._entries = parseBuffer(entries);
        }
        else if (Array.isArray(entries)) {
            this._entries = entries.map(nudgeIntoShape);
        }
        else {
            throw new Error('invalid type passed to GitTree constructor');
        }
    }
    static from(tree) {
        return new GitTree(tree);
    }
    render() {
        return this._entries.map((entry) => `${entry.mode} ${entry.type} ${entry.oid}    ${entry.path}`).join('\n');
    }
    toObject() {
        return Buffer.concat(this._entries.map((entry) => {
            let mode = Buffer.from(entry.mode.replace(/^0/, ''));
            let space = Buffer.from(' ');
            let path = Buffer.from(entry.path);
            // let path = Buffer.from(entry.path, { encoding: 'utf8' })
            let nullchar = Buffer.from([0]);
            let oid = Buffer.from(entry.oid.match(/../g).map((n) => parseInt(n, 16)));
            return Buffer.concat([mode, space, path, nullchar, oid]);
        }));
    }
    entries() {
        return this._entries;
    }
    *[Symbol.iterator]() {
        for (let entry of this._entries) {
            yield entry;
        }
    }
}
exports.default = GitTree;


/***/ }),
/* 62 */
/***/ (function(module, exports) {

module.exports = require("sha.js");

/***/ }),
/* 63 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GitRequest_1 = __importDefault(__webpack_require__(64));
const Git_1 = __webpack_require__(22);
const Peer_pb_1 = __webpack_require__(12);
/**
 * Responsible for converting HTTP messages from isomorphic-git into requests and sending them to a specific peer.
 */
class GitFrontend {
    constructor(peerManager) {
        this.peerManager = peerManager;
    }
    /**
     * Requests remote info from the connected peer for the named vault.
     * @param vaultName Name of the desired vault
     * @param peerConnection A connection object to the peer
     */
    async requestInfo(vaultName, peerConnection) {
        const request = Git_1.gitInterface.InfoRequest.encodeDelimited({ vaultName }).finish();
        const response = await peerConnection.sendPeerRequest(Peer_pb_1.SubServiceType.GIT, Git_1.gitInterface.GitMessage.encodeDelimited({ type: Git_1.gitInterface.GitMessageType.INFO, subMessage: request }).finish());
        const { type, subMessage } = Git_1.gitInterface.GitMessage.decodeDelimited(response);
        const { body: responseBody } = Git_1.gitInterface.InfoReply.decodeDelimited(subMessage);
        return responseBody;
    }
    /**
     * Requests a pack from the connected peer for the named vault.
     * @param vaultName Name of the desired vault
     * @param body Contains the pack request
     * @param peerConnection A connection object to the peer
     */
    async requestPack(vaultName, body, peerConnection) {
        const request = Git_1.gitInterface.PackRequest.encodeDelimited({ vaultName, body }).finish();
        const response = await peerConnection.sendPeerRequest(Peer_pb_1.SubServiceType.GIT, Git_1.gitInterface.GitMessage.encodeDelimited({ type: Git_1.gitInterface.GitMessageType.PACK, subMessage: request }).finish());
        const { type, subMessage } = Git_1.gitInterface.GitMessage.decodeDelimited(response);
        const { body: responseBody } = Git_1.gitInterface.PackReply.decodeDelimited(subMessage);
        return responseBody;
    }
    /**
     * Requests a pack from the connected peer for the named vault.
     * @param vaultName Name of the desired vault
     * @param body Contains the pack request
     * @param peerConnection A connection object to the peer
     */
    async requestVaultNames(peerConnection) {
        const response = await peerConnection.sendPeerRequest(Peer_pb_1.SubServiceType.GIT, Git_1.gitInterface.GitMessage.encodeDelimited({
            type: Git_1.gitInterface.GitMessageType.VAULT_NAMES,
            subMessage: Buffer.from(''),
        }).finish());
        const { type, subMessage } = Git_1.gitInterface.GitMessage.decodeDelimited(response);
        const { vaultNameList } = Git_1.gitInterface.VaultNamesReply.decodeDelimited(subMessage);
        return vaultNameList;
    }
    connectToPeerGit(publicKey) {
        const peerConnection = this.peerManager.connectToPeer(publicKey);
        const gitRequest = new GitRequest_1.default(((vaultName) => this.requestInfo(vaultName, peerConnection)).bind(this), ((vaultName, body) => this.requestPack(vaultName, body, peerConnection)).bind(this), (() => this.requestVaultNames(peerConnection)).bind(this));
        return gitRequest;
    }
}
exports.default = GitFrontend;


/***/ }),
/* 64 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Responsible for converting HTTP messages from isomorphic-git into requests and sending them to a specific peer.
 */
class GitRequest {
    constructor(requestInfo, requestPack, requestVaultNames) {
        this.requestInfo = requestInfo;
        this.requestPack = requestPack;
        this.requestVaultNames = requestVaultNames;
    }
    /**
     * The custom http request method to feed into isomorphic-git's [custom http object](https://isomorphic-git.org/docs/en/http)
     */
    async request({ url, method, headers, body, onProgress }) {
        // eslint-disable-next-line
        return new Promise(async (resolve, reject) => {
            const u = new URL(url);
            // Parse request
            if (method == 'GET') {
                // Info request
                const match = u.pathname.match(/\/(.+)\/info\/refs$/);
                if (!match || /\.\./.test(match[1])) {
                    reject(new Error('Error'));
                }
                const vaultName = match[1];
                const infoResponse = await this.requestInfo(vaultName);
                resolve({
                    url: url,
                    method: method,
                    statusCode: 200,
                    statusMessage: 'OK',
                    body: this.iteratorFromData(infoResponse),
                    headers: headers,
                });
            }
            else if (method == 'POST') {
                // Info request
                const match = u.pathname.match(/\/(.+)\/git-(.+)/);
                if (!match || /\.\./.test(match[1])) {
                    reject(new Error('Error'));
                }
                const vaultName = match[1];
                const packResponse = await this.requestPack(vaultName, body[0]);
                resolve({
                    url: url,
                    method: method,
                    statusCode: 200,
                    statusMessage: 'OK',
                    body: this.iteratorFromData(packResponse),
                    headers: headers,
                });
            }
            else {
                reject(new Error('Method not supported'));
            }
        });
    }
    async scanVaults() {
        return await this.requestVaultNames();
    }
    // ==== HELPER METHODS ==== //
    /**
     * Converts a buffer into an iterator expected by isomorphic git.
     * @param data Data to be turned into an iterator
     */
    iteratorFromData(data) {
        let ended = false;
        return {
            next() {
                return new Promise((resolve, reject) => {
                    if (ended) {
                        return resolve({ done: true });
                    }
                    else {
                        ended = true;
                        resolve({ value: data, done: false });
                    }
                });
            },
        };
    }
}
exports.default = GitRequest;


/***/ }),
/* 65 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(__webpack_require__(8));
const fs_1 = __importDefault(__webpack_require__(3));
const net_1 = __importDefault(__webpack_require__(10));
const path_1 = __importDefault(__webpack_require__(1));
const process_1 = __importDefault(__webpack_require__(28));
const configstore_1 = __importDefault(__webpack_require__(66));
const PeerInfo_1 = __importDefault(__webpack_require__(0));
const PolykeyClient_1 = __importDefault(__webpack_require__(29));
const Polykey_1 = __importStar(__webpack_require__(67));
const child_process_1 = __webpack_require__(30);
const Agent_1 = __webpack_require__(5);
class PolykeyAgent {
    constructor() {
        // For storing the state of each polykey node
        // Keys are the paths to the polykey node, e.g. '~/.polykey'
        this.polykeyMap = new Map();
        this.pid = process_1.default.pid;
        this.socketPath = PolykeyAgent.SocketPath;
        this.persistentStore = new configstore_1.default('polykey', undefined, {
            configPath: path_1.default.join(path_1.default.dirname(this.socketPath), '.node_path_list.json'),
        });
        // Make sure the socket file doesn't already exist (agent is already running)
        if (fs_1.default.existsSync(this.socketPath)) {
            fs_1.default.unlinkSync(this.socketPath);
        }
        // Make the socket path if it doesn't exist
        if (!fs_1.default.existsSync(path_1.default.dirname(this.socketPath))) {
            fs_1.default.promises.mkdir(path_1.default.dirname(this.socketPath));
        }
        // Load polykeys
        const nodePaths = this.persistentStore.get('nodePaths');
        if (nodePaths === null || nodePaths === void 0 ? void 0 : nodePaths.values) {
            for (const path of nodePaths) {
                if (fs_1.default.existsSync(path)) {
                    this.setPolyKey(path, new Polykey_1.default(path, fs_1.default));
                }
                else {
                    this.removeNodePath(path);
                }
            }
        }
        else {
            this.persistentStore.set('nodePaths', []);
        }
        // Start the server
        this.server = net_1.default.createServer().listen(this.socketPath);
        this.server.on('connection', (socket) => {
            this.handleClientCommunication(socket);
        });
    }
    setPolyKey(nodePath, pk) {
        this.polykeyMap.set(nodePath, pk);
        const nodePathSet = new Set(this.persistentStore.get('nodePaths'));
        nodePathSet.add(nodePath);
        this.persistentStore.set('nodePaths', Array.from(nodePathSet.values()));
    }
    removeNodePath(nodePath) {
        this.polykeyMap.delete(nodePath);
        const nodePathSet = new Set(this.persistentStore.get('nodePaths'));
        nodePathSet.delete(nodePath);
        this.persistentStore.set('nodePaths', Array.from(nodePathSet.values()));
    }
    getPolyKey(nodePath, failOnLocked = true) {
        const pk = this.polykeyMap.get(nodePath);
        if (this.polykeyMap.has(nodePath) && pk) {
            if (fs_1.default.existsSync(nodePath)) {
                if (failOnLocked && !pk.keyManager.identityLoaded) {
                    throw Error(`node path exists in memory but is locked: ${nodePath}`);
                }
                else {
                    return pk;
                }
            }
            else {
                this.removeNodePath(nodePath);
                throw Error(`node path exists in memory but does not exist on file system: ${nodePath}`);
            }
        }
        else {
            this.removeNodePath(nodePath);
            throw Error(`node path does not exist in memory: ${nodePath}`);
        }
    }
    get AllNodePaths() {
        return Array.from(this.polykeyMap.keys()).filter((nodePath) => {
            try {
                this.getPolyKey(nodePath, false);
                return true;
            }
            catch (_a) {
                return false;
            }
        });
    }
    get UnlockedNodePaths() {
        return this.AllNodePaths.filter((nodePath) => {
            try {
                return this.getPolyKey(nodePath, false).keyManager.identityLoaded;
            }
            catch (_a) {
                return false;
            }
        });
    }
    stop() {
        this.server.close();
        for (const nodePath of this.polykeyMap.keys()) {
            const pk = this.getPolyKey(nodePath);
            pk.peerManager.multicastBroadcaster.stopBroadcasting();
        }
        // finally kill the pid of the agent process
        if (process_1.default.env.NODE_ENV !== 'test') {
            process_1.default.kill(this.pid);
        }
    }
    handleClientCommunication(socket) {
        socket.on('data', async (encodedMessage) => {
            var _a;
            try {
                const { type, nodePath, subMessage } = Agent_1.agentInterface.AgentMessage.decodeDelimited(encodedMessage);
                let response = undefined;
                switch (type) {
                    case Agent_1.agentInterface.AgentMessageType.STATUS:
                        response = Agent_1.agentInterface.AgentStatusResponseMessage.encodeDelimited({
                            status: Agent_1.agentInterface.AgentStatusType.ONLINE,
                        }).finish();
                        break;
                    case Agent_1.agentInterface.AgentMessageType.STOP_AGENT:
                        this.stop();
                        break;
                    case Agent_1.agentInterface.AgentMessageType.REGISTER_NODE:
                        response = await this.registerNode(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.NEW_NODE:
                        response = await this.newNode(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.LIST_NODES:
                        response = this.listNodes(subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.DERIVE_KEY:
                        response = await this.deriveKey(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.LIST_KEYS:
                        response = await this.listKeys(nodePath);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.GET_KEY:
                        response = await this.getKey(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.GET_PRIMARY_KEYPAIR:
                        response = await this.getPrimaryKeyPair(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.DELETE_KEY:
                        response = await this.deleteKey(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.SIGN_FILE:
                        response = await this.signFile(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.VERIFY_FILE:
                        response = await this.verifyFile(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.ENCRYPT_FILE:
                        response = await this.encryptFile(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.DECRYPT_FILE:
                        response = await this.decryptFile(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.LIST_VAULTS:
                        response = await this.listVaults(nodePath);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.SCAN_VAULT_NAMES:
                        response = await this.scanVaultNames(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.NEW_VAULT:
                        response = await this.newVault(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.PULL_VAULT:
                        response = await this.pullVault(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.DESTROY_VAULT:
                        response = await this.destroyVault(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.LIST_SECRETS:
                        response = await this.listSecrets(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.CREATE_SECRET:
                        response = await this.createSecret(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.DESTROY_SECRET:
                        response = await this.destroySecret(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.GET_SECRET:
                        response = await this.getSecret(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.UPDATE_SECRET:
                        response = await this.updateSecret(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.ADD_PEER:
                        response = await this.addPeer(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.GET_PEER_INFO:
                        response = await this.getPeerInfo(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.PING_PEER:
                        response = await this.pingPeer(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.FIND_PEER:
                        response = await this.findPeer(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.FIND_SOCIAL_PEER:
                        response = await this.findSocialPeer(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.LIST_PEERS:
                        response = await this.listPeers(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.TOGGLE_STEALTH:
                        response = await this.toggleStealth(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.UPDATE_PEER_INFO:
                        response = await this.updatePeerInfo(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.REQUEST_RELAY:
                        response = await this.requestRelay(nodePath, subMessage);
                        break;
                    case Agent_1.agentInterface.AgentMessageType.REQUEST_PUNCH:
                        response = await this.requestPunch(nodePath, subMessage);
                        break;
                    default:
                        throw Error(`message type not supported: ${Agent_1.agentInterface.AgentMessageType[type]}`);
                }
                if (response) {
                    const encodedResponse = Agent_1.agentInterface.AgentMessage.encodeDelimited({
                        type: type,
                        isResponse: true,
                        nodePath: nodePath,
                        subMessage: response,
                    }).finish();
                    socket.write(encodedResponse);
                }
                else {
                    throw Error('something went wrong');
                }
            }
            catch (err) {
                const errorResponse = Agent_1.agentInterface.AgentMessage.encodeDelimited({
                    type: Agent_1.agentInterface.AgentMessageType.ERROR,
                    isResponse: true,
                    nodePath: undefined,
                    subMessage: Agent_1.agentInterface.ErrorMessage.encodeDelimited({ error: (_a = err.message) !== null && _a !== void 0 ? _a : err }).finish(),
                }).finish();
                socket.write(errorResponse);
            }
            // Close connection
            socket.end();
        });
    }
    // Register an existing polykey agent
    async registerNode(nodePath, request) {
        const { passphrase } = Agent_1.agentInterface.RegisterNodeRequestMessage.decodeDelimited(request);
        let pk;
        if (this.polykeyMap.has(nodePath)) {
            pk = this.getPolyKey(nodePath, false);
            if (pk.keyManager.identityLoaded) {
                throw Error(`node path is already loaded and unlocked: '${nodePath}'`);
            }
            await pk.keyManager.unlockIdentity(passphrase);
        }
        else {
            const km = new Polykey_1.KeyManager(nodePath, fs_1.default);
            await km.unlockIdentity(passphrase);
            // Create polykey class
            pk = new Polykey_1.default(nodePath, fs_1.default, km);
        }
        // Load all metadata
        await pk.keyManager.loadMetadata();
        await pk.vaultManager.loadMetadata();
        // Set polykey class
        this.setPolyKey(nodePath, pk);
        // Encode and send response
        const response = Agent_1.agentInterface.NewNodeResponseMessage.encodeDelimited({
            successful: pk.keyManager.identityLoaded && this.polykeyMap.has(nodePath),
        }).finish();
        return response;
    }
    // Create a new polykey agent
    async newNode(nodePath, request) {
        // Throw if path already exists
        if (this.polykeyMap.has(nodePath) && fs_1.default.existsSync(nodePath)) {
            throw Error(`node path '${nodePath}' is already loaded`);
        }
        else if (fs_1.default.existsSync(nodePath)) {
            throw Error(`node path already exists: '${nodePath}'`);
        }
        const { userId, passphrase, nbits } = Agent_1.agentInterface.NewNodeRequestMessage.decodeDelimited(request);
        const km = new Polykey_1.KeyManager(nodePath, fs_1.default);
        await km.generateKeyPair(userId, passphrase, nbits == 0 ? undefined : nbits, true, (info) => {
            // socket.write(JSON.stringify(info))
        });
        // Create and set polykey class
        const pk = new Polykey_1.default(nodePath, fs_1.default, km);
        this.setPolyKey(nodePath, pk);
        // Encode and send response
        const response = Agent_1.agentInterface.NewNodeResponseMessage.encodeDelimited({
            successful: km.identityLoaded && this.polykeyMap.has(nodePath),
        }).finish();
        return response;
    }
    // Create a new polykey agent
    listNodes(request) {
        const { unlockedOnly } = Agent_1.agentInterface.ListNodesRequestMessage.decodeDelimited(request);
        if (unlockedOnly) {
            return Agent_1.agentInterface.ListNodesResponseMessage.encodeDelimited({ nodes: this.UnlockedNodePaths }).finish();
        }
        else {
            return Agent_1.agentInterface.ListNodesResponseMessage.encodeDelimited({ nodes: this.AllNodePaths }).finish();
        }
    }
    /////////////////////////
    // KeyManager commands //
    /////////////////////////
    async deriveKey(nodePath, request) {
        const { keyName, passphrase } = Agent_1.agentInterface.DeriveKeyRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        await pk.keyManager.generateKey(keyName, passphrase);
        return Agent_1.agentInterface.DeriveKeyResponseMessage.encodeDelimited({ successful: true }).finish();
    }
    async listKeys(nodePath) {
        const pk = this.getPolyKey(nodePath);
        const keyNames = pk.keyManager.listKeys();
        return Agent_1.agentInterface.ListKeysResponseMessage.encodeDelimited({ keyNames }).finish();
    }
    async getKey(nodePath, request) {
        const { keyName } = Agent_1.agentInterface.GetKeyRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const keyContent = pk.keyManager.getKey(keyName).toString();
        return Agent_1.agentInterface.GetKeyResponseMessage.encodeDelimited({ keyContent }).finish();
    }
    async getPrimaryKeyPair(nodePath, request) {
        const { includePrivateKey } = Agent_1.agentInterface.GetPrimaryKeyPairRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const keypair = pk.keyManager.getKeyPair();
        return Agent_1.agentInterface.GetPrimaryKeyPairResponseMessage.encodeDelimited({
            publicKey: keypair.public,
            privateKey: includePrivateKey ? keypair.private : undefined,
        }).finish();
    }
    async deleteKey(nodePath, request) {
        const { keyName } = Agent_1.agentInterface.DeleteKeyRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const successful = await pk.keyManager.deleteKey(keyName);
        return Agent_1.agentInterface.DeleteKeyResponseMessage.encodeDelimited({ successful }).finish();
    }
    /////////////////////
    // Crypto commands //
    /////////////////////
    async signFile(nodePath, request) {
        const { filePath, privateKeyPath, passphrase } = Agent_1.agentInterface.SignFileRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const signaturePath = await pk.keyManager.signFile(filePath, privateKeyPath, passphrase);
        return Agent_1.agentInterface.SignFileResponseMessage.encodeDelimited({ signaturePath }).finish();
    }
    async verifyFile(nodePath, request) {
        const { filePath, publicKeyPath } = Agent_1.agentInterface.VerifyFileRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const verified = await pk.keyManager.verifyFile(filePath, publicKeyPath);
        return Agent_1.agentInterface.VerifyFileResponseMessage.encodeDelimited({ verified }).finish();
    }
    async encryptFile(nodePath, request) {
        const { filePath, publicKeyPath } = Agent_1.agentInterface.EncryptFileRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const encryptedPath = await pk.keyManager.encryptFile(filePath, publicKeyPath);
        return Agent_1.agentInterface.EncryptFileResponseMessage.encodeDelimited({ encryptedPath }).finish();
    }
    async decryptFile(nodePath, request) {
        const { filePath, privateKeyPath, passphrase } = Agent_1.agentInterface.DecryptFileRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const decryptedPath = await pk.keyManager.decryptFile(filePath, privateKeyPath, passphrase);
        return Agent_1.agentInterface.DecryptFileResponseMessage.encodeDelimited({ decryptedPath }).finish();
    }
    //////////////////////
    // Vault Operations //
    //////////////////////
    async listVaults(nodePath) {
        const pk = this.getPolyKey(nodePath);
        const vaultNames = pk.vaultManager.listVaults();
        return Agent_1.agentInterface.ListVaultsResponseMessage.encodeDelimited({ vaultNames }).finish();
    }
    async scanVaultNames(nodePath, request) {
        const { publicKey } = Agent_1.agentInterface.ScanVaultNamesRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const vaultNames = await pk.vaultManager.scanVaultNames(publicKey);
        return Agent_1.agentInterface.ScanVaultNamesResponseMessage.encodeDelimited({ vaultNames }).finish();
    }
    async newVault(nodePath, request) {
        const { vaultName } = Agent_1.agentInterface.NewVaultRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        await pk.vaultManager.createVault(vaultName);
        return Agent_1.agentInterface.NewVaultResponseMessage.encodeDelimited({ successful: true }).finish();
    }
    async pullVault(nodePath, request) {
        const { vaultName, publicKey } = Agent_1.agentInterface.PullVaultRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        // pull if vault exists locally, otherwise clone
        if (pk.vaultManager.vaultExists(vaultName)) {
            const vault = pk.vaultManager.getVault(vaultName);
            vault.pullVault(publicKey);
        }
        else {
            pk.vaultManager.cloneVault(vaultName, publicKey);
        }
        return Agent_1.agentInterface.PullVaultResponseMessage.encodeDelimited({ successful: true }).finish();
    }
    async destroyVault(nodePath, request) {
        const { vaultName } = Agent_1.agentInterface.DestroyVaultRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        pk.vaultManager.destroyVault(vaultName);
        return Agent_1.agentInterface.DestroyVaultResponseMessage.encodeDelimited({ successful: true }).finish();
    }
    ///////////////////////
    // Secret Operations //
    ///////////////////////
    async listSecrets(nodePath, request) {
        const { vaultName } = Agent_1.agentInterface.ListSecretsRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const vault = pk.vaultManager.getVault(vaultName);
        const secretNames = vault.listSecrets();
        return Agent_1.agentInterface.ListSecretsResponseMessage.encodeDelimited({ secretNames }).finish();
    }
    async createSecret(nodePath, request) {
        const { vaultName, secretName, secretPath, secretContent, } = Agent_1.agentInterface.CreateSecretRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const vault = pk.vaultManager.getVault(vaultName);
        let secretBuffer;
        if (secretPath) {
            secretBuffer = await fs_1.default.promises.readFile(secretPath);
        }
        else {
            secretBuffer = Buffer.from(secretContent);
        }
        await vault.addSecret(secretName, secretBuffer);
        return Agent_1.agentInterface.CreateSecretResponseMessage.encodeDelimited({ successful: true }).finish();
    }
    async destroySecret(nodePath, request) {
        const { vaultName, secretName } = Agent_1.agentInterface.DestroySecretRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const vault = pk.vaultManager.getVault(vaultName);
        await vault.removeSecret(secretName);
        return Agent_1.agentInterface.DestroySecretResponseMessage.encodeDelimited({ successful: true }).finish();
    }
    async getSecret(nodePath, request) {
        const { vaultName, secretName } = Agent_1.agentInterface.GetSecretRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const vault = pk.vaultManager.getVault(vaultName);
        const secret = Buffer.from(vault.getSecret(secretName));
        return Agent_1.agentInterface.GetSecretResponseMessage.encodeDelimited({ secret: secret }).finish();
    }
    async updateSecret(nodePath, request) {
        const { vaultName, secretName, secretPath, secretContent, } = Agent_1.agentInterface.UpdateSecretRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const vault = pk.vaultManager.getVault(vaultName);
        let secretBuffer;
        if (secretPath) {
            secretBuffer = await fs_1.default.promises.readFile(secretPath);
        }
        else {
            secretBuffer = Buffer.from(secretContent);
        }
        await vault.updateSecret(secretName, secretBuffer);
        return Agent_1.agentInterface.UpdateSecretResponseMessage.encodeDelimited({ successful: true }).finish();
    }
    /////////////////////
    // Peer Operations //
    /////////////////////
    async addPeer(nodePath, request) {
        const { publicKey, peerAddress, relayPublicKey } = Agent_1.agentInterface.AddPeerRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        pk.peerManager.addPeer(new PeerInfo_1.default(publicKey, peerAddress, relayPublicKey));
        return Agent_1.agentInterface.AddPeerResponseMessage.encodeDelimited({ successful: true }).finish();
    }
    async getPeerInfo(nodePath, request) {
        var _a;
        const { current, publicKey } = Agent_1.agentInterface.PeerInfoRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        let peerInfo;
        if (current) {
            peerInfo = pk.peerManager.peerInfo;
        }
        else {
            if (!pk.peerManager.hasPeer(publicKey)) {
                throw Error('public key does not exist in peer store');
            }
            peerInfo = pk.peerManager.getPeer(publicKey);
        }
        return Agent_1.agentInterface.PeerInfoResponseMessage.encodeDelimited({
            publicKey: peerInfo.publicKey,
            peerAddress: (_a = peerInfo.peerAddress) === null || _a === void 0 ? void 0 : _a.toString(),
            relayPublicKey: peerInfo.relayPublicKey,
        }).finish();
    }
    async pingPeer(nodePath, request) {
        const { publicKey, timeout } = Agent_1.agentInterface.PingPeerRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const successful = await pk.peerManager.pingPeer(publicKey, timeout);
        return Agent_1.agentInterface.PingPeerResponseMessage.encodeDelimited({ successful }).finish();
    }
    async findPeer(nodePath, request) {
        const { publicKey, timeout } = Agent_1.agentInterface.FindPeerRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const successful = await pk.peerManager.findPublicKey(publicKey, timeout);
        return Agent_1.agentInterface.FindPeerResponseMessage.encodeDelimited({ successful }).finish();
    }
    async findSocialPeer(nodePath, request) {
        const { handle, service, timeout } = Agent_1.agentInterface.FindSocialPeerRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const successful = await pk.peerManager.findSocialUser(handle, service, timeout);
        return Agent_1.agentInterface.FindSocialPeerResponseMessage.encodeDelimited({ successful }).finish();
    }
    async listPeers(nodePath, request) {
        const pk = this.getPolyKey(nodePath);
        const publicKeys = pk.peerManager.listPeers();
        return Agent_1.agentInterface.ListPeersResponseMessage.encodeDelimited({ publicKeys }).finish();
    }
    async toggleStealth(nodePath, request) {
        const { active } = Agent_1.agentInterface.ToggleStealthRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        pk.peerManager.toggleStealthMode(active);
        return Agent_1.agentInterface.ToggleStealthResponseMessage.encodeDelimited({ successful: true }).finish();
    }
    async updatePeerInfo(nodePath, request) {
        var _a, _b;
        const { publicKey, currentNode, peerHost, peerPort, relayPublicKey, } = Agent_1.agentInterface.UpdatePeerInfoRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        let currentPeerInfo;
        if (currentNode) {
            currentPeerInfo = pk.peerManager.peerInfo;
        }
        else {
            if (!pk.peerManager.hasPeer(publicKey)) {
                throw Error('peer does not exist in store');
            }
            currentPeerInfo = pk.peerManager.getPeer(publicKey);
        }
        (_a = currentPeerInfo.peerAddress) === null || _a === void 0 ? void 0 : _a.updateHost(peerHost);
        (_b = currentPeerInfo.peerAddress) === null || _b === void 0 ? void 0 : _b.updatePort(peerPort);
        currentPeerInfo.relayPublicKey = relayPublicKey;
        if (!currentNode) {
            pk.peerManager.updatePeer(currentPeerInfo);
        }
        return Agent_1.agentInterface.UpdatePeerInfoResponseMessage.encodeDelimited({ successful: true }).finish();
    }
    async requestRelay(nodePath, request) {
        const { publicKey } = Agent_1.agentInterface.RequestRelayRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        await pk.peerManager.turnClient.requestRelayConnection(publicKey);
        return Agent_1.agentInterface.RequestRelayResponseMessage.encodeDelimited({ successful: true }).finish();
    }
    async requestPunch(nodePath, request) {
        const { publicKey } = Agent_1.agentInterface.RequestPunchRequestMessage.decodeDelimited(request);
        const pk = this.getPolyKey(nodePath);
        const address = await pk.peerManager.turnClient.requestLocalHolePunchAddress(publicKey);
        return Agent_1.agentInterface.RequestPunchResponseMessage.encodeDelimited({ address: address.toString() }).finish();
    }
    ///////////////////////
    // Client Connection //
    ///////////////////////
    static connectToAgent(getStream) {
        const defaultStream = () => {
            const socket = net_1.default.createConnection(PolykeyAgent.SocketPath);
            return socket;
        };
        const client = new PolykeyClient_1.default(getStream !== null && getStream !== void 0 ? getStream : defaultStream);
        return client;
    }
    // ===== Helper methods===== //
    static get SocketPath() {
        const platform = os_1.default.platform();
        const userInfo = os_1.default.userInfo();
        if (process_1.default.env.PK_SOCKET_PATH) {
            return process_1.default.env.PK_SOCKET_PATH;
        }
        else if (platform == 'win32') {
            return path_1.default.join('\\\\?\\pipe', process_1.default.cwd(), 'polykey-agent');
        }
        else {
            return `/run/user/${userInfo.uid}/polykey/S.polykey-agent`;
        }
    }
    static get LogPath() {
        const platform = os_1.default.platform();
        const userInfo = os_1.default.userInfo();
        if (process_1.default.env.PK_LOG_PATH) {
            return process_1.default.env.PK_LOG_PATH;
        }
        else if (platform == 'win32') {
            return path_1.default.join(os_1.default.tmpdir(), 'polykey', 'log');
        }
        else {
            return `/run/user/${userInfo.uid}/polykey/log`;
        }
    }
    static async startAgent(daemon = false) {
        return new Promise((resolve, reject) => {
            try {
                if (fs_1.default.existsSync(PolykeyAgent.LogPath)) {
                    fs_1.default.rmdirSync(PolykeyAgent.LogPath, { recursive: true });
                }
                fs_1.default.mkdirSync(PolykeyAgent.LogPath, { recursive: true });
                let options = {
                    uid: process_1.default.getuid(),
                    detached: daemon,
                    stdio: [
                        'ipc',
                        fs_1.default.openSync(path_1.default.join(PolykeyAgent.LogPath, 'output.log'), 'a'),
                        fs_1.default.openSync(path_1.default.join(PolykeyAgent.LogPath, 'error.log'), 'a'),
                    ],
                };
                const agentProcess = child_process_1.spawn(PolykeyAgent.DAEMON_SCRIPT_PATH.includes('.js') ? 'node' : 'ts-node', [PolykeyAgent.DAEMON_SCRIPT_PATH], options);
                const pid = agentProcess.pid;
                agentProcess.unref();
                agentProcess.disconnect();
                resolve(pid);
            }
            catch (err) {
                reject(err);
            }
        });
    }
}
//////////////////////
// Agent Operations //
//////////////////////
PolykeyAgent.DAEMON_SCRIPT_PATH_PREFIX = path_1.default.resolve(__dirname, 'internal', 'daemon-script.');
PolykeyAgent.DAEMON_SCRIPT_PATH_SUFFIX = fs_1.default.existsSync(PolykeyAgent.DAEMON_SCRIPT_PATH_PREFIX + 'js') ? 'js' : 'ts';
PolykeyAgent.DAEMON_SCRIPT_PATH = PolykeyAgent.DAEMON_SCRIPT_PATH_PREFIX + PolykeyAgent.DAEMON_SCRIPT_PATH_SUFFIX;
exports.default = PolykeyAgent;


/***/ }),
/* 66 */
/***/ (function(module, exports) {

module.exports = require("configstore");

/***/ }),
/* 67 */
/***/ (function(module, exports) {

module.exports = require("./polykey.js");

/***/ }),
/* 68 */
/***/ (function(module, exports) {

module.exports = require("chalk");

/***/ }),
/* 69 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(__webpack_require__(2));
const natCommands_1 = __webpack_require__(70);
const peerCommands_1 = __webpack_require__(71);
const socialCommands_1 = __webpack_require__(72);
function makePeersCommand() {
    return new commander_1.default.Command('peers')
        .description('peer operations')
        .addCommand(peerCommands_1.makeAddPeerCommand())
        .addCommand(peerCommands_1.makeUpdatePeerInfoCommand())
        .addCommand(peerCommands_1.makeGetPeerInfoCommand())
        .addCommand(peerCommands_1.makeListPeersCommand())
        .addCommand(peerCommands_1.makePingPeerCommand())
        .addCommand(peerCommands_1.makeFindPeerCommand())
        .addCommand(socialCommands_1.makeFindSocialPeerCommand())
        .addCommand(peerCommands_1.makeStealthCommand())
        .addCommand(natCommands_1.makeRelayCommand())
        .addCommand(natCommands_1.makePunchCommand());
}
exports.default = makePeersCommand;


/***/ }),
/* 70 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(__webpack_require__(3));
const commander_1 = __importDefault(__webpack_require__(2));
const Polykey_1 = __webpack_require__(4);
const utils_1 = __webpack_require__(6);
const Agent_1 = __webpack_require__(5);
function makeRelayCommand() {
    return new commander_1.default.Command('relay')
        .description('request a relay connection from a public peer')
        .option('--node-path <nodePath>', 'node path')
        .requiredOption('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
        .option('-v, --verbose', 'increase verbosity level by one')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
            throw Error(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }
        const nodePath = utils_1.determineNodePath(options.nodePath);
        // read in publicKey if it exists
        const publicKey = fs_1.default.readFileSync(options.publicKey).toString();
        const successful = await client.requestRelay(nodePath, publicKey);
        if (successful) {
            utils_1.pkLogger('peer server successfully relayed', utils_1.PKMessageType.SUCCESS);
        }
        else {
            utils_1.pkLogger('something went wrong', utils_1.PKMessageType.WARNING);
        }
    }));
}
exports.makeRelayCommand = makeRelayCommand;
function makePunchCommand() {
    return new commander_1.default.Command('punch')
        .description('request a udp hole punched address from a peer')
        .option('--node-path <nodePath>', 'node path')
        .requiredOption('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
        .option('-v, --verbose', 'increase verbosity level by one')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
            throw Error(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }
        const nodePath = utils_1.determineNodePath(options.nodePath);
        // read in publicKey if it exists
        const publicKey = fs_1.default.readFileSync(options.publicKey).toString();
        const address = await client.requestPunch(nodePath, publicKey);
        utils_1.pkLogger(`peer server successfully served at hole punched address: ${address.toString()}`, utils_1.PKMessageType.SUCCESS);
    }));
}
exports.makePunchCommand = makePunchCommand;


/***/ }),
/* 71 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(__webpack_require__(3));
const commander_1 = __importDefault(__webpack_require__(2));
const Polykey_1 = __webpack_require__(4);
const utils_1 = __webpack_require__(6);
const Agent_1 = __webpack_require__(5);
function makeAddPeerCommand() {
    return new commander_1.default.Command('add')
        .description('add a new peer to the store')
        .option('-b64, --base64 <base64>', 'decode the peer info from a base64 string')
        .option('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
        .option('-pa, --peer-address <peerAddress>', 'public address on which the node can be contacted')
        .option('-rk, --relay-key <relayKey>', 'path to the file which contains the public key of the relay peer')
        .option('--node-path <nodePath>', 'node path')
        .option('-v, --verbose', 'increase verbosity level by one')
        .action(utils_1.actionRunner(async (options) => {
        var _a, _b, _c;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
            throw Error(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const base64String = (_b = (_a = options === null || options === void 0 ? void 0 : options.base64) === null || _a === void 0 ? void 0 : _a.replace('\r', '')) === null || _b === void 0 ? void 0 : _b.replace('\n', '');
        let successful;
        if (base64String != undefined) {
            // read in peer info string
            const { publicKey, peerAddress, relayPublicKey } = Polykey_1.PeerInfo.parseB64(base64String);
            successful = await client.addPeer(nodePath, publicKey, (_c = peerAddress === null || peerAddress === void 0 ? void 0 : peerAddress.toString()) !== null && _c !== void 0 ? _c : '', relayPublicKey);
        }
        else {
            // read in publicKey if it exists
            const publicKey = fs_1.default.readFileSync(options.publicKey).toString();
            const relayPublicKey = fs_1.default.readFileSync(options.relayKey).toString();
            successful = await client.addPeer(nodePath, publicKey, options.peerAddress, relayPublicKey);
        }
        if (successful) {
            utils_1.pkLogger('peer successfully added to peer store', utils_1.PKMessageType.SUCCESS);
        }
        else {
            utils_1.pkLogger('something went wrong, peer was not added to peer store', utils_1.PKMessageType.WARNING);
        }
    }));
}
exports.makeAddPeerCommand = makeAddPeerCommand;
function makeFindPeerCommand() {
    return new commander_1.default.Command('find')
        .description('find a peer based on a public key')
        .option('--node-path <nodePath>', 'node path')
        .requiredOption('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
        .option('-v, --verbose', 'increase verbosity level by one')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
            throw Error(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }
        const nodePath = utils_1.determineNodePath(options.nodePath);
        // read in publicKey if it exists
        const publicKey = fs_1.default.readFileSync(options.publicKey).toString();
        const successful = await client.findPeer(nodePath, publicKey);
        if (successful) {
            utils_1.pkLogger('peer successfully pinged', utils_1.PKMessageType.SUCCESS);
        }
        else {
            utils_1.pkLogger('ping timed out', utils_1.PKMessageType.WARNING);
        }
    }));
}
exports.makeFindPeerCommand = makeFindPeerCommand;
function makeGetPeerInfoCommand() {
    return new commander_1.default.Command('get')
        .description('get the peer info for a particular public key')
        .option('--node-path <nodePath>', 'node path')
        .option('-b64, --base64', 'output peer info as a base64 string')
        .option('-cn, --current-node', 'only list the peer information for the current node, useful for sharing')
        .option('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
        .option('-v, --verbose', 'increase verbosity level by one')
        .action(utils_1.actionRunner(async (options) => {
        var _a, _b, _c;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
            throw Error(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const publicKeyPath = options.publicKey;
        // read in publicKey if it exists
        let publicKey;
        if (publicKeyPath) {
            publicKey = fs_1.default.readFileSync(publicKeyPath).toString();
        }
        const peerInfo = await client.getPeerInfo(nodePath, options.currentNode, publicKey);
        if (options.base64) {
            utils_1.pkLogger(peerInfo.toStringB64(), utils_1.PKMessageType.SUCCESS);
        }
        else {
            utils_1.pkLogger('Peer Public Key:', utils_1.PKMessageType.INFO);
            utils_1.pkLogger(peerInfo.publicKey, utils_1.PKMessageType.SUCCESS);
            utils_1.pkLogger('Peer Address:', utils_1.PKMessageType.INFO);
            utils_1.pkLogger((_b = (_a = peerInfo.peerAddress) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : '', utils_1.PKMessageType.SUCCESS);
            utils_1.pkLogger('Relay Public Key:', utils_1.PKMessageType.INFO);
            utils_1.pkLogger((_c = peerInfo.relayPublicKey) !== null && _c !== void 0 ? _c : '', utils_1.PKMessageType.SUCCESS);
        }
    }));
}
exports.makeGetPeerInfoCommand = makeGetPeerInfoCommand;
function makeListPeersCommand() {
    return new commander_1.default.Command('list')
        .description('list all connected peers')
        .alias('ls')
        .option('--node-path <nodePath>', 'node path')
        .option('-v, --verbose', 'increase verbosity level by one')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
            throw Error(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const publicKeys = await client.listPeers(nodePath);
        if (publicKeys === undefined || publicKeys.length == 0) {
            utils_1.pkLogger('no peers exist', utils_1.PKMessageType.INFO);
        }
        else {
            publicKeys.forEach((publicKey, index) => {
                utils_1.pkLogger(`${index + 1}: ${publicKey}`, utils_1.PKMessageType.INFO);
            });
        }
    }));
}
exports.makeListPeersCommand = makeListPeersCommand;
function makePingPeerCommand() {
    return new commander_1.default.Command('ping')
        .description('ping a connected peer')
        .option('--node-path <nodePath>', 'node path')
        .requiredOption('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
        .option('-v, --verbose', 'increase verbosity level by one')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
            throw Error(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }
        const nodePath = utils_1.determineNodePath(options.nodePath);
        // read in publicKey if it exists
        const publicKey = fs_1.default.readFileSync(options.publicKey).toString();
        const successful = await client.pingPeer(nodePath, publicKey);
        if (successful) {
            utils_1.pkLogger('peer successfully pinged', utils_1.PKMessageType.SUCCESS);
        }
        else {
            utils_1.pkLogger('ping timed out', utils_1.PKMessageType.WARNING);
        }
    }));
}
exports.makePingPeerCommand = makePingPeerCommand;
function makeStealthCommand() {
    // create active command
    const activeStealthCommand = new commander_1.default.Command('active')
        .command('active')
        .option('--node-path <nodePath>', 'node path')
        .option('-v, --verbose', 'increase verbosity level by one')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
            throw Error(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }
        const nodePath = utils_1.determineNodePath(options.nodePath);
        await client.toggleStealth(nodePath, true);
        utils_1.pkLogger(`stealth mode toggled to 'active'`, utils_1.PKMessageType.SUCCESS);
    }));
    // add inactive command
    const inactiveStealthCommand = new commander_1.default.Command('inactive')
        .option('--node-path <nodePath>', 'node path')
        .option('-v, --verbose', 'increase verbosity level by one')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
            throw Error(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }
        const nodePath = utils_1.determineNodePath(options.nodePath);
        await client.toggleStealth(nodePath, false);
        utils_1.pkLogger(`stealth mode toggled to 'inactive'`, utils_1.PKMessageType.SUCCESS);
    }));
    const stealthCommand = new commander_1.default.Command('stealth')
        .description('toggle stealth mode on or off')
        .addCommand(activeStealthCommand)
        .addCommand(inactiveStealthCommand);
    return stealthCommand;
}
exports.makeStealthCommand = makeStealthCommand;
function makeUpdatePeerInfoCommand() {
    return new commander_1.default.Command('update')
        .description('update the peer info for a particular public key')
        .option('--node-path <nodePath>', 'node path')
        .option('-cn, --current-node', 'only list the peer information for the current node, useful for sharing')
        .option('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
        .option('-b64, --base64 <base64>', 'decode the peer info from a base64 string')
        .option('-ch, --peer-host <peerHost>', 'update the peer addresss host')
        .option('-cp, --peer-port <peerPort>', 'update the peer addresss port')
        .option('-rk, --relay-key <relayKey>', 'path to the file which contains the public key of the relay peer')
        .option('-v, --verbose', 'increase verbosity level by one')
        .action(utils_1.actionRunner(async (options) => {
        var _a, _b;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
            throw Error(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const currentNode = options.currentNode;
        const publicKeyPath = options.publicKey;
        // read in publicKey if it exists
        let publicKey = undefined;
        if (publicKeyPath) {
            publicKey = fs_1.default.readFileSync(publicKeyPath).toString();
        }
        const relayPublicKeyPath = options.relayKey;
        // read in relay publicKey if it exists
        let relayPublicKey = undefined;
        if (relayPublicKeyPath) {
            relayPublicKey = fs_1.default.readFileSync(relayPublicKeyPath).toString();
        }
        const base64String = (_b = (_a = options === null || options === void 0 ? void 0 : options.base64) === null || _a === void 0 ? void 0 : _a.replace('\r', '')) === null || _b === void 0 ? void 0 : _b.replace('\n', '');
        let successful;
        if (base64String != undefined) {
            // read in peer info string
            const { publicKey, peerAddress, relayPublicKey } = Polykey_1.PeerInfo.parseB64(base64String);
            successful = await client.updatePeer(nodePath, currentNode ? undefined : publicKey, currentNode, peerAddress === null || peerAddress === void 0 ? void 0 : peerAddress.host, peerAddress === null || peerAddress === void 0 ? void 0 : peerAddress.port, relayPublicKey);
        }
        else {
            successful = await client.updatePeer(nodePath, publicKey, currentNode, options.peerHost, options.peerPort, relayPublicKey);
        }
        if (successful) {
            utils_1.pkLogger('peer info was successfully updated', utils_1.PKMessageType.SUCCESS);
        }
        else {
            utils_1.pkLogger('something went wrong, peer info could not be updated', utils_1.PKMessageType.WARNING);
        }
    }));
}
exports.makeUpdatePeerInfoCommand = makeUpdatePeerInfoCommand;


/***/ }),
/* 72 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(__webpack_require__(2));
const Polykey_1 = __webpack_require__(4);
const utils_1 = __webpack_require__(6);
const Agent_1 = __webpack_require__(5);
function makeFindSocialPeerCommand() {
    return new commander_1.default.Command('social')
        .description('find a peer based on a handle and service, e.g. john.smith and github')
        .option('--node-path <nodePath>', 'node path')
        .requiredOption('-h, --handle <handle>', 'handle of the user on the specified service, e.g. john.smith')
        .requiredOption('-s, --service <service>', 'service where the handle can be found, e.g. github')
        .option('-v, --verbose', 'increase verbosity level by one')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
            throw Error(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const successful = await client.findSocialPeer(nodePath, options.handle, options.service);
        if (successful) {
            utils_1.pkLogger('peer successfully pinged', utils_1.PKMessageType.SUCCESS);
        }
        else {
            utils_1.pkLogger('ping timed out', utils_1.PKMessageType.WARNING);
        }
    }));
}
exports.makeFindSocialPeerCommand = makeFindSocialPeerCommand;


/***/ }),
/* 73 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(__webpack_require__(2));
const Polykey_1 = __webpack_require__(4);
const utils_1 = __webpack_require__(6);
const Agent_1 = __webpack_require__(5);
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
        if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
            throw Error(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }
        const nodePath = utils_1.determineNodePath(options.nodePath);
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
                utils_1.pkLogger(`file '${filePath}' successfully signed at '${signaturePath}'`, utils_1.PKMessageType.SUCCESS);
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
        .requiredOption('-f, --signed-file <signedFile>', 'file to be verified')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
            throw Error(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const filePath = options.signedFile;
        const verified = await client.verifyFile(nodePath, filePath, options.publicKey);
        if (verified) {
            utils_1.pkLogger(`file '${filePath}' was successfully verified`, utils_1.PKMessageType.SUCCESS);
        }
        else {
            utils_1.pkLogger(`file '${filePath}' was not verified`, utils_1.PKMessageType.WARNING);
        }
    }));
}
function makeEncryptCommand() {
    return new commander_1.default.Command('encrypt')
        .description('encryption operations')
        .option('--node-path <nodePath>', 'node path')
        .option('-k, --public-key <publicKey>', 'path to public key that will be used to encrypt files, defaults to primary key')
        .requiredOption('-f, --file-path <filePath>', 'file to be encrypted')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
            throw Error(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const filePath = options.filePath;
        try {
            const encryptedPath = await client.encryptFile(nodePath, filePath, options.publicKey);
            utils_1.pkLogger(`file successfully encrypted: '${encryptedPath}'`, utils_1.PKMessageType.SUCCESS);
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
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
            throw Error(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const filePath = options.filePath;
        try {
            const decryptedPath = await client.decryptFile(nodePath, filePath, options.privateKey, options.keyPassphrase);
            utils_1.pkLogger(`file successfully decrypted: '${decryptedPath}'`, utils_1.PKMessageType.SUCCESS);
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
/* 74 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(__webpack_require__(3));
const commander_1 = __importDefault(__webpack_require__(2));
const Polykey_1 = __webpack_require__(4);
const utils_1 = __webpack_require__(6);
const Agent_1 = __webpack_require__(5);
function makeListVaultsCommand() {
    return new commander_1.default.Command('list')
        .description('list all available vaults')
        .alias('ls')
        .option('--node-path <nodePath>', 'node path')
        .option('-v, --verbose', 'increase verbosity level by one')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != Agent_1.agentInterface.AgentStatusType.ONLINE) {
            throw Error(`agent status is: '${Agent_1.agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const vaultNames = await client.listVaults(nodePath);
        if (vaultNames === undefined || vaultNames.length == 0) {
            utils_1.pkLogger('no vaults found', utils_1.PKMessageType.INFO);
        }
        else {
            vaultNames.forEach((vaultName, index) => {
                utils_1.pkLogger(`${index + 1}: ${vaultName}`, utils_1.PKMessageType.INFO);
            });
        }
    }));
}
function makeScanVaultsCommand() {
    return new commander_1.default.Command('scan')
        .description('scan a known peer for accessible vaults')
        .option('--node-path <nodePath>', 'node path')
        .requiredOption('-p, --public-key <publicKey>', 'name of vault')
        .option('-v, --verbose', 'increase verbosity by one level')
        .arguments('name of vault to remove')
        .action(utils_1.actionRunner(async (options) => {
        var _a;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const verbose = (_a = options.verbose) !== null && _a !== void 0 ? _a : false;
        const publicKey = fs_1.default.readFileSync(options.publicKey).toString();
        const vaultNames = await client.scanVaultNames(nodePath, publicKey);
        if (!vaultNames || vaultNames.length == 0) {
            utils_1.pkLogger(`no vault names were provided`, utils_1.PKMessageType.INFO);
        }
        for (const vaultName of vaultNames) {
            utils_1.pkLogger(vaultName, utils_1.PKMessageType.SUCCESS);
        }
    }));
}
function makeNewVaultCommand() {
    return new commander_1.default.Command('new')
        .description('create new vault(s)')
        .option('--node-path <nodePath>', 'node path')
        .arguments('vault name(s)')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
        for (const vaultName of options.args.values()) {
            await client.newVault(nodePath, vaultName);
            utils_1.pkLogger(`vault created at '${nodePath}/${vaultName}'`, utils_1.PKMessageType.SUCCESS);
        }
    }));
}
function makePullVaultCommand() {
    return new commander_1.default.Command('pull')
        .description('pull a vault from a peer')
        .option('--node-path <nodePath>', 'node path')
        .requiredOption('-pk, --public-key <publicKey>', 'public key file path of the peer who has the vault')
        .requiredOption('-vn, --vault-name <vaultName>', 'name of the vault to be cloned')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const vaultName = options.vaultName;
        // read in public key
        const publicKey = fs_1.default.readFileSync(options.publicKey).toString();
        const successful = await client.pullVault(nodePath, vaultName, publicKey.toString());
        utils_1.pkLogger(`vault '${vaultName}' pulled ${successful ? 'un-' : ''}successfully`, utils_1.PKMessageType.SUCCESS);
    }));
}
function makeDeleteVaultCommand() {
    return new commander_1.default.Command('delete')
        .alias('del')
        .description('delete an existing vault')
        .option('-n, --vault-name <vaultName>', 'name of vault')
        .option('-v, --verbose', 'increase verbosity by one level')
        .arguments('name of vault to remove')
        .action(utils_1.actionRunner(async (options) => {
        var _a;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const verbose = (_a = options.verbose) !== null && _a !== void 0 ? _a : false;
        const vaultNames = options.args.values();
        if (!vaultNames) {
            throw Error('error: did not receive any vault name');
        }
        for (const vaultName of vaultNames) {
            const successful = await client.destroyVault(nodePath, vaultName);
            utils_1.pkLogger(`vault '${vaultName}' destroyed ${successful ? 'un-' : ''}successfully`, utils_1.PKMessageType.SUCCESS);
        }
    }));
}
function makeVaultsCommand() {
    return new commander_1.default.Command('vaults')
        .description('manipulate vaults')
        .addCommand(makeListVaultsCommand())
        .addCommand(makeScanVaultsCommand())
        .addCommand(makeNewVaultCommand())
        .addCommand(makePullVaultCommand())
        .addCommand(makeDeleteVaultCommand());
}
exports.default = makeVaultsCommand;


/***/ }),
/* 75 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const process_1 = __importDefault(__webpack_require__(28));
const commander_1 = __importDefault(__webpack_require__(2));
const child_process_1 = __webpack_require__(30);
const Polykey_1 = __webpack_require__(4);
const utils_1 = __webpack_require__(6);
const pathRegex = /^([a-zA-Z0-9_ -]+)(?::)([a-zA-Z0-9_ -]+)(?:=)?([a-zA-Z_][a-zA-Z0-9_]+)?$/;
function makeListSecretsCommand() {
    return new commander_1.default.Command('list')
        .description('list all available secrets for a given vault')
        .alias('ls')
        .option('--node-path <nodePath>', 'node path')
        .option('--verbose', 'increase verbosity level by one')
        .arguments('vault name(s) to list')
        .action(utils_1.actionRunner(async (options) => {
        var _a;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
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
                utils_1.pkLogger(`no secrets found for vault '${vaultName}'`, utils_1.PKMessageType.INFO);
            }
            else {
                if (isVerbose) {
                    utils_1.pkLogger(`secrets contained within the ${vaultName} vault:`, utils_1.PKMessageType.INFO);
                }
                secretNames.forEach((secretName) => {
                    utils_1.pkLogger(`${vaultName}:${secretName}`, utils_1.PKMessageType.INFO);
                });
            }
        }
    }));
}
function makeNewSecretCommand() {
    return new commander_1.default.Command('new')
        .description("create a secret within a given vault, specify a secret path with '<vaultName>:<secretName>'")
        .option('--node-path <nodePath>', 'node path')
        .arguments("secret path of the format '<vaultName>:<secretName>'")
        .requiredOption('-f, --file-path <filePath>', 'path to the secret to be added')
        .option('--verbose', 'increase verbosity level by one')
        .action(utils_1.actionRunner(async (options) => {
        var _a;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
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
        try {
            // Add the secret
            const successful = await client.createSecret(nodePath, vaultName, secretName, options.filePath);
            utils_1.pkLogger(`secret '${secretName}' was ${successful ? '' : 'un-'}successfully added to vault '${vaultName}'`, utils_1.PKMessageType.SUCCESS);
        }
        catch (err) {
            throw Error(`Error when adding secret: ${err.message}`);
        }
    }));
}
function makeUpdateSecretCommand() {
    return new commander_1.default.Command('update')
        .description("update a secret within a given vault, specify a secret path with '<vaultName>:<secretName>'")
        .option('--node-path <nodePath>', 'node path')
        .arguments("secret path of the format '<vaultName>:<secretName>'")
        .requiredOption('-f, --file-path <filePath>', 'path to the new secret')
        .option('--verbose', 'increase verbosity level by one')
        .action(utils_1.actionRunner(async (options) => {
        var _a;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
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
        try {
            // Update the secret
            const successful = await client.updateSecret(nodePath, vaultName, secretName, options.filePath);
            utils_1.pkLogger(`secret '${secretName}' was ${successful ? '' : 'un-'}successfully updated in vault '${vaultName}'`, successful ? utils_1.PKMessageType.SUCCESS : utils_1.PKMessageType.WARNING);
        }
        catch (err) {
            throw Error(`Error when updating secret: ${err.message}`);
        }
    }));
}
function makeDeleteSecretCommand() {
    return new commander_1.default.Command('delete')
        .alias('del')
        .description("delete a secret from a given vault, specify a secret path with '<vaultName>:<secretName>'")
        .arguments("secret path of the format '<vaultName>:<secretName>'")
        .option('--verbose', 'increase verbosity level by one')
        .action(utils_1.actionRunner(async (options) => {
        var _a;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
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
            utils_1.pkLogger(`secret '${secretName}' was ${successful ? '' : 'un-'}successfully removed from vault '${vaultName}'`, utils_1.PKMessageType.SUCCESS);
        }
        catch (err) {
            throw Error(`Error when removing secret: ${err.message}`);
        }
    }));
}
function makeGetSecretCommand() {
    return new commander_1.default.Command('get')
        .description("retrieve a secret from a given vault, specify a secret path with '<vaultName>:<secretName>'")
        .arguments("secret path of the format '<vaultName>:<secretName>'")
        .option('-e, --env', 'wrap the secret in an environment variable declaration')
        .action(utils_1.actionRunner(async (options) => {
        var _a, _b;
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
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
                utils_1.pkLogger(`export ${secretName.toUpperCase().replace('-', '_')}='${secret.toString()}'`, utils_1.PKMessageType.none);
            }
            else {
                utils_1.pkLogger(secret.toString(), utils_1.PKMessageType.none);
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
        .description("run a modified environment with injected secrets, specify a secret path with '<vaultName>:<secretName>'")
        .option('--command <command>', 'In the environment of the derivation, run the shell command cmd. This command is executed in an interactive shell. (Use --run to use a non-interactive shell instead.)')
        .option('--run <run>', 'Like --command, but executes the command in a non-interactive shell. This means (among other things) that if you hit Ctrl-C while the command is running, the shell exits.')
        .arguments("secrets to inject into env, of the format '<vaultName>:<secretName>'. you can also control what the environment variable will be called using '<vaultName>:<secretName>=<variableName>', defaults to upper, snake case of the original secret name.")
        .action(utils_1.actionRunner(async (cmd) => {
        var _a, _b;
        const options = cmd.opts();
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const isVerbose = (_a = options.verbose) !== null && _a !== void 0 ? _a : false;
        const command = options.command;
        const run = options.run;
        const secretPathList = Array.from(cmd.args.values());
        if (secretPathList.length < 1) {
            throw Error('please specify at least one secret');
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
                variableName: variableName !== null && variableName !== void 0 ? variableName : secretName.toUpperCase().replace('-', '_'),
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
            const shellPath = (_b = process_1.default.env.SHELL) !== null && _b !== void 0 ? _b : 'sh';
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
                shell: true,
            });
            shell.on('close', (code) => {
                if (code != 0) {
                    utils_1.pkLogger(`polykey: environment terminated with code: ${code}`, utils_1.PKMessageType.WARNING);
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
/* 76 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(__webpack_require__(2));
const Polykey_1 = __webpack_require__(4);
const utils_1 = __webpack_require__(6);
function makeNewKeyCommand() {
    return new commander_1.default.Command('new')
        .description('derive a new symmetric key')
        .option('--node-path <nodePath>', 'node path')
        .requiredOption('-n, --key-name <keyName>', 'the name of the new key')
        .requiredOption('-p, --key-passphrase <keyPassphrase>', 'the passphrase for the new key')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const keyName = options.keyName;
        await client.deriveKey(nodePath, keyName, options.keyPassphrase);
        utils_1.pkLogger(`'${keyName}' was added to the Key Manager`, utils_1.PKMessageType.SUCCESS);
    }));
}
function makeDeleteKeyCommand() {
    return new commander_1.default.Command('delete')
        .description('delete a symmetric key from the key manager')
        .option('--node-path <nodePath>', 'node path')
        .requiredOption('-n, --key-name <keyName>', 'the name of the symmetric key to be deleted')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const keyName = options.keyName;
        const successful = await client.deleteKey(nodePath, keyName);
        utils_1.pkLogger(`key '${keyName}' was ${successful ? '' : 'un-'}successfully deleted`, successful ? utils_1.PKMessageType.SUCCESS : utils_1.PKMessageType.INFO);
    }));
}
function makeListKeysCommand() {
    return new commander_1.default.Command('list')
        .alias('ls')
        .description('list all symmetric keys in the keynode')
        .option('--node-path <nodePath>', 'node path')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const keyNames = await client.listKeys(nodePath);
        for (const name of keyNames) {
            utils_1.pkLogger(name, utils_1.PKMessageType.INFO);
        }
    }));
}
function makeGetKeyCommand() {
    return new commander_1.default.Command('get')
        .description('get the contents of a specific symmetric key')
        .option('--node-path <nodePath>', 'node path')
        .requiredOption('-n, --key-name <keyName>', 'the name of the new key')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const keyContent = await client.getKey(nodePath, options.keyName);
        utils_1.pkLogger(keyContent, utils_1.PKMessageType.INFO);
    }));
}
function makeListPrimaryKeyPairCommand() {
    return new commander_1.default.Command('primary')
        .description('get the contents of the primary keypair')
        .option('--node-path <nodePath>', 'node path')
        .option('-p, --private-key', 'include private key')
        .option('-j, --output-json', 'output in JSON format')
        .action(utils_1.actionRunner(async (options) => {
        const client = Polykey_1.PolykeyAgent.connectToAgent();
        const nodePath = utils_1.determineNodePath(options.nodePath);
        const privateKey = options.privateKey;
        const keypair = await client.getPrimaryKeyPair(nodePath, privateKey);
        if (options.outputJson) {
            utils_1.pkLogger(JSON.stringify(keypair), utils_1.PKMessageType.INFO);
        }
        else {
            utils_1.pkLogger('Public Key:', utils_1.PKMessageType.SUCCESS);
            utils_1.pkLogger(keypair.publicKey, utils_1.PKMessageType.INFO);
            if (privateKey) {
                utils_1.pkLogger('Private Key:', utils_1.PKMessageType.SUCCESS);
                utils_1.pkLogger(keypair.privateKey, utils_1.PKMessageType.INFO);
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
/* 77 */
/***/ (function(module, exports) {

module.exports = require("../package.json");

/***/ })
/******/ ]);
});