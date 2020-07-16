/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.git = (function() {

    /**
     * Namespace git.
     * @exports git
     * @namespace
     */
    var git = {};

    git.GitServer = (function() {

        /**
         * Constructs a new GitServer service.
         * @memberof git
         * @classdesc Represents a GitServer
         * @extends $protobuf.rpc.Service
         * @constructor
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         */
        function GitServer(rpcImpl, requestDelimited, responseDelimited) {
            $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
        }

        (GitServer.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = GitServer;

        /**
         * Creates new GitServer service using the specified rpc implementation.
         * @function create
         * @memberof git.GitServer
         * @static
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         * @returns {GitServer} RPC service. Useful where requests and/or responses are streamed.
         */
        GitServer.create = function create(rpcImpl, requestDelimited, responseDelimited) {
            return new this(rpcImpl, requestDelimited, responseDelimited);
        };

        /**
         * Callback as used by {@link git.GitServer#requestInfo}.
         * @memberof git.GitServer
         * @typedef RequestInfoCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {git.InfoReply} [response] InfoReply
         */

        /**
         * Calls RequestInfo.
         * @function requestInfo
         * @memberof git.GitServer
         * @instance
         * @param {git.IInfoRequest} request InfoRequest message or plain object
         * @param {git.GitServer.RequestInfoCallback} callback Node-style callback called with the error, if any, and InfoReply
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(GitServer.prototype.requestInfo = function requestInfo(request, callback) {
            return this.rpcCall(requestInfo, $root.git.InfoRequest, $root.git.InfoReply, request, callback);
        }, "name", { value: "RequestInfo" });

        /**
         * Calls RequestInfo.
         * @function requestInfo
         * @memberof git.GitServer
         * @instance
         * @param {git.IInfoRequest} request InfoRequest message or plain object
         * @returns {Promise<git.InfoReply>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link git.GitServer#requestPack}.
         * @memberof git.GitServer
         * @typedef RequestPackCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {git.PackReply} [response] PackReply
         */

        /**
         * Calls RequestPack.
         * @function requestPack
         * @memberof git.GitServer
         * @instance
         * @param {git.IPackRequest} request PackRequest message or plain object
         * @param {git.GitServer.RequestPackCallback} callback Node-style callback called with the error, if any, and PackReply
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(GitServer.prototype.requestPack = function requestPack(request, callback) {
            return this.rpcCall(requestPack, $root.git.PackRequest, $root.git.PackReply, request, callback);
        }, "name", { value: "RequestPack" });

        /**
         * Calls RequestPack.
         * @function requestPack
         * @memberof git.GitServer
         * @instance
         * @param {git.IPackRequest} request PackRequest message or plain object
         * @returns {Promise<git.PackReply>} Promise
         * @variation 2
         */

        return GitServer;
    })();

    git.InfoRequest = (function() {

        /**
         * Properties of an InfoRequest.
         * @memberof git
         * @interface IInfoRequest
         * @property {string|null} [vaultName] InfoRequest vaultName
         */

        /**
         * Constructs a new InfoRequest.
         * @memberof git
         * @classdesc Represents an InfoRequest.
         * @implements IInfoRequest
         * @constructor
         * @param {git.IInfoRequest=} [p] Properties to set
         */
        function InfoRequest(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * InfoRequest vaultName.
         * @member {string} vaultName
         * @memberof git.InfoRequest
         * @instance
         */
        InfoRequest.prototype.vaultName = "";

        /**
         * Creates a new InfoRequest instance using the specified properties.
         * @function create
         * @memberof git.InfoRequest
         * @static
         * @param {git.IInfoRequest=} [properties] Properties to set
         * @returns {git.InfoRequest} InfoRequest instance
         */
        InfoRequest.create = function create(properties) {
            return new InfoRequest(properties);
        };

        /**
         * Encodes the specified InfoRequest message. Does not implicitly {@link git.InfoRequest.verify|verify} messages.
         * @function encode
         * @memberof git.InfoRequest
         * @static
         * @param {git.IInfoRequest} m InfoRequest message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        InfoRequest.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultName != null && Object.hasOwnProperty.call(m, "vaultName"))
                w.uint32(10).string(m.vaultName);
            return w;
        };

        /**
         * Decodes an InfoRequest message from the specified reader or buffer.
         * @function decode
         * @memberof git.InfoRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {git.InfoRequest} InfoRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        InfoRequest.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.git.InfoRequest();
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

        return InfoRequest;
    })();

    git.InfoReply = (function() {

        /**
         * Properties of an InfoReply.
         * @memberof git
         * @interface IInfoReply
         * @property {string|null} [vaultName] InfoReply vaultName
         * @property {Uint8Array|null} [body] InfoReply body
         */

        /**
         * Constructs a new InfoReply.
         * @memberof git
         * @classdesc Represents an InfoReply.
         * @implements IInfoReply
         * @constructor
         * @param {git.IInfoReply=} [p] Properties to set
         */
        function InfoReply(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * InfoReply vaultName.
         * @member {string} vaultName
         * @memberof git.InfoReply
         * @instance
         */
        InfoReply.prototype.vaultName = "";

        /**
         * InfoReply body.
         * @member {Uint8Array} body
         * @memberof git.InfoReply
         * @instance
         */
        InfoReply.prototype.body = $util.newBuffer([]);

        /**
         * Creates a new InfoReply instance using the specified properties.
         * @function create
         * @memberof git.InfoReply
         * @static
         * @param {git.IInfoReply=} [properties] Properties to set
         * @returns {git.InfoReply} InfoReply instance
         */
        InfoReply.create = function create(properties) {
            return new InfoReply(properties);
        };

        /**
         * Encodes the specified InfoReply message. Does not implicitly {@link git.InfoReply.verify|verify} messages.
         * @function encode
         * @memberof git.InfoReply
         * @static
         * @param {git.IInfoReply} m InfoReply message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        InfoReply.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultName != null && Object.hasOwnProperty.call(m, "vaultName"))
                w.uint32(10).string(m.vaultName);
            if (m.body != null && Object.hasOwnProperty.call(m, "body"))
                w.uint32(18).bytes(m.body);
            return w;
        };

        /**
         * Decodes an InfoReply message from the specified reader or buffer.
         * @function decode
         * @memberof git.InfoReply
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {git.InfoReply} InfoReply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        InfoReply.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.git.InfoReply();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.vaultName = r.string();
                    break;
                case 2:
                    m.body = r.bytes();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        return InfoReply;
    })();

    git.PackRequest = (function() {

        /**
         * Properties of a PackRequest.
         * @memberof git
         * @interface IPackRequest
         * @property {string|null} [vaultName] PackRequest vaultName
         * @property {Uint8Array|null} [body] PackRequest body
         */

        /**
         * Constructs a new PackRequest.
         * @memberof git
         * @classdesc Represents a PackRequest.
         * @implements IPackRequest
         * @constructor
         * @param {git.IPackRequest=} [p] Properties to set
         */
        function PackRequest(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PackRequest vaultName.
         * @member {string} vaultName
         * @memberof git.PackRequest
         * @instance
         */
        PackRequest.prototype.vaultName = "";

        /**
         * PackRequest body.
         * @member {Uint8Array} body
         * @memberof git.PackRequest
         * @instance
         */
        PackRequest.prototype.body = $util.newBuffer([]);

        /**
         * Creates a new PackRequest instance using the specified properties.
         * @function create
         * @memberof git.PackRequest
         * @static
         * @param {git.IPackRequest=} [properties] Properties to set
         * @returns {git.PackRequest} PackRequest instance
         */
        PackRequest.create = function create(properties) {
            return new PackRequest(properties);
        };

        /**
         * Encodes the specified PackRequest message. Does not implicitly {@link git.PackRequest.verify|verify} messages.
         * @function encode
         * @memberof git.PackRequest
         * @static
         * @param {git.IPackRequest} m PackRequest message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PackRequest.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultName != null && Object.hasOwnProperty.call(m, "vaultName"))
                w.uint32(10).string(m.vaultName);
            if (m.body != null && Object.hasOwnProperty.call(m, "body"))
                w.uint32(18).bytes(m.body);
            return w;
        };

        /**
         * Decodes a PackRequest message from the specified reader or buffer.
         * @function decode
         * @memberof git.PackRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {git.PackRequest} PackRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PackRequest.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.git.PackRequest();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.vaultName = r.string();
                    break;
                case 2:
                    m.body = r.bytes();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        return PackRequest;
    })();

    git.PackReply = (function() {

        /**
         * Properties of a PackReply.
         * @memberof git
         * @interface IPackReply
         * @property {string|null} [vaultName] PackReply vaultName
         * @property {Uint8Array|null} [body] PackReply body
         */

        /**
         * Constructs a new PackReply.
         * @memberof git
         * @classdesc Represents a PackReply.
         * @implements IPackReply
         * @constructor
         * @param {git.IPackReply=} [p] Properties to set
         */
        function PackReply(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PackReply vaultName.
         * @member {string} vaultName
         * @memberof git.PackReply
         * @instance
         */
        PackReply.prototype.vaultName = "";

        /**
         * PackReply body.
         * @member {Uint8Array} body
         * @memberof git.PackReply
         * @instance
         */
        PackReply.prototype.body = $util.newBuffer([]);

        /**
         * Creates a new PackReply instance using the specified properties.
         * @function create
         * @memberof git.PackReply
         * @static
         * @param {git.IPackReply=} [properties] Properties to set
         * @returns {git.PackReply} PackReply instance
         */
        PackReply.create = function create(properties) {
            return new PackReply(properties);
        };

        /**
         * Encodes the specified PackReply message. Does not implicitly {@link git.PackReply.verify|verify} messages.
         * @function encode
         * @memberof git.PackReply
         * @static
         * @param {git.IPackReply} m PackReply message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PackReply.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultName != null && Object.hasOwnProperty.call(m, "vaultName"))
                w.uint32(10).string(m.vaultName);
            if (m.body != null && Object.hasOwnProperty.call(m, "body"))
                w.uint32(18).bytes(m.body);
            return w;
        };

        /**
         * Decodes a PackReply message from the specified reader or buffer.
         * @function decode
         * @memberof git.PackReply
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {git.PackReply} PackReply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PackReply.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.git.PackReply();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.vaultName = r.string();
                    break;
                case 2:
                    m.body = r.bytes();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        return PackReply;
    })();

    return git;
})();

module.exports = $root;
