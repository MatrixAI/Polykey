/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

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
