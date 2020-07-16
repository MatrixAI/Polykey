import * as $protobuf from "protobufjs";
/** Namespace peer. */
export namespace peer {

    /** Properties of a HandshakeMessage. */
    interface IHandshakeMessage {

        /** HandshakeMessage targetPubKey */
        targetPubKey?: (Uint8Array|null);

        /** HandshakeMessage requestingPubKey */
        requestingPubKey?: (Uint8Array|null);

        /** HandshakeMessage message */
        message?: (Uint8Array|null);

        /** HandshakeMessage responsePeerInfo */
        responsePeerInfo?: (Uint8Array|null);
    }

    /** Represents a HandshakeMessage. */
    class HandshakeMessage implements IHandshakeMessage {

        /**
         * Constructs a new HandshakeMessage.
         * @param [p] Properties to set
         */
        constructor(p?: peer.IHandshakeMessage);

        /** HandshakeMessage targetPubKey. */
        public targetPubKey: Uint8Array;

        /** HandshakeMessage requestingPubKey. */
        public requestingPubKey: Uint8Array;

        /** HandshakeMessage message. */
        public message: Uint8Array;

        /** HandshakeMessage responsePeerInfo. */
        public responsePeerInfo: Uint8Array;

        /**
         * Creates a new HandshakeMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns HandshakeMessage instance
         */
        public static create(properties?: peer.IHandshakeMessage): peer.HandshakeMessage;

        /**
         * Encodes the specified HandshakeMessage message. Does not implicitly {@link peer.HandshakeMessage.verify|verify} messages.
         * @param m HandshakeMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: peer.IHandshakeMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a HandshakeMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns HandshakeMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peer.HandshakeMessage;
    }

    /** Properties of a PeerInfoMessage. */
    interface IPeerInfoMessage {

        /** PeerInfoMessage pubKey */
        pubKey?: (string|null);

        /** PeerInfoMessage addresses */
        addresses?: (string[]|null);

        /** PeerInfoMessage connectedAddr */
        connectedAddr?: (string|null);
    }

    /** Represents a PeerInfoMessage. */
    class PeerInfoMessage implements IPeerInfoMessage {

        /**
         * Constructs a new PeerInfoMessage.
         * @param [p] Properties to set
         */
        constructor(p?: peer.IPeerInfoMessage);

        /** PeerInfoMessage pubKey. */
        public pubKey: string;

        /** PeerInfoMessage addresses. */
        public addresses: string[];

        /** PeerInfoMessage connectedAddr. */
        public connectedAddr: string;

        /**
         * Creates a new PeerInfoMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PeerInfoMessage instance
         */
        public static create(properties?: peer.IPeerInfoMessage): peer.PeerInfoMessage;

        /**
         * Encodes the specified PeerInfoMessage message. Does not implicitly {@link peer.PeerInfoMessage.verify|verify} messages.
         * @param m PeerInfoMessage message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: peer.IPeerInfoMessage, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PeerInfoMessage message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns PeerInfoMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peer.PeerInfoMessage;
    }
}
