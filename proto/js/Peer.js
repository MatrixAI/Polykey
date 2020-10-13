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
     * @property {number} CERTIFICATE_AUTHORITY=3 CERTIFICATE_AUTHORITY value
     * @property {number} PEER_DHT=4 PEER_DHT value
     */
    peerInterface.SubServiceType = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "PING_PEER"] = 0;
        values[valuesById[1] = "GIT"] = 1;
        values[valuesById[2] = "NAT_TRAVERSAL"] = 2;
        values[valuesById[3] = "CERTIFICATE_AUTHORITY"] = 3;
        values[valuesById[4] = "PEER_DHT"] = 4;
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
         * @property {string|null} [rootCertificate] PeerInfoMessage rootCertificate
         * @property {string|null} [peerAddress] PeerInfoMessage peerAddress
         * @property {string|null} [apiAddress] PeerInfoMessage apiAddress
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
         * PeerInfoMessage rootCertificate.
         * @member {string} rootCertificate
         * @memberof peerInterface.PeerInfoMessage
         * @instance
         */
        PeerInfoMessage.prototype.rootCertificate = "";

        /**
         * PeerInfoMessage peerAddress.
         * @member {string} peerAddress
         * @memberof peerInterface.PeerInfoMessage
         * @instance
         */
        PeerInfoMessage.prototype.peerAddress = "";

        /**
         * PeerInfoMessage apiAddress.
         * @member {string} apiAddress
         * @memberof peerInterface.PeerInfoMessage
         * @instance
         */
        PeerInfoMessage.prototype.apiAddress = "";

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
            if (m.rootCertificate != null && Object.hasOwnProperty.call(m, "rootCertificate"))
                w.uint32(18).string(m.rootCertificate);
            if (m.peerAddress != null && Object.hasOwnProperty.call(m, "peerAddress"))
                w.uint32(26).string(m.peerAddress);
            if (m.apiAddress != null && Object.hasOwnProperty.call(m, "apiAddress"))
                w.uint32(34).string(m.apiAddress);
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
                    m.rootCertificate = r.string();
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
     * @property {number} UDP_ADDRESS=0 UDP_ADDRESS value
     * @property {number} DIRECT_CONNECTION=1 DIRECT_CONNECTION value
     * @property {number} HOLE_PUNCH_CONNECTION=2 HOLE_PUNCH_CONNECTION value
     * @property {number} RELAY_CONNECTION=3 RELAY_CONNECTION value
     */
    peerInterface.NatMessageType = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "UDP_ADDRESS"] = 0;
        values[valuesById[1] = "DIRECT_CONNECTION"] = 1;
        values[valuesById[2] = "HOLE_PUNCH_CONNECTION"] = 2;
        values[valuesById[3] = "RELAY_CONNECTION"] = 3;
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

    peerInterface.UDPAddressMessage = (function() {

        /**
         * Properties of a UDPAddressMessage.
         * @memberof peerInterface
         * @interface IUDPAddressMessage
         * @property {string|null} [address] UDPAddressMessage address
         * @property {string|null} [token] UDPAddressMessage token
         */

        /**
         * Constructs a new UDPAddressMessage.
         * @memberof peerInterface
         * @classdesc Represents a UDPAddressMessage.
         * @implements IUDPAddressMessage
         * @constructor
         * @param {peerInterface.IUDPAddressMessage=} [p] Properties to set
         */
        function UDPAddressMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * UDPAddressMessage address.
         * @member {string} address
         * @memberof peerInterface.UDPAddressMessage
         * @instance
         */
        UDPAddressMessage.prototype.address = "";

        /**
         * UDPAddressMessage token.
         * @member {string} token
         * @memberof peerInterface.UDPAddressMessage
         * @instance
         */
        UDPAddressMessage.prototype.token = "";

        /**
         * Creates a new UDPAddressMessage instance using the specified properties.
         * @function create
         * @memberof peerInterface.UDPAddressMessage
         * @static
         * @param {peerInterface.IUDPAddressMessage=} [properties] Properties to set
         * @returns {peerInterface.UDPAddressMessage} UDPAddressMessage instance
         */
        UDPAddressMessage.create = function create(properties) {
            return new UDPAddressMessage(properties);
        };

        /**
         * Encodes the specified UDPAddressMessage message. Does not implicitly {@link peerInterface.UDPAddressMessage.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.UDPAddressMessage
         * @static
         * @param {peerInterface.IUDPAddressMessage} m UDPAddressMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UDPAddressMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.address != null && Object.hasOwnProperty.call(m, "address"))
                w.uint32(10).string(m.address);
            if (m.token != null && Object.hasOwnProperty.call(m, "token"))
                w.uint32(18).string(m.token);
            return w;
        };

        /**
         * Encodes the specified UDPAddressMessage message, length delimited. Does not implicitly {@link peerInterface.UDPAddressMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.UDPAddressMessage
         * @static
         * @param {peerInterface.IUDPAddressMessage} message UDPAddressMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UDPAddressMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a UDPAddressMessage message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.UDPAddressMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.UDPAddressMessage} UDPAddressMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UDPAddressMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.UDPAddressMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.address = r.string();
                    break;
                case 2:
                    m.token = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a UDPAddressMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.UDPAddressMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.UDPAddressMessage} UDPAddressMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UDPAddressMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return UDPAddressMessage;
    })();

    peerInterface.DirectConnectionMessage = (function() {

        /**
         * Properties of a DirectConnectionMessage.
         * @memberof peerInterface
         * @interface IDirectConnectionMessage
         * @property {string|null} [peerId] DirectConnectionMessage peerId
         */

        /**
         * Constructs a new DirectConnectionMessage.
         * @memberof peerInterface
         * @classdesc Represents a DirectConnectionMessage.
         * @implements IDirectConnectionMessage
         * @constructor
         * @param {peerInterface.IDirectConnectionMessage=} [p] Properties to set
         */
        function DirectConnectionMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * DirectConnectionMessage peerId.
         * @member {string} peerId
         * @memberof peerInterface.DirectConnectionMessage
         * @instance
         */
        DirectConnectionMessage.prototype.peerId = "";

        /**
         * Creates a new DirectConnectionMessage instance using the specified properties.
         * @function create
         * @memberof peerInterface.DirectConnectionMessage
         * @static
         * @param {peerInterface.IDirectConnectionMessage=} [properties] Properties to set
         * @returns {peerInterface.DirectConnectionMessage} DirectConnectionMessage instance
         */
        DirectConnectionMessage.create = function create(properties) {
            return new DirectConnectionMessage(properties);
        };

        /**
         * Encodes the specified DirectConnectionMessage message. Does not implicitly {@link peerInterface.DirectConnectionMessage.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.DirectConnectionMessage
         * @static
         * @param {peerInterface.IDirectConnectionMessage} m DirectConnectionMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DirectConnectionMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.peerId != null && Object.hasOwnProperty.call(m, "peerId"))
                w.uint32(10).string(m.peerId);
            return w;
        };

        /**
         * Encodes the specified DirectConnectionMessage message, length delimited. Does not implicitly {@link peerInterface.DirectConnectionMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.DirectConnectionMessage
         * @static
         * @param {peerInterface.IDirectConnectionMessage} message DirectConnectionMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DirectConnectionMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DirectConnectionMessage message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.DirectConnectionMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.DirectConnectionMessage} DirectConnectionMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DirectConnectionMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.DirectConnectionMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.peerId = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a DirectConnectionMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.DirectConnectionMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.DirectConnectionMessage} DirectConnectionMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DirectConnectionMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return DirectConnectionMessage;
    })();

    peerInterface.HolePunchConnectionMessage = (function() {

        /**
         * Properties of a HolePunchConnectionMessage.
         * @memberof peerInterface
         * @interface IHolePunchConnectionMessage
         * @property {string|null} [targetPeerId] HolePunchConnectionMessage targetPeerId
         * @property {string|null} [originPeerId] HolePunchConnectionMessage originPeerId
         * @property {string|null} [udpAddress] HolePunchConnectionMessage udpAddress
         */

        /**
         * Constructs a new HolePunchConnectionMessage.
         * @memberof peerInterface
         * @classdesc Represents a HolePunchConnectionMessage.
         * @implements IHolePunchConnectionMessage
         * @constructor
         * @param {peerInterface.IHolePunchConnectionMessage=} [p] Properties to set
         */
        function HolePunchConnectionMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * HolePunchConnectionMessage targetPeerId.
         * @member {string} targetPeerId
         * @memberof peerInterface.HolePunchConnectionMessage
         * @instance
         */
        HolePunchConnectionMessage.prototype.targetPeerId = "";

        /**
         * HolePunchConnectionMessage originPeerId.
         * @member {string} originPeerId
         * @memberof peerInterface.HolePunchConnectionMessage
         * @instance
         */
        HolePunchConnectionMessage.prototype.originPeerId = "";

        /**
         * HolePunchConnectionMessage udpAddress.
         * @member {string} udpAddress
         * @memberof peerInterface.HolePunchConnectionMessage
         * @instance
         */
        HolePunchConnectionMessage.prototype.udpAddress = "";

        /**
         * Creates a new HolePunchConnectionMessage instance using the specified properties.
         * @function create
         * @memberof peerInterface.HolePunchConnectionMessage
         * @static
         * @param {peerInterface.IHolePunchConnectionMessage=} [properties] Properties to set
         * @returns {peerInterface.HolePunchConnectionMessage} HolePunchConnectionMessage instance
         */
        HolePunchConnectionMessage.create = function create(properties) {
            return new HolePunchConnectionMessage(properties);
        };

        /**
         * Encodes the specified HolePunchConnectionMessage message. Does not implicitly {@link peerInterface.HolePunchConnectionMessage.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.HolePunchConnectionMessage
         * @static
         * @param {peerInterface.IHolePunchConnectionMessage} m HolePunchConnectionMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HolePunchConnectionMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.targetPeerId != null && Object.hasOwnProperty.call(m, "targetPeerId"))
                w.uint32(10).string(m.targetPeerId);
            if (m.originPeerId != null && Object.hasOwnProperty.call(m, "originPeerId"))
                w.uint32(18).string(m.originPeerId);
            if (m.udpAddress != null && Object.hasOwnProperty.call(m, "udpAddress"))
                w.uint32(26).string(m.udpAddress);
            return w;
        };

        /**
         * Encodes the specified HolePunchConnectionMessage message, length delimited. Does not implicitly {@link peerInterface.HolePunchConnectionMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.HolePunchConnectionMessage
         * @static
         * @param {peerInterface.IHolePunchConnectionMessage} message HolePunchConnectionMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HolePunchConnectionMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a HolePunchConnectionMessage message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.HolePunchConnectionMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.HolePunchConnectionMessage} HolePunchConnectionMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HolePunchConnectionMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.HolePunchConnectionMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.targetPeerId = r.string();
                    break;
                case 2:
                    m.originPeerId = r.string();
                    break;
                case 3:
                    m.udpAddress = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a HolePunchConnectionMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.HolePunchConnectionMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.HolePunchConnectionMessage} HolePunchConnectionMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HolePunchConnectionMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return HolePunchConnectionMessage;
    })();

    peerInterface.RelayConnectionMessage = (function() {

        /**
         * Properties of a RelayConnectionMessage.
         * @memberof peerInterface
         * @interface IRelayConnectionMessage
         * @property {string|null} [targetPeerId] RelayConnectionMessage targetPeerId
         * @property {string|null} [originPeerId] RelayConnectionMessage originPeerId
         * @property {string|null} [relayAddress] RelayConnectionMessage relayAddress
         */

        /**
         * Constructs a new RelayConnectionMessage.
         * @memberof peerInterface
         * @classdesc Represents a RelayConnectionMessage.
         * @implements IRelayConnectionMessage
         * @constructor
         * @param {peerInterface.IRelayConnectionMessage=} [p] Properties to set
         */
        function RelayConnectionMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * RelayConnectionMessage targetPeerId.
         * @member {string} targetPeerId
         * @memberof peerInterface.RelayConnectionMessage
         * @instance
         */
        RelayConnectionMessage.prototype.targetPeerId = "";

        /**
         * RelayConnectionMessage originPeerId.
         * @member {string} originPeerId
         * @memberof peerInterface.RelayConnectionMessage
         * @instance
         */
        RelayConnectionMessage.prototype.originPeerId = "";

        /**
         * RelayConnectionMessage relayAddress.
         * @member {string} relayAddress
         * @memberof peerInterface.RelayConnectionMessage
         * @instance
         */
        RelayConnectionMessage.prototype.relayAddress = "";

        /**
         * Creates a new RelayConnectionMessage instance using the specified properties.
         * @function create
         * @memberof peerInterface.RelayConnectionMessage
         * @static
         * @param {peerInterface.IRelayConnectionMessage=} [properties] Properties to set
         * @returns {peerInterface.RelayConnectionMessage} RelayConnectionMessage instance
         */
        RelayConnectionMessage.create = function create(properties) {
            return new RelayConnectionMessage(properties);
        };

        /**
         * Encodes the specified RelayConnectionMessage message. Does not implicitly {@link peerInterface.RelayConnectionMessage.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.RelayConnectionMessage
         * @static
         * @param {peerInterface.IRelayConnectionMessage} m RelayConnectionMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RelayConnectionMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.targetPeerId != null && Object.hasOwnProperty.call(m, "targetPeerId"))
                w.uint32(10).string(m.targetPeerId);
            if (m.originPeerId != null && Object.hasOwnProperty.call(m, "originPeerId"))
                w.uint32(18).string(m.originPeerId);
            if (m.relayAddress != null && Object.hasOwnProperty.call(m, "relayAddress"))
                w.uint32(26).string(m.relayAddress);
            return w;
        };

        /**
         * Encodes the specified RelayConnectionMessage message, length delimited. Does not implicitly {@link peerInterface.RelayConnectionMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.RelayConnectionMessage
         * @static
         * @param {peerInterface.IRelayConnectionMessage} message RelayConnectionMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RelayConnectionMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RelayConnectionMessage message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.RelayConnectionMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.RelayConnectionMessage} RelayConnectionMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RelayConnectionMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.RelayConnectionMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.targetPeerId = r.string();
                    break;
                case 2:
                    m.originPeerId = r.string();
                    break;
                case 3:
                    m.relayAddress = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a RelayConnectionMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.RelayConnectionMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.RelayConnectionMessage} RelayConnectionMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RelayConnectionMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return RelayConnectionMessage;
    })();

    /**
     * CAMessageType enum.
     * @name peerInterface.CAMessageType
     * @enum {number}
     * @property {number} ROOT_CERT=0 ROOT_CERT value
     * @property {number} REQUEST_CERT=1 REQUEST_CERT value
     */
    peerInterface.CAMessageType = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "ROOT_CERT"] = 0;
        values[valuesById[1] = "REQUEST_CERT"] = 1;
        return values;
    })();

    peerInterface.CAMessage = (function() {

        /**
         * Properties of a CAMessage.
         * @memberof peerInterface
         * @interface ICAMessage
         * @property {peerInterface.CAMessageType|null} [type] CAMessage type
         * @property {boolean|null} [isResponse] CAMessage isResponse
         * @property {Uint8Array|null} [subMessage] CAMessage subMessage
         */

        /**
         * Constructs a new CAMessage.
         * @memberof peerInterface
         * @classdesc Represents a CAMessage.
         * @implements ICAMessage
         * @constructor
         * @param {peerInterface.ICAMessage=} [p] Properties to set
         */
        function CAMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * CAMessage type.
         * @member {peerInterface.CAMessageType} type
         * @memberof peerInterface.CAMessage
         * @instance
         */
        CAMessage.prototype.type = 0;

        /**
         * CAMessage isResponse.
         * @member {boolean} isResponse
         * @memberof peerInterface.CAMessage
         * @instance
         */
        CAMessage.prototype.isResponse = false;

        /**
         * CAMessage subMessage.
         * @member {Uint8Array} subMessage
         * @memberof peerInterface.CAMessage
         * @instance
         */
        CAMessage.prototype.subMessage = $util.newBuffer([]);

        /**
         * Creates a new CAMessage instance using the specified properties.
         * @function create
         * @memberof peerInterface.CAMessage
         * @static
         * @param {peerInterface.ICAMessage=} [properties] Properties to set
         * @returns {peerInterface.CAMessage} CAMessage instance
         */
        CAMessage.create = function create(properties) {
            return new CAMessage(properties);
        };

        /**
         * Encodes the specified CAMessage message. Does not implicitly {@link peerInterface.CAMessage.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.CAMessage
         * @static
         * @param {peerInterface.ICAMessage} m CAMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CAMessage.encode = function encode(m, w) {
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
         * Encodes the specified CAMessage message, length delimited. Does not implicitly {@link peerInterface.CAMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.CAMessage
         * @static
         * @param {peerInterface.ICAMessage} message CAMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CAMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a CAMessage message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.CAMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.CAMessage} CAMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CAMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.CAMessage();
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
         * Decodes a CAMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.CAMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.CAMessage} CAMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CAMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return CAMessage;
    })();

    /**
     * PeerDHTMessageType enum.
     * @name peerInterface.PeerDHTMessageType
     * @enum {number}
     * @property {number} PING=0 PING value
     * @property {number} FIND_NODE=1 FIND_NODE value
     */
    peerInterface.PeerDHTMessageType = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "PING"] = 0;
        values[valuesById[1] = "FIND_NODE"] = 1;
        return values;
    })();

    peerInterface.PeerDHTMessage = (function() {

        /**
         * Properties of a PeerDHTMessage.
         * @memberof peerInterface
         * @interface IPeerDHTMessage
         * @property {peerInterface.PeerDHTMessageType|null} [type] PeerDHTMessage type
         * @property {boolean|null} [isResponse] PeerDHTMessage isResponse
         * @property {Uint8Array|null} [subMessage] PeerDHTMessage subMessage
         */

        /**
         * Constructs a new PeerDHTMessage.
         * @memberof peerInterface
         * @classdesc Represents a PeerDHTMessage.
         * @implements IPeerDHTMessage
         * @constructor
         * @param {peerInterface.IPeerDHTMessage=} [p] Properties to set
         */
        function PeerDHTMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PeerDHTMessage type.
         * @member {peerInterface.PeerDHTMessageType} type
         * @memberof peerInterface.PeerDHTMessage
         * @instance
         */
        PeerDHTMessage.prototype.type = 0;

        /**
         * PeerDHTMessage isResponse.
         * @member {boolean} isResponse
         * @memberof peerInterface.PeerDHTMessage
         * @instance
         */
        PeerDHTMessage.prototype.isResponse = false;

        /**
         * PeerDHTMessage subMessage.
         * @member {Uint8Array} subMessage
         * @memberof peerInterface.PeerDHTMessage
         * @instance
         */
        PeerDHTMessage.prototype.subMessage = $util.newBuffer([]);

        /**
         * Creates a new PeerDHTMessage instance using the specified properties.
         * @function create
         * @memberof peerInterface.PeerDHTMessage
         * @static
         * @param {peerInterface.IPeerDHTMessage=} [properties] Properties to set
         * @returns {peerInterface.PeerDHTMessage} PeerDHTMessage instance
         */
        PeerDHTMessage.create = function create(properties) {
            return new PeerDHTMessage(properties);
        };

        /**
         * Encodes the specified PeerDHTMessage message. Does not implicitly {@link peerInterface.PeerDHTMessage.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.PeerDHTMessage
         * @static
         * @param {peerInterface.IPeerDHTMessage} m PeerDHTMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerDHTMessage.encode = function encode(m, w) {
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
         * Encodes the specified PeerDHTMessage message, length delimited. Does not implicitly {@link peerInterface.PeerDHTMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.PeerDHTMessage
         * @static
         * @param {peerInterface.IPeerDHTMessage} message PeerDHTMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerDHTMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PeerDHTMessage message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.PeerDHTMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.PeerDHTMessage} PeerDHTMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerDHTMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.PeerDHTMessage();
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
         * Decodes a PeerDHTMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.PeerDHTMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.PeerDHTMessage} PeerDHTMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerDHTMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PeerDHTMessage;
    })();

    peerInterface.PeerDHTPingNodeMessage = (function() {

        /**
         * Properties of a PeerDHTPingNodeMessage.
         * @memberof peerInterface
         * @interface IPeerDHTPingNodeMessage
         * @property {string|null} [peerId] PeerDHTPingNodeMessage peerId
         * @property {string|null} [randomChallenge] PeerDHTPingNodeMessage randomChallenge
         */

        /**
         * Constructs a new PeerDHTPingNodeMessage.
         * @memberof peerInterface
         * @classdesc Represents a PeerDHTPingNodeMessage.
         * @implements IPeerDHTPingNodeMessage
         * @constructor
         * @param {peerInterface.IPeerDHTPingNodeMessage=} [p] Properties to set
         */
        function PeerDHTPingNodeMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PeerDHTPingNodeMessage peerId.
         * @member {string} peerId
         * @memberof peerInterface.PeerDHTPingNodeMessage
         * @instance
         */
        PeerDHTPingNodeMessage.prototype.peerId = "";

        /**
         * PeerDHTPingNodeMessage randomChallenge.
         * @member {string} randomChallenge
         * @memberof peerInterface.PeerDHTPingNodeMessage
         * @instance
         */
        PeerDHTPingNodeMessage.prototype.randomChallenge = "";

        /**
         * Creates a new PeerDHTPingNodeMessage instance using the specified properties.
         * @function create
         * @memberof peerInterface.PeerDHTPingNodeMessage
         * @static
         * @param {peerInterface.IPeerDHTPingNodeMessage=} [properties] Properties to set
         * @returns {peerInterface.PeerDHTPingNodeMessage} PeerDHTPingNodeMessage instance
         */
        PeerDHTPingNodeMessage.create = function create(properties) {
            return new PeerDHTPingNodeMessage(properties);
        };

        /**
         * Encodes the specified PeerDHTPingNodeMessage message. Does not implicitly {@link peerInterface.PeerDHTPingNodeMessage.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.PeerDHTPingNodeMessage
         * @static
         * @param {peerInterface.IPeerDHTPingNodeMessage} m PeerDHTPingNodeMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerDHTPingNodeMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.peerId != null && Object.hasOwnProperty.call(m, "peerId"))
                w.uint32(10).string(m.peerId);
            if (m.randomChallenge != null && Object.hasOwnProperty.call(m, "randomChallenge"))
                w.uint32(18).string(m.randomChallenge);
            return w;
        };

        /**
         * Encodes the specified PeerDHTPingNodeMessage message, length delimited. Does not implicitly {@link peerInterface.PeerDHTPingNodeMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.PeerDHTPingNodeMessage
         * @static
         * @param {peerInterface.IPeerDHTPingNodeMessage} message PeerDHTPingNodeMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerDHTPingNodeMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PeerDHTPingNodeMessage message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.PeerDHTPingNodeMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.PeerDHTPingNodeMessage} PeerDHTPingNodeMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerDHTPingNodeMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.PeerDHTPingNodeMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.peerId = r.string();
                    break;
                case 2:
                    m.randomChallenge = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a PeerDHTPingNodeMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.PeerDHTPingNodeMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.PeerDHTPingNodeMessage} PeerDHTPingNodeMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerDHTPingNodeMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PeerDHTPingNodeMessage;
    })();

    peerInterface.PeerDHTFindNodeMessage = (function() {

        /**
         * Properties of a PeerDHTFindNodeMessage.
         * @memberof peerInterface
         * @interface IPeerDHTFindNodeMessage
         * @property {string|null} [peerId] PeerDHTFindNodeMessage peerId
         * @property {Array.<peerInterface.IPeerInfoMessage>|null} [closestPeers] PeerDHTFindNodeMessage closestPeers
         */

        /**
         * Constructs a new PeerDHTFindNodeMessage.
         * @memberof peerInterface
         * @classdesc Represents a PeerDHTFindNodeMessage.
         * @implements IPeerDHTFindNodeMessage
         * @constructor
         * @param {peerInterface.IPeerDHTFindNodeMessage=} [p] Properties to set
         */
        function PeerDHTFindNodeMessage(p) {
            this.closestPeers = [];
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PeerDHTFindNodeMessage peerId.
         * @member {string} peerId
         * @memberof peerInterface.PeerDHTFindNodeMessage
         * @instance
         */
        PeerDHTFindNodeMessage.prototype.peerId = "";

        /**
         * PeerDHTFindNodeMessage closestPeers.
         * @member {Array.<peerInterface.IPeerInfoMessage>} closestPeers
         * @memberof peerInterface.PeerDHTFindNodeMessage
         * @instance
         */
        PeerDHTFindNodeMessage.prototype.closestPeers = $util.emptyArray;

        /**
         * Creates a new PeerDHTFindNodeMessage instance using the specified properties.
         * @function create
         * @memberof peerInterface.PeerDHTFindNodeMessage
         * @static
         * @param {peerInterface.IPeerDHTFindNodeMessage=} [properties] Properties to set
         * @returns {peerInterface.PeerDHTFindNodeMessage} PeerDHTFindNodeMessage instance
         */
        PeerDHTFindNodeMessage.create = function create(properties) {
            return new PeerDHTFindNodeMessage(properties);
        };

        /**
         * Encodes the specified PeerDHTFindNodeMessage message. Does not implicitly {@link peerInterface.PeerDHTFindNodeMessage.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.PeerDHTFindNodeMessage
         * @static
         * @param {peerInterface.IPeerDHTFindNodeMessage} m PeerDHTFindNodeMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerDHTFindNodeMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.peerId != null && Object.hasOwnProperty.call(m, "peerId"))
                w.uint32(10).string(m.peerId);
            if (m.closestPeers != null && m.closestPeers.length) {
                for (var i = 0; i < m.closestPeers.length; ++i)
                    $root.peerInterface.PeerInfoMessage.encode(m.closestPeers[i], w.uint32(18).fork()).ldelim();
            }
            return w;
        };

        /**
         * Encodes the specified PeerDHTFindNodeMessage message, length delimited. Does not implicitly {@link peerInterface.PeerDHTFindNodeMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.PeerDHTFindNodeMessage
         * @static
         * @param {peerInterface.IPeerDHTFindNodeMessage} message PeerDHTFindNodeMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerDHTFindNodeMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PeerDHTFindNodeMessage message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.PeerDHTFindNodeMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.PeerDHTFindNodeMessage} PeerDHTFindNodeMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerDHTFindNodeMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.PeerDHTFindNodeMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.peerId = r.string();
                    break;
                case 2:
                    if (!(m.closestPeers && m.closestPeers.length))
                        m.closestPeers = [];
                    m.closestPeers.push($root.peerInterface.PeerInfoMessage.decode(r, r.uint32()));
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a PeerDHTFindNodeMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.PeerDHTFindNodeMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.PeerDHTFindNodeMessage} PeerDHTFindNodeMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerDHTFindNodeMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return PeerDHTFindNodeMessage;
    })();

    peerInterface.MTPPacket = (function() {

        /**
         * Properties of a MTPPacket.
         * @memberof peerInterface
         * @interface IMTPPacket
         * @property {number|null} [id] MTPPacket id
         * @property {string|null} [peerId] MTPPacket peerId
         * @property {number|null} [connection] MTPPacket connection
         * @property {number|null} [timestamp] MTPPacket timestamp
         * @property {number|null} [timediff] MTPPacket timediff
         * @property {number|null} [window] MTPPacket window
         * @property {number|null} [seq] MTPPacket seq
         * @property {number|null} [ack] MTPPacket ack
         * @property {Uint8Array|null} [data] MTPPacket data
         * @property {number|null} [sent] MTPPacket sent
         */

        /**
         * Constructs a new MTPPacket.
         * @memberof peerInterface
         * @classdesc Represents a MTPPacket.
         * @implements IMTPPacket
         * @constructor
         * @param {peerInterface.IMTPPacket=} [p] Properties to set
         */
        function MTPPacket(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * MTPPacket id.
         * @member {number} id
         * @memberof peerInterface.MTPPacket
         * @instance
         */
        MTPPacket.prototype.id = 0;

        /**
         * MTPPacket peerId.
         * @member {string} peerId
         * @memberof peerInterface.MTPPacket
         * @instance
         */
        MTPPacket.prototype.peerId = "";

        /**
         * MTPPacket connection.
         * @member {number} connection
         * @memberof peerInterface.MTPPacket
         * @instance
         */
        MTPPacket.prototype.connection = 0;

        /**
         * MTPPacket timestamp.
         * @member {number} timestamp
         * @memberof peerInterface.MTPPacket
         * @instance
         */
        MTPPacket.prototype.timestamp = 0;

        /**
         * MTPPacket timediff.
         * @member {number} timediff
         * @memberof peerInterface.MTPPacket
         * @instance
         */
        MTPPacket.prototype.timediff = 0;

        /**
         * MTPPacket window.
         * @member {number} window
         * @memberof peerInterface.MTPPacket
         * @instance
         */
        MTPPacket.prototype.window = 0;

        /**
         * MTPPacket seq.
         * @member {number} seq
         * @memberof peerInterface.MTPPacket
         * @instance
         */
        MTPPacket.prototype.seq = 0;

        /**
         * MTPPacket ack.
         * @member {number} ack
         * @memberof peerInterface.MTPPacket
         * @instance
         */
        MTPPacket.prototype.ack = 0;

        /**
         * MTPPacket data.
         * @member {Uint8Array} data
         * @memberof peerInterface.MTPPacket
         * @instance
         */
        MTPPacket.prototype.data = $util.newBuffer([]);

        /**
         * MTPPacket sent.
         * @member {number} sent
         * @memberof peerInterface.MTPPacket
         * @instance
         */
        MTPPacket.prototype.sent = 0;

        /**
         * Creates a new MTPPacket instance using the specified properties.
         * @function create
         * @memberof peerInterface.MTPPacket
         * @static
         * @param {peerInterface.IMTPPacket=} [properties] Properties to set
         * @returns {peerInterface.MTPPacket} MTPPacket instance
         */
        MTPPacket.create = function create(properties) {
            return new MTPPacket(properties);
        };

        /**
         * Encodes the specified MTPPacket message. Does not implicitly {@link peerInterface.MTPPacket.verify|verify} messages.
         * @function encode
         * @memberof peerInterface.MTPPacket
         * @static
         * @param {peerInterface.IMTPPacket} m MTPPacket message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        MTPPacket.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.id != null && Object.hasOwnProperty.call(m, "id"))
                w.uint32(8).int32(m.id);
            if (m.peerId != null && Object.hasOwnProperty.call(m, "peerId"))
                w.uint32(18).string(m.peerId);
            if (m.connection != null && Object.hasOwnProperty.call(m, "connection"))
                w.uint32(24).int32(m.connection);
            if (m.timestamp != null && Object.hasOwnProperty.call(m, "timestamp"))
                w.uint32(32).int32(m.timestamp);
            if (m.timediff != null && Object.hasOwnProperty.call(m, "timediff"))
                w.uint32(40).int32(m.timediff);
            if (m.window != null && Object.hasOwnProperty.call(m, "window"))
                w.uint32(48).int32(m.window);
            if (m.seq != null && Object.hasOwnProperty.call(m, "seq"))
                w.uint32(56).int32(m.seq);
            if (m.ack != null && Object.hasOwnProperty.call(m, "ack"))
                w.uint32(64).int32(m.ack);
            if (m.data != null && Object.hasOwnProperty.call(m, "data"))
                w.uint32(74).bytes(m.data);
            if (m.sent != null && Object.hasOwnProperty.call(m, "sent"))
                w.uint32(80).int32(m.sent);
            return w;
        };

        /**
         * Encodes the specified MTPPacket message, length delimited. Does not implicitly {@link peerInterface.MTPPacket.verify|verify} messages.
         * @function encodeDelimited
         * @memberof peerInterface.MTPPacket
         * @static
         * @param {peerInterface.IMTPPacket} message MTPPacket message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        MTPPacket.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a MTPPacket message from the specified reader or buffer.
         * @function decode
         * @memberof peerInterface.MTPPacket
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peerInterface.MTPPacket} MTPPacket
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MTPPacket.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peerInterface.MTPPacket();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.id = r.int32();
                    break;
                case 2:
                    m.peerId = r.string();
                    break;
                case 3:
                    m.connection = r.int32();
                    break;
                case 4:
                    m.timestamp = r.int32();
                    break;
                case 5:
                    m.timediff = r.int32();
                    break;
                case 6:
                    m.window = r.int32();
                    break;
                case 7:
                    m.seq = r.int32();
                    break;
                case 8:
                    m.ack = r.int32();
                    break;
                case 9:
                    m.data = r.bytes();
                    break;
                case 10:
                    m.sent = r.int32();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Decodes a MTPPacket message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof peerInterface.MTPPacket
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {peerInterface.MTPPacket} MTPPacket
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MTPPacket.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        return MTPPacket;
    })();

    return peerInterface;
})();

module.exports = $root;
