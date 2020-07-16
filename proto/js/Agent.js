/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

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
