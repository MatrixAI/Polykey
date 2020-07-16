import * as $protobuf from "protobufjs";
/** Namespace agent. */
export namespace agent {

    /** Type enum. */
    enum Type {
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
        GET_SECRET = 15
    }

    /** Properties of an AgentMessage. */
    interface IAgentMessage {

        /** AgentMessage type */
        type?: (agent.Type|null);

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
        public type: agent.Type;

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
}
