/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.gitInterface = (function() {

    /**
     * Namespace gitInterface.
     * @exports gitInterface
     * @namespace
     */
    var gitInterface = {};

    /**
     * GitMessageType enum.
     * @name gitInterface.GitMessageType
     * @enum {number}
     * @property {number} INFO=0 INFO value
     * @property {number} PACK=1 PACK value
     * @property {number} VAULT_NAMES=2 VAULT_NAMES value
     */
    gitInterface.GitMessageType = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "INFO"] = 0;
        values[valuesById[1] = "PACK"] = 1;
        values[valuesById[2] = "VAULT_NAMES"] = 2;
        return values;
    })();

    gitInterface.GitMessage = (function() {

        /**
         * Properties of a GitMessage.
         * @memberof gitInterface
         * @interface IGitMessage
         * @property {gitInterface.GitMessageType|null} [type] GitMessage type
         * @property {Uint8Array|null} [subMessage] GitMessage subMessage
         */

        /**
         * Constructs a new GitMessage.
         * @memberof gitInterface
         * @classdesc Represents a GitMessage.
         * @implements IGitMessage
         * @constructor
         * @param {gitInterface.IGitMessage=} [p] Properties to set
         */
        function GitMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * GitMessage type.
         * @member {gitInterface.GitMessageType} type
         * @memberof gitInterface.GitMessage
         * @instance
         */
        GitMessage.prototype.type = 0;

        /**
         * GitMessage subMessage.
         * @member {Uint8Array} subMessage
         * @memberof gitInterface.GitMessage
         * @instance
         */
        GitMessage.prototype.subMessage = $util.newBuffer([]);

        /**
         * Creates a new GitMessage instance using the specified properties.
         * @function create
         * @memberof gitInterface.GitMessage
         * @static
         * @param {gitInterface.IGitMessage=} [properties] Properties to set
         * @returns {gitInterface.GitMessage} GitMessage instance
         */
        GitMessage.create = function create(properties) {
            return new GitMessage(properties);
        };

        /**
         * Encodes the specified GitMessage message. Does not implicitly {@link gitInterface.GitMessage.verify|verify} messages.
         * @function encode
         * @memberof gitInterface.GitMessage
         * @static
         * @param {gitInterface.IGitMessage} m GitMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GitMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.type != null && Object.hasOwnProperty.call(m, "type"))
                w.uint32(0).int32(m.type);
            if (m.subMessage != null && Object.hasOwnProperty.call(m, "subMessage"))
                w.uint32(10).bytes(m.subMessage);
            return w;
        };

        /**
         * Encodes the specified GitMessage message, length delimited. Does not implicitly {@link gitInterface.GitMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof gitInterface.GitMessage
         * @static
         * @param {gitInterface.IGitMessage} message GitMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GitMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GitMessage message from the specified reader or buffer.
         * @function decode
         * @memberof gitInterface.GitMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {gitInterface.GitMessage} GitMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GitMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.gitInterface.GitMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 0:
                    m.type = r.int32();
                    break;
                case 1:
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
         * Decodes a GitMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof gitInterface.GitMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {gitInterface.GitMessage} GitMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GitMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return GitMessage;
    })();

    gitInterface.InfoRequest = (function() {

        /**
         * Properties of an InfoRequest.
         * @memberof gitInterface
         * @interface IInfoRequest
         * @property {string|null} [vaultName] InfoRequest vaultName
         */

        /**
         * Constructs a new InfoRequest.
         * @memberof gitInterface
         * @classdesc Represents an InfoRequest.
         * @implements IInfoRequest
         * @constructor
         * @param {gitInterface.IInfoRequest=} [p] Properties to set
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
         * @memberof gitInterface.InfoRequest
         * @instance
         */
        InfoRequest.prototype.vaultName = "";

        /**
         * Creates a new InfoRequest instance using the specified properties.
         * @function create
         * @memberof gitInterface.InfoRequest
         * @static
         * @param {gitInterface.IInfoRequest=} [properties] Properties to set
         * @returns {gitInterface.InfoRequest} InfoRequest instance
         */
        InfoRequest.create = function create(properties) {
            return new InfoRequest(properties);
        };

        /**
         * Encodes the specified InfoRequest message. Does not implicitly {@link gitInterface.InfoRequest.verify|verify} messages.
         * @function encode
         * @memberof gitInterface.InfoRequest
         * @static
         * @param {gitInterface.IInfoRequest} m InfoRequest message or plain object to encode
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
         * Encodes the specified InfoRequest message, length delimited. Does not implicitly {@link gitInterface.InfoRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof gitInterface.InfoRequest
         * @static
         * @param {gitInterface.IInfoRequest} message InfoRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        InfoRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an InfoRequest message from the specified reader or buffer.
         * @function decode
         * @memberof gitInterface.InfoRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {gitInterface.InfoRequest} InfoRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        InfoRequest.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.gitInterface.InfoRequest();
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
         * Decodes an InfoRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof gitInterface.InfoRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {gitInterface.InfoRequest} InfoRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        InfoRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return InfoRequest;
    })();

    gitInterface.InfoReply = (function() {

        /**
         * Properties of an InfoReply.
         * @memberof gitInterface
         * @interface IInfoReply
         * @property {string|null} [vaultName] InfoReply vaultName
         * @property {Uint8Array|null} [body] InfoReply body
         */

        /**
         * Constructs a new InfoReply.
         * @memberof gitInterface
         * @classdesc Represents an InfoReply.
         * @implements IInfoReply
         * @constructor
         * @param {gitInterface.IInfoReply=} [p] Properties to set
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
         * @memberof gitInterface.InfoReply
         * @instance
         */
        InfoReply.prototype.vaultName = "";

        /**
         * InfoReply body.
         * @member {Uint8Array} body
         * @memberof gitInterface.InfoReply
         * @instance
         */
        InfoReply.prototype.body = $util.newBuffer([]);

        /**
         * Creates a new InfoReply instance using the specified properties.
         * @function create
         * @memberof gitInterface.InfoReply
         * @static
         * @param {gitInterface.IInfoReply=} [properties] Properties to set
         * @returns {gitInterface.InfoReply} InfoReply instance
         */
        InfoReply.create = function create(properties) {
            return new InfoReply(properties);
        };

        /**
         * Encodes the specified InfoReply message. Does not implicitly {@link gitInterface.InfoReply.verify|verify} messages.
         * @function encode
         * @memberof gitInterface.InfoReply
         * @static
         * @param {gitInterface.IInfoReply} m InfoReply message or plain object to encode
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
         * Encodes the specified InfoReply message, length delimited. Does not implicitly {@link gitInterface.InfoReply.verify|verify} messages.
         * @function encodeDelimited
         * @memberof gitInterface.InfoReply
         * @static
         * @param {gitInterface.IInfoReply} message InfoReply message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        InfoReply.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an InfoReply message from the specified reader or buffer.
         * @function decode
         * @memberof gitInterface.InfoReply
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {gitInterface.InfoReply} InfoReply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        InfoReply.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.gitInterface.InfoReply();
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

        /**
         * Decodes an InfoReply message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof gitInterface.InfoReply
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {gitInterface.InfoReply} InfoReply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        InfoReply.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return InfoReply;
    })();

    gitInterface.PackRequest = (function() {

        /**
         * Properties of a PackRequest.
         * @memberof gitInterface
         * @interface IPackRequest
         * @property {string|null} [vaultName] PackRequest vaultName
         * @property {Uint8Array|null} [body] PackRequest body
         */

        /**
         * Constructs a new PackRequest.
         * @memberof gitInterface
         * @classdesc Represents a PackRequest.
         * @implements IPackRequest
         * @constructor
         * @param {gitInterface.IPackRequest=} [p] Properties to set
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
         * @memberof gitInterface.PackRequest
         * @instance
         */
        PackRequest.prototype.vaultName = "";

        /**
         * PackRequest body.
         * @member {Uint8Array} body
         * @memberof gitInterface.PackRequest
         * @instance
         */
        PackRequest.prototype.body = $util.newBuffer([]);

        /**
         * Creates a new PackRequest instance using the specified properties.
         * @function create
         * @memberof gitInterface.PackRequest
         * @static
         * @param {gitInterface.IPackRequest=} [properties] Properties to set
         * @returns {gitInterface.PackRequest} PackRequest instance
         */
        PackRequest.create = function create(properties) {
            return new PackRequest(properties);
        };

        /**
         * Encodes the specified PackRequest message. Does not implicitly {@link gitInterface.PackRequest.verify|verify} messages.
         * @function encode
         * @memberof gitInterface.PackRequest
         * @static
         * @param {gitInterface.IPackRequest} m PackRequest message or plain object to encode
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
         * Encodes the specified PackRequest message, length delimited. Does not implicitly {@link gitInterface.PackRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof gitInterface.PackRequest
         * @static
         * @param {gitInterface.IPackRequest} message PackRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PackRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PackRequest message from the specified reader or buffer.
         * @function decode
         * @memberof gitInterface.PackRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {gitInterface.PackRequest} PackRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PackRequest.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.gitInterface.PackRequest();
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

        /**
         * Decodes a PackRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof gitInterface.PackRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {gitInterface.PackRequest} PackRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PackRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PackRequest;
    })();

    gitInterface.PackReply = (function() {

        /**
         * Properties of a PackReply.
         * @memberof gitInterface
         * @interface IPackReply
         * @property {string|null} [vaultName] PackReply vaultName
         * @property {Uint8Array|null} [body] PackReply body
         */

        /**
         * Constructs a new PackReply.
         * @memberof gitInterface
         * @classdesc Represents a PackReply.
         * @implements IPackReply
         * @constructor
         * @param {gitInterface.IPackReply=} [p] Properties to set
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
         * @memberof gitInterface.PackReply
         * @instance
         */
        PackReply.prototype.vaultName = "";

        /**
         * PackReply body.
         * @member {Uint8Array} body
         * @memberof gitInterface.PackReply
         * @instance
         */
        PackReply.prototype.body = $util.newBuffer([]);

        /**
         * Creates a new PackReply instance using the specified properties.
         * @function create
         * @memberof gitInterface.PackReply
         * @static
         * @param {gitInterface.IPackReply=} [properties] Properties to set
         * @returns {gitInterface.PackReply} PackReply instance
         */
        PackReply.create = function create(properties) {
            return new PackReply(properties);
        };

        /**
         * Encodes the specified PackReply message. Does not implicitly {@link gitInterface.PackReply.verify|verify} messages.
         * @function encode
         * @memberof gitInterface.PackReply
         * @static
         * @param {gitInterface.IPackReply} m PackReply message or plain object to encode
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
         * Encodes the specified PackReply message, length delimited. Does not implicitly {@link gitInterface.PackReply.verify|verify} messages.
         * @function encodeDelimited
         * @memberof gitInterface.PackReply
         * @static
         * @param {gitInterface.IPackReply} message PackReply message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PackReply.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PackReply message from the specified reader or buffer.
         * @function decode
         * @memberof gitInterface.PackReply
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {gitInterface.PackReply} PackReply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PackReply.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.gitInterface.PackReply();
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

        /**
         * Decodes a PackReply message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof gitInterface.PackReply
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {gitInterface.PackReply} PackReply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PackReply.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PackReply;
    })();

    gitInterface.VaultNamesReply = (function() {

        /**
         * Properties of a VaultNamesReply.
         * @memberof gitInterface
         * @interface IVaultNamesReply
         * @property {Array.<string>|null} [vaultNameList] VaultNamesReply vaultNameList
         */

        /**
         * Constructs a new VaultNamesReply.
         * @memberof gitInterface
         * @classdesc Represents a VaultNamesReply.
         * @implements IVaultNamesReply
         * @constructor
         * @param {gitInterface.IVaultNamesReply=} [p] Properties to set
         */
        function VaultNamesReply(p) {
            this.vaultNameList = [];
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * VaultNamesReply vaultNameList.
         * @member {Array.<string>} vaultNameList
         * @memberof gitInterface.VaultNamesReply
         * @instance
         */
        VaultNamesReply.prototype.vaultNameList = $util.emptyArray;

        /**
         * Creates a new VaultNamesReply instance using the specified properties.
         * @function create
         * @memberof gitInterface.VaultNamesReply
         * @static
         * @param {gitInterface.IVaultNamesReply=} [properties] Properties to set
         * @returns {gitInterface.VaultNamesReply} VaultNamesReply instance
         */
        VaultNamesReply.create = function create(properties) {
            return new VaultNamesReply(properties);
        };

        /**
         * Encodes the specified VaultNamesReply message. Does not implicitly {@link gitInterface.VaultNamesReply.verify|verify} messages.
         * @function encode
         * @memberof gitInterface.VaultNamesReply
         * @static
         * @param {gitInterface.IVaultNamesReply} m VaultNamesReply message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        VaultNamesReply.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.vaultNameList != null && m.vaultNameList.length) {
                for (var i = 0; i < m.vaultNameList.length; ++i)
                    w.uint32(10).string(m.vaultNameList[i]);
            }
            return w;
        };

        /**
         * Encodes the specified VaultNamesReply message, length delimited. Does not implicitly {@link gitInterface.VaultNamesReply.verify|verify} messages.
         * @function encodeDelimited
         * @memberof gitInterface.VaultNamesReply
         * @static
         * @param {gitInterface.IVaultNamesReply} message VaultNamesReply message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        VaultNamesReply.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a VaultNamesReply message from the specified reader or buffer.
         * @function decode
         * @memberof gitInterface.VaultNamesReply
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {gitInterface.VaultNamesReply} VaultNamesReply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        VaultNamesReply.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.gitInterface.VaultNamesReply();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    if (!(m.vaultNameList && m.vaultNameList.length))
                        m.vaultNameList = [];
                    m.vaultNameList.push(r.string());
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a VaultNamesReply message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof gitInterface.VaultNamesReply
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {gitInterface.VaultNamesReply} VaultNamesReply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        VaultNamesReply.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return VaultNamesReply;
    })();

    return gitInterface;
})();

module.exports = $root;
