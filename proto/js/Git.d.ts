import * as $protobuf from "protobufjs";
export = Git;

declare namespace Git {


    /** Namespace gitInterface. */
    namespace gitInterface {

        /** GitMessageType enum. */
        enum GitMessageType {
            INFO = 0,
            PACK = 1,
            VAULT_NAMES = 2
        }

        /** Properties of a GitMessage. */
        interface IGitMessage {

            /** GitMessage type */
            type?: (gitInterface.GitMessageType|null);

            /** GitMessage subMessage */
            subMessage?: (Uint8Array|null);
        }

        /** Represents a GitMessage. */
        class GitMessage implements IGitMessage {

            /**
             * Constructs a new GitMessage.
             * @param [p] Properties to set
             */
            constructor(p?: gitInterface.IGitMessage);

            /** GitMessage type. */
            public type: gitInterface.GitMessageType;

            /** GitMessage subMessage. */
            public subMessage: Uint8Array;

            /**
             * Creates a new GitMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GitMessage instance
             */
            public static create(properties?: gitInterface.IGitMessage): gitInterface.GitMessage;

            /**
             * Encodes the specified GitMessage message. Does not implicitly {@link gitInterface.GitMessage.verify|verify} messages.
             * @param m GitMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: gitInterface.IGitMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GitMessage message, length delimited. Does not implicitly {@link gitInterface.GitMessage.verify|verify} messages.
             * @param message GitMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: gitInterface.IGitMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GitMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns GitMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): gitInterface.GitMessage;

            /**
             * Decodes a GitMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GitMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): gitInterface.GitMessage;
        }

        /** Properties of an InfoRequest. */
        interface IInfoRequest {

            /** InfoRequest vaultName */
            vaultName?: (string|null);
        }

        /** Represents an InfoRequest. */
        class InfoRequest implements IInfoRequest {

            /**
             * Constructs a new InfoRequest.
             * @param [p] Properties to set
             */
            constructor(p?: gitInterface.IInfoRequest);

            /** InfoRequest vaultName. */
            public vaultName: string;

            /**
             * Creates a new InfoRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns InfoRequest instance
             */
            public static create(properties?: gitInterface.IInfoRequest): gitInterface.InfoRequest;

            /**
             * Encodes the specified InfoRequest message. Does not implicitly {@link gitInterface.InfoRequest.verify|verify} messages.
             * @param m InfoRequest message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: gitInterface.IInfoRequest, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified InfoRequest message, length delimited. Does not implicitly {@link gitInterface.InfoRequest.verify|verify} messages.
             * @param message InfoRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: gitInterface.IInfoRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an InfoRequest message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns InfoRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): gitInterface.InfoRequest;

            /**
             * Decodes an InfoRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns InfoRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): gitInterface.InfoRequest;
        }

        /** Properties of an InfoReply. */
        interface IInfoReply {

            /** InfoReply vaultName */
            vaultName?: (string|null);

            /** InfoReply body */
            body?: (Uint8Array|null);
        }

        /** Represents an InfoReply. */
        class InfoReply implements IInfoReply {

            /**
             * Constructs a new InfoReply.
             * @param [p] Properties to set
             */
            constructor(p?: gitInterface.IInfoReply);

            /** InfoReply vaultName. */
            public vaultName: string;

            /** InfoReply body. */
            public body: Uint8Array;

            /**
             * Creates a new InfoReply instance using the specified properties.
             * @param [properties] Properties to set
             * @returns InfoReply instance
             */
            public static create(properties?: gitInterface.IInfoReply): gitInterface.InfoReply;

            /**
             * Encodes the specified InfoReply message. Does not implicitly {@link gitInterface.InfoReply.verify|verify} messages.
             * @param m InfoReply message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: gitInterface.IInfoReply, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified InfoReply message, length delimited. Does not implicitly {@link gitInterface.InfoReply.verify|verify} messages.
             * @param message InfoReply message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: gitInterface.IInfoReply, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an InfoReply message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns InfoReply
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): gitInterface.InfoReply;

            /**
             * Decodes an InfoReply message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns InfoReply
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): gitInterface.InfoReply;
        }

        /** Properties of a PackRequest. */
        interface IPackRequest {

            /** PackRequest vaultName */
            vaultName?: (string|null);

            /** PackRequest body */
            body?: (Uint8Array|null);
        }

        /** Represents a PackRequest. */
        class PackRequest implements IPackRequest {

            /**
             * Constructs a new PackRequest.
             * @param [p] Properties to set
             */
            constructor(p?: gitInterface.IPackRequest);

            /** PackRequest vaultName. */
            public vaultName: string;

            /** PackRequest body. */
            public body: Uint8Array;

            /**
             * Creates a new PackRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PackRequest instance
             */
            public static create(properties?: gitInterface.IPackRequest): gitInterface.PackRequest;

            /**
             * Encodes the specified PackRequest message. Does not implicitly {@link gitInterface.PackRequest.verify|verify} messages.
             * @param m PackRequest message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: gitInterface.IPackRequest, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PackRequest message, length delimited. Does not implicitly {@link gitInterface.PackRequest.verify|verify} messages.
             * @param message PackRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: gitInterface.IPackRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PackRequest message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PackRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): gitInterface.PackRequest;

            /**
             * Decodes a PackRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PackRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): gitInterface.PackRequest;
        }

        /** Properties of a PackReply. */
        interface IPackReply {

            /** PackReply vaultName */
            vaultName?: (string|null);

            /** PackReply body */
            body?: (Uint8Array|null);
        }

        /** Represents a PackReply. */
        class PackReply implements IPackReply {

            /**
             * Constructs a new PackReply.
             * @param [p] Properties to set
             */
            constructor(p?: gitInterface.IPackReply);

            /** PackReply vaultName. */
            public vaultName: string;

            /** PackReply body. */
            public body: Uint8Array;

            /**
             * Creates a new PackReply instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PackReply instance
             */
            public static create(properties?: gitInterface.IPackReply): gitInterface.PackReply;

            /**
             * Encodes the specified PackReply message. Does not implicitly {@link gitInterface.PackReply.verify|verify} messages.
             * @param m PackReply message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: gitInterface.IPackReply, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PackReply message, length delimited. Does not implicitly {@link gitInterface.PackReply.verify|verify} messages.
             * @param message PackReply message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: gitInterface.IPackReply, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PackReply message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PackReply
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): gitInterface.PackReply;

            /**
             * Decodes a PackReply message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PackReply
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): gitInterface.PackReply;
        }

        /** Properties of a VaultNamesReply. */
        interface IVaultNamesReply {

            /** VaultNamesReply vaultNameList */
            vaultNameList?: (string[]|null);
        }

        /** Represents a VaultNamesReply. */
        class VaultNamesReply implements IVaultNamesReply {

            /**
             * Constructs a new VaultNamesReply.
             * @param [p] Properties to set
             */
            constructor(p?: gitInterface.IVaultNamesReply);

            /** VaultNamesReply vaultNameList. */
            public vaultNameList: string[];

            /**
             * Creates a new VaultNamesReply instance using the specified properties.
             * @param [properties] Properties to set
             * @returns VaultNamesReply instance
             */
            public static create(properties?: gitInterface.IVaultNamesReply): gitInterface.VaultNamesReply;

            /**
             * Encodes the specified VaultNamesReply message. Does not implicitly {@link gitInterface.VaultNamesReply.verify|verify} messages.
             * @param m VaultNamesReply message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: gitInterface.IVaultNamesReply, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified VaultNamesReply message, length delimited. Does not implicitly {@link gitInterface.VaultNamesReply.verify|verify} messages.
             * @param message VaultNamesReply message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: gitInterface.IVaultNamesReply, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a VaultNamesReply message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns VaultNamesReply
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): gitInterface.VaultNamesReply;

            /**
             * Decodes a VaultNamesReply message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns VaultNamesReply
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): gitInterface.VaultNamesReply;
        }
    }
}
