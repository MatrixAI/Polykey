/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.peer = (function() {

    /**
     * Namespace peer.
     * @exports peer
     * @namespace
     */
    var peer = {};

    peer.HandshakeMessage = (function() {

        /**
         * Properties of a HandshakeMessage.
         * @memberof peer
         * @interface IHandshakeMessage
         * @property {Uint8Array|null} [targetPubKey] HandshakeMessage targetPubKey
         * @property {Uint8Array|null} [requestingPubKey] HandshakeMessage requestingPubKey
         * @property {Uint8Array|null} [message] HandshakeMessage message
         * @property {Uint8Array|null} [responsePeerInfo] HandshakeMessage responsePeerInfo
         */

        /**
         * Constructs a new HandshakeMessage.
         * @memberof peer
         * @classdesc Represents a HandshakeMessage.
         * @implements IHandshakeMessage
         * @constructor
         * @param {peer.IHandshakeMessage=} [p] Properties to set
         */
        function HandshakeMessage(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * HandshakeMessage targetPubKey.
         * @member {Uint8Array} targetPubKey
         * @memberof peer.HandshakeMessage
         * @instance
         */
        HandshakeMessage.prototype.targetPubKey = $util.newBuffer([]);

        /**
         * HandshakeMessage requestingPubKey.
         * @member {Uint8Array} requestingPubKey
         * @memberof peer.HandshakeMessage
         * @instance
         */
        HandshakeMessage.prototype.requestingPubKey = $util.newBuffer([]);

        /**
         * HandshakeMessage message.
         * @member {Uint8Array} message
         * @memberof peer.HandshakeMessage
         * @instance
         */
        HandshakeMessage.prototype.message = $util.newBuffer([]);

        /**
         * HandshakeMessage responsePeerInfo.
         * @member {Uint8Array} responsePeerInfo
         * @memberof peer.HandshakeMessage
         * @instance
         */
        HandshakeMessage.prototype.responsePeerInfo = $util.newBuffer([]);

        /**
         * Creates a new HandshakeMessage instance using the specified properties.
         * @function create
         * @memberof peer.HandshakeMessage
         * @static
         * @param {peer.IHandshakeMessage=} [properties] Properties to set
         * @returns {peer.HandshakeMessage} HandshakeMessage instance
         */
        HandshakeMessage.create = function create(properties) {
            return new HandshakeMessage(properties);
        };

        /**
         * Encodes the specified HandshakeMessage message. Does not implicitly {@link peer.HandshakeMessage.verify|verify} messages.
         * @function encode
         * @memberof peer.HandshakeMessage
         * @static
         * @param {peer.IHandshakeMessage} m HandshakeMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HandshakeMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.targetPubKey != null && Object.hasOwnProperty.call(m, "targetPubKey"))
                w.uint32(10).bytes(m.targetPubKey);
            if (m.requestingPubKey != null && Object.hasOwnProperty.call(m, "requestingPubKey"))
                w.uint32(18).bytes(m.requestingPubKey);
            if (m.message != null && Object.hasOwnProperty.call(m, "message"))
                w.uint32(26).bytes(m.message);
            if (m.responsePeerInfo != null && Object.hasOwnProperty.call(m, "responsePeerInfo"))
                w.uint32(34).bytes(m.responsePeerInfo);
            return w;
        };

        /**
         * Decodes a HandshakeMessage message from the specified reader or buffer.
         * @function decode
         * @memberof peer.HandshakeMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peer.HandshakeMessage} HandshakeMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HandshakeMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peer.HandshakeMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.targetPubKey = r.bytes();
                    break;
                case 2:
                    m.requestingPubKey = r.bytes();
                    break;
                case 3:
                    m.message = r.bytes();
                    break;
                case 4:
                    m.responsePeerInfo = r.bytes();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        return HandshakeMessage;
    })();

    peer.PeerInfoMessage = (function() {

        /**
         * Properties of a PeerInfoMessage.
         * @memberof peer
         * @interface IPeerInfoMessage
         * @property {string|null} [pubKey] PeerInfoMessage pubKey
         * @property {Array.<string>|null} [addresses] PeerInfoMessage addresses
         * @property {string|null} [connectedAddr] PeerInfoMessage connectedAddr
         */

        /**
         * Constructs a new PeerInfoMessage.
         * @memberof peer
         * @classdesc Represents a PeerInfoMessage.
         * @implements IPeerInfoMessage
         * @constructor
         * @param {peer.IPeerInfoMessage=} [p] Properties to set
         */
        function PeerInfoMessage(p) {
            this.addresses = [];
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * PeerInfoMessage pubKey.
         * @member {string} pubKey
         * @memberof peer.PeerInfoMessage
         * @instance
         */
        PeerInfoMessage.prototype.pubKey = "";

        /**
         * PeerInfoMessage addresses.
         * @member {Array.<string>} addresses
         * @memberof peer.PeerInfoMessage
         * @instance
         */
        PeerInfoMessage.prototype.addresses = $util.emptyArray;

        /**
         * PeerInfoMessage connectedAddr.
         * @member {string} connectedAddr
         * @memberof peer.PeerInfoMessage
         * @instance
         */
        PeerInfoMessage.prototype.connectedAddr = "";

        /**
         * Creates a new PeerInfoMessage instance using the specified properties.
         * @function create
         * @memberof peer.PeerInfoMessage
         * @static
         * @param {peer.IPeerInfoMessage=} [properties] Properties to set
         * @returns {peer.PeerInfoMessage} PeerInfoMessage instance
         */
        PeerInfoMessage.create = function create(properties) {
            return new PeerInfoMessage(properties);
        };

        /**
         * Encodes the specified PeerInfoMessage message. Does not implicitly {@link peer.PeerInfoMessage.verify|verify} messages.
         * @function encode
         * @memberof peer.PeerInfoMessage
         * @static
         * @param {peer.IPeerInfoMessage} m PeerInfoMessage message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerInfoMessage.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.pubKey != null && Object.hasOwnProperty.call(m, "pubKey"))
                w.uint32(10).string(m.pubKey);
            if (m.addresses != null && m.addresses.length) {
                for (var i = 0; i < m.addresses.length; ++i)
                    w.uint32(18).string(m.addresses[i]);
            }
            if (m.connectedAddr != null && Object.hasOwnProperty.call(m, "connectedAddr"))
                w.uint32(26).string(m.connectedAddr);
            return w;
        };

        /**
         * Decodes a PeerInfoMessage message from the specified reader or buffer.
         * @function decode
         * @memberof peer.PeerInfoMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {peer.PeerInfoMessage} PeerInfoMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerInfoMessage.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.peer.PeerInfoMessage();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.pubKey = r.string();
                    break;
                case 2:
                    if (!(m.addresses && m.addresses.length))
                        m.addresses = [];
                    m.addresses.push(r.string());
                    break;
                case 3:
                    m.connectedAddr = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        return PeerInfoMessage;
    })();

    return peer;
})();

module.exports = $root;
