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
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {
Object.defineProperty(exports, "__esModule", { value: true });
const Agent_1 = __webpack_require__(6);
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
            console.log(err);
            return 'stopped';
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

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(1).Buffer))

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */



var base64 = __webpack_require__(3)
var ieee754 = __webpack_require__(4)
var isArray = __webpack_require__(5)

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

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(2)))

/***/ }),
/* 2 */
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
/* 3 */
/***/ (function(module, exports) {

module.exports = require("base64-js");

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = require("ieee754");

/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = require("isarray");

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/


var $protobuf = __webpack_require__(7);

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.agent = (function() {

    /**
     * Namespace agent.
     * @exports agent
     * @namespace
     */
    var agent = {};

    /**
     * Type enum.
     * @name agent.Type
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
     */
    agent.Type = (function() {
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
        return values;
    })();

    agent.AgentMessage = (function() {

        /**
         * Properties of an AgentMessage.
         * @memberof agent
         * @interface IAgentMessage
         * @property {agent.Type|null} [type] AgentMessage type
         * @property {boolean|null} [isResponse] AgentMessage isResponse
         * @property {string|null} [nodePath] AgentMessage nodePath
         * @property {Uint8Array|null} [subMessage] AgentMessage subMessage
         */

        /**
         * Constructs a new AgentMessage.
         * @memberof agent
         * @classdesc Represents an AgentMessage.
         * @implements IAgentMessage
         * @constructor
         * @param {agent.IAgentMessage=} [p] Properties to set
         */
        function AgentMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * AgentMessage type.
         * @member {agent.Type} type
         * @memberof agent.AgentMessage
         * @instance
         */
        AgentMessage.prototype.type = 0;

        /**
         * AgentMessage isResponse.
         * @member {boolean} isResponse
         * @memberof agent.AgentMessage
         * @instance
         */
        AgentMessage.prototype.isResponse = false;

        /**
         * AgentMessage nodePath.
         * @member {string} nodePath
         * @memberof agent.AgentMessage
         * @instance
         */
        AgentMessage.prototype.nodePath = "";

        /**
         * AgentMessage subMessage.
         * @member {Uint8Array} subMessage
         * @memberof agent.AgentMessage
         * @instance
         */
        AgentMessage.prototype.subMessage = $util.newBuffer([]);

        /**
         * Creates a new AgentMessage instance using the specified properties.
         * @function create
         * @memberof agent.AgentMessage
         * @static
         * @param {agent.IAgentMessage=} [properties] Properties to set
         * @returns {agent.AgentMessage} AgentMessage instance
         */
        AgentMessage.create = function create(properties) {
            return new AgentMessage(properties);
        };

        /**
         * Encodes the specified AgentMessage message. Does not implicitly {@link agent.AgentMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.AgentMessage
         * @static
         * @param {agent.IAgentMessage} m AgentMessage message or plain object to encode
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
         * Decodes an AgentMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.AgentMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.AgentMessage} AgentMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AgentMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.AgentMessage();
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

        return AgentMessage;
    })();

    agent.ErrorMessage = (function() {

        /**
         * Properties of an ErrorMessage.
         * @memberof agent
         * @interface IErrorMessage
         * @property {string|null} [error] ErrorMessage error
         */

        /**
         * Constructs a new ErrorMessage.
         * @memberof agent
         * @classdesc Represents an ErrorMessage.
         * @implements IErrorMessage
         * @constructor
         * @param {agent.IErrorMessage=} [p] Properties to set
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
         * @memberof agent.ErrorMessage
         * @instance
         */
        ErrorMessage.prototype.error = "";

        /**
         * Creates a new ErrorMessage instance using the specified properties.
         * @function create
         * @memberof agent.ErrorMessage
         * @static
         * @param {agent.IErrorMessage=} [properties] Properties to set
         * @returns {agent.ErrorMessage} ErrorMessage instance
         */
        ErrorMessage.create = function create(properties) {
            return new ErrorMessage(properties);
        };

        /**
         * Encodes the specified ErrorMessage message. Does not implicitly {@link agent.ErrorMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.ErrorMessage
         * @static
         * @param {agent.IErrorMessage} m ErrorMessage message or plain object to encode
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
         * Decodes an ErrorMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.ErrorMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.ErrorMessage} ErrorMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ErrorMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.ErrorMessage();
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

        return ErrorMessage;
    })();

    agent.RegisterNodeRequestMessage = (function() {

        /**
         * Properties of a RegisterNodeRequestMessage.
         * @memberof agent
         * @interface IRegisterNodeRequestMessage
         * @property {string|null} [passphrase] RegisterNodeRequestMessage passphrase
         */

        /**
         * Constructs a new RegisterNodeRequestMessage.
         * @memberof agent
         * @classdesc Represents a RegisterNodeRequestMessage.
         * @implements IRegisterNodeRequestMessage
         * @constructor
         * @param {agent.IRegisterNodeRequestMessage=} [p] Properties to set
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
         * @memberof agent.RegisterNodeRequestMessage
         * @instance
         */
        RegisterNodeRequestMessage.prototype.passphrase = "";

        /**
         * Creates a new RegisterNodeRequestMessage instance using the specified properties.
         * @function create
         * @memberof agent.RegisterNodeRequestMessage
         * @static
         * @param {agent.IRegisterNodeRequestMessage=} [properties] Properties to set
         * @returns {agent.RegisterNodeRequestMessage} RegisterNodeRequestMessage instance
         */
        RegisterNodeRequestMessage.create = function create(properties) {
            return new RegisterNodeRequestMessage(properties);
        };

        /**
         * Encodes the specified RegisterNodeRequestMessage message. Does not implicitly {@link agent.RegisterNodeRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.RegisterNodeRequestMessage
         * @static
         * @param {agent.IRegisterNodeRequestMessage} m RegisterNodeRequestMessage message or plain object to encode
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
         * Decodes a RegisterNodeRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.RegisterNodeRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.RegisterNodeRequestMessage} RegisterNodeRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RegisterNodeRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.RegisterNodeRequestMessage();
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

        return RegisterNodeRequestMessage;
    })();

    agent.RegisterNodeResponseMessage = (function() {

        /**
         * Properties of a RegisterNodeResponseMessage.
         * @memberof agent
         * @interface IRegisterNodeResponseMessage
         * @property {boolean|null} [successful] RegisterNodeResponseMessage successful
         */

        /**
         * Constructs a new RegisterNodeResponseMessage.
         * @memberof agent
         * @classdesc Represents a RegisterNodeResponseMessage.
         * @implements IRegisterNodeResponseMessage
         * @constructor
         * @param {agent.IRegisterNodeResponseMessage=} [p] Properties to set
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
         * @memberof agent.RegisterNodeResponseMessage
         * @instance
         */
        RegisterNodeResponseMessage.prototype.successful = false;

        /**
         * Creates a new RegisterNodeResponseMessage instance using the specified properties.
         * @function create
         * @memberof agent.RegisterNodeResponseMessage
         * @static
         * @param {agent.IRegisterNodeResponseMessage=} [properties] Properties to set
         * @returns {agent.RegisterNodeResponseMessage} RegisterNodeResponseMessage instance
         */
        RegisterNodeResponseMessage.create = function create(properties) {
            return new RegisterNodeResponseMessage(properties);
        };

        /**
         * Encodes the specified RegisterNodeResponseMessage message. Does not implicitly {@link agent.RegisterNodeResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.RegisterNodeResponseMessage
         * @static
         * @param {agent.IRegisterNodeResponseMessage} m RegisterNodeResponseMessage message or plain object to encode
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
         * Decodes a RegisterNodeResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.RegisterNodeResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.RegisterNodeResponseMessage} RegisterNodeResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RegisterNodeResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.RegisterNodeResponseMessage();
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

        return RegisterNodeResponseMessage;
    })();

    agent.NewNodeRequestMessage = (function() {

        /**
         * Properties of a NewNodeRequestMessage.
         * @memberof agent
         * @interface INewNodeRequestMessage
         * @property {string|null} [name] NewNodeRequestMessage name
         * @property {string|null} [email] NewNodeRequestMessage email
         * @property {string|null} [passphrase] NewNodeRequestMessage passphrase
         * @property {number|null} [nbits] NewNodeRequestMessage nbits
         */

        /**
         * Constructs a new NewNodeRequestMessage.
         * @memberof agent
         * @classdesc Represents a NewNodeRequestMessage.
         * @implements INewNodeRequestMessage
         * @constructor
         * @param {agent.INewNodeRequestMessage=} [p] Properties to set
         */
        function NewNodeRequestMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * NewNodeRequestMessage name.
         * @member {string} name
         * @memberof agent.NewNodeRequestMessage
         * @instance
         */
        NewNodeRequestMessage.prototype.name = "";

        /**
         * NewNodeRequestMessage email.
         * @member {string} email
         * @memberof agent.NewNodeRequestMessage
         * @instance
         */
        NewNodeRequestMessage.prototype.email = "";

        /**
         * NewNodeRequestMessage passphrase.
         * @member {string} passphrase
         * @memberof agent.NewNodeRequestMessage
         * @instance
         */
        NewNodeRequestMessage.prototype.passphrase = "";

        /**
         * NewNodeRequestMessage nbits.
         * @member {number} nbits
         * @memberof agent.NewNodeRequestMessage
         * @instance
         */
        NewNodeRequestMessage.prototype.nbits = 0;

        /**
         * Creates a new NewNodeRequestMessage instance using the specified properties.
         * @function create
         * @memberof agent.NewNodeRequestMessage
         * @static
         * @param {agent.INewNodeRequestMessage=} [properties] Properties to set
         * @returns {agent.NewNodeRequestMessage} NewNodeRequestMessage instance
         */
        NewNodeRequestMessage.create = function create(properties) {
            return new NewNodeRequestMessage(properties);
        };

        /**
         * Encodes the specified NewNodeRequestMessage message. Does not implicitly {@link agent.NewNodeRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.NewNodeRequestMessage
         * @static
         * @param {agent.INewNodeRequestMessage} m NewNodeRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NewNodeRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.name != null && Object.hasOwnProperty.call(m, "name"))
                w.uint32(10).string(m.name);
            if (m.email != null && Object.hasOwnProperty.call(m, "email"))
                w.uint32(18).string(m.email);
            if (m.passphrase != null && Object.hasOwnProperty.call(m, "passphrase"))
                w.uint32(26).string(m.passphrase);
            if (m.nbits != null && Object.hasOwnProperty.call(m, "nbits"))
                w.uint32(32).int32(m.nbits);
            return w;
        };

        /**
         * Decodes a NewNodeRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.NewNodeRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.NewNodeRequestMessage} NewNodeRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NewNodeRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.NewNodeRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.name = r.string();
                    break;
                case 2:
                    m.email = r.string();
                    break;
                case 3:
                    m.passphrase = r.string();
                    break;
                case 4:
                    m.nbits = r.int32();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        return NewNodeRequestMessage;
    })();

    agent.NewNodeResponseMessage = (function() {

        /**
         * Properties of a NewNodeResponseMessage.
         * @memberof agent
         * @interface INewNodeResponseMessage
         * @property {boolean|null} [successful] NewNodeResponseMessage successful
         */

        /**
         * Constructs a new NewNodeResponseMessage.
         * @memberof agent
         * @classdesc Represents a NewNodeResponseMessage.
         * @implements INewNodeResponseMessage
         * @constructor
         * @param {agent.INewNodeResponseMessage=} [p] Properties to set
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
         * @memberof agent.NewNodeResponseMessage
         * @instance
         */
        NewNodeResponseMessage.prototype.successful = false;

        /**
         * Creates a new NewNodeResponseMessage instance using the specified properties.
         * @function create
         * @memberof agent.NewNodeResponseMessage
         * @static
         * @param {agent.INewNodeResponseMessage=} [properties] Properties to set
         * @returns {agent.NewNodeResponseMessage} NewNodeResponseMessage instance
         */
        NewNodeResponseMessage.create = function create(properties) {
            return new NewNodeResponseMessage(properties);
        };

        /**
         * Encodes the specified NewNodeResponseMessage message. Does not implicitly {@link agent.NewNodeResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.NewNodeResponseMessage
         * @static
         * @param {agent.INewNodeResponseMessage} m NewNodeResponseMessage message or plain object to encode
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
         * Decodes a NewNodeResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.NewNodeResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.NewNodeResponseMessage} NewNodeResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NewNodeResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.NewNodeResponseMessage();
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

        return NewNodeResponseMessage;
    })();

    agent.ListNodesRequestMessage = (function() {

        /**
         * Properties of a ListNodesRequestMessage.
         * @memberof agent
         * @interface IListNodesRequestMessage
         * @property {boolean|null} [unlockedOnly] ListNodesRequestMessage unlockedOnly
         */

        /**
         * Constructs a new ListNodesRequestMessage.
         * @memberof agent
         * @classdesc Represents a ListNodesRequestMessage.
         * @implements IListNodesRequestMessage
         * @constructor
         * @param {agent.IListNodesRequestMessage=} [p] Properties to set
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
         * @memberof agent.ListNodesRequestMessage
         * @instance
         */
        ListNodesRequestMessage.prototype.unlockedOnly = false;

        /**
         * Creates a new ListNodesRequestMessage instance using the specified properties.
         * @function create
         * @memberof agent.ListNodesRequestMessage
         * @static
         * @param {agent.IListNodesRequestMessage=} [properties] Properties to set
         * @returns {agent.ListNodesRequestMessage} ListNodesRequestMessage instance
         */
        ListNodesRequestMessage.create = function create(properties) {
            return new ListNodesRequestMessage(properties);
        };

        /**
         * Encodes the specified ListNodesRequestMessage message. Does not implicitly {@link agent.ListNodesRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.ListNodesRequestMessage
         * @static
         * @param {agent.IListNodesRequestMessage} m ListNodesRequestMessage message or plain object to encode
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
         * Decodes a ListNodesRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.ListNodesRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.ListNodesRequestMessage} ListNodesRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListNodesRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.ListNodesRequestMessage();
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

        return ListNodesRequestMessage;
    })();

    agent.ListNodesResponseMessage = (function() {

        /**
         * Properties of a ListNodesResponseMessage.
         * @memberof agent
         * @interface IListNodesResponseMessage
         * @property {Array.<string>|null} [nodes] ListNodesResponseMessage nodes
         */

        /**
         * Constructs a new ListNodesResponseMessage.
         * @memberof agent
         * @classdesc Represents a ListNodesResponseMessage.
         * @implements IListNodesResponseMessage
         * @constructor
         * @param {agent.IListNodesResponseMessage=} [p] Properties to set
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
         * @memberof agent.ListNodesResponseMessage
         * @instance
         */
        ListNodesResponseMessage.prototype.nodes = $util.emptyArray;

        /**
         * Creates a new ListNodesResponseMessage instance using the specified properties.
         * @function create
         * @memberof agent.ListNodesResponseMessage
         * @static
         * @param {agent.IListNodesResponseMessage=} [properties] Properties to set
         * @returns {agent.ListNodesResponseMessage} ListNodesResponseMessage instance
         */
        ListNodesResponseMessage.create = function create(properties) {
            return new ListNodesResponseMessage(properties);
        };

        /**
         * Encodes the specified ListNodesResponseMessage message. Does not implicitly {@link agent.ListNodesResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.ListNodesResponseMessage
         * @static
         * @param {agent.IListNodesResponseMessage} m ListNodesResponseMessage message or plain object to encode
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
         * Decodes a ListNodesResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.ListNodesResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.ListNodesResponseMessage} ListNodesResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListNodesResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.ListNodesResponseMessage();
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

        return ListNodesResponseMessage;
    })();

    agent.SignFileRequestMessage = (function() {

        /**
         * Properties of a SignFileRequestMessage.
         * @memberof agent
         * @interface ISignFileRequestMessage
         * @property {string|null} [filePath] SignFileRequestMessage filePath
         * @property {string|null} [privateKeyPath] SignFileRequestMessage privateKeyPath
         * @property {string|null} [passphrase] SignFileRequestMessage passphrase
         */

        /**
         * Constructs a new SignFileRequestMessage.
         * @memberof agent
         * @classdesc Represents a SignFileRequestMessage.
         * @implements ISignFileRequestMessage
         * @constructor
         * @param {agent.ISignFileRequestMessage=} [p] Properties to set
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
         * @memberof agent.SignFileRequestMessage
         * @instance
         */
        SignFileRequestMessage.prototype.filePath = "";

        /**
         * SignFileRequestMessage privateKeyPath.
         * @member {string} privateKeyPath
         * @memberof agent.SignFileRequestMessage
         * @instance
         */
        SignFileRequestMessage.prototype.privateKeyPath = "";

        /**
         * SignFileRequestMessage passphrase.
         * @member {string} passphrase
         * @memberof agent.SignFileRequestMessage
         * @instance
         */
        SignFileRequestMessage.prototype.passphrase = "";

        /**
         * Creates a new SignFileRequestMessage instance using the specified properties.
         * @function create
         * @memberof agent.SignFileRequestMessage
         * @static
         * @param {agent.ISignFileRequestMessage=} [properties] Properties to set
         * @returns {agent.SignFileRequestMessage} SignFileRequestMessage instance
         */
        SignFileRequestMessage.create = function create(properties) {
            return new SignFileRequestMessage(properties);
        };

        /**
         * Encodes the specified SignFileRequestMessage message. Does not implicitly {@link agent.SignFileRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.SignFileRequestMessage
         * @static
         * @param {agent.ISignFileRequestMessage} m SignFileRequestMessage message or plain object to encode
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
         * Decodes a SignFileRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.SignFileRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.SignFileRequestMessage} SignFileRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SignFileRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.SignFileRequestMessage();
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

        return SignFileRequestMessage;
    })();

    agent.SignFileResponseMessage = (function() {

        /**
         * Properties of a SignFileResponseMessage.
         * @memberof agent
         * @interface ISignFileResponseMessage
         * @property {string|null} [signaturePath] SignFileResponseMessage signaturePath
         */

        /**
         * Constructs a new SignFileResponseMessage.
         * @memberof agent
         * @classdesc Represents a SignFileResponseMessage.
         * @implements ISignFileResponseMessage
         * @constructor
         * @param {agent.ISignFileResponseMessage=} [p] Properties to set
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
         * @memberof agent.SignFileResponseMessage
         * @instance
         */
        SignFileResponseMessage.prototype.signaturePath = "";

        /**
         * Creates a new SignFileResponseMessage instance using the specified properties.
         * @function create
         * @memberof agent.SignFileResponseMessage
         * @static
         * @param {agent.ISignFileResponseMessage=} [properties] Properties to set
         * @returns {agent.SignFileResponseMessage} SignFileResponseMessage instance
         */
        SignFileResponseMessage.create = function create(properties) {
            return new SignFileResponseMessage(properties);
        };

        /**
         * Encodes the specified SignFileResponseMessage message. Does not implicitly {@link agent.SignFileResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.SignFileResponseMessage
         * @static
         * @param {agent.ISignFileResponseMessage} m SignFileResponseMessage message or plain object to encode
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
         * Decodes a SignFileResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.SignFileResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.SignFileResponseMessage} SignFileResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SignFileResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.SignFileResponseMessage();
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

        return SignFileResponseMessage;
    })();

    agent.VerifyFileRequestMessage = (function() {

        /**
         * Properties of a VerifyFileRequestMessage.
         * @memberof agent
         * @interface IVerifyFileRequestMessage
         * @property {string|null} [filePath] VerifyFileRequestMessage filePath
         * @property {string|null} [signaturePath] VerifyFileRequestMessage signaturePath
         */

        /**
         * Constructs a new VerifyFileRequestMessage.
         * @memberof agent
         * @classdesc Represents a VerifyFileRequestMessage.
         * @implements IVerifyFileRequestMessage
         * @constructor
         * @param {agent.IVerifyFileRequestMessage=} [p] Properties to set
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
         * @memberof agent.VerifyFileRequestMessage
         * @instance
         */
        VerifyFileRequestMessage.prototype.filePath = "";

        /**
         * VerifyFileRequestMessage signaturePath.
         * @member {string} signaturePath
         * @memberof agent.VerifyFileRequestMessage
         * @instance
         */
        VerifyFileRequestMessage.prototype.signaturePath = "";

        /**
         * Creates a new VerifyFileRequestMessage instance using the specified properties.
         * @function create
         * @memberof agent.VerifyFileRequestMessage
         * @static
         * @param {agent.IVerifyFileRequestMessage=} [properties] Properties to set
         * @returns {agent.VerifyFileRequestMessage} VerifyFileRequestMessage instance
         */
        VerifyFileRequestMessage.create = function create(properties) {
            return new VerifyFileRequestMessage(properties);
        };

        /**
         * Encodes the specified VerifyFileRequestMessage message. Does not implicitly {@link agent.VerifyFileRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.VerifyFileRequestMessage
         * @static
         * @param {agent.IVerifyFileRequestMessage} m VerifyFileRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        VerifyFileRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.filePath != null && Object.hasOwnProperty.call(m, "filePath"))
                w.uint32(10).string(m.filePath);
            if (m.signaturePath != null && Object.hasOwnProperty.call(m, "signaturePath"))
                w.uint32(18).string(m.signaturePath);
            return w;
        };

        /**
         * Decodes a VerifyFileRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.VerifyFileRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.VerifyFileRequestMessage} VerifyFileRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        VerifyFileRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.VerifyFileRequestMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.filePath = r.string();
                    break;
                case 2:
                    m.signaturePath = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        return VerifyFileRequestMessage;
    })();

    agent.VerifyFileResponseMessage = (function() {

        /**
         * Properties of a VerifyFileResponseMessage.
         * @memberof agent
         * @interface IVerifyFileResponseMessage
         * @property {boolean|null} [verified] VerifyFileResponseMessage verified
         */

        /**
         * Constructs a new VerifyFileResponseMessage.
         * @memberof agent
         * @classdesc Represents a VerifyFileResponseMessage.
         * @implements IVerifyFileResponseMessage
         * @constructor
         * @param {agent.IVerifyFileResponseMessage=} [p] Properties to set
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
         * @memberof agent.VerifyFileResponseMessage
         * @instance
         */
        VerifyFileResponseMessage.prototype.verified = false;

        /**
         * Creates a new VerifyFileResponseMessage instance using the specified properties.
         * @function create
         * @memberof agent.VerifyFileResponseMessage
         * @static
         * @param {agent.IVerifyFileResponseMessage=} [properties] Properties to set
         * @returns {agent.VerifyFileResponseMessage} VerifyFileResponseMessage instance
         */
        VerifyFileResponseMessage.create = function create(properties) {
            return new VerifyFileResponseMessage(properties);
        };

        /**
         * Encodes the specified VerifyFileResponseMessage message. Does not implicitly {@link agent.VerifyFileResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.VerifyFileResponseMessage
         * @static
         * @param {agent.IVerifyFileResponseMessage} m VerifyFileResponseMessage message or plain object to encode
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
         * Decodes a VerifyFileResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.VerifyFileResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.VerifyFileResponseMessage} VerifyFileResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        VerifyFileResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.VerifyFileResponseMessage();
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

        return VerifyFileResponseMessage;
    })();

    agent.ListVaultsRequestMessage = (function() {

        /**
         * Properties of a ListVaultsRequestMessage.
         * @memberof agent
         * @interface IListVaultsRequestMessage
         */

        /**
         * Constructs a new ListVaultsRequestMessage.
         * @memberof agent
         * @classdesc Represents a ListVaultsRequestMessage.
         * @implements IListVaultsRequestMessage
         * @constructor
         * @param {agent.IListVaultsRequestMessage=} [p] Properties to set
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
         * @memberof agent.ListVaultsRequestMessage
         * @static
         * @param {agent.IListVaultsRequestMessage=} [properties] Properties to set
         * @returns {agent.ListVaultsRequestMessage} ListVaultsRequestMessage instance
         */
        ListVaultsRequestMessage.create = function create(properties) {
            return new ListVaultsRequestMessage(properties);
        };

        /**
         * Encodes the specified ListVaultsRequestMessage message. Does not implicitly {@link agent.ListVaultsRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.ListVaultsRequestMessage
         * @static
         * @param {agent.IListVaultsRequestMessage} m ListVaultsRequestMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListVaultsRequestMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            return w;
        };

        /**
         * Decodes a ListVaultsRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.ListVaultsRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.ListVaultsRequestMessage} ListVaultsRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListVaultsRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.ListVaultsRequestMessage();
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

        return ListVaultsRequestMessage;
    })();

    agent.ListVaultsResponseMessage = (function() {

        /**
         * Properties of a ListVaultsResponseMessage.
         * @memberof agent
         * @interface IListVaultsResponseMessage
         * @property {Array.<string>|null} [vaultNames] ListVaultsResponseMessage vaultNames
         */

        /**
         * Constructs a new ListVaultsResponseMessage.
         * @memberof agent
         * @classdesc Represents a ListVaultsResponseMessage.
         * @implements IListVaultsResponseMessage
         * @constructor
         * @param {agent.IListVaultsResponseMessage=} [p] Properties to set
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
         * @memberof agent.ListVaultsResponseMessage
         * @instance
         */
        ListVaultsResponseMessage.prototype.vaultNames = $util.emptyArray;

        /**
         * Creates a new ListVaultsResponseMessage instance using the specified properties.
         * @function create
         * @memberof agent.ListVaultsResponseMessage
         * @static
         * @param {agent.IListVaultsResponseMessage=} [properties] Properties to set
         * @returns {agent.ListVaultsResponseMessage} ListVaultsResponseMessage instance
         */
        ListVaultsResponseMessage.create = function create(properties) {
            return new ListVaultsResponseMessage(properties);
        };

        /**
         * Encodes the specified ListVaultsResponseMessage message. Does not implicitly {@link agent.ListVaultsResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.ListVaultsResponseMessage
         * @static
         * @param {agent.IListVaultsResponseMessage} m ListVaultsResponseMessage message or plain object to encode
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
         * Decodes a ListVaultsResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.ListVaultsResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.ListVaultsResponseMessage} ListVaultsResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListVaultsResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.ListVaultsResponseMessage();
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

        return ListVaultsResponseMessage;
    })();

    agent.NewVaultRequestMessage = (function() {

        /**
         * Properties of a NewVaultRequestMessage.
         * @memberof agent
         * @interface INewVaultRequestMessage
         * @property {string|null} [vaultName] NewVaultRequestMessage vaultName
         */

        /**
         * Constructs a new NewVaultRequestMessage.
         * @memberof agent
         * @classdesc Represents a NewVaultRequestMessage.
         * @implements INewVaultRequestMessage
         * @constructor
         * @param {agent.INewVaultRequestMessage=} [p] Properties to set
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
         * @memberof agent.NewVaultRequestMessage
         * @instance
         */
        NewVaultRequestMessage.prototype.vaultName = "";

        /**
         * Creates a new NewVaultRequestMessage instance using the specified properties.
         * @function create
         * @memberof agent.NewVaultRequestMessage
         * @static
         * @param {agent.INewVaultRequestMessage=} [properties] Properties to set
         * @returns {agent.NewVaultRequestMessage} NewVaultRequestMessage instance
         */
        NewVaultRequestMessage.create = function create(properties) {
            return new NewVaultRequestMessage(properties);
        };

        /**
         * Encodes the specified NewVaultRequestMessage message. Does not implicitly {@link agent.NewVaultRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.NewVaultRequestMessage
         * @static
         * @param {agent.INewVaultRequestMessage} m NewVaultRequestMessage message or plain object to encode
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
         * Decodes a NewVaultRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.NewVaultRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.NewVaultRequestMessage} NewVaultRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NewVaultRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.NewVaultRequestMessage();
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

        return NewVaultRequestMessage;
    })();

    agent.NewVaultResponseMessage = (function() {

        /**
         * Properties of a NewVaultResponseMessage.
         * @memberof agent
         * @interface INewVaultResponseMessage
         * @property {boolean|null} [successful] NewVaultResponseMessage successful
         */

        /**
         * Constructs a new NewVaultResponseMessage.
         * @memberof agent
         * @classdesc Represents a NewVaultResponseMessage.
         * @implements INewVaultResponseMessage
         * @constructor
         * @param {agent.INewVaultResponseMessage=} [p] Properties to set
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
         * @memberof agent.NewVaultResponseMessage
         * @instance
         */
        NewVaultResponseMessage.prototype.successful = false;

        /**
         * Creates a new NewVaultResponseMessage instance using the specified properties.
         * @function create
         * @memberof agent.NewVaultResponseMessage
         * @static
         * @param {agent.INewVaultResponseMessage=} [properties] Properties to set
         * @returns {agent.NewVaultResponseMessage} NewVaultResponseMessage instance
         */
        NewVaultResponseMessage.create = function create(properties) {
            return new NewVaultResponseMessage(properties);
        };

        /**
         * Encodes the specified NewVaultResponseMessage message. Does not implicitly {@link agent.NewVaultResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.NewVaultResponseMessage
         * @static
         * @param {agent.INewVaultResponseMessage} m NewVaultResponseMessage message or plain object to encode
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
         * Decodes a NewVaultResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.NewVaultResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.NewVaultResponseMessage} NewVaultResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NewVaultResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.NewVaultResponseMessage();
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

        return NewVaultResponseMessage;
    })();

    agent.DestroyVaultRequestMessage = (function() {

        /**
         * Properties of a DestroyVaultRequestMessage.
         * @memberof agent
         * @interface IDestroyVaultRequestMessage
         * @property {string|null} [vaultName] DestroyVaultRequestMessage vaultName
         */

        /**
         * Constructs a new DestroyVaultRequestMessage.
         * @memberof agent
         * @classdesc Represents a DestroyVaultRequestMessage.
         * @implements IDestroyVaultRequestMessage
         * @constructor
         * @param {agent.IDestroyVaultRequestMessage=} [p] Properties to set
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
         * @memberof agent.DestroyVaultRequestMessage
         * @instance
         */
        DestroyVaultRequestMessage.prototype.vaultName = "";

        /**
         * Creates a new DestroyVaultRequestMessage instance using the specified properties.
         * @function create
         * @memberof agent.DestroyVaultRequestMessage
         * @static
         * @param {agent.IDestroyVaultRequestMessage=} [properties] Properties to set
         * @returns {agent.DestroyVaultRequestMessage} DestroyVaultRequestMessage instance
         */
        DestroyVaultRequestMessage.create = function create(properties) {
            return new DestroyVaultRequestMessage(properties);
        };

        /**
         * Encodes the specified DestroyVaultRequestMessage message. Does not implicitly {@link agent.DestroyVaultRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.DestroyVaultRequestMessage
         * @static
         * @param {agent.IDestroyVaultRequestMessage} m DestroyVaultRequestMessage message or plain object to encode
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
         * Decodes a DestroyVaultRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.DestroyVaultRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.DestroyVaultRequestMessage} DestroyVaultRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DestroyVaultRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.DestroyVaultRequestMessage();
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

        return DestroyVaultRequestMessage;
    })();

    agent.DestroyVaultResponseMessage = (function() {

        /**
         * Properties of a DestroyVaultResponseMessage.
         * @memberof agent
         * @interface IDestroyVaultResponseMessage
         * @property {boolean|null} [successful] DestroyVaultResponseMessage successful
         */

        /**
         * Constructs a new DestroyVaultResponseMessage.
         * @memberof agent
         * @classdesc Represents a DestroyVaultResponseMessage.
         * @implements IDestroyVaultResponseMessage
         * @constructor
         * @param {agent.IDestroyVaultResponseMessage=} [p] Properties to set
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
         * @memberof agent.DestroyVaultResponseMessage
         * @instance
         */
        DestroyVaultResponseMessage.prototype.successful = false;

        /**
         * Creates a new DestroyVaultResponseMessage instance using the specified properties.
         * @function create
         * @memberof agent.DestroyVaultResponseMessage
         * @static
         * @param {agent.IDestroyVaultResponseMessage=} [properties] Properties to set
         * @returns {agent.DestroyVaultResponseMessage} DestroyVaultResponseMessage instance
         */
        DestroyVaultResponseMessage.create = function create(properties) {
            return new DestroyVaultResponseMessage(properties);
        };

        /**
         * Encodes the specified DestroyVaultResponseMessage message. Does not implicitly {@link agent.DestroyVaultResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.DestroyVaultResponseMessage
         * @static
         * @param {agent.IDestroyVaultResponseMessage} m DestroyVaultResponseMessage message or plain object to encode
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
         * Decodes a DestroyVaultResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.DestroyVaultResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.DestroyVaultResponseMessage} DestroyVaultResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DestroyVaultResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.DestroyVaultResponseMessage();
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

        return DestroyVaultResponseMessage;
    })();

    agent.ListSecretsRequestMessage = (function() {

        /**
         * Properties of a ListSecretsRequestMessage.
         * @memberof agent
         * @interface IListSecretsRequestMessage
         * @property {string|null} [vaultName] ListSecretsRequestMessage vaultName
         */

        /**
         * Constructs a new ListSecretsRequestMessage.
         * @memberof agent
         * @classdesc Represents a ListSecretsRequestMessage.
         * @implements IListSecretsRequestMessage
         * @constructor
         * @param {agent.IListSecretsRequestMessage=} [p] Properties to set
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
         * @memberof agent.ListSecretsRequestMessage
         * @instance
         */
        ListSecretsRequestMessage.prototype.vaultName = "";

        /**
         * Creates a new ListSecretsRequestMessage instance using the specified properties.
         * @function create
         * @memberof agent.ListSecretsRequestMessage
         * @static
         * @param {agent.IListSecretsRequestMessage=} [properties] Properties to set
         * @returns {agent.ListSecretsRequestMessage} ListSecretsRequestMessage instance
         */
        ListSecretsRequestMessage.create = function create(properties) {
            return new ListSecretsRequestMessage(properties);
        };

        /**
         * Encodes the specified ListSecretsRequestMessage message. Does not implicitly {@link agent.ListSecretsRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.ListSecretsRequestMessage
         * @static
         * @param {agent.IListSecretsRequestMessage} m ListSecretsRequestMessage message or plain object to encode
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
         * Decodes a ListSecretsRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.ListSecretsRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.ListSecretsRequestMessage} ListSecretsRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListSecretsRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.ListSecretsRequestMessage();
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

        return ListSecretsRequestMessage;
    })();

    agent.ListSecretsResponseMessage = (function() {

        /**
         * Properties of a ListSecretsResponseMessage.
         * @memberof agent
         * @interface IListSecretsResponseMessage
         * @property {Array.<string>|null} [secretNames] ListSecretsResponseMessage secretNames
         */

        /**
         * Constructs a new ListSecretsResponseMessage.
         * @memberof agent
         * @classdesc Represents a ListSecretsResponseMessage.
         * @implements IListSecretsResponseMessage
         * @constructor
         * @param {agent.IListSecretsResponseMessage=} [p] Properties to set
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
         * @memberof agent.ListSecretsResponseMessage
         * @instance
         */
        ListSecretsResponseMessage.prototype.secretNames = $util.emptyArray;

        /**
         * Creates a new ListSecretsResponseMessage instance using the specified properties.
         * @function create
         * @memberof agent.ListSecretsResponseMessage
         * @static
         * @param {agent.IListSecretsResponseMessage=} [properties] Properties to set
         * @returns {agent.ListSecretsResponseMessage} ListSecretsResponseMessage instance
         */
        ListSecretsResponseMessage.create = function create(properties) {
            return new ListSecretsResponseMessage(properties);
        };

        /**
         * Encodes the specified ListSecretsResponseMessage message. Does not implicitly {@link agent.ListSecretsResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.ListSecretsResponseMessage
         * @static
         * @param {agent.IListSecretsResponseMessage} m ListSecretsResponseMessage message or plain object to encode
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
         * Decodes a ListSecretsResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.ListSecretsResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.ListSecretsResponseMessage} ListSecretsResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListSecretsResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.ListSecretsResponseMessage();
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

        return ListSecretsResponseMessage;
    })();

    agent.CreateSecretRequestMessage = (function() {

        /**
         * Properties of a CreateSecretRequestMessage.
         * @memberof agent
         * @interface ICreateSecretRequestMessage
         * @property {string|null} [vaultName] CreateSecretRequestMessage vaultName
         * @property {string|null} [secretName] CreateSecretRequestMessage secretName
         * @property {string|null} [secretPath] CreateSecretRequestMessage secretPath
         * @property {Uint8Array|null} [secretContent] CreateSecretRequestMessage secretContent
         */

        /**
         * Constructs a new CreateSecretRequestMessage.
         * @memberof agent
         * @classdesc Represents a CreateSecretRequestMessage.
         * @implements ICreateSecretRequestMessage
         * @constructor
         * @param {agent.ICreateSecretRequestMessage=} [p] Properties to set
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
         * @memberof agent.CreateSecretRequestMessage
         * @instance
         */
        CreateSecretRequestMessage.prototype.vaultName = "";

        /**
         * CreateSecretRequestMessage secretName.
         * @member {string} secretName
         * @memberof agent.CreateSecretRequestMessage
         * @instance
         */
        CreateSecretRequestMessage.prototype.secretName = "";

        /**
         * CreateSecretRequestMessage secretPath.
         * @member {string} secretPath
         * @memberof agent.CreateSecretRequestMessage
         * @instance
         */
        CreateSecretRequestMessage.prototype.secretPath = "";

        /**
         * CreateSecretRequestMessage secretContent.
         * @member {Uint8Array} secretContent
         * @memberof agent.CreateSecretRequestMessage
         * @instance
         */
        CreateSecretRequestMessage.prototype.secretContent = $util.newBuffer([]);

        /**
         * Creates a new CreateSecretRequestMessage instance using the specified properties.
         * @function create
         * @memberof agent.CreateSecretRequestMessage
         * @static
         * @param {agent.ICreateSecretRequestMessage=} [properties] Properties to set
         * @returns {agent.CreateSecretRequestMessage} CreateSecretRequestMessage instance
         */
        CreateSecretRequestMessage.create = function create(properties) {
            return new CreateSecretRequestMessage(properties);
        };

        /**
         * Encodes the specified CreateSecretRequestMessage message. Does not implicitly {@link agent.CreateSecretRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.CreateSecretRequestMessage
         * @static
         * @param {agent.ICreateSecretRequestMessage} m CreateSecretRequestMessage message or plain object to encode
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
         * Decodes a CreateSecretRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.CreateSecretRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.CreateSecretRequestMessage} CreateSecretRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CreateSecretRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.CreateSecretRequestMessage();
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

        return CreateSecretRequestMessage;
    })();

    agent.CreateSecretResponseMessage = (function() {

        /**
         * Properties of a CreateSecretResponseMessage.
         * @memberof agent
         * @interface ICreateSecretResponseMessage
         * @property {boolean|null} [successful] CreateSecretResponseMessage successful
         */

        /**
         * Constructs a new CreateSecretResponseMessage.
         * @memberof agent
         * @classdesc Represents a CreateSecretResponseMessage.
         * @implements ICreateSecretResponseMessage
         * @constructor
         * @param {agent.ICreateSecretResponseMessage=} [p] Properties to set
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
         * @memberof agent.CreateSecretResponseMessage
         * @instance
         */
        CreateSecretResponseMessage.prototype.successful = false;

        /**
         * Creates a new CreateSecretResponseMessage instance using the specified properties.
         * @function create
         * @memberof agent.CreateSecretResponseMessage
         * @static
         * @param {agent.ICreateSecretResponseMessage=} [properties] Properties to set
         * @returns {agent.CreateSecretResponseMessage} CreateSecretResponseMessage instance
         */
        CreateSecretResponseMessage.create = function create(properties) {
            return new CreateSecretResponseMessage(properties);
        };

        /**
         * Encodes the specified CreateSecretResponseMessage message. Does not implicitly {@link agent.CreateSecretResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.CreateSecretResponseMessage
         * @static
         * @param {agent.ICreateSecretResponseMessage} m CreateSecretResponseMessage message or plain object to encode
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
         * Decodes a CreateSecretResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.CreateSecretResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.CreateSecretResponseMessage} CreateSecretResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CreateSecretResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.CreateSecretResponseMessage();
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

        return CreateSecretResponseMessage;
    })();

    agent.DestroySecretRequestMessage = (function() {

        /**
         * Properties of a DestroySecretRequestMessage.
         * @memberof agent
         * @interface IDestroySecretRequestMessage
         * @property {string|null} [vaultName] DestroySecretRequestMessage vaultName
         * @property {string|null} [secretName] DestroySecretRequestMessage secretName
         */

        /**
         * Constructs a new DestroySecretRequestMessage.
         * @memberof agent
         * @classdesc Represents a DestroySecretRequestMessage.
         * @implements IDestroySecretRequestMessage
         * @constructor
         * @param {agent.IDestroySecretRequestMessage=} [p] Properties to set
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
         * @memberof agent.DestroySecretRequestMessage
         * @instance
         */
        DestroySecretRequestMessage.prototype.vaultName = "";

        /**
         * DestroySecretRequestMessage secretName.
         * @member {string} secretName
         * @memberof agent.DestroySecretRequestMessage
         * @instance
         */
        DestroySecretRequestMessage.prototype.secretName = "";

        /**
         * Creates a new DestroySecretRequestMessage instance using the specified properties.
         * @function create
         * @memberof agent.DestroySecretRequestMessage
         * @static
         * @param {agent.IDestroySecretRequestMessage=} [properties] Properties to set
         * @returns {agent.DestroySecretRequestMessage} DestroySecretRequestMessage instance
         */
        DestroySecretRequestMessage.create = function create(properties) {
            return new DestroySecretRequestMessage(properties);
        };

        /**
         * Encodes the specified DestroySecretRequestMessage message. Does not implicitly {@link agent.DestroySecretRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.DestroySecretRequestMessage
         * @static
         * @param {agent.IDestroySecretRequestMessage} m DestroySecretRequestMessage message or plain object to encode
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
         * Decodes a DestroySecretRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.DestroySecretRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.DestroySecretRequestMessage} DestroySecretRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DestroySecretRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.DestroySecretRequestMessage();
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

        return DestroySecretRequestMessage;
    })();

    agent.DestroySecretResponseMessage = (function() {

        /**
         * Properties of a DestroySecretResponseMessage.
         * @memberof agent
         * @interface IDestroySecretResponseMessage
         * @property {boolean|null} [successful] DestroySecretResponseMessage successful
         */

        /**
         * Constructs a new DestroySecretResponseMessage.
         * @memberof agent
         * @classdesc Represents a DestroySecretResponseMessage.
         * @implements IDestroySecretResponseMessage
         * @constructor
         * @param {agent.IDestroySecretResponseMessage=} [p] Properties to set
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
         * @memberof agent.DestroySecretResponseMessage
         * @instance
         */
        DestroySecretResponseMessage.prototype.successful = false;

        /**
         * Creates a new DestroySecretResponseMessage instance using the specified properties.
         * @function create
         * @memberof agent.DestroySecretResponseMessage
         * @static
         * @param {agent.IDestroySecretResponseMessage=} [properties] Properties to set
         * @returns {agent.DestroySecretResponseMessage} DestroySecretResponseMessage instance
         */
        DestroySecretResponseMessage.create = function create(properties) {
            return new DestroySecretResponseMessage(properties);
        };

        /**
         * Encodes the specified DestroySecretResponseMessage message. Does not implicitly {@link agent.DestroySecretResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.DestroySecretResponseMessage
         * @static
         * @param {agent.IDestroySecretResponseMessage} m DestroySecretResponseMessage message or plain object to encode
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
         * Decodes a DestroySecretResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.DestroySecretResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.DestroySecretResponseMessage} DestroySecretResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DestroySecretResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.DestroySecretResponseMessage();
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

        return DestroySecretResponseMessage;
    })();

    agent.GetSecretRequestMessage = (function() {

        /**
         * Properties of a GetSecretRequestMessage.
         * @memberof agent
         * @interface IGetSecretRequestMessage
         * @property {string|null} [vaultName] GetSecretRequestMessage vaultName
         * @property {string|null} [secretName] GetSecretRequestMessage secretName
         */

        /**
         * Constructs a new GetSecretRequestMessage.
         * @memberof agent
         * @classdesc Represents a GetSecretRequestMessage.
         * @implements IGetSecretRequestMessage
         * @constructor
         * @param {agent.IGetSecretRequestMessage=} [p] Properties to set
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
         * @memberof agent.GetSecretRequestMessage
         * @instance
         */
        GetSecretRequestMessage.prototype.vaultName = "";

        /**
         * GetSecretRequestMessage secretName.
         * @member {string} secretName
         * @memberof agent.GetSecretRequestMessage
         * @instance
         */
        GetSecretRequestMessage.prototype.secretName = "";

        /**
         * Creates a new GetSecretRequestMessage instance using the specified properties.
         * @function create
         * @memberof agent.GetSecretRequestMessage
         * @static
         * @param {agent.IGetSecretRequestMessage=} [properties] Properties to set
         * @returns {agent.GetSecretRequestMessage} GetSecretRequestMessage instance
         */
        GetSecretRequestMessage.create = function create(properties) {
            return new GetSecretRequestMessage(properties);
        };

        /**
         * Encodes the specified GetSecretRequestMessage message. Does not implicitly {@link agent.GetSecretRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.GetSecretRequestMessage
         * @static
         * @param {agent.IGetSecretRequestMessage} m GetSecretRequestMessage message or plain object to encode
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
         * Decodes a GetSecretRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.GetSecretRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.GetSecretRequestMessage} GetSecretRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetSecretRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.GetSecretRequestMessage();
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

        return GetSecretRequestMessage;
    })();

    agent.GetSecretResponseMessage = (function() {

        /**
         * Properties of a GetSecretResponseMessage.
         * @memberof agent
         * @interface IGetSecretResponseMessage
         * @property {Uint8Array|null} [secret] GetSecretResponseMessage secret
         */

        /**
         * Constructs a new GetSecretResponseMessage.
         * @memberof agent
         * @classdesc Represents a GetSecretResponseMessage.
         * @implements IGetSecretResponseMessage
         * @constructor
         * @param {agent.IGetSecretResponseMessage=} [p] Properties to set
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
         * @memberof agent.GetSecretResponseMessage
         * @instance
         */
        GetSecretResponseMessage.prototype.secret = $util.newBuffer([]);

        /**
         * Creates a new GetSecretResponseMessage instance using the specified properties.
         * @function create
         * @memberof agent.GetSecretResponseMessage
         * @static
         * @param {agent.IGetSecretResponseMessage=} [properties] Properties to set
         * @returns {agent.GetSecretResponseMessage} GetSecretResponseMessage instance
         */
        GetSecretResponseMessage.create = function create(properties) {
            return new GetSecretResponseMessage(properties);
        };

        /**
         * Encodes the specified GetSecretResponseMessage message. Does not implicitly {@link agent.GetSecretResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.GetSecretResponseMessage
         * @static
         * @param {agent.IGetSecretResponseMessage} m GetSecretResponseMessage message or plain object to encode
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
         * Decodes a GetSecretResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.GetSecretResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.GetSecretResponseMessage} GetSecretResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetSecretResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.GetSecretResponseMessage();
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

        return GetSecretResponseMessage;
    })();

    agent.DeriveKeyRequestMessage = (function() {

        /**
         * Properties of a DeriveKeyRequestMessage.
         * @memberof agent
         * @interface IDeriveKeyRequestMessage
         * @property {string|null} [vaultName] DeriveKeyRequestMessage vaultName
         * @property {string|null} [keyName] DeriveKeyRequestMessage keyName
         * @property {string|null} [passphrase] DeriveKeyRequestMessage passphrase
         */

        /**
         * Constructs a new DeriveKeyRequestMessage.
         * @memberof agent
         * @classdesc Represents a DeriveKeyRequestMessage.
         * @implements IDeriveKeyRequestMessage
         * @constructor
         * @param {agent.IDeriveKeyRequestMessage=} [p] Properties to set
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
         * @memberof agent.DeriveKeyRequestMessage
         * @instance
         */
        DeriveKeyRequestMessage.prototype.vaultName = "";

        /**
         * DeriveKeyRequestMessage keyName.
         * @member {string} keyName
         * @memberof agent.DeriveKeyRequestMessage
         * @instance
         */
        DeriveKeyRequestMessage.prototype.keyName = "";

        /**
         * DeriveKeyRequestMessage passphrase.
         * @member {string} passphrase
         * @memberof agent.DeriveKeyRequestMessage
         * @instance
         */
        DeriveKeyRequestMessage.prototype.passphrase = "";

        /**
         * Creates a new DeriveKeyRequestMessage instance using the specified properties.
         * @function create
         * @memberof agent.DeriveKeyRequestMessage
         * @static
         * @param {agent.IDeriveKeyRequestMessage=} [properties] Properties to set
         * @returns {agent.DeriveKeyRequestMessage} DeriveKeyRequestMessage instance
         */
        DeriveKeyRequestMessage.create = function create(properties) {
            return new DeriveKeyRequestMessage(properties);
        };

        /**
         * Encodes the specified DeriveKeyRequestMessage message. Does not implicitly {@link agent.DeriveKeyRequestMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.DeriveKeyRequestMessage
         * @static
         * @param {agent.IDeriveKeyRequestMessage} m DeriveKeyRequestMessage message or plain object to encode
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
         * Decodes a DeriveKeyRequestMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.DeriveKeyRequestMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.DeriveKeyRequestMessage} DeriveKeyRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeriveKeyRequestMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.DeriveKeyRequestMessage();
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

        return DeriveKeyRequestMessage;
    })();

    agent.DeriveKeyResponseMessage = (function() {

        /**
         * Properties of a DeriveKeyResponseMessage.
         * @memberof agent
         * @interface IDeriveKeyResponseMessage
         * @property {boolean|null} [successful] DeriveKeyResponseMessage successful
         */

        /**
         * Constructs a new DeriveKeyResponseMessage.
         * @memberof agent
         * @classdesc Represents a DeriveKeyResponseMessage.
         * @implements IDeriveKeyResponseMessage
         * @constructor
         * @param {agent.IDeriveKeyResponseMessage=} [p] Properties to set
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
         * @memberof agent.DeriveKeyResponseMessage
         * @instance
         */
        DeriveKeyResponseMessage.prototype.successful = false;

        /**
         * Creates a new DeriveKeyResponseMessage instance using the specified properties.
         * @function create
         * @memberof agent.DeriveKeyResponseMessage
         * @static
         * @param {agent.IDeriveKeyResponseMessage=} [properties] Properties to set
         * @returns {agent.DeriveKeyResponseMessage} DeriveKeyResponseMessage instance
         */
        DeriveKeyResponseMessage.create = function create(properties) {
            return new DeriveKeyResponseMessage(properties);
        };

        /**
         * Encodes the specified DeriveKeyResponseMessage message. Does not implicitly {@link agent.DeriveKeyResponseMessage.verify|verify} messages.
         * @function encode
         * @memberof agent.DeriveKeyResponseMessage
         * @static
         * @param {agent.IDeriveKeyResponseMessage} m DeriveKeyResponseMessage message or plain object to encode
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
         * Decodes a DeriveKeyResponseMessage message from the specified reader or buffer.
         * @function decode
         * @memberof agent.DeriveKeyResponseMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {agent.DeriveKeyResponseMessage} DeriveKeyResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeriveKeyResponseMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.agent.DeriveKeyResponseMessage();
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

        return DeriveKeyResponseMessage;
    })();

    return agent;
})();

module.exports = $root;


/***/ }),
/* 7 */
/***/ (function(module, exports) {

module.exports = require("protobufjs/minimal");

/***/ })
/******/ ]);
});
//# sourceMappingURL=browser-client.js.map