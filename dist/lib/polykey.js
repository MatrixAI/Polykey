(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["polykey"] = factory();
	else
		root["polykey"] = factory();
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
/******/ 	return __webpack_require__(__webpack_require__.s = 4);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = require("path");

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = require("os");

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = require("fs");

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = require("readable-stream");

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(__webpack_require__(1));
const KeyManager_1 = __importDefault(__webpack_require__(20));
exports.KeyManager = KeyManager_1.default;
const PeerManager_1 = __importDefault(__webpack_require__(23));
exports.PeerManager = PeerManager_1.default;
const VaultManager_1 = __importDefault(__webpack_require__(43));
exports.VaultManager = VaultManager_1.default;
const PolykeyAgent_1 = __importDefault(__webpack_require__(46));
exports.PolykeyAgent = PolykeyAgent_1.default;
const PolykeyClient_1 = __importDefault(__webpack_require__(18));
exports.PolykeyClient = PolykeyClient_1.default;
class Polykey {
    constructor(polykeyPath = `${os_1.default.homedir()}/.polykey`, fileSystem, keyManager, vaultManager, peerManager) {
        this.polykeyPath = polykeyPath;
        // Set key manager
        this.keyManager = keyManager !== null && keyManager !== void 0 ? keyManager : new KeyManager_1.default(this.polykeyPath, fileSystem);
        // Set or Initialize vaultManager
        this.vaultManager = vaultManager !== null && vaultManager !== void 0 ? vaultManager : new VaultManager_1.default(this.polykeyPath, fileSystem, this.keyManager);
        // Initialize peer store and peer discovery classes
        this.peerManager = peerManager !== null && peerManager !== void 0 ? peerManager : new PeerManager_1.default(this.polykeyPath, fileSystem, this.keyManager, this.vaultManager);
    }
}
exports.default = Polykey;


/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = require("crypto");

/***/ }),
/* 6 */
/***/ (function(module, exports) {

module.exports = require("@grpc/grpc-js");

/***/ }),
/* 7 */
/***/ (function(module, exports) {

module.exports = require("../../proto/compiled/Git_grpc_pb");

/***/ }),
/* 8 */
/***/ (function(module, exports) {

module.exports = require("../../proto/compiled/Git_pb");

/***/ }),
/* 9 */
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
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// This is a convenience wrapper for reading and writing files in the 'refs' directory.
const path_1 = __importDefault(__webpack_require__(0));
const GitPackedRefs_1 = __importDefault(__webpack_require__(27));
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
/* 11 */
/***/ (function(module, exports) {

module.exports = require("pako");

/***/ }),
/* 12 */
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
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(__webpack_require__(2));
const pako_1 = __importDefault(__webpack_require__(11));
const path_1 = __importDefault(__webpack_require__(0));
const GitObject_1 = __importDefault(__webpack_require__(32));
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
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class Address {
    constructor(ip, port) {
        this.ip = ip;
        this.port = port;
    }
    /**
     * Create an address object from a address string
     * @param addressString Address string in the format of `${this.ip}:${this.port}`
     */
    static parse(addressString) {
        const components = addressString.split(':');
        const ip = components[0];
        const port = components[1];
        return new Address(ip, port);
    }
    /**
     * Create an address object from a net.AddressInfo
     * @param addressInfo AddressInfo of desired address
     */
    static fromAddressInfo(addressInfo) {
        const ip = addressInfo.address == '::' ? 'localhost' : addressInfo.address;
        return new Address(ip, addressInfo.port.toString());
    }
    /**
     * Convert address into string of format `${this.ip}:${this.port}`
     */
    toString() {
        return `${this.ip}:${this.port}`;
    }
}
exports.Address = Address;
Address.prototype.toString = function () {
    return `${this.ip}:${this.port}`;
};
class PeerInfo {
    constructor(pubKey, addresses = [], connectedAddr) {
        this.publicKey = pubKey;
        this.addresses = new Set(addresses.map((addr) => {
            return Address.parse(addr);
        }));
        this.connectedAddr = connectedAddr ? Address.parse(connectedAddr) : undefined;
    }
    /**
     * Sets the main server address for the peer
     * @param address Main server address for peer
     */
    connect(address) {
        if (!this.addresses.has(address)) {
            this.addresses.add(address);
        }
        this.connectedAddr = address;
    }
    /**
     * Clears the main server address for the peer
     */
    disconnect() {
        this.connectedAddr = undefined;
    }
    get AdressStringList() {
        return Array.from(this.addresses.values()).map((addr) => {
            return addr.toString();
        });
    }
}
exports.default = PeerInfo;


/***/ }),
/* 15 */
/***/ (function(module, exports) {

module.exports = require("isomorphic-git");

/***/ }),
/* 16 */
/***/ (function(module, exports) {

module.exports = require("encryptedfs");

/***/ }),
/* 17 */
/***/ (function(module, exports) {

module.exports = require("virtualfs");

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Agent_1 = __webpack_require__(19);
const { AgentMessage, CreateSecretRequestMessage, CreateSecretResponseMessage, DeriveKeyRequestMessage, DeriveKeyResponseMessage, DestroySecretRequestMessage, DestroySecretResponseMessage, DestroyVaultRequestMessage, DestroyVaultResponseMessage, ErrorMessage, GetSecretRequestMessage, GetSecretResponseMessage, ListNodesRequestMessage, ListNodesResponseMessage, ListSecretsRequestMessage, ListSecretsResponseMessage, ListVaultsRequestMessage, ListVaultsResponseMessage, NewNodeRequestMessage, NewNodeResponseMessage, NewVaultRequestMessage, NewVaultResponseMessage, RegisterNodeRequestMessage, RegisterNodeResponseMessage, SignFileRequestMessage, SignFileResponseMessage, Type, VerifyFileRequestMessage, VerifyFileResponseMessage, } = Agent_1.agent;
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
        const agentMessage = AgentMessage.encode({
            type: type,
            isResponse: false,
            nodePath: nodePath,
            subMessage: request,
        }).finish();
        const responseList = await this.sendRequestToAgent(agentMessage);
        const agentMessageList = [];
        for (const response of responseList.values()) {
            const { subMessage, type } = AgentMessage.decode(response);
            if (type == Type.ERROR) {
                const { error } = ErrorMessage.decode(subMessage);
                const reason = new Error(`Agent Error: ${error}`);
                throw reason;
            }
            else {
                agentMessageList.push(AgentMessage.decode(response));
            }
        }
        return agentMessageList;
    }
    async registerNode(path, passphrase) {
        var _a;
        const registerNodeRequest = RegisterNodeRequestMessage.encode({ passphrase }).finish();
        const encodedResponse = await this.handleAgentCommunication(Type.REGISTER_NODE, path, registerNodeRequest);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Type.REGISTER_NODE)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = RegisterNodeResponseMessage.decode(subMessage);
        return successful;
    }
    async newNode(path, name, email, passphrase, nbits) {
        var _a;
        const newNodeRequest = NewNodeRequestMessage.encode({ name, email, passphrase, nbits }).finish();
        const encodedResponse = await this.handleAgentCommunication(Type.NEW_NODE, path, newNodeRequest);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Type.NEW_NODE)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = NewNodeResponseMessage.decode(subMessage);
        return successful;
    }
    async listNodes(unlockedOnly = true) {
        var _a;
        const newNodeRequest = ListNodesRequestMessage.encode({ unlockedOnly }).finish();
        const encodedResponse = await this.handleAgentCommunication(Type.LIST_NODES, undefined, newNodeRequest);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Type.LIST_NODES)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { nodes } = ListNodesResponseMessage.decode(subMessage);
        return nodes;
    }
    /////////////////////
    // Crypto commands //
    /////////////////////
    async deriveKey(nodePath, keyName, passphrase) {
        var _a;
        const request = DeriveKeyRequestMessage.encode({ keyName, passphrase }).finish();
        const encodedResponse = await this.handleAgentCommunication(Type.DERIVE_KEY, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Type.DERIVE_KEY)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = DeriveKeyResponseMessage.decode(subMessage);
        return successful;
    }
    /////////////////////
    // Crypto commands //
    /////////////////////
    async signFile(nodePath, filePath, privateKeyPath, passphrase) {
        var _a;
        const request = SignFileRequestMessage.encode({ filePath, privateKeyPath, passphrase }).finish();
        const encodedResponse = await this.handleAgentCommunication(Type.SIGN_FILE, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Type.SIGN_FILE)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { signaturePath } = SignFileResponseMessage.decode(subMessage);
        return signaturePath;
    }
    async verifyFile(nodePath, filePath, signaturePath) {
        var _a;
        const request = VerifyFileRequestMessage.encode({ filePath, signaturePath }).finish();
        const encodedResponse = await this.handleAgentCommunication(Type.VERIFY_FILE, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Type.VERIFY_FILE)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { verified } = VerifyFileResponseMessage.decode(subMessage);
        return verified;
    }
    //////////////////////
    // Vault Operations //
    //////////////////////
    async listVaults(nodePath) {
        var _a;
        const encodedResponse = await this.handleAgentCommunication(Type.LIST_VAULTS, nodePath);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Type.LIST_VAULTS)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { vaultNames } = ListVaultsResponseMessage.decode(subMessage);
        return vaultNames;
    }
    async newVault(nodePath, vaultName) {
        var _a;
        const request = NewVaultRequestMessage.encode({ vaultName }).finish();
        const encodedResponse = await this.handleAgentCommunication(Type.NEW_VAULT, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Type.NEW_VAULT)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = NewVaultResponseMessage.decode(subMessage);
        return successful;
    }
    async destroyVault(nodePath, vaultName) {
        var _a;
        const request = DestroyVaultRequestMessage.encode({ vaultName }).finish();
        const encodedResponse = await this.handleAgentCommunication(Type.DESTROY_VAULT, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Type.DESTROY_VAULT)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = DestroyVaultResponseMessage.decode(subMessage);
        return successful;
    }
    ///////////////////////
    // Secret Operations //
    ///////////////////////
    async listSecrets(nodePath, vaultName) {
        var _a;
        const request = ListSecretsRequestMessage.encode({ vaultName }).finish();
        const encodedResponse = await this.handleAgentCommunication(Type.LIST_SECRETS, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Type.LIST_SECRETS)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { secretNames } = ListSecretsResponseMessage.decode(subMessage);
        return secretNames;
    }
    async createSecret(nodePath, vaultName, secretName, secret) {
        var _a;
        let request;
        if (typeof secret == 'string') {
            request = CreateSecretRequestMessage.encode({ vaultName, secretName, secretPath: secret }).finish();
        }
        else {
            request = CreateSecretRequestMessage.encode({ vaultName, secretName, secretContent: secret }).finish();
        }
        const encodedResponse = await this.handleAgentCommunication(Type.CREATE_SECRET, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Type.CREATE_SECRET)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = CreateSecretResponseMessage.decode(subMessage);
        return successful;
    }
    async destroySecret(nodePath, vaultName, secretName) {
        var _a;
        const request = DestroySecretRequestMessage.encode({ vaultName, secretName }).finish();
        const encodedResponse = await this.handleAgentCommunication(Type.DESTROY_SECRET, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Type.DESTROY_SECRET)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { successful } = DestroySecretResponseMessage.decode(subMessage);
        return successful;
    }
    async getSecret(nodePath, vaultName, secretName) {
        var _a;
        const request = GetSecretRequestMessage.encode({ vaultName, secretName }).finish();
        const encodedResponse = await this.handleAgentCommunication(Type.GET_SECRET, nodePath, request);
        const subMessage = (_a = encodedResponse.find((r) => r.type == Type.GET_SECRET)) === null || _a === void 0 ? void 0 : _a.subMessage;
        if (!subMessage) {
            throw Error('agent did not respond');
        }
        const { secret } = GetSecretResponseMessage.decode(subMessage);
        return Buffer.from(secret);
    }
    ///////////////////
    // Agent control //
    ///////////////////
    async getAgentStatus() {
        var _a;
        try {
            const encodedResponse = await this.handleAgentCommunication(Type.STATUS);
            const subMessage = (_a = encodedResponse.find((r) => r.type == Type.STATUS)) === null || _a === void 0 ? void 0 : _a.subMessage;
            if (!subMessage) {
                throw Error('agent did not respond');
            }
            const status = Buffer.from(subMessage).toString();
            return status;
        }
        catch (err) {
            if (err.toString().match(/ECONNRESET|ENOENT|ECONNRESET/)) {
                return 'stopped';
            }
            throw err;
        }
    }
    async stopAgent() {
        try {
            // Tell it to start shutting and wait for response
            await this.handleAgentCommunication(Type.STOP_AGENT);
            return true;
        }
        catch (err) {
            return (await this.getAgentStatus()) != 'online';
        }
    }
}
exports.default = PolykeyClient;


/***/ }),
/* 19 */
/***/ (function(module, exports) {

module.exports = require("../../proto/js/Agent");

/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(__webpack_require__(1));
const fs_1 = __importDefault(__webpack_require__(2));
const path_1 = __importDefault(__webpack_require__(0));
const kbpgp_1 = __importDefault(__webpack_require__(21));
const crypto_1 = __importDefault(__webpack_require__(5));
const util_1 = __webpack_require__(22);
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
        this.keypairPath = path_1.default.join(polyKeyPath, '.keypair');
        if (!this.fileSystem.existsSync(this.keypairPath)) {
            this.fileSystem.mkdirSync(this.keypairPath, { recursive: true });
        }
        this.metadataPath = path_1.default.join(this.keypairPath, 'metadata');
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
    async generateKeyPair(name, email, passphrase, nbits = 4096, replacePrimary = false, progressCallback) {
        // kbpgp doesn't seem to work for small nbits so set a minimum of 1024
        if (nbits < 1024) {
            throw Error('nbits must be greater than 1024 for keypair generation');
        }
        // Define options
        const flags = kbpgp_1.default['const'].openpgp;
        const params = {
            asp: progressCallback ? new kbpgp_1.default.ASP({ progress_hook: progressCallback }) : undefined,
            userid: `${name} <${email}>`,
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
     * Synchronously generates a new symmetric key and stores it in the key manager
     * @param name Unique name of the generated key
     * @param passphrase Passphrase to derive the key from
     */
    generateKeySync(name, passphrase) {
        const salt = crypto_1.default.randomBytes(32);
        this.derivedKeys[name] = crypto_1.default.pbkdf2Sync(passphrase, salt, 10000, 256 / 8, 'sha256');
        return this.derivedKeys[name];
    }
    /**
     * Asynchronously Generates a new symmetric key and stores it in the key manager
     * @param name Unique name of the generated key
     * @param passphrase Passphrase to derive the key from
     */
    async generateKey(name, passphrase) {
        const salt = crypto_1.default.randomBytes(32);
        this.derivedKeys[name] = await util_1.promisify(crypto_1.default.pbkdf2)(passphrase, salt, 10000, 256 / 8, 'sha256');
        return this.derivedKeys[name];
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
            await util_1.promisify(identity.unlock_pgp)({ passphrase: passphrase });
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
     * @param signature The PGP signature
     * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
     */
    async verifyData(data, signature, publicKey) {
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
                return await workerCrypto.verifyData(data, signature, resolvedIdentity);
            });
            return workerResponse;
        }
        else {
            const params = {
                armored: signature,
                data: data,
                keyfetch: ring,
            };
            const literals = await util_1.promisify(kbpgp_1.default.unbox)(params);
            // Get the identity that signed the data if any
            let dataSigner = literals[0].get_data_signer();
            // Retrieve the key manager associated with that data signer
            let keyManager;
            if (dataSigner) {
                keyManager = dataSigner.get_key_manager();
            }
            // If we know the pgp finger print then we say the data is verified.
            // Otherwise it is unverified.
            if (keyManager) {
                if (keyManager.get_pgp_fingerprint()) {
                    return true;
                }
                else {
                    return false;
                }
            }
            else {
                return false;
            }
        }
    }
    /**
     * Verifies the given file with the provided key or the primary key if none is specified
     * @param filePath Path to file containing the data to be verified
     * @param signaturePath The path to the file containing the PGP signature
     * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
     */
    async verifyFile(filePath, signaturePath, publicKey) {
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
        const fileBuffer = this.fileSystem.readFileSync(filePath);
        const signatureBuffer = this.fileSystem.readFileSync(signaturePath);
        const isVerified = await this.verifyData(fileBuffer, signatureBuffer, keyBuffer);
        return isVerified;
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
            return result_string;
        }
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
    writeMetadata() {
        const metadata = JSON.stringify(this.metadata);
        this.fileSystem.writeFileSync(this.metadataPath, metadata);
    }
    loadMetadata() {
        // Check if file exists
        if (this.fileSystem.existsSync(this.metadataPath)) {
            const metadata = this.fileSystem.readFileSync(this.metadataPath).toString();
            this.metadata = JSON.parse(metadata);
        }
    }
}
exports.default = KeyManager;


/***/ }),
/* 21 */
/***/ (function(module, exports) {

module.exports = require("kbpgp");

/***/ }),
/* 22 */
/***/ (function(module, exports) {

module.exports = require("util");

/***/ }),
/* 23 */
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
const os_1 = __importDefault(__webpack_require__(1));
const path_1 = __importDefault(__webpack_require__(0));
const grpc = __importStar(__webpack_require__(6));
const GitClient_1 = __importDefault(__webpack_require__(24));
const GitBackend_1 = __importDefault(__webpack_require__(25));
const Peer_1 = __webpack_require__(37);
const utils_1 = __webpack_require__(38);
const PeerInfo_1 = __importStar(__webpack_require__(14));
const MulticastBroadcaster_1 = __importDefault(__webpack_require__(39));
const Git_grpc_pb_1 = __webpack_require__(7);
const Git_pb_1 = __webpack_require__(8);
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
    constructor(polykeyPath = `${os_1.default.homedir()}/.polykey`, fileSystem, keyManager, vaultManager, peerInfo, socialDiscoveryServices = []) {
        var _a;
        this.metadata = { localPeerInfo: null };
        this.serverStarted = false;
        this.fileSystem = fileSystem;
        this.fileSystem.mkdirSync(polykeyPath, { recursive: true });
        this.metadataPath = path_1.default.join(polykeyPath, '.peerMetadata');
        // Set given variables
        this.keyManager = keyManager;
        this.socialDiscoveryServices = socialDiscoveryServices;
        // Load metadata with peer info
        this.loadMetadata();
        // Load peer store and local peer info
        if (peerInfo) {
            this.localPeerInfo = peerInfo;
            this.writeMetadata();
        }
        else if (this.metadata.localPeerInfo) {
            this.localPeerInfo = this.metadata.localPeerInfo;
        }
        else if (this.keyManager.hasPublicKey()) {
            this.localPeerInfo = new PeerInfo_1.default(this.keyManager.getPublicKey());
        }
        this.peerStore = new Map();
        this.socialDiscoveryServices = [];
        this.socialDiscoveryServices.push(keybaseDiscovery);
        for (const service of socialDiscoveryServices) {
            this.socialDiscoveryServices.push(service);
        }
        this.multicastBroadcaster = new MulticastBroadcaster_1.default(this.addPeer, this.localPeerInfo, this.keyManager);
        this.peerConnections = new Map();
        /////////////////
        // GRPC Server //
        /////////////////
        this.gitBackend = new GitBackend_1.default(polykeyPath, vaultManager);
        this.server = new grpc.Server();
        // Add service
        this.server.addService(Git_grpc_pb_1.GitServerService, {
            requestInfo: this.requestInfo.bind(this),
            requestPack: this.requestPack.bind(this),
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
        this.server.bindAsync(`0.0.0.0:${(_a = process.env.PK_PORT) !== null && _a !== void 0 ? _a : 0}`, this.credentials, (err, boundPort) => {
            if (err) {
                throw err;
            }
            else {
                const address = new PeerInfo_1.Address('localhost', boundPort.toString());
                this.server.start();
                this.localPeerInfo.connect(address);
                this.serverStarted = true;
            }
        });
    }
    async requestInfo(call, callback) {
        const infoRequest = call.request;
        const vaultName = infoRequest.getVaultname();
        const infoReply = new Git_pb_1.InfoReply();
        infoReply.setVaultname(vaultName);
        infoReply.setBody(await this.gitBackend.handleInfoRequest(vaultName));
        callback(null, infoReply);
    }
    async requestPack(call, callback) {
        const packRequest = call.request;
        const vaultName = packRequest.getVaultname();
        const body = Buffer.from(packRequest.getBody_asB64(), 'base64');
        const reply = new Git_pb_1.PackReply();
        reply.setVaultname(vaultName);
        reply.setBody(await this.gitBackend.handlePackRequest(vaultName, body));
        callback(null, reply);
    }
    ////////////////
    // Peer store //
    ////////////////
    /**
     * Get the peer info of the current keynode
     */
    getLocalPeerInfo() {
        return this.localPeerInfo;
    }
    /**
     * Set the address of the active server
     * @param adress Address of active server
     */
    connectLocalPeerInfo(address) {
        this.localPeerInfo.connect(address);
    }
    /**
     * Add a peer's info to the peerStore
     * @param peerInfo Info of the peer to be added
     */
    addPeer(peerInfo) {
        this.peerStore.set(peerInfo.publicKey, peerInfo);
    }
    /**
     * Retrieves a peer for the given public key
     * @param publicKey Public key of the desired peer
     */
    getPeer(publicKey) {
        var _a;
        return (_a = this.peerStore.get(publicKey)) !== null && _a !== void 0 ? _a : null;
    }
    /**
     * Determines if the peerStore contains the desired peer
     * @param publicKey Public key of the desired peer
     */
    hasPeer(pubKey) {
        return this.peerStore.has(pubKey);
    }
    //////////////////////
    // Social discovery //
    //////////////////////
    /**
     * Finds an existing peer using multicast peer discovery
     * @param publicKey Public key of the desired peer
     */
    async findPubKey(publicKey) {
        return new Promise((resolve, reject) => {
            this.multicastBroadcaster.requestPeerContact(publicKey);
            this.multicastBroadcaster.on('found', (peerInfo) => {
                if (peerInfo.publicKey == publicKey) {
                    resolve(peerInfo);
                }
            });
            this.multicastBroadcaster.on('timeout', (timedOutPubKey) => {
                if (timedOutPubKey == publicKey) {
                    reject('The broadcaster stopped looking');
                }
            });
        });
    }
    /**
     * Finds an existing peer given a social service and handle
     * @param handle Username or handle of the user (e.g. @john-smith)
     * @param service Service on which to search for the user (e.g. github)
     */
    async findSocialUser(handle, service) {
        const tasks = [];
        for (const socialDiscovery of this.socialDiscoveryServices) {
            try {
                tasks.push(socialDiscovery.findUser(handle, service));
            }
            catch (error) {
                console.log(`Could not find user on this discovery service: ${socialDiscovery.name}`);
            }
        }
        const pubKeyOrFail = await utils_1.firstPromiseFulfilled(tasks);
        if (pubKeyOrFail.length > 1) {
            throw Error('Could not find public key from services');
        }
        const pubKeyFound = pubKeyOrFail[0];
        const peerInfo = await this.findPubKey(pubKeyFound);
        return peerInfo;
    }
    ///////////////////////
    // Peers Connections //
    ///////////////////////
    /**
     * Get a secure connection to the peer
     * @param peer Public key of an existing peer or address of new peer
     */
    connectToPeer(peer) {
        var _a;
        // Throw error if trying to connect to self
        if (peer == this.localPeerInfo.connectedAddr || peer == this.localPeerInfo.publicKey) {
            throw Error('Cannot connect to self');
        }
        let address;
        if (typeof peer == 'string') {
            const existingSocket = this.peerConnections.get(peer);
            if (existingSocket) {
                return existingSocket;
            }
            const peerAddress = (_a = this.getPeer(peer)) === null || _a === void 0 ? void 0 : _a.connectedAddr;
            if (peerAddress) {
                address = peerAddress;
            }
            else {
                throw Error('Peer does not exist in peer store');
            }
        }
        else {
            address = peer;
        }
        const conn = new GitClient_1.default(address, this.keyManager);
        if (typeof peer == 'string') {
            this.peerConnections.set(peer, conn);
        }
        return conn;
    }
    /* ============ HELPERS =============== */
    writeMetadata() {
        var _a;
        const peerInfo = this.localPeerInfo;
        const metadata = Peer_1.peer.PeerInfoMessage.encode({
            addresses: peerInfo.AdressStringList,
            connectedAddr: (_a = peerInfo.connectedAddr) === null || _a === void 0 ? void 0 : _a.toString(),
            pubKey: peerInfo.publicKey,
        }).finish();
        this.fileSystem.writeFileSync(this.metadataPath, metadata);
    }
    loadMetadata() {
        // Check if file exists
        if (this.fileSystem.existsSync(this.metadataPath)) {
            const metadata = this.fileSystem.readFileSync(this.metadataPath);
            const { addresses, connectedAddr, pubKey } = Peer_1.peer.PeerInfoMessage.decode(metadata);
            this.localPeerInfo = new PeerInfo_1.default(pubKey, addresses, connectedAddr);
        }
    }
}
exports.default = PeerManager;


/***/ }),
/* 24 */
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
const grpc = __importStar(__webpack_require__(6));
const Git_grpc_pb_1 = __webpack_require__(7);
const Git_pb_1 = __webpack_require__(8);
/**
 * Responsible for converting HTTP messages from isomorphic-git into requests and sending them to a specific peer.
 */
class GitClient {
    constructor(address, keyManager) {
        const pkiInfo = keyManager.PKIInfo;
        if (pkiInfo.caCert && pkiInfo.cert && pkiInfo.key) {
            this.credentials = grpc.credentials.createSsl(pkiInfo.caCert, pkiInfo.key, pkiInfo.cert);
        }
        else {
            this.credentials = grpc.credentials.createInsecure();
        }
        this.client = new Git_grpc_pb_1.GitServerClient(address.toString(), this.credentials);
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
    // ==== HELPER METHODS ==== //
    /**
     * Requests remote info from the connected peer for the named vault.
     * @param vaultName Name of the desired vault
     */
    async requestInfo(vaultName) {
        return new Promise((resolve, reject) => {
            const request = new Git_pb_1.InfoRequest();
            request.setVaultname(vaultName);
            this.client.requestInfo(request, function (err, response) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(Buffer.from(response.getBody_asB64(), 'base64'));
                }
            });
        });
    }
    /**
     * Requests a pack from the connected peer for the named vault.
     * @param vaultName Name of the desired vault
     */
    async requestPack(vaultName, body) {
        return new Promise((resolve, reject) => {
            const request = new Git_pb_1.PackRequest();
            request.setVaultname(vaultName);
            request.setBody(body);
            this.client.requestPack(request, function (err, response) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(Buffer.from(response.getBody_asB64(), 'base64'));
                }
            });
        });
    }
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
exports.default = GitClient;


/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(__webpack_require__(0));
const readable_stream_1 = __webpack_require__(3);
const uploadPack_1 = __importDefault(__webpack_require__(26));
const GitSideBand_1 = __importDefault(__webpack_require__(28));
const packObjects_1 = __importDefault(__webpack_require__(30));
// Here is the protocol git outlines for sending pack files over http:
// https://git-scm.com/docs/pack-protocol/2.17.0
// https://github.com/git/git/blob/master/Documentation/technical/pack-protocol.txt
// This should be consulted in developing our upload pack implementation
// This git backend (as well as HttpDuplex class) is heavily inspired by node-git-server:
// https://github.com/gabrielcsapo/node-git-server
// We need someway to notify other agents about what vaults we have based on some type of authorisation because they don't explicitly know about them
class GitBackend {
    constructor(polykeyPath, vaultManager) {
        this.polykeyPath = polykeyPath;
        this.vaultManager = vaultManager;
    }
    /**
     * Find out whether vault exists.
     * @param vaultName Name of vault to check
     * @param publicKey Public key of peer trying to access vault
     */
    exists(vaultName, publicKey) {
        try {
            const vault = this.vaultManager.getVault(vaultName);
            if (vault) {
                return vault.peerCanAccess(publicKey);
            }
            return false;
        }
        catch (error) {
            return false;
        }
    }
    async handleInfoRequest(vaultName) {
        var _a;
        // Only handle upload-pack for now
        const service = 'upload-pack';
        const connectingPublicKey = '';
        const responseBuffers = [];
        if (!this.exists(vaultName, connectingPublicKey)) {
            throw Error(`vault does not exist: '${vaultName}'`);
        }
        else {
            responseBuffers.push(Buffer.from(this.createGitPacketLine('# service=git-' + service + '\n')));
            responseBuffers.push(Buffer.from('0000'));
            const fileSystem = (_a = this.vaultManager.getVault(vaultName)) === null || _a === void 0 ? void 0 : _a.EncryptedFS;
            const buffers = await uploadPack_1.default(fileSystem, path_1.default.join(this.polykeyPath, vaultName), undefined, true);
            const buffersToWrite = buffers !== null && buffers !== void 0 ? buffers : [];
            responseBuffers.push(...buffersToWrite);
        }
        return Buffer.concat(responseBuffers);
    }
    async handlePackRequest(vaultName, body) {
        // eslint-disable-next-line
        return new Promise(async (resolve, reject) => {
            var _a;
            const responseBuffers = [];
            // Check if vault exists
            const connectingPublicKey = '';
            if (!this.exists(vaultName, connectingPublicKey)) {
                throw Error(`vault does not exist: '${vaultName}'`);
            }
            const fileSystem = (_a = this.vaultManager.getVault(vaultName)) === null || _a === void 0 ? void 0 : _a.EncryptedFS;
            if (fileSystem) {
                if (body.toString().slice(4, 8) == 'want') {
                    const wantedObjectId = body.toString().slice(9, 49);
                    const packResult = await packObjects_1.default(fileSystem, path_1.default.join(this.polykeyPath, vaultName), [wantedObjectId], undefined);
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
            }
        });
    }
    // ============ Helper functions ============ //
    createGitPacketLine(line) {
        const hexPrefix = (4 + line.length).toString(16);
        return Array(4 - hexPrefix.length + 1).join('0') + hexPrefix + line;
    }
}
exports.default = GitBackend;


/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(__webpack_require__(0));
const GitPktLine_1 = __importDefault(__webpack_require__(9));
const GitRefManager_1 = __importDefault(__webpack_require__(10));
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
/* 27 */
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
/* 28 */
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
const buffer_1 = __webpack_require__(29);
const readable_stream_1 = __webpack_require__(3);
const GitPktLine_1 = __importDefault(__webpack_require__(9));
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
/* 29 */
/***/ (function(module, exports) {

module.exports = require("buffer");

/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pako_1 = __importDefault(__webpack_require__(11));
const path_1 = __importDefault(__webpack_require__(0));
const log_1 = __importDefault(__webpack_require__(31));
const GitTree_1 = __importDefault(__webpack_require__(35));
const sha_js_1 = __importDefault(__webpack_require__(36));
const GitCommit_1 = __importDefault(__webpack_require__(12));
const readable_stream_1 = __webpack_require__(3);
const GitObjectManager_1 = __importDefault(__webpack_require__(13));
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
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __webpack_require__(0);
const GitCommit_1 = __importDefault(__webpack_require__(12));
const GitObjectManager_1 = __importDefault(__webpack_require__(13));
const GitRefManager_1 = __importDefault(__webpack_require__(10));
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
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const shasum_1 = __importDefault(__webpack_require__(33));
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
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sha1_1 = __importDefault(__webpack_require__(34));
// This is modeled after @dominictarr's "shasum" module,
// but without the 'json-stable-stringify' dependency and
// extra type-casting features.
function shasum(buffer) {
    return new sha1_1.default().update(buffer).digest('hex');
}
exports.default = shasum;


/***/ }),
/* 34 */
/***/ (function(module, exports) {

module.exports = require("sha.js/sha1");

/***/ }),
/* 35 */
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
/* 36 */
/***/ (function(module, exports) {

module.exports = require("sha.js");

/***/ }),
/* 37 */
/***/ (function(module, exports) {

module.exports = require("../../proto/js/Peer");

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
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
 * Inverts the provided promise
 * @param p Promise to invert
 */
function invertPromise(p) {
    return new Promise((res, rej) => p.then(rej, res));
}
/**
 * Gets the first promise fulfiled
 * @param ps List of promises
 */
function firstPromiseFulfilled(ps) {
    return invertPromise(Promise.all(ps.map(invertPromise)));
}
exports.firstPromiseFulfilled = firstPromiseFulfilled;


/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const dgram_1 = __importDefault(__webpack_require__(40));
const crypto_1 = __importDefault(__webpack_require__(5));
const PeerInfo_1 = __importDefault(__webpack_require__(14));
const events_1 = __webpack_require__(41);
const Peer_js_1 = __webpack_require__(42);
const { HandshakeMessage, PeerInfoMessage } = Peer_js_1.peer;
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
    constructor(addPeer, localPeerInfo, keyManager) {
        super();
        this.peerPubKeyMessages = new Map();
        this.addPeer = addPeer;
        this.localPeerInfo = localPeerInfo;
        this.keyManager = keyManager;
        this.interval = 1e3;
        this.queryInterval = null;
        // Create socket
        this.socket = dgram_1.default.createSocket({ type: 'udp4', reuseAddr: true });
        this.socket.bind(UDP_MULTICAST_PORT);
        // Set up listener
        this.socket.on('listening', (() => {
            this.socket.addMembership(UDP_MULTICAST_ADDR);
            const address = this.socket.address();
        }).bind(this));
        // Handle messages
        this.socket.on('message', this.handleHandshakeMessages.bind(this));
        // Start the query process
        this.queryInterval = this.queryLAN();
    }
    /**
     * Request a peer contact for the multicast peer discovery to check for
     * @param publicKey Public key of the desired peer
     */
    async requestPeerContact(publicKey) {
        const pubKeyBuf = Buffer.from(publicKey);
        const randomMessage = crypto_1.default.randomBytes(16);
        // Encrypt message
        const encryptedPeerPubKey = await this.keyManager.encryptData(pubKeyBuf, pubKeyBuf);
        const encryptedRandomMessage = await this.keyManager.encryptData(randomMessage, pubKeyBuf);
        const encryptedLocalPubKey = await this.keyManager.encryptData(Buffer.from(this.keyManager.getPublicKey()), pubKeyBuf);
        // Add to peer messages to be sent over multicast
        this.peerPubKeyMessages.set(publicKey, {
            encryptedLocalPubKey: Buffer.from(encryptedLocalPubKey),
            encryptedPeerPubKey: Buffer.from(encryptedPeerPubKey),
            rawRandomMessage: randomMessage,
            encryptedRandomMessage: Buffer.from(encryptedRandomMessage),
        });
    }
    // ==== Helper methods ==== //
    queryLAN() {
        const query = () => {
            for (const pubKey of this.peerPubKeyMessages.keys()) {
                const peerMessage = this.peerPubKeyMessages.get(pubKey);
                if (peerMessage) {
                    const handshakeMessage = HandshakeMessage.encode({
                        targetPubKey: peerMessage.encryptedPeerPubKey,
                        requestingPubKey: peerMessage.encryptedLocalPubKey,
                        message: peerMessage.encryptedRandomMessage,
                    }).finish();
                    this.socket.send(handshakeMessage, 0, handshakeMessage.length, UDP_MULTICAST_PORT, UDP_MULTICAST_ADDR);
                }
            }
        };
        // Immediately start a query, then do it every interval.
        query();
        return setInterval(query, this.interval);
    }
    async handleHandshakeMessages(request, rinfo) {
        var _a, _b;
        try {
            const { message, requestingPubKey, responsePeerInfo, targetPubKey } = HandshakeMessage.decode(request);
            // Try to decrypt message and pubKey
            const decryptedMessage = await this.keyManager.decryptData(Buffer.from(message));
            const decryptedTargetPubKey = await this.keyManager.decryptData(Buffer.from(targetPubKey));
            const decryptedRequestingPubKey = await this.keyManager.decryptData(Buffer.from(requestingPubKey));
            const myPubKey = this.keyManager.getPublicKey();
            if (decryptedRequestingPubKey.toString() == myPubKey) {
                // Response
                // Make sure decrypted bytes equal raw bytes in memory
                const originalMessage = (_a = this.peerPubKeyMessages.get(decryptedTargetPubKey.toString())) === null || _a === void 0 ? void 0 : _a.rawRandomMessage;
                if (decryptedMessage.toString() == (originalMessage === null || originalMessage === void 0 ? void 0 : originalMessage.toString())) {
                    // Validated!
                    // Add peer info to peerStore
                    const { addresses, connectedAddr, pubKey } = PeerInfoMessage.decode(responsePeerInfo);
                    const newPeerInfo = new PeerInfo_1.default(pubKey, addresses, connectedAddr);
                    if (newPeerInfo) {
                        this.addPeer(newPeerInfo);
                        // Remove peerId from requested messages
                        const pubKey = newPeerInfo.publicKey;
                        this.peerPubKeyMessages.delete(pubKey);
                        console.log(`New peer added to the store`);
                        this.emit('found', newPeerInfo);
                    }
                    else {
                        this.emit('error', 'I got a validated response. But no peerInfo');
                    }
                }
            }
            else {
                // Requests on target node
                // Try decrypting message
                // Re-encrypt the data and send it on its way
                const encryptedTargetPubKey = await this.keyManager.encryptData(Buffer.from(myPubKey), decryptedRequestingPubKey);
                const encryptedMessage = await this.keyManager.encryptData(decryptedMessage, decryptedRequestingPubKey);
                const encryptedPubKey = await this.keyManager.encryptData(decryptedRequestingPubKey, decryptedRequestingPubKey);
                const encodedLocalPeerInfo = PeerInfoMessage.encode({
                    addresses: this.localPeerInfo.AdressStringList,
                    connectedAddr: (_b = this.localPeerInfo.connectedAddr) === null || _b === void 0 ? void 0 : _b.toString(),
                    pubKey: this.localPeerInfo.publicKey,
                }).finish();
                const handshakeMessage = HandshakeMessage.encode({
                    targetPubKey: Buffer.from(encryptedTargetPubKey),
                    requestingPubKey: Buffer.from(encryptedPubKey),
                    message: Buffer.from(encryptedMessage),
                    responsePeerInfo: encodedLocalPeerInfo,
                }).finish();
                this.socket.send(handshakeMessage, 0, handshakeMessage.length, UDP_MULTICAST_PORT, UDP_MULTICAST_ADDR);
            }
        }
        catch (err) {
            // Couldn't decode message
            // We don't want the multicast discovery to error on every message it coudln't decode!
        }
    }
}
exports.default = MulticastBroadcaster;


/***/ }),
/* 40 */
/***/ (function(module, exports) {

module.exports = require("dgram");

/***/ }),
/* 41 */
/***/ (function(module, exports) {

module.exports = require("events");

/***/ }),
/* 42 */
/***/ (function(module, exports) {

module.exports = require("../../proto/js/Peer.js");

/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(__webpack_require__(1));
const path_1 = __importDefault(__webpack_require__(0));
const isomorphic_git_1 = __importDefault(__webpack_require__(15));
const Vault_1 = __importDefault(__webpack_require__(44));
const encryptedfs_1 = __webpack_require__(16);
class VaultManager {
    constructor(polykeyPath = `${os_1.default.homedir()}/.polykey`, fileSystem, keyManager) {
        this.polykeyPath = polykeyPath;
        this.fileSystem = fileSystem;
        this.keyManager = keyManager;
        this.metadataPath = path_1.default.join(polykeyPath, '.vaultKeys');
        // Make polykeyPath if it doesn't exist
        this.fileSystem.mkdirSync(this.polykeyPath, { recursive: true });
        // Initialize stateful variables
        this.vaults = new Map();
        this.vaultKeys = new Map();
        // Read in vault keys
        this.loadMetadata();
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
            const vault = new Vault_1.default(vaultName, vaultKey, this.polykeyPath);
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
            const path = path_1.default.join(this.polykeyPath, vaultName);
            // Directory not present, create one
            this.fileSystem.mkdirSync(path, { recursive: true });
            // Create key if not provided
            let vaultKey;
            if (!key) {
                // Generate new key
                vaultKey = await this.keyManager.generateKey(`${vaultName}-Key`, this.keyManager.getPrivateKey());
            }
            else {
                // Assign key if it is provided
                vaultKey = key;
            }
            this.vaultKeys.set(vaultName, vaultKey);
            this.writeMetadata();
            // Create vault
            const vault = new Vault_1.default(vaultName, vaultKey, this.polykeyPath);
            // Init repository for vault
            const vaultPath = path_1.default.join(this.polykeyPath, vaultName);
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
    async cloneVault(vaultName, gitClient) {
        // Confirm it doesn't exist locally already
        if (this.vaultExists(vaultName)) {
            throw Error('Vault name already exists locally, try pulling instead');
        }
        const vaultUrl = `http://0.0.0.0/${vaultName}`;
        // First check if it exists on remote
        const info = await isomorphic_git_1.default.getRemoteInfo({
            http: gitClient,
            url: vaultUrl,
        });
        if (!info.refs) {
            throw Error(`Peer does not have vault: '${vaultName}'`);
        }
        // Create new efs first
        // Generate new key
        const vaultKey = await this.keyManager.generateKey(`${vaultName}-Key`, this.keyManager.getPrivateKey());
        // Set filesystem
        const vfsInstance = new (__webpack_require__(17).VirtualFS)();
        const newEfs = new encryptedfs_1.EncryptedFS(vaultKey, vfsInstance, vfsInstance, this.fileSystem, process);
        // Clone vault from address
        await isomorphic_git_1.default.clone({
            fs: { promises: newEfs.promises },
            http: gitClient,
            dir: path_1.default.join(this.polykeyPath, vaultName),
            url: vaultUrl,
            ref: 'master',
            singleBranch: true,
        });
        // Finally return the vault
        const vault = new Vault_1.default(vaultName, vaultKey, this.polykeyPath);
        this.vaults.set(vaultName, vault);
        return vault;
    }
    /**
     * Determines whether the vault exists
     * @param vaultName Name of desired vault
     */
    vaultExists(vaultName) {
        const path = path_1.default.join(this.polykeyPath, vaultName);
        const vaultExists = this.fileSystem.existsSync(path);
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
        const path = path_1.default.join(this.polykeyPath, vaultName);
        // Remove directory on file system
        if (this.fileSystem.existsSync(path)) {
            this.fileSystem.rmdirSync(path, { recursive: true });
        }
        // Remove from maps
        this.vaults.delete(vaultName);
        this.vaultKeys.delete(vaultName);
        // Write to metadata file
        this.writeMetadata();
        const vaultPathExists = this.fileSystem.existsSync(path);
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
                const path = path_1.default.join(this.polykeyPath, vaultName);
                if (this.fileSystem.existsSync(path)) {
                    const vault = new Vault_1.default(vaultName, vaultKey, this.polykeyPath);
                    this.vaults.set(vaultName, vault);
                }
            }
            console.log(this.vaults);
        }
    }
}
exports.default = VaultManager;


/***/ }),
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(__webpack_require__(2));
const path_1 = __importDefault(__webpack_require__(0));
const isomorphic_git_1 = __importDefault(__webpack_require__(15));
const encryptedfs_1 = __webpack_require__(16);
const async_mutex_1 = __webpack_require__(45);
class Vault {
    constructor(name, symKey, baseDir) {
        // Concurrency
        this.mutex = new async_mutex_1.Mutex();
        // how do we create pub/priv key pair?
        // do we use the same gpg pub/priv keypair
        this.key = symKey;
        // Set filesystem
        const vfsInstance = new (__webpack_require__(17).VirtualFS)();
        this.efs = new encryptedfs_1.EncryptedFS(this.key, vfsInstance, vfsInstance, fs_1.default, process);
        this.name = name;
        this.vaultPath = path_1.default.join(baseDir, name);
        // make the vault directory
        this.efs.mkdirSync(this.vaultPath, { recursive: true });
        this.secrets = new Map();
        this.loadSecrets();
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
     * @param address Address of polykey node that owns vault to be pulled
     * @param getSocket Function to get an active connection to provided address
     */
    async pullVault(gitClient) {
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
/* 45 */
/***/ (function(module, exports) {

module.exports = require("async-mutex");

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
const os_1 = __importDefault(__webpack_require__(1));
const fs_1 = __importDefault(__webpack_require__(2));
const net_1 = __importDefault(__webpack_require__(47));
const path_1 = __importDefault(__webpack_require__(0));
const process_1 = __importDefault(__webpack_require__(48));
const child_process_1 = __webpack_require__(49);
const Polykey_1 = __importStar(__webpack_require__(4));
const configstore_1 = __importDefault(__webpack_require__(50));
const PolykeyClient_1 = __importDefault(__webpack_require__(18));
const Agent_1 = __webpack_require__(19);
const { AgentMessage, CreateSecretRequestMessage, CreateSecretResponseMessage, DeriveKeyRequestMessage, DeriveKeyResponseMessage, DestroySecretRequestMessage, DestroySecretResponseMessage, DestroyVaultRequestMessage, DestroyVaultResponseMessage, ErrorMessage, GetSecretRequestMessage, GetSecretResponseMessage, ListNodesRequestMessage, ListNodesResponseMessage, ListSecretsRequestMessage, ListSecretsResponseMessage, ListVaultsRequestMessage, ListVaultsResponseMessage, NewNodeRequestMessage, NewNodeResponseMessage, NewVaultRequestMessage, NewVaultResponseMessage, RegisterNodeRequestMessage, RegisterNodeResponseMessage, SignFileRequestMessage, SignFileResponseMessage, Type, VerifyFileRequestMessage, VerifyFileResponseMessage, } = Agent_1.agent;
class PolykeyAgent {
    constructor() {
        this.persistentStore = new configstore_1.default('polykey');
        // For storing the state of each polykey node
        // Keys are the paths to the polykey node, e.g. '~/.polykey'
        this.polykeyMap = new Map();
        this.socketPath = PolykeyAgent.SocketPath;
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
                    this.polykeyMap.set(path, new Polykey_1.default(path, fs_1.default));
                }
                else {
                    this.removeFromNodePaths(path);
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
    get AllNodePaths() {
        return Array.from(this.polykeyMap.keys()).filter((nodePath) => {
            try {
                this.getPolykey(nodePath);
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
                return this.getPolykey(nodePath).keyManager.identityLoaded;
            }
            catch (_a) {
                return false;
            }
        });
    }
    stop() {
        this.server.close();
    }
    addToNodePaths(nodePath, pk) {
        this.polykeyMap.set(nodePath, pk);
        const nodePathSet = new Set(this.persistentStore.get('nodePaths'));
        nodePathSet.add(nodePath);
        this.persistentStore.set('nodePaths', Array.from(nodePathSet.values()));
    }
    removeFromNodePaths(nodePath) {
        this.polykeyMap.delete(nodePath);
        const nodePathSet = new Set(this.persistentStore.get('nodePaths'));
        nodePathSet.delete(nodePath);
        this.persistentStore.set('nodePaths', Array.from(nodePathSet.values()));
    }
    handleClientCommunication(socket) {
        socket.on('data', async (encodedMessage) => {
            var _a;
            try {
                const { type, nodePath, subMessage } = AgentMessage.decode(encodedMessage);
                let response = undefined;
                switch (type) {
                    case Type.STATUS:
                        response = Buffer.from('online');
                        break;
                    case Type.STOP_AGENT:
                        this.stop();
                        process_1.default.exit();
                    // eslint-disable-next-line
                    case Type.REGISTER_NODE:
                        response = await this.registerNode(nodePath, subMessage);
                        break;
                    case Type.NEW_NODE:
                        response = await this.newNode(nodePath, subMessage);
                        break;
                    case Type.LIST_NODES:
                        response = this.listNodes(subMessage);
                        break;
                    case Type.DERIVE_KEY:
                        response = await this.deriveKey(nodePath, subMessage);
                        break;
                    case Type.SIGN_FILE:
                        response = await this.signFile(nodePath, subMessage);
                        break;
                    case Type.VERIFY_FILE:
                        response = await this.verifyFile(nodePath, subMessage);
                        break;
                    case Type.LIST_VAULTS:
                        response = await this.listVaults(nodePath);
                        break;
                    case Type.NEW_VAULT:
                        response = await this.newVault(nodePath, subMessage);
                        break;
                    case Type.DESTROY_VAULT:
                        response = await this.destroyVault(nodePath, subMessage);
                        break;
                    case Type.LIST_SECRETS:
                        response = await this.listSecrets(nodePath, subMessage);
                        break;
                    case Type.CREATE_SECRET:
                        response = await this.createSecret(nodePath, subMessage);
                        break;
                    case Type.DESTROY_SECRET:
                        response = await this.destroySecret(nodePath, subMessage);
                        break;
                    case Type.GET_SECRET:
                        response = await this.getSecret(nodePath, subMessage);
                        break;
                    default:
                        throw Error(`message type not supported: ${type}`);
                }
                if (response) {
                    const encodedResponse = AgentMessage.encode({
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
                const errorResponse = AgentMessage.encode({
                    type: Type.ERROR,
                    isResponse: true,
                    nodePath: undefined,
                    subMessage: ErrorMessage.encode({ error: (_a = err.message) !== null && _a !== void 0 ? _a : err }).finish(),
                }).finish();
                socket.write(errorResponse);
            }
            // Close connection
            socket.end();
        });
    }
    // Register an existing polykey agent
    async registerNode(nodePath, request) {
        const { passphrase } = RegisterNodeRequestMessage.decode(request);
        let pk = this.polykeyMap.get(nodePath);
        if (pk) {
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
        pk.keyManager.loadMetadata();
        pk.peerManager.loadMetadata();
        await pk.vaultManager.loadMetadata();
        console.log(pk.vaultManager.listVaults());
        // Set polykey class
        this.addToNodePaths(nodePath, pk);
        // Encode and send response
        const response = NewNodeResponseMessage.encode({
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
        const { name, email, passphrase, nbits } = NewNodeRequestMessage.decode(request);
        const km = new Polykey_1.KeyManager(nodePath, fs_1.default);
        await km.generateKeyPair(name, email, passphrase, nbits == 0 ? undefined : nbits, true, (info) => {
            // socket.write(JSON.stringify(info))
        });
        // Create and set polykey class
        const pk = new Polykey_1.default(nodePath, fs_1.default, km);
        this.addToNodePaths(nodePath, pk);
        // Encode and send response
        const response = NewNodeResponseMessage.encode({
            successful: km.identityLoaded && this.polykeyMap.has(nodePath),
        }).finish();
        return response;
    }
    // Create a new polykey agent
    listNodes(request) {
        const { unlockedOnly } = ListNodesRequestMessage.decode(request);
        if (unlockedOnly) {
            return ListNodesResponseMessage.encode({ nodes: this.UnlockedNodePaths }).finish();
        }
        else {
            return ListNodesResponseMessage.encode({ nodes: this.AllNodePaths }).finish();
        }
    }
    getPolykey(nodePath) {
        var _a;
        if (this.polykeyMap.has(nodePath)) {
            return this.polykeyMap.get(nodePath);
        }
        else if (fs_1.default.existsSync(nodePath)) {
            throw Error(`polykey node has not been loaded yet: '${nodePath}'`);
        }
        else {
            const nodePathList = new Set((_a = this.persistentStore.get('nodePaths')) !== null && _a !== void 0 ? _a : []);
            nodePathList.delete(nodePath);
            this.persistentStore.set('nodePaths', Array.from(nodePathList.values()));
            throw Error(`node path does not exist: '${nodePath}'`);
        }
    }
    /////////////////////////
    // KeyManager commands //
    /////////////////////////
    async deriveKey(nodePath, request) {
        const { keyName, passphrase } = DeriveKeyRequestMessage.decode(request);
        const pk = this.getPolykey(nodePath);
        await pk.keyManager.generateKey(keyName, passphrase);
        return DeriveKeyResponseMessage.encode({ successful: true }).finish();
    }
    /////////////////////
    // Crypto commands //
    /////////////////////
    async signFile(nodePath, request) {
        const { filePath, privateKeyPath, passphrase } = SignFileRequestMessage.decode(request);
        const pk = this.getPolykey(nodePath);
        const signaturePath = await pk.keyManager.signFile(filePath, privateKeyPath, passphrase);
        return SignFileResponseMessage.encode({ signaturePath }).finish();
    }
    async verifyFile(nodePath, request) {
        const { filePath, signaturePath } = VerifyFileRequestMessage.decode(request);
        const pk = this.getPolykey(nodePath);
        const verified = await pk.keyManager.verifyFile(filePath, signaturePath);
        return VerifyFileResponseMessage.encode({ verified }).finish();
    }
    //////////////////////
    // Vault Operations //
    //////////////////////
    async listVaults(nodePath) {
        const pk = this.getPolykey(nodePath);
        const vaultNames = pk.vaultManager.listVaults();
        return ListVaultsResponseMessage.encode({ vaultNames }).finish();
    }
    async newVault(nodePath, request) {
        const { vaultName } = NewVaultRequestMessage.decode(request);
        const pk = this.getPolykey(nodePath);
        await pk.vaultManager.createVault(vaultName);
        return NewVaultResponseMessage.encode({ successful: true }).finish();
    }
    async destroyVault(nodePath, request) {
        const { vaultName } = DestroyVaultRequestMessage.decode(request);
        const pk = this.getPolykey(nodePath);
        pk.vaultManager.destroyVault(vaultName);
        return DestroyVaultResponseMessage.encode({ successful: true }).finish();
    }
    ///////////////////////
    // Secret Operations //
    ///////////////////////
    async listSecrets(nodePath, request) {
        const { vaultName } = ListSecretsRequestMessage.decode(request);
        const pk = this.getPolykey(nodePath);
        const vault = pk.vaultManager.getVault(vaultName);
        const secretNames = vault.listSecrets();
        return ListSecretsResponseMessage.encode({ secretNames }).finish();
    }
    async createSecret(nodePath, request) {
        const { vaultName, secretName, secretPath, secretContent } = CreateSecretRequestMessage.decode(request);
        const pk = this.getPolykey(nodePath);
        const vault = pk.vaultManager.getVault(vaultName);
        let secretBuffer;
        if (secretPath) {
            secretBuffer = await fs_1.default.promises.readFile(secretPath);
        }
        else {
            secretBuffer = Buffer.from(secretContent);
        }
        await vault.addSecret(secretName, secretBuffer);
        return CreateSecretResponseMessage.encode({ successful: true }).finish();
    }
    async destroySecret(nodePath, request) {
        const { vaultName, secretName } = DestroySecretRequestMessage.decode(request);
        const pk = this.getPolykey(nodePath);
        const vault = pk.vaultManager.getVault(vaultName);
        await vault.removeSecret(secretName);
        return DestroySecretResponseMessage.encode({ successful: true }).finish();
    }
    async getSecret(nodePath, request) {
        const { vaultName, secretName } = GetSecretRequestMessage.decode(request);
        const pk = this.getPolykey(nodePath);
        const vault = pk.vaultManager.getVault(vaultName);
        const secret = Buffer.from(vault.getSecret(secretName));
        return GetSecretResponseMessage.encode({ secret: secret }).finish();
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
        if (platform == 'win32') {
            return path_1.default.join('\\\\?\\pipe', process_1.default.cwd(), 'polykey-agent');
        }
        else {
            return `/run/user/${userInfo.uid}/polykey/S.polykey-agent`;
        }
    }
    static get LogPath() {
        const platform = os_1.default.platform();
        const userInfo = os_1.default.userInfo();
        if (platform == 'win32') {
            return path_1.default.join(os_1.default.tmpdir(), 'polykey', 'log');
        }
        else {
            return `/run/user/${userInfo.uid}/polykey/log`;
        }
    }
    static async startAgent(daemon = false) {
        return new Promise((resolve, reject) => {
            try {
                fs_1.default.rmdirSync(PolykeyAgent.LogPath, { recursive: true });
                fs_1.default.mkdirSync(PolykeyAgent.LogPath, { recursive: true });
                let options = {
                    uid: process_1.default.getuid(),
                    detached: daemon,
                    stdio: [
                        'ipc',
                        fs_1.default.openSync(path_1.default.join(PolykeyAgent.LogPath, 'output.log'), 'a'),
                        fs_1.default.openSync(path_1.default.join(PolykeyAgent.LogPath, 'error.log'), 'a'),
                    ]
                };
                const agentProcess = child_process_1.fork(PolykeyAgent.DAEMON_SCRIPT_PATH, undefined, options);
                const pid = agentProcess.pid;
                agentProcess.unref();
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
PolykeyAgent.DAEMON_SCRIPT_PATH = path_1.default.join(__dirname, 'internal', 'daemon-script.js');
exports.default = PolykeyAgent;


/***/ }),
/* 47 */
/***/ (function(module, exports) {

module.exports = require("net");

/***/ }),
/* 48 */
/***/ (function(module, exports) {

module.exports = require("process");

/***/ }),
/* 49 */
/***/ (function(module, exports) {

module.exports = require("child_process");

/***/ }),
/* 50 */
/***/ (function(module, exports) {

module.exports = require("configstore");

/***/ })
/******/ ]);
});
//# sourceMappingURL=polykey.js.map