import * as $protobuf from "protobufjs";
/** Namespace agent. */
export namespace agent {

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
        UPDATE_SECRET = 22
    }

    /** Properties of an AgentMessage. */
    interface IAgentMessage {

        /** AgentMessage type */
        type?: (agent.AgentMessageType|null);

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
        constructor(p?: agent.IAgentMessage);

        /** AgentMessage type. */
        public type: agent.AgentMessageType;

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
        public static create(properties?: agent.IAgentMessage): agent.AgentMessage;

        /**
         * Encodes the specified AgentMessage message. Does not implicitly {@link agent.AgentMessage.verify|verify} messages.
         * @param m AgentMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IAgentMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an AgentMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns AgentMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.AgentMessage;
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
        constructor(p?: agent.IErrorMessage);

        /** ErrorMessage error. */
        public error: string;

        /**
         * Creates a new ErrorMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ErrorMessage instance
         */
        public static create(properties?: agent.IErrorMessage): agent.ErrorMessage;

        /**
         * Encodes the specified ErrorMessage message. Does not implicitly {@link agent.ErrorMessage.verify|verify} messages.
         * @param m ErrorMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IErrorMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an ErrorMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns ErrorMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.ErrorMessage;
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
        constructor(p?: agent.IRegisterNodeRequestMessage);

        /** RegisterNodeRequestMessage passphrase. */
        public passphrase: string;

        /**
         * Creates a new RegisterNodeRequestMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RegisterNodeRequestMessage instance
         */
        public static create(properties?: agent.IRegisterNodeRequestMessage): agent.RegisterNodeRequestMessage;

        /**
         * Encodes the specified RegisterNodeRequestMessage message. Does not implicitly {@link agent.RegisterNodeRequestMessage.verify|verify} messages.
         * @param m RegisterNodeRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IRegisterNodeRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RegisterNodeRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns RegisterNodeRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.RegisterNodeRequestMessage;
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
        constructor(p?: agent.IRegisterNodeResponseMessage);

        /** RegisterNodeResponseMessage successful. */
        public successful: boolean;

        /**
         * Creates a new RegisterNodeResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RegisterNodeResponseMessage instance
         */
        public static create(properties?: agent.IRegisterNodeResponseMessage): agent.RegisterNodeResponseMessage;

        /**
         * Encodes the specified RegisterNodeResponseMessage message. Does not implicitly {@link agent.RegisterNodeResponseMessage.verify|verify} messages.
         * @param m RegisterNodeResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IRegisterNodeResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RegisterNodeResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns RegisterNodeResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.RegisterNodeResponseMessage;
    }

    /** Properties of a NewNodeRequestMessage. */
    interface INewNodeRequestMessage {

        /** NewNodeRequestMessage name */
        name?: (string|null);

        /** NewNodeRequestMessage email */
        email?: (string|null);

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
        constructor(p?: agent.INewNodeRequestMessage);

        /** NewNodeRequestMessage name. */
        public name: string;

        /** NewNodeRequestMessage email. */
        public email: string;

        /** NewNodeRequestMessage passphrase. */
        public passphrase: string;

        /** NewNodeRequestMessage nbits. */
        public nbits: number;

        /**
         * Creates a new NewNodeRequestMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns NewNodeRequestMessage instance
         */
        public static create(properties?: agent.INewNodeRequestMessage): agent.NewNodeRequestMessage;

        /**
         * Encodes the specified NewNodeRequestMessage message. Does not implicitly {@link agent.NewNodeRequestMessage.verify|verify} messages.
         * @param m NewNodeRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.INewNodeRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a NewNodeRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns NewNodeRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.NewNodeRequestMessage;
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
        constructor(p?: agent.INewNodeResponseMessage);

        /** NewNodeResponseMessage successful. */
        public successful: boolean;

        /**
         * Creates a new NewNodeResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns NewNodeResponseMessage instance
         */
        public static create(properties?: agent.INewNodeResponseMessage): agent.NewNodeResponseMessage;

        /**
         * Encodes the specified NewNodeResponseMessage message. Does not implicitly {@link agent.NewNodeResponseMessage.verify|verify} messages.
         * @param m NewNodeResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.INewNodeResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a NewNodeResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns NewNodeResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.NewNodeResponseMessage;
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
        constructor(p?: agent.IListNodesRequestMessage);

        /** ListNodesRequestMessage unlockedOnly. */
        public unlockedOnly: boolean;

        /**
         * Creates a new ListNodesRequestMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListNodesRequestMessage instance
         */
        public static create(properties?: agent.IListNodesRequestMessage): agent.ListNodesRequestMessage;

        /**
         * Encodes the specified ListNodesRequestMessage message. Does not implicitly {@link agent.ListNodesRequestMessage.verify|verify} messages.
         * @param m ListNodesRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IListNodesRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListNodesRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns ListNodesRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.ListNodesRequestMessage;
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
        constructor(p?: agent.IListNodesResponseMessage);

        /** ListNodesResponseMessage nodes. */
        public nodes: string[];

        /**
         * Creates a new ListNodesResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListNodesResponseMessage instance
         */
        public static create(properties?: agent.IListNodesResponseMessage): agent.ListNodesResponseMessage;

        /**
         * Encodes the specified ListNodesResponseMessage message. Does not implicitly {@link agent.ListNodesResponseMessage.verify|verify} messages.
         * @param m ListNodesResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IListNodesResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListNodesResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns ListNodesResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.ListNodesResponseMessage;
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
        constructor(p?: agent.ISignFileRequestMessage);

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
        public static create(properties?: agent.ISignFileRequestMessage): agent.SignFileRequestMessage;

        /**
         * Encodes the specified SignFileRequestMessage message. Does not implicitly {@link agent.SignFileRequestMessage.verify|verify} messages.
         * @param m SignFileRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.ISignFileRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SignFileRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns SignFileRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.SignFileRequestMessage;
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
        constructor(p?: agent.ISignFileResponseMessage);

        /** SignFileResponseMessage signaturePath. */
        public signaturePath: string;

        /**
         * Creates a new SignFileResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SignFileResponseMessage instance
         */
        public static create(properties?: agent.ISignFileResponseMessage): agent.SignFileResponseMessage;

        /**
         * Encodes the specified SignFileResponseMessage message. Does not implicitly {@link agent.SignFileResponseMessage.verify|verify} messages.
         * @param m SignFileResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.ISignFileResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SignFileResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns SignFileResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.SignFileResponseMessage;
    }

    /** Properties of a VerifyFileRequestMessage. */
    interface IVerifyFileRequestMessage {

        /** VerifyFileRequestMessage filePath */
        filePath?: (string|null);

        /** VerifyFileRequestMessage signaturePath */
        signaturePath?: (string|null);

        /** VerifyFileRequestMessage publicKeyPath */
        publicKeyPath?: (string|null);
    }

    /** Represents a VerifyFileRequestMessage. */
    class VerifyFileRequestMessage implements IVerifyFileRequestMessage {

        /**
         * Constructs a new VerifyFileRequestMessage.
         * @param [p] Properties to set
         */
        constructor(p?: agent.IVerifyFileRequestMessage);

        /** VerifyFileRequestMessage filePath. */
        public filePath: string;

        /** VerifyFileRequestMessage signaturePath. */
        public signaturePath: string;

        /** VerifyFileRequestMessage publicKeyPath. */
        public publicKeyPath: string;

        /**
         * Creates a new VerifyFileRequestMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns VerifyFileRequestMessage instance
         */
        public static create(properties?: agent.IVerifyFileRequestMessage): agent.VerifyFileRequestMessage;

        /**
         * Encodes the specified VerifyFileRequestMessage message. Does not implicitly {@link agent.VerifyFileRequestMessage.verify|verify} messages.
         * @param m VerifyFileRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IVerifyFileRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a VerifyFileRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns VerifyFileRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.VerifyFileRequestMessage;
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
        constructor(p?: agent.IVerifyFileResponseMessage);

        /** VerifyFileResponseMessage verified. */
        public verified: boolean;

        /**
         * Creates a new VerifyFileResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns VerifyFileResponseMessage instance
         */
        public static create(properties?: agent.IVerifyFileResponseMessage): agent.VerifyFileResponseMessage;

        /**
         * Encodes the specified VerifyFileResponseMessage message. Does not implicitly {@link agent.VerifyFileResponseMessage.verify|verify} messages.
         * @param m VerifyFileResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IVerifyFileResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a VerifyFileResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns VerifyFileResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.VerifyFileResponseMessage;
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
        constructor(p?: agent.IEncryptFileRequestMessage);

        /** EncryptFileRequestMessage filePath. */
        public filePath: string;

        /** EncryptFileRequestMessage publicKeyPath. */
        public publicKeyPath: string;

        /**
         * Creates a new EncryptFileRequestMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns EncryptFileRequestMessage instance
         */
        public static create(properties?: agent.IEncryptFileRequestMessage): agent.EncryptFileRequestMessage;

        /**
         * Encodes the specified EncryptFileRequestMessage message. Does not implicitly {@link agent.EncryptFileRequestMessage.verify|verify} messages.
         * @param m EncryptFileRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IEncryptFileRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an EncryptFileRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns EncryptFileRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.EncryptFileRequestMessage;
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
        constructor(p?: agent.IEncryptFileResponseMessage);

        /** EncryptFileResponseMessage encryptedPath. */
        public encryptedPath: string;

        /**
         * Creates a new EncryptFileResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns EncryptFileResponseMessage instance
         */
        public static create(properties?: agent.IEncryptFileResponseMessage): agent.EncryptFileResponseMessage;

        /**
         * Encodes the specified EncryptFileResponseMessage message. Does not implicitly {@link agent.EncryptFileResponseMessage.verify|verify} messages.
         * @param m EncryptFileResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IEncryptFileResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an EncryptFileResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns EncryptFileResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.EncryptFileResponseMessage;
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
        constructor(p?: agent.IDecryptFileRequestMessage);

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
        public static create(properties?: agent.IDecryptFileRequestMessage): agent.DecryptFileRequestMessage;

        /**
         * Encodes the specified DecryptFileRequestMessage message. Does not implicitly {@link agent.DecryptFileRequestMessage.verify|verify} messages.
         * @param m DecryptFileRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IDecryptFileRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DecryptFileRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns DecryptFileRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.DecryptFileRequestMessage;
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
        constructor(p?: agent.IDecryptFileResponseMessage);

        /** DecryptFileResponseMessage decryptedPath. */
        public decryptedPath: string;

        /**
         * Creates a new DecryptFileResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DecryptFileResponseMessage instance
         */
        public static create(properties?: agent.IDecryptFileResponseMessage): agent.DecryptFileResponseMessage;

        /**
         * Encodes the specified DecryptFileResponseMessage message. Does not implicitly {@link agent.DecryptFileResponseMessage.verify|verify} messages.
         * @param m DecryptFileResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IDecryptFileResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DecryptFileResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns DecryptFileResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.DecryptFileResponseMessage;
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
        constructor(p?: agent.IListVaultsRequestMessage);

        /**
         * Creates a new ListVaultsRequestMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListVaultsRequestMessage instance
         */
        public static create(properties?: agent.IListVaultsRequestMessage): agent.ListVaultsRequestMessage;

        /**
         * Encodes the specified ListVaultsRequestMessage message. Does not implicitly {@link agent.ListVaultsRequestMessage.verify|verify} messages.
         * @param m ListVaultsRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IListVaultsRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListVaultsRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns ListVaultsRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.ListVaultsRequestMessage;
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
        constructor(p?: agent.IListVaultsResponseMessage);

        /** ListVaultsResponseMessage vaultNames. */
        public vaultNames: string[];

        /**
         * Creates a new ListVaultsResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListVaultsResponseMessage instance
         */
        public static create(properties?: agent.IListVaultsResponseMessage): agent.ListVaultsResponseMessage;

        /**
         * Encodes the specified ListVaultsResponseMessage message. Does not implicitly {@link agent.ListVaultsResponseMessage.verify|verify} messages.
         * @param m ListVaultsResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IListVaultsResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListVaultsResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns ListVaultsResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.ListVaultsResponseMessage;
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
        constructor(p?: agent.INewVaultRequestMessage);

        /** NewVaultRequestMessage vaultName. */
        public vaultName: string;

        /**
         * Creates a new NewVaultRequestMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns NewVaultRequestMessage instance
         */
        public static create(properties?: agent.INewVaultRequestMessage): agent.NewVaultRequestMessage;

        /**
         * Encodes the specified NewVaultRequestMessage message. Does not implicitly {@link agent.NewVaultRequestMessage.verify|verify} messages.
         * @param m NewVaultRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.INewVaultRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a NewVaultRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns NewVaultRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.NewVaultRequestMessage;
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
        constructor(p?: agent.INewVaultResponseMessage);

        /** NewVaultResponseMessage successful. */
        public successful: boolean;

        /**
         * Creates a new NewVaultResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns NewVaultResponseMessage instance
         */
        public static create(properties?: agent.INewVaultResponseMessage): agent.NewVaultResponseMessage;

        /**
         * Encodes the specified NewVaultResponseMessage message. Does not implicitly {@link agent.NewVaultResponseMessage.verify|verify} messages.
         * @param m NewVaultResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.INewVaultResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a NewVaultResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns NewVaultResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.NewVaultResponseMessage;
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
        constructor(p?: agent.IDestroyVaultRequestMessage);

        /** DestroyVaultRequestMessage vaultName. */
        public vaultName: string;

        /**
         * Creates a new DestroyVaultRequestMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DestroyVaultRequestMessage instance
         */
        public static create(properties?: agent.IDestroyVaultRequestMessage): agent.DestroyVaultRequestMessage;

        /**
         * Encodes the specified DestroyVaultRequestMessage message. Does not implicitly {@link agent.DestroyVaultRequestMessage.verify|verify} messages.
         * @param m DestroyVaultRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IDestroyVaultRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DestroyVaultRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns DestroyVaultRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.DestroyVaultRequestMessage;
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
        constructor(p?: agent.IDestroyVaultResponseMessage);

        /** DestroyVaultResponseMessage successful. */
        public successful: boolean;

        /**
         * Creates a new DestroyVaultResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DestroyVaultResponseMessage instance
         */
        public static create(properties?: agent.IDestroyVaultResponseMessage): agent.DestroyVaultResponseMessage;

        /**
         * Encodes the specified DestroyVaultResponseMessage message. Does not implicitly {@link agent.DestroyVaultResponseMessage.verify|verify} messages.
         * @param m DestroyVaultResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IDestroyVaultResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DestroyVaultResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns DestroyVaultResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.DestroyVaultResponseMessage;
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
        constructor(p?: agent.IListSecretsRequestMessage);

        /** ListSecretsRequestMessage vaultName. */
        public vaultName: string;

        /**
         * Creates a new ListSecretsRequestMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListSecretsRequestMessage instance
         */
        public static create(properties?: agent.IListSecretsRequestMessage): agent.ListSecretsRequestMessage;

        /**
         * Encodes the specified ListSecretsRequestMessage message. Does not implicitly {@link agent.ListSecretsRequestMessage.verify|verify} messages.
         * @param m ListSecretsRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IListSecretsRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListSecretsRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns ListSecretsRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.ListSecretsRequestMessage;
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
        constructor(p?: agent.IListSecretsResponseMessage);

        /** ListSecretsResponseMessage secretNames. */
        public secretNames: string[];

        /**
         * Creates a new ListSecretsResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListSecretsResponseMessage instance
         */
        public static create(properties?: agent.IListSecretsResponseMessage): agent.ListSecretsResponseMessage;

        /**
         * Encodes the specified ListSecretsResponseMessage message. Does not implicitly {@link agent.ListSecretsResponseMessage.verify|verify} messages.
         * @param m ListSecretsResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IListSecretsResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListSecretsResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns ListSecretsResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.ListSecretsResponseMessage;
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
        constructor(p?: agent.ICreateSecretRequestMessage);

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
        public static create(properties?: agent.ICreateSecretRequestMessage): agent.CreateSecretRequestMessage;

        /**
         * Encodes the specified CreateSecretRequestMessage message. Does not implicitly {@link agent.CreateSecretRequestMessage.verify|verify} messages.
         * @param m CreateSecretRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.ICreateSecretRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CreateSecretRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns CreateSecretRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.CreateSecretRequestMessage;
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
        constructor(p?: agent.ICreateSecretResponseMessage);

        /** CreateSecretResponseMessage successful. */
        public successful: boolean;

        /**
         * Creates a new CreateSecretResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CreateSecretResponseMessage instance
         */
        public static create(properties?: agent.ICreateSecretResponseMessage): agent.CreateSecretResponseMessage;

        /**
         * Encodes the specified CreateSecretResponseMessage message. Does not implicitly {@link agent.CreateSecretResponseMessage.verify|verify} messages.
         * @param m CreateSecretResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.ICreateSecretResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CreateSecretResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns CreateSecretResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.CreateSecretResponseMessage;
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
        constructor(p?: agent.IDestroySecretRequestMessage);

        /** DestroySecretRequestMessage vaultName. */
        public vaultName: string;

        /** DestroySecretRequestMessage secretName. */
        public secretName: string;

        /**
         * Creates a new DestroySecretRequestMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DestroySecretRequestMessage instance
         */
        public static create(properties?: agent.IDestroySecretRequestMessage): agent.DestroySecretRequestMessage;

        /**
         * Encodes the specified DestroySecretRequestMessage message. Does not implicitly {@link agent.DestroySecretRequestMessage.verify|verify} messages.
         * @param m DestroySecretRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IDestroySecretRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DestroySecretRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns DestroySecretRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.DestroySecretRequestMessage;
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
        constructor(p?: agent.IDestroySecretResponseMessage);

        /** DestroySecretResponseMessage successful. */
        public successful: boolean;

        /**
         * Creates a new DestroySecretResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DestroySecretResponseMessage instance
         */
        public static create(properties?: agent.IDestroySecretResponseMessage): agent.DestroySecretResponseMessage;

        /**
         * Encodes the specified DestroySecretResponseMessage message. Does not implicitly {@link agent.DestroySecretResponseMessage.verify|verify} messages.
         * @param m DestroySecretResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IDestroySecretResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DestroySecretResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns DestroySecretResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.DestroySecretResponseMessage;
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
        constructor(p?: agent.IGetSecretRequestMessage);

        /** GetSecretRequestMessage vaultName. */
        public vaultName: string;

        /** GetSecretRequestMessage secretName. */
        public secretName: string;

        /**
         * Creates a new GetSecretRequestMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetSecretRequestMessage instance
         */
        public static create(properties?: agent.IGetSecretRequestMessage): agent.GetSecretRequestMessage;

        /**
         * Encodes the specified GetSecretRequestMessage message. Does not implicitly {@link agent.GetSecretRequestMessage.verify|verify} messages.
         * @param m GetSecretRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IGetSecretRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetSecretRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns GetSecretRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.GetSecretRequestMessage;
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
        constructor(p?: agent.IGetSecretResponseMessage);

        /** GetSecretResponseMessage secret. */
        public secret: Uint8Array;

        /**
         * Creates a new GetSecretResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetSecretResponseMessage instance
         */
        public static create(properties?: agent.IGetSecretResponseMessage): agent.GetSecretResponseMessage;

        /**
         * Encodes the specified GetSecretResponseMessage message. Does not implicitly {@link agent.GetSecretResponseMessage.verify|verify} messages.
         * @param m GetSecretResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IGetSecretResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetSecretResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns GetSecretResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.GetSecretResponseMessage;
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
        constructor(p?: agent.IDeriveKeyRequestMessage);

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
        public static create(properties?: agent.IDeriveKeyRequestMessage): agent.DeriveKeyRequestMessage;

        /**
         * Encodes the specified DeriveKeyRequestMessage message. Does not implicitly {@link agent.DeriveKeyRequestMessage.verify|verify} messages.
         * @param m DeriveKeyRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IDeriveKeyRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DeriveKeyRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns DeriveKeyRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.DeriveKeyRequestMessage;
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
        constructor(p?: agent.IDeriveKeyResponseMessage);

        /** DeriveKeyResponseMessage successful. */
        public successful: boolean;

        /**
         * Creates a new DeriveKeyResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DeriveKeyResponseMessage instance
         */
        public static create(properties?: agent.IDeriveKeyResponseMessage): agent.DeriveKeyResponseMessage;

        /**
         * Encodes the specified DeriveKeyResponseMessage message. Does not implicitly {@link agent.DeriveKeyResponseMessage.verify|verify} messages.
         * @param m DeriveKeyResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IDeriveKeyResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DeriveKeyResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns DeriveKeyResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.DeriveKeyResponseMessage;
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
        constructor(p?: agent.IListKeysRequestMessage);

        /**
         * Creates a new ListKeysRequestMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListKeysRequestMessage instance
         */
        public static create(properties?: agent.IListKeysRequestMessage): agent.ListKeysRequestMessage;

        /**
         * Encodes the specified ListKeysRequestMessage message. Does not implicitly {@link agent.ListKeysRequestMessage.verify|verify} messages.
         * @param m ListKeysRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IListKeysRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListKeysRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns ListKeysRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.ListKeysRequestMessage;
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
        constructor(p?: agent.IListKeysResponseMessage);

        /** ListKeysResponseMessage keyNames. */
        public keyNames: string[];

        /**
         * Creates a new ListKeysResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListKeysResponseMessage instance
         */
        public static create(properties?: agent.IListKeysResponseMessage): agent.ListKeysResponseMessage;

        /**
         * Encodes the specified ListKeysResponseMessage message. Does not implicitly {@link agent.ListKeysResponseMessage.verify|verify} messages.
         * @param m ListKeysResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IListKeysResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListKeysResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns ListKeysResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.ListKeysResponseMessage;
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
        constructor(p?: agent.IGetKeyRequestMessage);

        /** GetKeyRequestMessage keyName. */
        public keyName: string;

        /**
         * Creates a new GetKeyRequestMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetKeyRequestMessage instance
         */
        public static create(properties?: agent.IGetKeyRequestMessage): agent.GetKeyRequestMessage;

        /**
         * Encodes the specified GetKeyRequestMessage message. Does not implicitly {@link agent.GetKeyRequestMessage.verify|verify} messages.
         * @param m GetKeyRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IGetKeyRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetKeyRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns GetKeyRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.GetKeyRequestMessage;
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
        constructor(p?: agent.IGetKeyResponseMessage);

        /** GetKeyResponseMessage keyName. */
        public keyName: string;

        /** GetKeyResponseMessage keyContent. */
        public keyContent: string;

        /**
         * Creates a new GetKeyResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetKeyResponseMessage instance
         */
        public static create(properties?: agent.IGetKeyResponseMessage): agent.GetKeyResponseMessage;

        /**
         * Encodes the specified GetKeyResponseMessage message. Does not implicitly {@link agent.GetKeyResponseMessage.verify|verify} messages.
         * @param m GetKeyResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IGetKeyResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetKeyResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns GetKeyResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.GetKeyResponseMessage;
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
        constructor(p?: agent.IGetPrimaryKeyPairRequestMessage);

        /** GetPrimaryKeyPairRequestMessage includePrivateKey. */
        public includePrivateKey: boolean;

        /**
         * Creates a new GetPrimaryKeyPairRequestMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetPrimaryKeyPairRequestMessage instance
         */
        public static create(properties?: agent.IGetPrimaryKeyPairRequestMessage): agent.GetPrimaryKeyPairRequestMessage;

        /**
         * Encodes the specified GetPrimaryKeyPairRequestMessage message. Does not implicitly {@link agent.GetPrimaryKeyPairRequestMessage.verify|verify} messages.
         * @param m GetPrimaryKeyPairRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IGetPrimaryKeyPairRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetPrimaryKeyPairRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns GetPrimaryKeyPairRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.GetPrimaryKeyPairRequestMessage;
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
        constructor(p?: agent.IGetPrimaryKeyPairResponseMessage);

        /** GetPrimaryKeyPairResponseMessage publicKey. */
        public publicKey: string;

        /** GetPrimaryKeyPairResponseMessage privateKey. */
        public privateKey: string;

        /**
         * Creates a new GetPrimaryKeyPairResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetPrimaryKeyPairResponseMessage instance
         */
        public static create(properties?: agent.IGetPrimaryKeyPairResponseMessage): agent.GetPrimaryKeyPairResponseMessage;

        /**
         * Encodes the specified GetPrimaryKeyPairResponseMessage message. Does not implicitly {@link agent.GetPrimaryKeyPairResponseMessage.verify|verify} messages.
         * @param m GetPrimaryKeyPairResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IGetPrimaryKeyPairResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetPrimaryKeyPairResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns GetPrimaryKeyPairResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.GetPrimaryKeyPairResponseMessage;
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
        constructor(p?: agent.IUpdateSecretRequestMessage);

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
        public static create(properties?: agent.IUpdateSecretRequestMessage): agent.UpdateSecretRequestMessage;

        /**
         * Encodes the specified UpdateSecretRequestMessage message. Does not implicitly {@link agent.UpdateSecretRequestMessage.verify|verify} messages.
         * @param m UpdateSecretRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IUpdateSecretRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an UpdateSecretRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns UpdateSecretRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.UpdateSecretRequestMessage;
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
        constructor(p?: agent.IUpdateSecretResponseMessage);

        /** UpdateSecretResponseMessage successful. */
        public successful: boolean;

        /**
         * Creates a new UpdateSecretResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns UpdateSecretResponseMessage instance
         */
        public static create(properties?: agent.IUpdateSecretResponseMessage): agent.UpdateSecretResponseMessage;

        /**
         * Encodes the specified UpdateSecretResponseMessage message. Does not implicitly {@link agent.UpdateSecretResponseMessage.verify|verify} messages.
         * @param m UpdateSecretResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IUpdateSecretResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an UpdateSecretResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns UpdateSecretResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.UpdateSecretResponseMessage;
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
        constructor(p?: agent.IDeleteKeyRequestMessage);

        /** DeleteKeyRequestMessage keyName. */
        public keyName: string;

        /**
         * Creates a new DeleteKeyRequestMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DeleteKeyRequestMessage instance
         */
        public static create(properties?: agent.IDeleteKeyRequestMessage): agent.DeleteKeyRequestMessage;

        /**
         * Encodes the specified DeleteKeyRequestMessage message. Does not implicitly {@link agent.DeleteKeyRequestMessage.verify|verify} messages.
         * @param m DeleteKeyRequestMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IDeleteKeyRequestMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DeleteKeyRequestMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns DeleteKeyRequestMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.DeleteKeyRequestMessage;
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
        constructor(p?: agent.IDeleteKeyResponseMessage);

        /** DeleteKeyResponseMessage successful. */
        public successful: boolean;

        /**
         * Creates a new DeleteKeyResponseMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DeleteKeyResponseMessage instance
         */
        public static create(properties?: agent.IDeleteKeyResponseMessage): agent.DeleteKeyResponseMessage;

        /**
         * Encodes the specified DeleteKeyResponseMessage message. Does not implicitly {@link agent.DeleteKeyResponseMessage.verify|verify} messages.
         * @param m DeleteKeyResponseMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: agent.IDeleteKeyResponseMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DeleteKeyResponseMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns DeleteKeyResponseMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): agent.DeleteKeyResponseMessage;
    }
}
