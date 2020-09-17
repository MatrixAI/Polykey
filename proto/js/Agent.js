/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

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
