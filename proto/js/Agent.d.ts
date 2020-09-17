import * as $protobuf from "protobufjs";
export = Agent;

declare namespace Agent {


    /** Namespace agentInterface. */
    namespace agentInterface {

        /** AgentMessageType enum. */
        enum AgentMessageType {
            ERROR = 0,
            STOP_AGENT = 1,
            STATUS = 2,
            REGISTER_NODE = 3,
            NEW_NODE = 4,
            LIST_NODES = 5,
            DERIVE_KEY = 6,
            SIGN_FILE = 7,
            VERIFY_FILE = 8,
            LIST_VAULTS = 9,
            NEW_VAULT = 10,
            DESTROY_VAULT = 11,
            LIST_SECRETS = 12,
            CREATE_SECRET = 13,
            DESTROY_SECRET = 14,
            GET_SECRET = 15,
            LIST_KEYS = 16,
            GET_KEY = 17,
            DELETE_KEY = 18,
            ENCRYPT_FILE = 19,
            DECRYPT_FILE = 20,
            GET_PRIMARY_KEYPAIR = 21,
            UPDATE_SECRET = 22,
            GET_PEER_INFO = 23,
            ADD_PEER = 24,
            PULL_VAULT = 26,
            PING_PEER = 27,
            FIND_PEER = 28,
            FIND_SOCIAL_PEER = 29,
            LIST_PEERS = 30,
            TOGGLE_STEALTH = 31,
            UPDATE_PEER_INFO = 32,
            REQUEST_RELAY = 33,
            REQUEST_PUNCH = 34,
            SCAN_VAULT_NAMES = 35
        }

        /** Properties of an AgentMessage. */
        interface IAgentMessage {

            /** AgentMessage type */
            type?: (agentInterface.AgentMessageType|null);

            /** AgentMessage isResponse */
            isResponse?: (boolean|null);

            /** AgentMessage nodePath */
            nodePath?: (string|null);

            /** AgentMessage subMessage */
            subMessage?: (Uint8Array|null);
        }

        /** Represents an AgentMessage. */
        class AgentMessage implements IAgentMessage {

            /**
             * Constructs a new AgentMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IAgentMessage);

            /** AgentMessage type. */
            public type: agentInterface.AgentMessageType;

            /** AgentMessage isResponse. */
            public isResponse: boolean;

            /** AgentMessage nodePath. */
            public nodePath: string;

            /** AgentMessage subMessage. */
            public subMessage: Uint8Array;

            /**
             * Creates a new AgentMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns AgentMessage instance
             */
            public static create(properties?: agentInterface.IAgentMessage): agentInterface.AgentMessage;

            /**
             * Encodes the specified AgentMessage message. Does not implicitly {@link agentInterface.AgentMessage.verify|verify} messages.
             * @param m AgentMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IAgentMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified AgentMessage message, length delimited. Does not implicitly {@link agentInterface.AgentMessage.verify|verify} messages.
             * @param message AgentMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IAgentMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an AgentMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns AgentMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.AgentMessage;

            /**
             * Decodes an AgentMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns AgentMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.AgentMessage;
        }

        /** Properties of an ErrorMessage. */
        interface IErrorMessage {

            /** ErrorMessage error */
            error?: (string|null);
        }

        /** Represents an ErrorMessage. */
        class ErrorMessage implements IErrorMessage {

            /**
             * Constructs a new ErrorMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IErrorMessage);

            /** ErrorMessage error. */
            public error: string;

            /**
             * Creates a new ErrorMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ErrorMessage instance
             */
            public static create(properties?: agentInterface.IErrorMessage): agentInterface.ErrorMessage;

            /**
             * Encodes the specified ErrorMessage message. Does not implicitly {@link agentInterface.ErrorMessage.verify|verify} messages.
             * @param m ErrorMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IErrorMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ErrorMessage message, length delimited. Does not implicitly {@link agentInterface.ErrorMessage.verify|verify} messages.
             * @param message ErrorMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IErrorMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an ErrorMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ErrorMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.ErrorMessage;

            /**
             * Decodes an ErrorMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ErrorMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.ErrorMessage;
        }

        /** AgentStatusType enum. */
        enum AgentStatusType {
            ONLINE = 0,
            OFFLINE = 1,
            ERRORED = 2
        }

        /** Properties of an AgentStatusResponseMessage. */
        interface IAgentStatusResponseMessage {

            /** AgentStatusResponseMessage status */
            status?: (agentInterface.AgentStatusType|null);
        }

        /** Represents an AgentStatusResponseMessage. */
        class AgentStatusResponseMessage implements IAgentStatusResponseMessage {

            /**
             * Constructs a new AgentStatusResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IAgentStatusResponseMessage);

            /** AgentStatusResponseMessage status. */
            public status: agentInterface.AgentStatusType;

            /**
             * Creates a new AgentStatusResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns AgentStatusResponseMessage instance
             */
            public static create(properties?: agentInterface.IAgentStatusResponseMessage): agentInterface.AgentStatusResponseMessage;

            /**
             * Encodes the specified AgentStatusResponseMessage message. Does not implicitly {@link agentInterface.AgentStatusResponseMessage.verify|verify} messages.
             * @param m AgentStatusResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IAgentStatusResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified AgentStatusResponseMessage message, length delimited. Does not implicitly {@link agentInterface.AgentStatusResponseMessage.verify|verify} messages.
             * @param message AgentStatusResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IAgentStatusResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an AgentStatusResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns AgentStatusResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.AgentStatusResponseMessage;

            /**
             * Decodes an AgentStatusResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns AgentStatusResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.AgentStatusResponseMessage;
        }

        /** Properties of a RegisterNodeRequestMessage. */
        interface IRegisterNodeRequestMessage {

            /** RegisterNodeRequestMessage passphrase */
            passphrase?: (string|null);
        }

        /** Represents a RegisterNodeRequestMessage. */
        class RegisterNodeRequestMessage implements IRegisterNodeRequestMessage {

            /**
             * Constructs a new RegisterNodeRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IRegisterNodeRequestMessage);

            /** RegisterNodeRequestMessage passphrase. */
            public passphrase: string;

            /**
             * Creates a new RegisterNodeRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RegisterNodeRequestMessage instance
             */
            public static create(properties?: agentInterface.IRegisterNodeRequestMessage): agentInterface.RegisterNodeRequestMessage;

            /**
             * Encodes the specified RegisterNodeRequestMessage message. Does not implicitly {@link agentInterface.RegisterNodeRequestMessage.verify|verify} messages.
             * @param m RegisterNodeRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IRegisterNodeRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RegisterNodeRequestMessage message, length delimited. Does not implicitly {@link agentInterface.RegisterNodeRequestMessage.verify|verify} messages.
             * @param message RegisterNodeRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IRegisterNodeRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RegisterNodeRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns RegisterNodeRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.RegisterNodeRequestMessage;

            /**
             * Decodes a RegisterNodeRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RegisterNodeRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.RegisterNodeRequestMessage;
        }

        /** Properties of a RegisterNodeResponseMessage. */
        interface IRegisterNodeResponseMessage {

            /** RegisterNodeResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents a RegisterNodeResponseMessage. */
        class RegisterNodeResponseMessage implements IRegisterNodeResponseMessage {

            /**
             * Constructs a new RegisterNodeResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IRegisterNodeResponseMessage);

            /** RegisterNodeResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new RegisterNodeResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RegisterNodeResponseMessage instance
             */
            public static create(properties?: agentInterface.IRegisterNodeResponseMessage): agentInterface.RegisterNodeResponseMessage;

            /**
             * Encodes the specified RegisterNodeResponseMessage message. Does not implicitly {@link agentInterface.RegisterNodeResponseMessage.verify|verify} messages.
             * @param m RegisterNodeResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IRegisterNodeResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RegisterNodeResponseMessage message, length delimited. Does not implicitly {@link agentInterface.RegisterNodeResponseMessage.verify|verify} messages.
             * @param message RegisterNodeResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IRegisterNodeResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RegisterNodeResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns RegisterNodeResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.RegisterNodeResponseMessage;

            /**
             * Decodes a RegisterNodeResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RegisterNodeResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.RegisterNodeResponseMessage;
        }

        /** Properties of a NewNodeRequestMessage. */
        interface INewNodeRequestMessage {

            /** NewNodeRequestMessage userId */
            userId?: (string|null);

            /** NewNodeRequestMessage passphrase */
            passphrase?: (string|null);

            /** NewNodeRequestMessage nbits */
            nbits?: (number|null);
        }

        /** Represents a NewNodeRequestMessage. */
        class NewNodeRequestMessage implements INewNodeRequestMessage {

            /**
             * Constructs a new NewNodeRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.INewNodeRequestMessage);

            /** NewNodeRequestMessage userId. */
            public userId: string;

            /** NewNodeRequestMessage passphrase. */
            public passphrase: string;

            /** NewNodeRequestMessage nbits. */
            public nbits: number;

            /**
             * Creates a new NewNodeRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NewNodeRequestMessage instance
             */
            public static create(properties?: agentInterface.INewNodeRequestMessage): agentInterface.NewNodeRequestMessage;

            /**
             * Encodes the specified NewNodeRequestMessage message. Does not implicitly {@link agentInterface.NewNodeRequestMessage.verify|verify} messages.
             * @param m NewNodeRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.INewNodeRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NewNodeRequestMessage message, length delimited. Does not implicitly {@link agentInterface.NewNodeRequestMessage.verify|verify} messages.
             * @param message NewNodeRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.INewNodeRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NewNodeRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns NewNodeRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.NewNodeRequestMessage;

            /**
             * Decodes a NewNodeRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns NewNodeRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.NewNodeRequestMessage;
        }

        /** Properties of a NewNodeResponseMessage. */
        interface INewNodeResponseMessage {

            /** NewNodeResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents a NewNodeResponseMessage. */
        class NewNodeResponseMessage implements INewNodeResponseMessage {

            /**
             * Constructs a new NewNodeResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.INewNodeResponseMessage);

            /** NewNodeResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new NewNodeResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NewNodeResponseMessage instance
             */
            public static create(properties?: agentInterface.INewNodeResponseMessage): agentInterface.NewNodeResponseMessage;

            /**
             * Encodes the specified NewNodeResponseMessage message. Does not implicitly {@link agentInterface.NewNodeResponseMessage.verify|verify} messages.
             * @param m NewNodeResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.INewNodeResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NewNodeResponseMessage message, length delimited. Does not implicitly {@link agentInterface.NewNodeResponseMessage.verify|verify} messages.
             * @param message NewNodeResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.INewNodeResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NewNodeResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns NewNodeResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.NewNodeResponseMessage;

            /**
             * Decodes a NewNodeResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns NewNodeResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.NewNodeResponseMessage;
        }

        /** Properties of a ListNodesRequestMessage. */
        interface IListNodesRequestMessage {

            /** ListNodesRequestMessage unlockedOnly */
            unlockedOnly?: (boolean|null);
        }

        /** Represents a ListNodesRequestMessage. */
        class ListNodesRequestMessage implements IListNodesRequestMessage {

            /**
             * Constructs a new ListNodesRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IListNodesRequestMessage);

            /** ListNodesRequestMessage unlockedOnly. */
            public unlockedOnly: boolean;

            /**
             * Creates a new ListNodesRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ListNodesRequestMessage instance
             */
            public static create(properties?: agentInterface.IListNodesRequestMessage): agentInterface.ListNodesRequestMessage;

            /**
             * Encodes the specified ListNodesRequestMessage message. Does not implicitly {@link agentInterface.ListNodesRequestMessage.verify|verify} messages.
             * @param m ListNodesRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IListNodesRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ListNodesRequestMessage message, length delimited. Does not implicitly {@link agentInterface.ListNodesRequestMessage.verify|verify} messages.
             * @param message ListNodesRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IListNodesRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ListNodesRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ListNodesRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.ListNodesRequestMessage;

            /**
             * Decodes a ListNodesRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ListNodesRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.ListNodesRequestMessage;
        }

        /** Properties of a ListNodesResponseMessage. */
        interface IListNodesResponseMessage {

            /** ListNodesResponseMessage nodes */
            nodes?: (string[]|null);
        }

        /** Represents a ListNodesResponseMessage. */
        class ListNodesResponseMessage implements IListNodesResponseMessage {

            /**
             * Constructs a new ListNodesResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IListNodesResponseMessage);

            /** ListNodesResponseMessage nodes. */
            public nodes: string[];

            /**
             * Creates a new ListNodesResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ListNodesResponseMessage instance
             */
            public static create(properties?: agentInterface.IListNodesResponseMessage): agentInterface.ListNodesResponseMessage;

            /**
             * Encodes the specified ListNodesResponseMessage message. Does not implicitly {@link agentInterface.ListNodesResponseMessage.verify|verify} messages.
             * @param m ListNodesResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IListNodesResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ListNodesResponseMessage message, length delimited. Does not implicitly {@link agentInterface.ListNodesResponseMessage.verify|verify} messages.
             * @param message ListNodesResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IListNodesResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ListNodesResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ListNodesResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.ListNodesResponseMessage;

            /**
             * Decodes a ListNodesResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ListNodesResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.ListNodesResponseMessage;
        }

        /** Properties of a SignFileRequestMessage. */
        interface ISignFileRequestMessage {

            /** SignFileRequestMessage filePath */
            filePath?: (string|null);

            /** SignFileRequestMessage privateKeyPath */
            privateKeyPath?: (string|null);

            /** SignFileRequestMessage passphrase */
            passphrase?: (string|null);
        }

        /** Represents a SignFileRequestMessage. */
        class SignFileRequestMessage implements ISignFileRequestMessage {

            /**
             * Constructs a new SignFileRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.ISignFileRequestMessage);

            /** SignFileRequestMessage filePath. */
            public filePath: string;

            /** SignFileRequestMessage privateKeyPath. */
            public privateKeyPath: string;

            /** SignFileRequestMessage passphrase. */
            public passphrase: string;

            /**
             * Creates a new SignFileRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SignFileRequestMessage instance
             */
            public static create(properties?: agentInterface.ISignFileRequestMessage): agentInterface.SignFileRequestMessage;

            /**
             * Encodes the specified SignFileRequestMessage message. Does not implicitly {@link agentInterface.SignFileRequestMessage.verify|verify} messages.
             * @param m SignFileRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.ISignFileRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SignFileRequestMessage message, length delimited. Does not implicitly {@link agentInterface.SignFileRequestMessage.verify|verify} messages.
             * @param message SignFileRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.ISignFileRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SignFileRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns SignFileRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.SignFileRequestMessage;

            /**
             * Decodes a SignFileRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SignFileRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.SignFileRequestMessage;
        }

        /** Properties of a SignFileResponseMessage. */
        interface ISignFileResponseMessage {

            /** SignFileResponseMessage signaturePath */
            signaturePath?: (string|null);
        }

        /** Represents a SignFileResponseMessage. */
        class SignFileResponseMessage implements ISignFileResponseMessage {

            /**
             * Constructs a new SignFileResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.ISignFileResponseMessage);

            /** SignFileResponseMessage signaturePath. */
            public signaturePath: string;

            /**
             * Creates a new SignFileResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SignFileResponseMessage instance
             */
            public static create(properties?: agentInterface.ISignFileResponseMessage): agentInterface.SignFileResponseMessage;

            /**
             * Encodes the specified SignFileResponseMessage message. Does not implicitly {@link agentInterface.SignFileResponseMessage.verify|verify} messages.
             * @param m SignFileResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.ISignFileResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SignFileResponseMessage message, length delimited. Does not implicitly {@link agentInterface.SignFileResponseMessage.verify|verify} messages.
             * @param message SignFileResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.ISignFileResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SignFileResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns SignFileResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.SignFileResponseMessage;

            /**
             * Decodes a SignFileResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SignFileResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.SignFileResponseMessage;
        }

        /** Properties of a VerifyFileRequestMessage. */
        interface IVerifyFileRequestMessage {

            /** VerifyFileRequestMessage filePath */
            filePath?: (string|null);

            /** VerifyFileRequestMessage publicKeyPath */
            publicKeyPath?: (string|null);
        }

        /** Represents a VerifyFileRequestMessage. */
        class VerifyFileRequestMessage implements IVerifyFileRequestMessage {

            /**
             * Constructs a new VerifyFileRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IVerifyFileRequestMessage);

            /** VerifyFileRequestMessage filePath. */
            public filePath: string;

            /** VerifyFileRequestMessage publicKeyPath. */
            public publicKeyPath: string;

            /**
             * Creates a new VerifyFileRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns VerifyFileRequestMessage instance
             */
            public static create(properties?: agentInterface.IVerifyFileRequestMessage): agentInterface.VerifyFileRequestMessage;

            /**
             * Encodes the specified VerifyFileRequestMessage message. Does not implicitly {@link agentInterface.VerifyFileRequestMessage.verify|verify} messages.
             * @param m VerifyFileRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IVerifyFileRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified VerifyFileRequestMessage message, length delimited. Does not implicitly {@link agentInterface.VerifyFileRequestMessage.verify|verify} messages.
             * @param message VerifyFileRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IVerifyFileRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a VerifyFileRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns VerifyFileRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.VerifyFileRequestMessage;

            /**
             * Decodes a VerifyFileRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns VerifyFileRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.VerifyFileRequestMessage;
        }

        /** Properties of a VerifyFileResponseMessage. */
        interface IVerifyFileResponseMessage {

            /** VerifyFileResponseMessage verified */
            verified?: (boolean|null);
        }

        /** Represents a VerifyFileResponseMessage. */
        class VerifyFileResponseMessage implements IVerifyFileResponseMessage {

            /**
             * Constructs a new VerifyFileResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IVerifyFileResponseMessage);

            /** VerifyFileResponseMessage verified. */
            public verified: boolean;

            /**
             * Creates a new VerifyFileResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns VerifyFileResponseMessage instance
             */
            public static create(properties?: agentInterface.IVerifyFileResponseMessage): agentInterface.VerifyFileResponseMessage;

            /**
             * Encodes the specified VerifyFileResponseMessage message. Does not implicitly {@link agentInterface.VerifyFileResponseMessage.verify|verify} messages.
             * @param m VerifyFileResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IVerifyFileResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified VerifyFileResponseMessage message, length delimited. Does not implicitly {@link agentInterface.VerifyFileResponseMessage.verify|verify} messages.
             * @param message VerifyFileResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IVerifyFileResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a VerifyFileResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns VerifyFileResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.VerifyFileResponseMessage;

            /**
             * Decodes a VerifyFileResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns VerifyFileResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.VerifyFileResponseMessage;
        }

        /** Properties of an EncryptFileRequestMessage. */
        interface IEncryptFileRequestMessage {

            /** EncryptFileRequestMessage filePath */
            filePath?: (string|null);

            /** EncryptFileRequestMessage publicKeyPath */
            publicKeyPath?: (string|null);
        }

        /** Represents an EncryptFileRequestMessage. */
        class EncryptFileRequestMessage implements IEncryptFileRequestMessage {

            /**
             * Constructs a new EncryptFileRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IEncryptFileRequestMessage);

            /** EncryptFileRequestMessage filePath. */
            public filePath: string;

            /** EncryptFileRequestMessage publicKeyPath. */
            public publicKeyPath: string;

            /**
             * Creates a new EncryptFileRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns EncryptFileRequestMessage instance
             */
            public static create(properties?: agentInterface.IEncryptFileRequestMessage): agentInterface.EncryptFileRequestMessage;

            /**
             * Encodes the specified EncryptFileRequestMessage message. Does not implicitly {@link agentInterface.EncryptFileRequestMessage.verify|verify} messages.
             * @param m EncryptFileRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IEncryptFileRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified EncryptFileRequestMessage message, length delimited. Does not implicitly {@link agentInterface.EncryptFileRequestMessage.verify|verify} messages.
             * @param message EncryptFileRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IEncryptFileRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an EncryptFileRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns EncryptFileRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.EncryptFileRequestMessage;

            /**
             * Decodes an EncryptFileRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns EncryptFileRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.EncryptFileRequestMessage;
        }

        /** Properties of an EncryptFileResponseMessage. */
        interface IEncryptFileResponseMessage {

            /** EncryptFileResponseMessage encryptedPath */
            encryptedPath?: (string|null);
        }

        /** Represents an EncryptFileResponseMessage. */
        class EncryptFileResponseMessage implements IEncryptFileResponseMessage {

            /**
             * Constructs a new EncryptFileResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IEncryptFileResponseMessage);

            /** EncryptFileResponseMessage encryptedPath. */
            public encryptedPath: string;

            /**
             * Creates a new EncryptFileResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns EncryptFileResponseMessage instance
             */
            public static create(properties?: agentInterface.IEncryptFileResponseMessage): agentInterface.EncryptFileResponseMessage;

            /**
             * Encodes the specified EncryptFileResponseMessage message. Does not implicitly {@link agentInterface.EncryptFileResponseMessage.verify|verify} messages.
             * @param m EncryptFileResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IEncryptFileResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified EncryptFileResponseMessage message, length delimited. Does not implicitly {@link agentInterface.EncryptFileResponseMessage.verify|verify} messages.
             * @param message EncryptFileResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IEncryptFileResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an EncryptFileResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns EncryptFileResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.EncryptFileResponseMessage;

            /**
             * Decodes an EncryptFileResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns EncryptFileResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.EncryptFileResponseMessage;
        }

        /** Properties of a DecryptFileRequestMessage. */
        interface IDecryptFileRequestMessage {

            /** DecryptFileRequestMessage filePath */
            filePath?: (string|null);

            /** DecryptFileRequestMessage privateKeyPath */
            privateKeyPath?: (string|null);

            /** DecryptFileRequestMessage passphrase */
            passphrase?: (string|null);
        }

        /** Represents a DecryptFileRequestMessage. */
        class DecryptFileRequestMessage implements IDecryptFileRequestMessage {

            /**
             * Constructs a new DecryptFileRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IDecryptFileRequestMessage);

            /** DecryptFileRequestMessage filePath. */
            public filePath: string;

            /** DecryptFileRequestMessage privateKeyPath. */
            public privateKeyPath: string;

            /** DecryptFileRequestMessage passphrase. */
            public passphrase: string;

            /**
             * Creates a new DecryptFileRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns DecryptFileRequestMessage instance
             */
            public static create(properties?: agentInterface.IDecryptFileRequestMessage): agentInterface.DecryptFileRequestMessage;

            /**
             * Encodes the specified DecryptFileRequestMessage message. Does not implicitly {@link agentInterface.DecryptFileRequestMessage.verify|verify} messages.
             * @param m DecryptFileRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IDecryptFileRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DecryptFileRequestMessage message, length delimited. Does not implicitly {@link agentInterface.DecryptFileRequestMessage.verify|verify} messages.
             * @param message DecryptFileRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IDecryptFileRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DecryptFileRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns DecryptFileRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.DecryptFileRequestMessage;

            /**
             * Decodes a DecryptFileRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns DecryptFileRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.DecryptFileRequestMessage;
        }

        /** Properties of a DecryptFileResponseMessage. */
        interface IDecryptFileResponseMessage {

            /** DecryptFileResponseMessage decryptedPath */
            decryptedPath?: (string|null);
        }

        /** Represents a DecryptFileResponseMessage. */
        class DecryptFileResponseMessage implements IDecryptFileResponseMessage {

            /**
             * Constructs a new DecryptFileResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IDecryptFileResponseMessage);

            /** DecryptFileResponseMessage decryptedPath. */
            public decryptedPath: string;

            /**
             * Creates a new DecryptFileResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns DecryptFileResponseMessage instance
             */
            public static create(properties?: agentInterface.IDecryptFileResponseMessage): agentInterface.DecryptFileResponseMessage;

            /**
             * Encodes the specified DecryptFileResponseMessage message. Does not implicitly {@link agentInterface.DecryptFileResponseMessage.verify|verify} messages.
             * @param m DecryptFileResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IDecryptFileResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DecryptFileResponseMessage message, length delimited. Does not implicitly {@link agentInterface.DecryptFileResponseMessage.verify|verify} messages.
             * @param message DecryptFileResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IDecryptFileResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DecryptFileResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns DecryptFileResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.DecryptFileResponseMessage;

            /**
             * Decodes a DecryptFileResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns DecryptFileResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.DecryptFileResponseMessage;
        }

        /** Properties of a ListVaultsRequestMessage. */
        interface IListVaultsRequestMessage {
        }

        /** Represents a ListVaultsRequestMessage. */
        class ListVaultsRequestMessage implements IListVaultsRequestMessage {

            /**
             * Constructs a new ListVaultsRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IListVaultsRequestMessage);

            /**
             * Creates a new ListVaultsRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ListVaultsRequestMessage instance
             */
            public static create(properties?: agentInterface.IListVaultsRequestMessage): agentInterface.ListVaultsRequestMessage;

            /**
             * Encodes the specified ListVaultsRequestMessage message. Does not implicitly {@link agentInterface.ListVaultsRequestMessage.verify|verify} messages.
             * @param m ListVaultsRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IListVaultsRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ListVaultsRequestMessage message, length delimited. Does not implicitly {@link agentInterface.ListVaultsRequestMessage.verify|verify} messages.
             * @param message ListVaultsRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IListVaultsRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ListVaultsRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ListVaultsRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.ListVaultsRequestMessage;

            /**
             * Decodes a ListVaultsRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ListVaultsRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.ListVaultsRequestMessage;
        }

        /** Properties of a ListVaultsResponseMessage. */
        interface IListVaultsResponseMessage {

            /** ListVaultsResponseMessage vaultNames */
            vaultNames?: (string[]|null);
        }

        /** Represents a ListVaultsResponseMessage. */
        class ListVaultsResponseMessage implements IListVaultsResponseMessage {

            /**
             * Constructs a new ListVaultsResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IListVaultsResponseMessage);

            /** ListVaultsResponseMessage vaultNames. */
            public vaultNames: string[];

            /**
             * Creates a new ListVaultsResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ListVaultsResponseMessage instance
             */
            public static create(properties?: agentInterface.IListVaultsResponseMessage): agentInterface.ListVaultsResponseMessage;

            /**
             * Encodes the specified ListVaultsResponseMessage message. Does not implicitly {@link agentInterface.ListVaultsResponseMessage.verify|verify} messages.
             * @param m ListVaultsResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IListVaultsResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ListVaultsResponseMessage message, length delimited. Does not implicitly {@link agentInterface.ListVaultsResponseMessage.verify|verify} messages.
             * @param message ListVaultsResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IListVaultsResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ListVaultsResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ListVaultsResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.ListVaultsResponseMessage;

            /**
             * Decodes a ListVaultsResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ListVaultsResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.ListVaultsResponseMessage;
        }

        /** Properties of a ScanVaultNamesRequestMessage. */
        interface IScanVaultNamesRequestMessage {

            /** ScanVaultNamesRequestMessage publicKey */
            publicKey?: (string|null);
        }

        /** Represents a ScanVaultNamesRequestMessage. */
        class ScanVaultNamesRequestMessage implements IScanVaultNamesRequestMessage {

            /**
             * Constructs a new ScanVaultNamesRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IScanVaultNamesRequestMessage);

            /** ScanVaultNamesRequestMessage publicKey. */
            public publicKey: string;

            /**
             * Creates a new ScanVaultNamesRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ScanVaultNamesRequestMessage instance
             */
            public static create(properties?: agentInterface.IScanVaultNamesRequestMessage): agentInterface.ScanVaultNamesRequestMessage;

            /**
             * Encodes the specified ScanVaultNamesRequestMessage message. Does not implicitly {@link agentInterface.ScanVaultNamesRequestMessage.verify|verify} messages.
             * @param m ScanVaultNamesRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IScanVaultNamesRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ScanVaultNamesRequestMessage message, length delimited. Does not implicitly {@link agentInterface.ScanVaultNamesRequestMessage.verify|verify} messages.
             * @param message ScanVaultNamesRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IScanVaultNamesRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ScanVaultNamesRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ScanVaultNamesRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.ScanVaultNamesRequestMessage;

            /**
             * Decodes a ScanVaultNamesRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ScanVaultNamesRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.ScanVaultNamesRequestMessage;
        }

        /** Properties of a ScanVaultNamesResponseMessage. */
        interface IScanVaultNamesResponseMessage {

            /** ScanVaultNamesResponseMessage vaultNames */
            vaultNames?: (string[]|null);
        }

        /** Represents a ScanVaultNamesResponseMessage. */
        class ScanVaultNamesResponseMessage implements IScanVaultNamesResponseMessage {

            /**
             * Constructs a new ScanVaultNamesResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IScanVaultNamesResponseMessage);

            /** ScanVaultNamesResponseMessage vaultNames. */
            public vaultNames: string[];

            /**
             * Creates a new ScanVaultNamesResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ScanVaultNamesResponseMessage instance
             */
            public static create(properties?: agentInterface.IScanVaultNamesResponseMessage): agentInterface.ScanVaultNamesResponseMessage;

            /**
             * Encodes the specified ScanVaultNamesResponseMessage message. Does not implicitly {@link agentInterface.ScanVaultNamesResponseMessage.verify|verify} messages.
             * @param m ScanVaultNamesResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IScanVaultNamesResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ScanVaultNamesResponseMessage message, length delimited. Does not implicitly {@link agentInterface.ScanVaultNamesResponseMessage.verify|verify} messages.
             * @param message ScanVaultNamesResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IScanVaultNamesResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ScanVaultNamesResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ScanVaultNamesResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.ScanVaultNamesResponseMessage;

            /**
             * Decodes a ScanVaultNamesResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ScanVaultNamesResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.ScanVaultNamesResponseMessage;
        }

        /** Properties of a NewVaultRequestMessage. */
        interface INewVaultRequestMessage {

            /** NewVaultRequestMessage vaultName */
            vaultName?: (string|null);
        }

        /** Represents a NewVaultRequestMessage. */
        class NewVaultRequestMessage implements INewVaultRequestMessage {

            /**
             * Constructs a new NewVaultRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.INewVaultRequestMessage);

            /** NewVaultRequestMessage vaultName. */
            public vaultName: string;

            /**
             * Creates a new NewVaultRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NewVaultRequestMessage instance
             */
            public static create(properties?: agentInterface.INewVaultRequestMessage): agentInterface.NewVaultRequestMessage;

            /**
             * Encodes the specified NewVaultRequestMessage message. Does not implicitly {@link agentInterface.NewVaultRequestMessage.verify|verify} messages.
             * @param m NewVaultRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.INewVaultRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NewVaultRequestMessage message, length delimited. Does not implicitly {@link agentInterface.NewVaultRequestMessage.verify|verify} messages.
             * @param message NewVaultRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.INewVaultRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NewVaultRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns NewVaultRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.NewVaultRequestMessage;

            /**
             * Decodes a NewVaultRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns NewVaultRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.NewVaultRequestMessage;
        }

        /** Properties of a NewVaultResponseMessage. */
        interface INewVaultResponseMessage {

            /** NewVaultResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents a NewVaultResponseMessage. */
        class NewVaultResponseMessage implements INewVaultResponseMessage {

            /**
             * Constructs a new NewVaultResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.INewVaultResponseMessage);

            /** NewVaultResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new NewVaultResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NewVaultResponseMessage instance
             */
            public static create(properties?: agentInterface.INewVaultResponseMessage): agentInterface.NewVaultResponseMessage;

            /**
             * Encodes the specified NewVaultResponseMessage message. Does not implicitly {@link agentInterface.NewVaultResponseMessage.verify|verify} messages.
             * @param m NewVaultResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.INewVaultResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NewVaultResponseMessage message, length delimited. Does not implicitly {@link agentInterface.NewVaultResponseMessage.verify|verify} messages.
             * @param message NewVaultResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.INewVaultResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NewVaultResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns NewVaultResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.NewVaultResponseMessage;

            /**
             * Decodes a NewVaultResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns NewVaultResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.NewVaultResponseMessage;
        }

        /** Properties of a PullVaultRequestMessage. */
        interface IPullVaultRequestMessage {

            /** PullVaultRequestMessage vaultName */
            vaultName?: (string|null);

            /** PullVaultRequestMessage publicKey */
            publicKey?: (string|null);
        }

        /** Represents a PullVaultRequestMessage. */
        class PullVaultRequestMessage implements IPullVaultRequestMessage {

            /**
             * Constructs a new PullVaultRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IPullVaultRequestMessage);

            /** PullVaultRequestMessage vaultName. */
            public vaultName: string;

            /** PullVaultRequestMessage publicKey. */
            public publicKey: string;

            /**
             * Creates a new PullVaultRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PullVaultRequestMessage instance
             */
            public static create(properties?: agentInterface.IPullVaultRequestMessage): agentInterface.PullVaultRequestMessage;

            /**
             * Encodes the specified PullVaultRequestMessage message. Does not implicitly {@link agentInterface.PullVaultRequestMessage.verify|verify} messages.
             * @param m PullVaultRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IPullVaultRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PullVaultRequestMessage message, length delimited. Does not implicitly {@link agentInterface.PullVaultRequestMessage.verify|verify} messages.
             * @param message PullVaultRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IPullVaultRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PullVaultRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PullVaultRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.PullVaultRequestMessage;

            /**
             * Decodes a PullVaultRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PullVaultRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.PullVaultRequestMessage;
        }

        /** Properties of a PullVaultResponseMessage. */
        interface IPullVaultResponseMessage {

            /** PullVaultResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents a PullVaultResponseMessage. */
        class PullVaultResponseMessage implements IPullVaultResponseMessage {

            /**
             * Constructs a new PullVaultResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IPullVaultResponseMessage);

            /** PullVaultResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new PullVaultResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PullVaultResponseMessage instance
             */
            public static create(properties?: agentInterface.IPullVaultResponseMessage): agentInterface.PullVaultResponseMessage;

            /**
             * Encodes the specified PullVaultResponseMessage message. Does not implicitly {@link agentInterface.PullVaultResponseMessage.verify|verify} messages.
             * @param m PullVaultResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IPullVaultResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PullVaultResponseMessage message, length delimited. Does not implicitly {@link agentInterface.PullVaultResponseMessage.verify|verify} messages.
             * @param message PullVaultResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IPullVaultResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PullVaultResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PullVaultResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.PullVaultResponseMessage;

            /**
             * Decodes a PullVaultResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PullVaultResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.PullVaultResponseMessage;
        }

        /** Properties of a DestroyVaultRequestMessage. */
        interface IDestroyVaultRequestMessage {

            /** DestroyVaultRequestMessage vaultName */
            vaultName?: (string|null);
        }

        /** Represents a DestroyVaultRequestMessage. */
        class DestroyVaultRequestMessage implements IDestroyVaultRequestMessage {

            /**
             * Constructs a new DestroyVaultRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IDestroyVaultRequestMessage);

            /** DestroyVaultRequestMessage vaultName. */
            public vaultName: string;

            /**
             * Creates a new DestroyVaultRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns DestroyVaultRequestMessage instance
             */
            public static create(properties?: agentInterface.IDestroyVaultRequestMessage): agentInterface.DestroyVaultRequestMessage;

            /**
             * Encodes the specified DestroyVaultRequestMessage message. Does not implicitly {@link agentInterface.DestroyVaultRequestMessage.verify|verify} messages.
             * @param m DestroyVaultRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IDestroyVaultRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DestroyVaultRequestMessage message, length delimited. Does not implicitly {@link agentInterface.DestroyVaultRequestMessage.verify|verify} messages.
             * @param message DestroyVaultRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IDestroyVaultRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DestroyVaultRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns DestroyVaultRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.DestroyVaultRequestMessage;

            /**
             * Decodes a DestroyVaultRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns DestroyVaultRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.DestroyVaultRequestMessage;
        }

        /** Properties of a DestroyVaultResponseMessage. */
        interface IDestroyVaultResponseMessage {

            /** DestroyVaultResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents a DestroyVaultResponseMessage. */
        class DestroyVaultResponseMessage implements IDestroyVaultResponseMessage {

            /**
             * Constructs a new DestroyVaultResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IDestroyVaultResponseMessage);

            /** DestroyVaultResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new DestroyVaultResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns DestroyVaultResponseMessage instance
             */
            public static create(properties?: agentInterface.IDestroyVaultResponseMessage): agentInterface.DestroyVaultResponseMessage;

            /**
             * Encodes the specified DestroyVaultResponseMessage message. Does not implicitly {@link agentInterface.DestroyVaultResponseMessage.verify|verify} messages.
             * @param m DestroyVaultResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IDestroyVaultResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DestroyVaultResponseMessage message, length delimited. Does not implicitly {@link agentInterface.DestroyVaultResponseMessage.verify|verify} messages.
             * @param message DestroyVaultResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IDestroyVaultResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DestroyVaultResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns DestroyVaultResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.DestroyVaultResponseMessage;

            /**
             * Decodes a DestroyVaultResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns DestroyVaultResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.DestroyVaultResponseMessage;
        }

        /** Properties of a ListSecretsRequestMessage. */
        interface IListSecretsRequestMessage {

            /** ListSecretsRequestMessage vaultName */
            vaultName?: (string|null);
        }

        /** Represents a ListSecretsRequestMessage. */
        class ListSecretsRequestMessage implements IListSecretsRequestMessage {

            /**
             * Constructs a new ListSecretsRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IListSecretsRequestMessage);

            /** ListSecretsRequestMessage vaultName. */
            public vaultName: string;

            /**
             * Creates a new ListSecretsRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ListSecretsRequestMessage instance
             */
            public static create(properties?: agentInterface.IListSecretsRequestMessage): agentInterface.ListSecretsRequestMessage;

            /**
             * Encodes the specified ListSecretsRequestMessage message. Does not implicitly {@link agentInterface.ListSecretsRequestMessage.verify|verify} messages.
             * @param m ListSecretsRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IListSecretsRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ListSecretsRequestMessage message, length delimited. Does not implicitly {@link agentInterface.ListSecretsRequestMessage.verify|verify} messages.
             * @param message ListSecretsRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IListSecretsRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ListSecretsRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ListSecretsRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.ListSecretsRequestMessage;

            /**
             * Decodes a ListSecretsRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ListSecretsRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.ListSecretsRequestMessage;
        }

        /** Properties of a ListSecretsResponseMessage. */
        interface IListSecretsResponseMessage {

            /** ListSecretsResponseMessage secretNames */
            secretNames?: (string[]|null);
        }

        /** Represents a ListSecretsResponseMessage. */
        class ListSecretsResponseMessage implements IListSecretsResponseMessage {

            /**
             * Constructs a new ListSecretsResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IListSecretsResponseMessage);

            /** ListSecretsResponseMessage secretNames. */
            public secretNames: string[];

            /**
             * Creates a new ListSecretsResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ListSecretsResponseMessage instance
             */
            public static create(properties?: agentInterface.IListSecretsResponseMessage): agentInterface.ListSecretsResponseMessage;

            /**
             * Encodes the specified ListSecretsResponseMessage message. Does not implicitly {@link agentInterface.ListSecretsResponseMessage.verify|verify} messages.
             * @param m ListSecretsResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IListSecretsResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ListSecretsResponseMessage message, length delimited. Does not implicitly {@link agentInterface.ListSecretsResponseMessage.verify|verify} messages.
             * @param message ListSecretsResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IListSecretsResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ListSecretsResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ListSecretsResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.ListSecretsResponseMessage;

            /**
             * Decodes a ListSecretsResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ListSecretsResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.ListSecretsResponseMessage;
        }

        /** Properties of a CreateSecretRequestMessage. */
        interface ICreateSecretRequestMessage {

            /** CreateSecretRequestMessage vaultName */
            vaultName?: (string|null);

            /** CreateSecretRequestMessage secretName */
            secretName?: (string|null);

            /** CreateSecretRequestMessage secretPath */
            secretPath?: (string|null);

            /** CreateSecretRequestMessage secretContent */
            secretContent?: (Uint8Array|null);
        }

        /** Represents a CreateSecretRequestMessage. */
        class CreateSecretRequestMessage implements ICreateSecretRequestMessage {

            /**
             * Constructs a new CreateSecretRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.ICreateSecretRequestMessage);

            /** CreateSecretRequestMessage vaultName. */
            public vaultName: string;

            /** CreateSecretRequestMessage secretName. */
            public secretName: string;

            /** CreateSecretRequestMessage secretPath. */
            public secretPath: string;

            /** CreateSecretRequestMessage secretContent. */
            public secretContent: Uint8Array;

            /**
             * Creates a new CreateSecretRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CreateSecretRequestMessage instance
             */
            public static create(properties?: agentInterface.ICreateSecretRequestMessage): agentInterface.CreateSecretRequestMessage;

            /**
             * Encodes the specified CreateSecretRequestMessage message. Does not implicitly {@link agentInterface.CreateSecretRequestMessage.verify|verify} messages.
             * @param m CreateSecretRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.ICreateSecretRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CreateSecretRequestMessage message, length delimited. Does not implicitly {@link agentInterface.CreateSecretRequestMessage.verify|verify} messages.
             * @param message CreateSecretRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.ICreateSecretRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CreateSecretRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns CreateSecretRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.CreateSecretRequestMessage;

            /**
             * Decodes a CreateSecretRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns CreateSecretRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.CreateSecretRequestMessage;
        }

        /** Properties of a CreateSecretResponseMessage. */
        interface ICreateSecretResponseMessage {

            /** CreateSecretResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents a CreateSecretResponseMessage. */
        class CreateSecretResponseMessage implements ICreateSecretResponseMessage {

            /**
             * Constructs a new CreateSecretResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.ICreateSecretResponseMessage);

            /** CreateSecretResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new CreateSecretResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CreateSecretResponseMessage instance
             */
            public static create(properties?: agentInterface.ICreateSecretResponseMessage): agentInterface.CreateSecretResponseMessage;

            /**
             * Encodes the specified CreateSecretResponseMessage message. Does not implicitly {@link agentInterface.CreateSecretResponseMessage.verify|verify} messages.
             * @param m CreateSecretResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.ICreateSecretResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CreateSecretResponseMessage message, length delimited. Does not implicitly {@link agentInterface.CreateSecretResponseMessage.verify|verify} messages.
             * @param message CreateSecretResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.ICreateSecretResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CreateSecretResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns CreateSecretResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.CreateSecretResponseMessage;

            /**
             * Decodes a CreateSecretResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns CreateSecretResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.CreateSecretResponseMessage;
        }

        /** Properties of a DestroySecretRequestMessage. */
        interface IDestroySecretRequestMessage {

            /** DestroySecretRequestMessage vaultName */
            vaultName?: (string|null);

            /** DestroySecretRequestMessage secretName */
            secretName?: (string|null);
        }

        /** Represents a DestroySecretRequestMessage. */
        class DestroySecretRequestMessage implements IDestroySecretRequestMessage {

            /**
             * Constructs a new DestroySecretRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IDestroySecretRequestMessage);

            /** DestroySecretRequestMessage vaultName. */
            public vaultName: string;

            /** DestroySecretRequestMessage secretName. */
            public secretName: string;

            /**
             * Creates a new DestroySecretRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns DestroySecretRequestMessage instance
             */
            public static create(properties?: agentInterface.IDestroySecretRequestMessage): agentInterface.DestroySecretRequestMessage;

            /**
             * Encodes the specified DestroySecretRequestMessage message. Does not implicitly {@link agentInterface.DestroySecretRequestMessage.verify|verify} messages.
             * @param m DestroySecretRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IDestroySecretRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DestroySecretRequestMessage message, length delimited. Does not implicitly {@link agentInterface.DestroySecretRequestMessage.verify|verify} messages.
             * @param message DestroySecretRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IDestroySecretRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DestroySecretRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns DestroySecretRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.DestroySecretRequestMessage;

            /**
             * Decodes a DestroySecretRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns DestroySecretRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.DestroySecretRequestMessage;
        }

        /** Properties of a DestroySecretResponseMessage. */
        interface IDestroySecretResponseMessage {

            /** DestroySecretResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents a DestroySecretResponseMessage. */
        class DestroySecretResponseMessage implements IDestroySecretResponseMessage {

            /**
             * Constructs a new DestroySecretResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IDestroySecretResponseMessage);

            /** DestroySecretResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new DestroySecretResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns DestroySecretResponseMessage instance
             */
            public static create(properties?: agentInterface.IDestroySecretResponseMessage): agentInterface.DestroySecretResponseMessage;

            /**
             * Encodes the specified DestroySecretResponseMessage message. Does not implicitly {@link agentInterface.DestroySecretResponseMessage.verify|verify} messages.
             * @param m DestroySecretResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IDestroySecretResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DestroySecretResponseMessage message, length delimited. Does not implicitly {@link agentInterface.DestroySecretResponseMessage.verify|verify} messages.
             * @param message DestroySecretResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IDestroySecretResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DestroySecretResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns DestroySecretResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.DestroySecretResponseMessage;

            /**
             * Decodes a DestroySecretResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns DestroySecretResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.DestroySecretResponseMessage;
        }

        /** Properties of a GetSecretRequestMessage. */
        interface IGetSecretRequestMessage {

            /** GetSecretRequestMessage vaultName */
            vaultName?: (string|null);

            /** GetSecretRequestMessage secretName */
            secretName?: (string|null);
        }

        /** Represents a GetSecretRequestMessage. */
        class GetSecretRequestMessage implements IGetSecretRequestMessage {

            /**
             * Constructs a new GetSecretRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IGetSecretRequestMessage);

            /** GetSecretRequestMessage vaultName. */
            public vaultName: string;

            /** GetSecretRequestMessage secretName. */
            public secretName: string;

            /**
             * Creates a new GetSecretRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GetSecretRequestMessage instance
             */
            public static create(properties?: agentInterface.IGetSecretRequestMessage): agentInterface.GetSecretRequestMessage;

            /**
             * Encodes the specified GetSecretRequestMessage message. Does not implicitly {@link agentInterface.GetSecretRequestMessage.verify|verify} messages.
             * @param m GetSecretRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IGetSecretRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GetSecretRequestMessage message, length delimited. Does not implicitly {@link agentInterface.GetSecretRequestMessage.verify|verify} messages.
             * @param message GetSecretRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IGetSecretRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GetSecretRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns GetSecretRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.GetSecretRequestMessage;

            /**
             * Decodes a GetSecretRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GetSecretRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.GetSecretRequestMessage;
        }

        /** Properties of a GetSecretResponseMessage. */
        interface IGetSecretResponseMessage {

            /** GetSecretResponseMessage secret */
            secret?: (Uint8Array|null);
        }

        /** Represents a GetSecretResponseMessage. */
        class GetSecretResponseMessage implements IGetSecretResponseMessage {

            /**
             * Constructs a new GetSecretResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IGetSecretResponseMessage);

            /** GetSecretResponseMessage secret. */
            public secret: Uint8Array;

            /**
             * Creates a new GetSecretResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GetSecretResponseMessage instance
             */
            public static create(properties?: agentInterface.IGetSecretResponseMessage): agentInterface.GetSecretResponseMessage;

            /**
             * Encodes the specified GetSecretResponseMessage message. Does not implicitly {@link agentInterface.GetSecretResponseMessage.verify|verify} messages.
             * @param m GetSecretResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IGetSecretResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GetSecretResponseMessage message, length delimited. Does not implicitly {@link agentInterface.GetSecretResponseMessage.verify|verify} messages.
             * @param message GetSecretResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IGetSecretResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GetSecretResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns GetSecretResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.GetSecretResponseMessage;

            /**
             * Decodes a GetSecretResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GetSecretResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.GetSecretResponseMessage;
        }

        /** Properties of a DeriveKeyRequestMessage. */
        interface IDeriveKeyRequestMessage {

            /** DeriveKeyRequestMessage vaultName */
            vaultName?: (string|null);

            /** DeriveKeyRequestMessage keyName */
            keyName?: (string|null);

            /** DeriveKeyRequestMessage passphrase */
            passphrase?: (string|null);
        }

        /** Represents a DeriveKeyRequestMessage. */
        class DeriveKeyRequestMessage implements IDeriveKeyRequestMessage {

            /**
             * Constructs a new DeriveKeyRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IDeriveKeyRequestMessage);

            /** DeriveKeyRequestMessage vaultName. */
            public vaultName: string;

            /** DeriveKeyRequestMessage keyName. */
            public keyName: string;

            /** DeriveKeyRequestMessage passphrase. */
            public passphrase: string;

            /**
             * Creates a new DeriveKeyRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns DeriveKeyRequestMessage instance
             */
            public static create(properties?: agentInterface.IDeriveKeyRequestMessage): agentInterface.DeriveKeyRequestMessage;

            /**
             * Encodes the specified DeriveKeyRequestMessage message. Does not implicitly {@link agentInterface.DeriveKeyRequestMessage.verify|verify} messages.
             * @param m DeriveKeyRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IDeriveKeyRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DeriveKeyRequestMessage message, length delimited. Does not implicitly {@link agentInterface.DeriveKeyRequestMessage.verify|verify} messages.
             * @param message DeriveKeyRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IDeriveKeyRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DeriveKeyRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns DeriveKeyRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.DeriveKeyRequestMessage;

            /**
             * Decodes a DeriveKeyRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns DeriveKeyRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.DeriveKeyRequestMessage;
        }

        /** Properties of a DeriveKeyResponseMessage. */
        interface IDeriveKeyResponseMessage {

            /** DeriveKeyResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents a DeriveKeyResponseMessage. */
        class DeriveKeyResponseMessage implements IDeriveKeyResponseMessage {

            /**
             * Constructs a new DeriveKeyResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IDeriveKeyResponseMessage);

            /** DeriveKeyResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new DeriveKeyResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns DeriveKeyResponseMessage instance
             */
            public static create(properties?: agentInterface.IDeriveKeyResponseMessage): agentInterface.DeriveKeyResponseMessage;

            /**
             * Encodes the specified DeriveKeyResponseMessage message. Does not implicitly {@link agentInterface.DeriveKeyResponseMessage.verify|verify} messages.
             * @param m DeriveKeyResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IDeriveKeyResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DeriveKeyResponseMessage message, length delimited. Does not implicitly {@link agentInterface.DeriveKeyResponseMessage.verify|verify} messages.
             * @param message DeriveKeyResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IDeriveKeyResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DeriveKeyResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns DeriveKeyResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.DeriveKeyResponseMessage;

            /**
             * Decodes a DeriveKeyResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns DeriveKeyResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.DeriveKeyResponseMessage;
        }

        /** Properties of a ListKeysRequestMessage. */
        interface IListKeysRequestMessage {
        }

        /** Represents a ListKeysRequestMessage. */
        class ListKeysRequestMessage implements IListKeysRequestMessage {

            /**
             * Constructs a new ListKeysRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IListKeysRequestMessage);

            /**
             * Creates a new ListKeysRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ListKeysRequestMessage instance
             */
            public static create(properties?: agentInterface.IListKeysRequestMessage): agentInterface.ListKeysRequestMessage;

            /**
             * Encodes the specified ListKeysRequestMessage message. Does not implicitly {@link agentInterface.ListKeysRequestMessage.verify|verify} messages.
             * @param m ListKeysRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IListKeysRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ListKeysRequestMessage message, length delimited. Does not implicitly {@link agentInterface.ListKeysRequestMessage.verify|verify} messages.
             * @param message ListKeysRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IListKeysRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ListKeysRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ListKeysRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.ListKeysRequestMessage;

            /**
             * Decodes a ListKeysRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ListKeysRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.ListKeysRequestMessage;
        }

        /** Properties of a ListKeysResponseMessage. */
        interface IListKeysResponseMessage {

            /** ListKeysResponseMessage keyNames */
            keyNames?: (string[]|null);
        }

        /** Represents a ListKeysResponseMessage. */
        class ListKeysResponseMessage implements IListKeysResponseMessage {

            /**
             * Constructs a new ListKeysResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IListKeysResponseMessage);

            /** ListKeysResponseMessage keyNames. */
            public keyNames: string[];

            /**
             * Creates a new ListKeysResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ListKeysResponseMessage instance
             */
            public static create(properties?: agentInterface.IListKeysResponseMessage): agentInterface.ListKeysResponseMessage;

            /**
             * Encodes the specified ListKeysResponseMessage message. Does not implicitly {@link agentInterface.ListKeysResponseMessage.verify|verify} messages.
             * @param m ListKeysResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IListKeysResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ListKeysResponseMessage message, length delimited. Does not implicitly {@link agentInterface.ListKeysResponseMessage.verify|verify} messages.
             * @param message ListKeysResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IListKeysResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ListKeysResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ListKeysResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.ListKeysResponseMessage;

            /**
             * Decodes a ListKeysResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ListKeysResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.ListKeysResponseMessage;
        }

        /** Properties of a GetKeyRequestMessage. */
        interface IGetKeyRequestMessage {

            /** GetKeyRequestMessage keyName */
            keyName?: (string|null);
        }

        /** Represents a GetKeyRequestMessage. */
        class GetKeyRequestMessage implements IGetKeyRequestMessage {

            /**
             * Constructs a new GetKeyRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IGetKeyRequestMessage);

            /** GetKeyRequestMessage keyName. */
            public keyName: string;

            /**
             * Creates a new GetKeyRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GetKeyRequestMessage instance
             */
            public static create(properties?: agentInterface.IGetKeyRequestMessage): agentInterface.GetKeyRequestMessage;

            /**
             * Encodes the specified GetKeyRequestMessage message. Does not implicitly {@link agentInterface.GetKeyRequestMessage.verify|verify} messages.
             * @param m GetKeyRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IGetKeyRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GetKeyRequestMessage message, length delimited. Does not implicitly {@link agentInterface.GetKeyRequestMessage.verify|verify} messages.
             * @param message GetKeyRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IGetKeyRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GetKeyRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns GetKeyRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.GetKeyRequestMessage;

            /**
             * Decodes a GetKeyRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GetKeyRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.GetKeyRequestMessage;
        }

        /** Properties of a GetKeyResponseMessage. */
        interface IGetKeyResponseMessage {

            /** GetKeyResponseMessage keyName */
            keyName?: (string|null);

            /** GetKeyResponseMessage keyContent */
            keyContent?: (string|null);
        }

        /** Represents a GetKeyResponseMessage. */
        class GetKeyResponseMessage implements IGetKeyResponseMessage {

            /**
             * Constructs a new GetKeyResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IGetKeyResponseMessage);

            /** GetKeyResponseMessage keyName. */
            public keyName: string;

            /** GetKeyResponseMessage keyContent. */
            public keyContent: string;

            /**
             * Creates a new GetKeyResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GetKeyResponseMessage instance
             */
            public static create(properties?: agentInterface.IGetKeyResponseMessage): agentInterface.GetKeyResponseMessage;

            /**
             * Encodes the specified GetKeyResponseMessage message. Does not implicitly {@link agentInterface.GetKeyResponseMessage.verify|verify} messages.
             * @param m GetKeyResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IGetKeyResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GetKeyResponseMessage message, length delimited. Does not implicitly {@link agentInterface.GetKeyResponseMessage.verify|verify} messages.
             * @param message GetKeyResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IGetKeyResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GetKeyResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns GetKeyResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.GetKeyResponseMessage;

            /**
             * Decodes a GetKeyResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GetKeyResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.GetKeyResponseMessage;
        }

        /** Properties of a GetPrimaryKeyPairRequestMessage. */
        interface IGetPrimaryKeyPairRequestMessage {

            /** GetPrimaryKeyPairRequestMessage includePrivateKey */
            includePrivateKey?: (boolean|null);
        }

        /** Represents a GetPrimaryKeyPairRequestMessage. */
        class GetPrimaryKeyPairRequestMessage implements IGetPrimaryKeyPairRequestMessage {

            /**
             * Constructs a new GetPrimaryKeyPairRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IGetPrimaryKeyPairRequestMessage);

            /** GetPrimaryKeyPairRequestMessage includePrivateKey. */
            public includePrivateKey: boolean;

            /**
             * Creates a new GetPrimaryKeyPairRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GetPrimaryKeyPairRequestMessage instance
             */
            public static create(properties?: agentInterface.IGetPrimaryKeyPairRequestMessage): agentInterface.GetPrimaryKeyPairRequestMessage;

            /**
             * Encodes the specified GetPrimaryKeyPairRequestMessage message. Does not implicitly {@link agentInterface.GetPrimaryKeyPairRequestMessage.verify|verify} messages.
             * @param m GetPrimaryKeyPairRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IGetPrimaryKeyPairRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GetPrimaryKeyPairRequestMessage message, length delimited. Does not implicitly {@link agentInterface.GetPrimaryKeyPairRequestMessage.verify|verify} messages.
             * @param message GetPrimaryKeyPairRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IGetPrimaryKeyPairRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GetPrimaryKeyPairRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns GetPrimaryKeyPairRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.GetPrimaryKeyPairRequestMessage;

            /**
             * Decodes a GetPrimaryKeyPairRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GetPrimaryKeyPairRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.GetPrimaryKeyPairRequestMessage;
        }

        /** Properties of a GetPrimaryKeyPairResponseMessage. */
        interface IGetPrimaryKeyPairResponseMessage {

            /** GetPrimaryKeyPairResponseMessage publicKey */
            publicKey?: (string|null);

            /** GetPrimaryKeyPairResponseMessage privateKey */
            privateKey?: (string|null);
        }

        /** Represents a GetPrimaryKeyPairResponseMessage. */
        class GetPrimaryKeyPairResponseMessage implements IGetPrimaryKeyPairResponseMessage {

            /**
             * Constructs a new GetPrimaryKeyPairResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IGetPrimaryKeyPairResponseMessage);

            /** GetPrimaryKeyPairResponseMessage publicKey. */
            public publicKey: string;

            /** GetPrimaryKeyPairResponseMessage privateKey. */
            public privateKey: string;

            /**
             * Creates a new GetPrimaryKeyPairResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GetPrimaryKeyPairResponseMessage instance
             */
            public static create(properties?: agentInterface.IGetPrimaryKeyPairResponseMessage): agentInterface.GetPrimaryKeyPairResponseMessage;

            /**
             * Encodes the specified GetPrimaryKeyPairResponseMessage message. Does not implicitly {@link agentInterface.GetPrimaryKeyPairResponseMessage.verify|verify} messages.
             * @param m GetPrimaryKeyPairResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IGetPrimaryKeyPairResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GetPrimaryKeyPairResponseMessage message, length delimited. Does not implicitly {@link agentInterface.GetPrimaryKeyPairResponseMessage.verify|verify} messages.
             * @param message GetPrimaryKeyPairResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IGetPrimaryKeyPairResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GetPrimaryKeyPairResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns GetPrimaryKeyPairResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.GetPrimaryKeyPairResponseMessage;

            /**
             * Decodes a GetPrimaryKeyPairResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GetPrimaryKeyPairResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.GetPrimaryKeyPairResponseMessage;
        }

        /** Properties of an UpdateSecretRequestMessage. */
        interface IUpdateSecretRequestMessage {

            /** UpdateSecretRequestMessage vaultName */
            vaultName?: (string|null);

            /** UpdateSecretRequestMessage secretName */
            secretName?: (string|null);

            /** UpdateSecretRequestMessage secretPath */
            secretPath?: (string|null);

            /** UpdateSecretRequestMessage secretContent */
            secretContent?: (Uint8Array|null);
        }

        /** Represents an UpdateSecretRequestMessage. */
        class UpdateSecretRequestMessage implements IUpdateSecretRequestMessage {

            /**
             * Constructs a new UpdateSecretRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IUpdateSecretRequestMessage);

            /** UpdateSecretRequestMessage vaultName. */
            public vaultName: string;

            /** UpdateSecretRequestMessage secretName. */
            public secretName: string;

            /** UpdateSecretRequestMessage secretPath. */
            public secretPath: string;

            /** UpdateSecretRequestMessage secretContent. */
            public secretContent: Uint8Array;

            /**
             * Creates a new UpdateSecretRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns UpdateSecretRequestMessage instance
             */
            public static create(properties?: agentInterface.IUpdateSecretRequestMessage): agentInterface.UpdateSecretRequestMessage;

            /**
             * Encodes the specified UpdateSecretRequestMessage message. Does not implicitly {@link agentInterface.UpdateSecretRequestMessage.verify|verify} messages.
             * @param m UpdateSecretRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IUpdateSecretRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified UpdateSecretRequestMessage message, length delimited. Does not implicitly {@link agentInterface.UpdateSecretRequestMessage.verify|verify} messages.
             * @param message UpdateSecretRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IUpdateSecretRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an UpdateSecretRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns UpdateSecretRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.UpdateSecretRequestMessage;

            /**
             * Decodes an UpdateSecretRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns UpdateSecretRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.UpdateSecretRequestMessage;
        }

        /** Properties of an UpdateSecretResponseMessage. */
        interface IUpdateSecretResponseMessage {

            /** UpdateSecretResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents an UpdateSecretResponseMessage. */
        class UpdateSecretResponseMessage implements IUpdateSecretResponseMessage {

            /**
             * Constructs a new UpdateSecretResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IUpdateSecretResponseMessage);

            /** UpdateSecretResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new UpdateSecretResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns UpdateSecretResponseMessage instance
             */
            public static create(properties?: agentInterface.IUpdateSecretResponseMessage): agentInterface.UpdateSecretResponseMessage;

            /**
             * Encodes the specified UpdateSecretResponseMessage message. Does not implicitly {@link agentInterface.UpdateSecretResponseMessage.verify|verify} messages.
             * @param m UpdateSecretResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IUpdateSecretResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified UpdateSecretResponseMessage message, length delimited. Does not implicitly {@link agentInterface.UpdateSecretResponseMessage.verify|verify} messages.
             * @param message UpdateSecretResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IUpdateSecretResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an UpdateSecretResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns UpdateSecretResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.UpdateSecretResponseMessage;

            /**
             * Decodes an UpdateSecretResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns UpdateSecretResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.UpdateSecretResponseMessage;
        }

        /** Properties of a DeleteKeyRequestMessage. */
        interface IDeleteKeyRequestMessage {

            /** DeleteKeyRequestMessage keyName */
            keyName?: (string|null);
        }

        /** Represents a DeleteKeyRequestMessage. */
        class DeleteKeyRequestMessage implements IDeleteKeyRequestMessage {

            /**
             * Constructs a new DeleteKeyRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IDeleteKeyRequestMessage);

            /** DeleteKeyRequestMessage keyName. */
            public keyName: string;

            /**
             * Creates a new DeleteKeyRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns DeleteKeyRequestMessage instance
             */
            public static create(properties?: agentInterface.IDeleteKeyRequestMessage): agentInterface.DeleteKeyRequestMessage;

            /**
             * Encodes the specified DeleteKeyRequestMessage message. Does not implicitly {@link agentInterface.DeleteKeyRequestMessage.verify|verify} messages.
             * @param m DeleteKeyRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IDeleteKeyRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DeleteKeyRequestMessage message, length delimited. Does not implicitly {@link agentInterface.DeleteKeyRequestMessage.verify|verify} messages.
             * @param message DeleteKeyRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IDeleteKeyRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DeleteKeyRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns DeleteKeyRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.DeleteKeyRequestMessage;

            /**
             * Decodes a DeleteKeyRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns DeleteKeyRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.DeleteKeyRequestMessage;
        }

        /** Properties of a DeleteKeyResponseMessage. */
        interface IDeleteKeyResponseMessage {

            /** DeleteKeyResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents a DeleteKeyResponseMessage. */
        class DeleteKeyResponseMessage implements IDeleteKeyResponseMessage {

            /**
             * Constructs a new DeleteKeyResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IDeleteKeyResponseMessage);

            /** DeleteKeyResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new DeleteKeyResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns DeleteKeyResponseMessage instance
             */
            public static create(properties?: agentInterface.IDeleteKeyResponseMessage): agentInterface.DeleteKeyResponseMessage;

            /**
             * Encodes the specified DeleteKeyResponseMessage message. Does not implicitly {@link agentInterface.DeleteKeyResponseMessage.verify|verify} messages.
             * @param m DeleteKeyResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IDeleteKeyResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DeleteKeyResponseMessage message, length delimited. Does not implicitly {@link agentInterface.DeleteKeyResponseMessage.verify|verify} messages.
             * @param message DeleteKeyResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IDeleteKeyResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DeleteKeyResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns DeleteKeyResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.DeleteKeyResponseMessage;

            /**
             * Decodes a DeleteKeyResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns DeleteKeyResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.DeleteKeyResponseMessage;
        }

        /** Properties of a PeerInfoRequestMessage. */
        interface IPeerInfoRequestMessage {

            /** PeerInfoRequestMessage current */
            current?: (boolean|null);

            /** PeerInfoRequestMessage publicKey */
            publicKey?: (string|null);
        }

        /** Represents a PeerInfoRequestMessage. */
        class PeerInfoRequestMessage implements IPeerInfoRequestMessage {

            /**
             * Constructs a new PeerInfoRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IPeerInfoRequestMessage);

            /** PeerInfoRequestMessage current. */
            public current: boolean;

            /** PeerInfoRequestMessage publicKey. */
            public publicKey: string;

            /**
             * Creates a new PeerInfoRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PeerInfoRequestMessage instance
             */
            public static create(properties?: agentInterface.IPeerInfoRequestMessage): agentInterface.PeerInfoRequestMessage;

            /**
             * Encodes the specified PeerInfoRequestMessage message. Does not implicitly {@link agentInterface.PeerInfoRequestMessage.verify|verify} messages.
             * @param m PeerInfoRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IPeerInfoRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PeerInfoRequestMessage message, length delimited. Does not implicitly {@link agentInterface.PeerInfoRequestMessage.verify|verify} messages.
             * @param message PeerInfoRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IPeerInfoRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PeerInfoRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PeerInfoRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.PeerInfoRequestMessage;

            /**
             * Decodes a PeerInfoRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PeerInfoRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.PeerInfoRequestMessage;
        }

        /** Properties of a PeerInfoResponseMessage. */
        interface IPeerInfoResponseMessage {

            /** PeerInfoResponseMessage publicKey */
            publicKey?: (string|null);

            /** PeerInfoResponseMessage peerAddress */
            peerAddress?: (string|null);

            /** PeerInfoResponseMessage relayPublicKey */
            relayPublicKey?: (string|null);
        }

        /** Represents a PeerInfoResponseMessage. */
        class PeerInfoResponseMessage implements IPeerInfoResponseMessage {

            /**
             * Constructs a new PeerInfoResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IPeerInfoResponseMessage);

            /** PeerInfoResponseMessage publicKey. */
            public publicKey: string;

            /** PeerInfoResponseMessage peerAddress. */
            public peerAddress: string;

            /** PeerInfoResponseMessage relayPublicKey. */
            public relayPublicKey: string;

            /**
             * Creates a new PeerInfoResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PeerInfoResponseMessage instance
             */
            public static create(properties?: agentInterface.IPeerInfoResponseMessage): agentInterface.PeerInfoResponseMessage;

            /**
             * Encodes the specified PeerInfoResponseMessage message. Does not implicitly {@link agentInterface.PeerInfoResponseMessage.verify|verify} messages.
             * @param m PeerInfoResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IPeerInfoResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PeerInfoResponseMessage message, length delimited. Does not implicitly {@link agentInterface.PeerInfoResponseMessage.verify|verify} messages.
             * @param message PeerInfoResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IPeerInfoResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PeerInfoResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PeerInfoResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.PeerInfoResponseMessage;

            /**
             * Decodes a PeerInfoResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PeerInfoResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.PeerInfoResponseMessage;
        }

        /** Properties of an AddPeerRequestMessage. */
        interface IAddPeerRequestMessage {

            /** AddPeerRequestMessage publicKey */
            publicKey?: (string|null);

            /** AddPeerRequestMessage peerAddress */
            peerAddress?: (string|null);

            /** AddPeerRequestMessage relayPublicKey */
            relayPublicKey?: (string|null);
        }

        /** Represents an AddPeerRequestMessage. */
        class AddPeerRequestMessage implements IAddPeerRequestMessage {

            /**
             * Constructs a new AddPeerRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IAddPeerRequestMessage);

            /** AddPeerRequestMessage publicKey. */
            public publicKey: string;

            /** AddPeerRequestMessage peerAddress. */
            public peerAddress: string;

            /** AddPeerRequestMessage relayPublicKey. */
            public relayPublicKey: string;

            /**
             * Creates a new AddPeerRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns AddPeerRequestMessage instance
             */
            public static create(properties?: agentInterface.IAddPeerRequestMessage): agentInterface.AddPeerRequestMessage;

            /**
             * Encodes the specified AddPeerRequestMessage message. Does not implicitly {@link agentInterface.AddPeerRequestMessage.verify|verify} messages.
             * @param m AddPeerRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IAddPeerRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified AddPeerRequestMessage message, length delimited. Does not implicitly {@link agentInterface.AddPeerRequestMessage.verify|verify} messages.
             * @param message AddPeerRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IAddPeerRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an AddPeerRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns AddPeerRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.AddPeerRequestMessage;

            /**
             * Decodes an AddPeerRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns AddPeerRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.AddPeerRequestMessage;
        }

        /** Properties of an AddPeerResponseMessage. */
        interface IAddPeerResponseMessage {

            /** AddPeerResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents an AddPeerResponseMessage. */
        class AddPeerResponseMessage implements IAddPeerResponseMessage {

            /**
             * Constructs a new AddPeerResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IAddPeerResponseMessage);

            /** AddPeerResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new AddPeerResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns AddPeerResponseMessage instance
             */
            public static create(properties?: agentInterface.IAddPeerResponseMessage): agentInterface.AddPeerResponseMessage;

            /**
             * Encodes the specified AddPeerResponseMessage message. Does not implicitly {@link agentInterface.AddPeerResponseMessage.verify|verify} messages.
             * @param m AddPeerResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IAddPeerResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified AddPeerResponseMessage message, length delimited. Does not implicitly {@link agentInterface.AddPeerResponseMessage.verify|verify} messages.
             * @param message AddPeerResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IAddPeerResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an AddPeerResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns AddPeerResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.AddPeerResponseMessage;

            /**
             * Decodes an AddPeerResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns AddPeerResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.AddPeerResponseMessage;
        }

        /** Properties of a PingPeerRequestMessage. */
        interface IPingPeerRequestMessage {

            /** PingPeerRequestMessage publicKey */
            publicKey?: (string|null);

            /** PingPeerRequestMessage timeout */
            timeout?: (number|null);
        }

        /** Represents a PingPeerRequestMessage. */
        class PingPeerRequestMessage implements IPingPeerRequestMessage {

            /**
             * Constructs a new PingPeerRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IPingPeerRequestMessage);

            /** PingPeerRequestMessage publicKey. */
            public publicKey: string;

            /** PingPeerRequestMessage timeout. */
            public timeout: number;

            /**
             * Creates a new PingPeerRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PingPeerRequestMessage instance
             */
            public static create(properties?: agentInterface.IPingPeerRequestMessage): agentInterface.PingPeerRequestMessage;

            /**
             * Encodes the specified PingPeerRequestMessage message. Does not implicitly {@link agentInterface.PingPeerRequestMessage.verify|verify} messages.
             * @param m PingPeerRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IPingPeerRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PingPeerRequestMessage message, length delimited. Does not implicitly {@link agentInterface.PingPeerRequestMessage.verify|verify} messages.
             * @param message PingPeerRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IPingPeerRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PingPeerRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PingPeerRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.PingPeerRequestMessage;

            /**
             * Decodes a PingPeerRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PingPeerRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.PingPeerRequestMessage;
        }

        /** Properties of a PingPeerResponseMessage. */
        interface IPingPeerResponseMessage {

            /** PingPeerResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents a PingPeerResponseMessage. */
        class PingPeerResponseMessage implements IPingPeerResponseMessage {

            /**
             * Constructs a new PingPeerResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IPingPeerResponseMessage);

            /** PingPeerResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new PingPeerResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PingPeerResponseMessage instance
             */
            public static create(properties?: agentInterface.IPingPeerResponseMessage): agentInterface.PingPeerResponseMessage;

            /**
             * Encodes the specified PingPeerResponseMessage message. Does not implicitly {@link agentInterface.PingPeerResponseMessage.verify|verify} messages.
             * @param m PingPeerResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IPingPeerResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PingPeerResponseMessage message, length delimited. Does not implicitly {@link agentInterface.PingPeerResponseMessage.verify|verify} messages.
             * @param message PingPeerResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IPingPeerResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PingPeerResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PingPeerResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.PingPeerResponseMessage;

            /**
             * Decodes a PingPeerResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PingPeerResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.PingPeerResponseMessage;
        }

        /** Properties of a FindPeerRequestMessage. */
        interface IFindPeerRequestMessage {

            /** FindPeerRequestMessage publicKey */
            publicKey?: (string|null);

            /** FindPeerRequestMessage timeout */
            timeout?: (number|null);
        }

        /** Represents a FindPeerRequestMessage. */
        class FindPeerRequestMessage implements IFindPeerRequestMessage {

            /**
             * Constructs a new FindPeerRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IFindPeerRequestMessage);

            /** FindPeerRequestMessage publicKey. */
            public publicKey: string;

            /** FindPeerRequestMessage timeout. */
            public timeout: number;

            /**
             * Creates a new FindPeerRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FindPeerRequestMessage instance
             */
            public static create(properties?: agentInterface.IFindPeerRequestMessage): agentInterface.FindPeerRequestMessage;

            /**
             * Encodes the specified FindPeerRequestMessage message. Does not implicitly {@link agentInterface.FindPeerRequestMessage.verify|verify} messages.
             * @param m FindPeerRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IFindPeerRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FindPeerRequestMessage message, length delimited. Does not implicitly {@link agentInterface.FindPeerRequestMessage.verify|verify} messages.
             * @param message FindPeerRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IFindPeerRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FindPeerRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns FindPeerRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.FindPeerRequestMessage;

            /**
             * Decodes a FindPeerRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns FindPeerRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.FindPeerRequestMessage;
        }

        /** Properties of a FindPeerResponseMessage. */
        interface IFindPeerResponseMessage {

            /** FindPeerResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents a FindPeerResponseMessage. */
        class FindPeerResponseMessage implements IFindPeerResponseMessage {

            /**
             * Constructs a new FindPeerResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IFindPeerResponseMessage);

            /** FindPeerResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new FindPeerResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FindPeerResponseMessage instance
             */
            public static create(properties?: agentInterface.IFindPeerResponseMessage): agentInterface.FindPeerResponseMessage;

            /**
             * Encodes the specified FindPeerResponseMessage message. Does not implicitly {@link agentInterface.FindPeerResponseMessage.verify|verify} messages.
             * @param m FindPeerResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IFindPeerResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FindPeerResponseMessage message, length delimited. Does not implicitly {@link agentInterface.FindPeerResponseMessage.verify|verify} messages.
             * @param message FindPeerResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IFindPeerResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FindPeerResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns FindPeerResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.FindPeerResponseMessage;

            /**
             * Decodes a FindPeerResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns FindPeerResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.FindPeerResponseMessage;
        }

        /** Properties of a FindSocialPeerRequestMessage. */
        interface IFindSocialPeerRequestMessage {

            /** FindSocialPeerRequestMessage handle */
            handle?: (string|null);

            /** FindSocialPeerRequestMessage service */
            service?: (string|null);

            /** FindSocialPeerRequestMessage timeout */
            timeout?: (number|null);
        }

        /** Represents a FindSocialPeerRequestMessage. */
        class FindSocialPeerRequestMessage implements IFindSocialPeerRequestMessage {

            /**
             * Constructs a new FindSocialPeerRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IFindSocialPeerRequestMessage);

            /** FindSocialPeerRequestMessage handle. */
            public handle: string;

            /** FindSocialPeerRequestMessage service. */
            public service: string;

            /** FindSocialPeerRequestMessage timeout. */
            public timeout: number;

            /**
             * Creates a new FindSocialPeerRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FindSocialPeerRequestMessage instance
             */
            public static create(properties?: agentInterface.IFindSocialPeerRequestMessage): agentInterface.FindSocialPeerRequestMessage;

            /**
             * Encodes the specified FindSocialPeerRequestMessage message. Does not implicitly {@link agentInterface.FindSocialPeerRequestMessage.verify|verify} messages.
             * @param m FindSocialPeerRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IFindSocialPeerRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FindSocialPeerRequestMessage message, length delimited. Does not implicitly {@link agentInterface.FindSocialPeerRequestMessage.verify|verify} messages.
             * @param message FindSocialPeerRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IFindSocialPeerRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FindSocialPeerRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns FindSocialPeerRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.FindSocialPeerRequestMessage;

            /**
             * Decodes a FindSocialPeerRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns FindSocialPeerRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.FindSocialPeerRequestMessage;
        }

        /** Properties of a FindSocialPeerResponseMessage. */
        interface IFindSocialPeerResponseMessage {

            /** FindSocialPeerResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents a FindSocialPeerResponseMessage. */
        class FindSocialPeerResponseMessage implements IFindSocialPeerResponseMessage {

            /**
             * Constructs a new FindSocialPeerResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IFindSocialPeerResponseMessage);

            /** FindSocialPeerResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new FindSocialPeerResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns FindSocialPeerResponseMessage instance
             */
            public static create(properties?: agentInterface.IFindSocialPeerResponseMessage): agentInterface.FindSocialPeerResponseMessage;

            /**
             * Encodes the specified FindSocialPeerResponseMessage message. Does not implicitly {@link agentInterface.FindSocialPeerResponseMessage.verify|verify} messages.
             * @param m FindSocialPeerResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IFindSocialPeerResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified FindSocialPeerResponseMessage message, length delimited. Does not implicitly {@link agentInterface.FindSocialPeerResponseMessage.verify|verify} messages.
             * @param message FindSocialPeerResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IFindSocialPeerResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a FindSocialPeerResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns FindSocialPeerResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.FindSocialPeerResponseMessage;

            /**
             * Decodes a FindSocialPeerResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns FindSocialPeerResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.FindSocialPeerResponseMessage;
        }

        /** Properties of a ListPeersRequestMessage. */
        interface IListPeersRequestMessage {
        }

        /** Represents a ListPeersRequestMessage. */
        class ListPeersRequestMessage implements IListPeersRequestMessage {

            /**
             * Constructs a new ListPeersRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IListPeersRequestMessage);

            /**
             * Creates a new ListPeersRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ListPeersRequestMessage instance
             */
            public static create(properties?: agentInterface.IListPeersRequestMessage): agentInterface.ListPeersRequestMessage;

            /**
             * Encodes the specified ListPeersRequestMessage message. Does not implicitly {@link agentInterface.ListPeersRequestMessage.verify|verify} messages.
             * @param m ListPeersRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IListPeersRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ListPeersRequestMessage message, length delimited. Does not implicitly {@link agentInterface.ListPeersRequestMessage.verify|verify} messages.
             * @param message ListPeersRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IListPeersRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ListPeersRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ListPeersRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.ListPeersRequestMessage;

            /**
             * Decodes a ListPeersRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ListPeersRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.ListPeersRequestMessage;
        }

        /** Properties of a ListPeersResponseMessage. */
        interface IListPeersResponseMessage {

            /** ListPeersResponseMessage publicKeys */
            publicKeys?: (string[]|null);
        }

        /** Represents a ListPeersResponseMessage. */
        class ListPeersResponseMessage implements IListPeersResponseMessage {

            /**
             * Constructs a new ListPeersResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IListPeersResponseMessage);

            /** ListPeersResponseMessage publicKeys. */
            public publicKeys: string[];

            /**
             * Creates a new ListPeersResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ListPeersResponseMessage instance
             */
            public static create(properties?: agentInterface.IListPeersResponseMessage): agentInterface.ListPeersResponseMessage;

            /**
             * Encodes the specified ListPeersResponseMessage message. Does not implicitly {@link agentInterface.ListPeersResponseMessage.verify|verify} messages.
             * @param m ListPeersResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IListPeersResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ListPeersResponseMessage message, length delimited. Does not implicitly {@link agentInterface.ListPeersResponseMessage.verify|verify} messages.
             * @param message ListPeersResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IListPeersResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ListPeersResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ListPeersResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.ListPeersResponseMessage;

            /**
             * Decodes a ListPeersResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ListPeersResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.ListPeersResponseMessage;
        }

        /** Properties of a ToggleStealthRequestMessage. */
        interface IToggleStealthRequestMessage {

            /** ToggleStealthRequestMessage active */
            active?: (boolean|null);
        }

        /** Represents a ToggleStealthRequestMessage. */
        class ToggleStealthRequestMessage implements IToggleStealthRequestMessage {

            /**
             * Constructs a new ToggleStealthRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IToggleStealthRequestMessage);

            /** ToggleStealthRequestMessage active. */
            public active: boolean;

            /**
             * Creates a new ToggleStealthRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ToggleStealthRequestMessage instance
             */
            public static create(properties?: agentInterface.IToggleStealthRequestMessage): agentInterface.ToggleStealthRequestMessage;

            /**
             * Encodes the specified ToggleStealthRequestMessage message. Does not implicitly {@link agentInterface.ToggleStealthRequestMessage.verify|verify} messages.
             * @param m ToggleStealthRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IToggleStealthRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ToggleStealthRequestMessage message, length delimited. Does not implicitly {@link agentInterface.ToggleStealthRequestMessage.verify|verify} messages.
             * @param message ToggleStealthRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IToggleStealthRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ToggleStealthRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ToggleStealthRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.ToggleStealthRequestMessage;

            /**
             * Decodes a ToggleStealthRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ToggleStealthRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.ToggleStealthRequestMessage;
        }

        /** Properties of a ToggleStealthResponseMessage. */
        interface IToggleStealthResponseMessage {

            /** ToggleStealthResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents a ToggleStealthResponseMessage. */
        class ToggleStealthResponseMessage implements IToggleStealthResponseMessage {

            /**
             * Constructs a new ToggleStealthResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IToggleStealthResponseMessage);

            /** ToggleStealthResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new ToggleStealthResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ToggleStealthResponseMessage instance
             */
            public static create(properties?: agentInterface.IToggleStealthResponseMessage): agentInterface.ToggleStealthResponseMessage;

            /**
             * Encodes the specified ToggleStealthResponseMessage message. Does not implicitly {@link agentInterface.ToggleStealthResponseMessage.verify|verify} messages.
             * @param m ToggleStealthResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IToggleStealthResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ToggleStealthResponseMessage message, length delimited. Does not implicitly {@link agentInterface.ToggleStealthResponseMessage.verify|verify} messages.
             * @param message ToggleStealthResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IToggleStealthResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ToggleStealthResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ToggleStealthResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.ToggleStealthResponseMessage;

            /**
             * Decodes a ToggleStealthResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ToggleStealthResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.ToggleStealthResponseMessage;
        }

        /** Properties of an UpdatePeerInfoRequestMessage. */
        interface IUpdatePeerInfoRequestMessage {

            /** UpdatePeerInfoRequestMessage publicKey */
            publicKey?: (string|null);

            /** UpdatePeerInfoRequestMessage currentNode */
            currentNode?: (boolean|null);

            /** UpdatePeerInfoRequestMessage peerHost */
            peerHost?: (string|null);

            /** UpdatePeerInfoRequestMessage peerPort */
            peerPort?: (number|null);

            /** UpdatePeerInfoRequestMessage relayPublicKey */
            relayPublicKey?: (string|null);
        }

        /** Represents an UpdatePeerInfoRequestMessage. */
        class UpdatePeerInfoRequestMessage implements IUpdatePeerInfoRequestMessage {

            /**
             * Constructs a new UpdatePeerInfoRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IUpdatePeerInfoRequestMessage);

            /** UpdatePeerInfoRequestMessage publicKey. */
            public publicKey: string;

            /** UpdatePeerInfoRequestMessage currentNode. */
            public currentNode: boolean;

            /** UpdatePeerInfoRequestMessage peerHost. */
            public peerHost: string;

            /** UpdatePeerInfoRequestMessage peerPort. */
            public peerPort: number;

            /** UpdatePeerInfoRequestMessage relayPublicKey. */
            public relayPublicKey: string;

            /**
             * Creates a new UpdatePeerInfoRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns UpdatePeerInfoRequestMessage instance
             */
            public static create(properties?: agentInterface.IUpdatePeerInfoRequestMessage): agentInterface.UpdatePeerInfoRequestMessage;

            /**
             * Encodes the specified UpdatePeerInfoRequestMessage message. Does not implicitly {@link agentInterface.UpdatePeerInfoRequestMessage.verify|verify} messages.
             * @param m UpdatePeerInfoRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IUpdatePeerInfoRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified UpdatePeerInfoRequestMessage message, length delimited. Does not implicitly {@link agentInterface.UpdatePeerInfoRequestMessage.verify|verify} messages.
             * @param message UpdatePeerInfoRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IUpdatePeerInfoRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an UpdatePeerInfoRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns UpdatePeerInfoRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.UpdatePeerInfoRequestMessage;

            /**
             * Decodes an UpdatePeerInfoRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns UpdatePeerInfoRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.UpdatePeerInfoRequestMessage;
        }

        /** Properties of an UpdatePeerInfoResponseMessage. */
        interface IUpdatePeerInfoResponseMessage {

            /** UpdatePeerInfoResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents an UpdatePeerInfoResponseMessage. */
        class UpdatePeerInfoResponseMessage implements IUpdatePeerInfoResponseMessage {

            /**
             * Constructs a new UpdatePeerInfoResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IUpdatePeerInfoResponseMessage);

            /** UpdatePeerInfoResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new UpdatePeerInfoResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns UpdatePeerInfoResponseMessage instance
             */
            public static create(properties?: agentInterface.IUpdatePeerInfoResponseMessage): agentInterface.UpdatePeerInfoResponseMessage;

            /**
             * Encodes the specified UpdatePeerInfoResponseMessage message. Does not implicitly {@link agentInterface.UpdatePeerInfoResponseMessage.verify|verify} messages.
             * @param m UpdatePeerInfoResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IUpdatePeerInfoResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified UpdatePeerInfoResponseMessage message, length delimited. Does not implicitly {@link agentInterface.UpdatePeerInfoResponseMessage.verify|verify} messages.
             * @param message UpdatePeerInfoResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IUpdatePeerInfoResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an UpdatePeerInfoResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns UpdatePeerInfoResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.UpdatePeerInfoResponseMessage;

            /**
             * Decodes an UpdatePeerInfoResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns UpdatePeerInfoResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.UpdatePeerInfoResponseMessage;
        }

        /** Properties of a RequestRelayRequestMessage. */
        interface IRequestRelayRequestMessage {

            /** RequestRelayRequestMessage publicKey */
            publicKey?: (string|null);
        }

        /** Represents a RequestRelayRequestMessage. */
        class RequestRelayRequestMessage implements IRequestRelayRequestMessage {

            /**
             * Constructs a new RequestRelayRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IRequestRelayRequestMessage);

            /** RequestRelayRequestMessage publicKey. */
            public publicKey: string;

            /**
             * Creates a new RequestRelayRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RequestRelayRequestMessage instance
             */
            public static create(properties?: agentInterface.IRequestRelayRequestMessage): agentInterface.RequestRelayRequestMessage;

            /**
             * Encodes the specified RequestRelayRequestMessage message. Does not implicitly {@link agentInterface.RequestRelayRequestMessage.verify|verify} messages.
             * @param m RequestRelayRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IRequestRelayRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RequestRelayRequestMessage message, length delimited. Does not implicitly {@link agentInterface.RequestRelayRequestMessage.verify|verify} messages.
             * @param message RequestRelayRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IRequestRelayRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RequestRelayRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns RequestRelayRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.RequestRelayRequestMessage;

            /**
             * Decodes a RequestRelayRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RequestRelayRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.RequestRelayRequestMessage;
        }

        /** Properties of a RequestRelayResponseMessage. */
        interface IRequestRelayResponseMessage {

            /** RequestRelayResponseMessage successful */
            successful?: (boolean|null);
        }

        /** Represents a RequestRelayResponseMessage. */
        class RequestRelayResponseMessage implements IRequestRelayResponseMessage {

            /**
             * Constructs a new RequestRelayResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IRequestRelayResponseMessage);

            /** RequestRelayResponseMessage successful. */
            public successful: boolean;

            /**
             * Creates a new RequestRelayResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RequestRelayResponseMessage instance
             */
            public static create(properties?: agentInterface.IRequestRelayResponseMessage): agentInterface.RequestRelayResponseMessage;

            /**
             * Encodes the specified RequestRelayResponseMessage message. Does not implicitly {@link agentInterface.RequestRelayResponseMessage.verify|verify} messages.
             * @param m RequestRelayResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IRequestRelayResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RequestRelayResponseMessage message, length delimited. Does not implicitly {@link agentInterface.RequestRelayResponseMessage.verify|verify} messages.
             * @param message RequestRelayResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IRequestRelayResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RequestRelayResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns RequestRelayResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.RequestRelayResponseMessage;

            /**
             * Decodes a RequestRelayResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RequestRelayResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.RequestRelayResponseMessage;
        }

        /** Properties of a RequestPunchRequestMessage. */
        interface IRequestPunchRequestMessage {

            /** RequestPunchRequestMessage publicKey */
            publicKey?: (string|null);
        }

        /** Represents a RequestPunchRequestMessage. */
        class RequestPunchRequestMessage implements IRequestPunchRequestMessage {

            /**
             * Constructs a new RequestPunchRequestMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IRequestPunchRequestMessage);

            /** RequestPunchRequestMessage publicKey. */
            public publicKey: string;

            /**
             * Creates a new RequestPunchRequestMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RequestPunchRequestMessage instance
             */
            public static create(properties?: agentInterface.IRequestPunchRequestMessage): agentInterface.RequestPunchRequestMessage;

            /**
             * Encodes the specified RequestPunchRequestMessage message. Does not implicitly {@link agentInterface.RequestPunchRequestMessage.verify|verify} messages.
             * @param m RequestPunchRequestMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IRequestPunchRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RequestPunchRequestMessage message, length delimited. Does not implicitly {@link agentInterface.RequestPunchRequestMessage.verify|verify} messages.
             * @param message RequestPunchRequestMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IRequestPunchRequestMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RequestPunchRequestMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns RequestPunchRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.RequestPunchRequestMessage;

            /**
             * Decodes a RequestPunchRequestMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RequestPunchRequestMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.RequestPunchRequestMessage;
        }

        /** Properties of a RequestPunchResponseMessage. */
        interface IRequestPunchResponseMessage {

            /** RequestPunchResponseMessage address */
            address?: (string|null);
        }

        /** Represents a RequestPunchResponseMessage. */
        class RequestPunchResponseMessage implements IRequestPunchResponseMessage {

            /**
             * Constructs a new RequestPunchResponseMessage.
             * @param [p] Properties to set
             */
            constructor(p?: agentInterface.IRequestPunchResponseMessage);

            /** RequestPunchResponseMessage address. */
            public address: string;

            /**
             * Creates a new RequestPunchResponseMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RequestPunchResponseMessage instance
             */
            public static create(properties?: agentInterface.IRequestPunchResponseMessage): agentInterface.RequestPunchResponseMessage;

            /**
             * Encodes the specified RequestPunchResponseMessage message. Does not implicitly {@link agentInterface.RequestPunchResponseMessage.verify|verify} messages.
             * @param m RequestPunchResponseMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: agentInterface.IRequestPunchResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RequestPunchResponseMessage message, length delimited. Does not implicitly {@link agentInterface.RequestPunchResponseMessage.verify|verify} messages.
             * @param message RequestPunchResponseMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: agentInterface.IRequestPunchResponseMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RequestPunchResponseMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns RequestPunchResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agentInterface.RequestPunchResponseMessage;

            /**
             * Decodes a RequestPunchResponseMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RequestPunchResponseMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): agentInterface.RequestPunchResponseMessage;
        }
    }
}
