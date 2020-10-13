import * as $protobuf from "protobufjs";
export = Peer;

declare namespace Peer {


    /** Namespace peerInterface. */
    namespace peerInterface {

        /** Represents a Peer */
        class Peer extends $protobuf.rpc.Service {

            /**
             * Constructs a new Peer service.
             * @param rpcImpl RPC implementation
             * @param [requestDelimited=false] Whether requests are length-delimited
             * @param [responseDelimited=false] Whether responses are length-delimited
             */
            constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);

            /**
             * Creates new Peer service using the specified rpc implementation.
             * @param rpcImpl RPC implementation
             * @param [requestDelimited=false] Whether requests are length-delimited
             * @param [responseDelimited=false] Whether responses are length-delimited
             * @returns RPC service. Useful where requests and/or responses are streamed.
             */
            public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): Peer;

            /**
             * Calls MessagePeer.
             * @param request PeerMessage message or plain object
             * @param callback Node-style callback called with the error, if any, and PeerMessage
             */
            public messagePeer(request: peerInterface.IPeerMessage, callback: peerInterface.Peer.MessagePeerCallback): void;

            /**
             * Calls MessagePeer.
             * @param request PeerMessage message or plain object
             * @returns Promise
             */
            public messagePeer(request: peerInterface.IPeerMessage): Promise<peerInterface.PeerMessage>;
        }

        namespace Peer {

            /**
             * Callback as used by {@link peerInterface.Peer#messagePeer}.
             * @param error Error, if any
             * @param [response] PeerMessage
             */
            type MessagePeerCallback = (error: (Error|null), response?: peerInterface.PeerMessage) => void;
        }

        /** Properties of a PeerMessage. */
        interface IPeerMessage {

            /** PeerMessage publicKey */
            publicKey?: (string|null);

            /** PeerMessage type */
            type?: (peerInterface.SubServiceType|null);

            /** PeerMessage subMessage */
            subMessage?: (string|null);
        }

        /** Represents a PeerMessage. */
        class PeerMessage implements IPeerMessage {

            /**
             * Constructs a new PeerMessage.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IPeerMessage);

            /** PeerMessage publicKey. */
            public publicKey: string;

            /** PeerMessage type. */
            public type: peerInterface.SubServiceType;

            /** PeerMessage subMessage. */
            public subMessage: string;

            /**
             * Creates a new PeerMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PeerMessage instance
             */
            public static create(properties?: peerInterface.IPeerMessage): peerInterface.PeerMessage;

            /**
             * Encodes the specified PeerMessage message. Does not implicitly {@link peerInterface.PeerMessage.verify|verify} messages.
             * @param m PeerMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IPeerMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PeerMessage message, length delimited. Does not implicitly {@link peerInterface.PeerMessage.verify|verify} messages.
             * @param message PeerMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IPeerMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PeerMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PeerMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.PeerMessage;

            /**
             * Decodes a PeerMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PeerMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.PeerMessage;
        }

        /** SubServiceType enum. */
        enum SubServiceType {
            PING_PEER = 0,
            GIT = 1,
            NAT_TRAVERSAL = 2,
            CERTIFICATE_AUTHORITY = 3,
            PEER_DHT = 4
        }

        /** Properties of a PingPeerMessage. */
        interface IPingPeerMessage {

            /** PingPeerMessage publicKey */
            publicKey?: (string|null);

            /** PingPeerMessage challenge */
            challenge?: (string|null);

            /** PingPeerMessage peerInfo */
            peerInfo?: (peerInterface.IPeerInfoMessage|null);
        }

        /** Represents a PingPeerMessage. */
        class PingPeerMessage implements IPingPeerMessage {

            /**
             * Constructs a new PingPeerMessage.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IPingPeerMessage);

            /** PingPeerMessage publicKey. */
            public publicKey: string;

            /** PingPeerMessage challenge. */
            public challenge: string;

            /** PingPeerMessage peerInfo. */
            public peerInfo?: (peerInterface.IPeerInfoMessage|null);

            /**
             * Creates a new PingPeerMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PingPeerMessage instance
             */
            public static create(properties?: peerInterface.IPingPeerMessage): peerInterface.PingPeerMessage;

            /**
             * Encodes the specified PingPeerMessage message. Does not implicitly {@link peerInterface.PingPeerMessage.verify|verify} messages.
             * @param m PingPeerMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IPingPeerMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PingPeerMessage message, length delimited. Does not implicitly {@link peerInterface.PingPeerMessage.verify|verify} messages.
             * @param message PingPeerMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IPingPeerMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PingPeerMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PingPeerMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.PingPeerMessage;

            /**
             * Decodes a PingPeerMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PingPeerMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.PingPeerMessage;
        }

        /** Properties of a PeerInfoMessage. */
        interface IPeerInfoMessage {

            /** PeerInfoMessage publicKey */
            publicKey?: (string|null);

            /** PeerInfoMessage rootCertificate */
            rootCertificate?: (string|null);

            /** PeerInfoMessage peerAddress */
            peerAddress?: (string|null);

            /** PeerInfoMessage apiAddress */
            apiAddress?: (string|null);
        }

        /** Represents a PeerInfoMessage. */
        class PeerInfoMessage implements IPeerInfoMessage {

            /**
             * Constructs a new PeerInfoMessage.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IPeerInfoMessage);

            /** PeerInfoMessage publicKey. */
            public publicKey: string;

            /** PeerInfoMessage rootCertificate. */
            public rootCertificate: string;

            /** PeerInfoMessage peerAddress. */
            public peerAddress: string;

            /** PeerInfoMessage apiAddress. */
            public apiAddress: string;

            /**
             * Creates a new PeerInfoMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PeerInfoMessage instance
             */
            public static create(properties?: peerInterface.IPeerInfoMessage): peerInterface.PeerInfoMessage;

            /**
             * Encodes the specified PeerInfoMessage message. Does not implicitly {@link peerInterface.PeerInfoMessage.verify|verify} messages.
             * @param m PeerInfoMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IPeerInfoMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PeerInfoMessage message, length delimited. Does not implicitly {@link peerInterface.PeerInfoMessage.verify|verify} messages.
             * @param message PeerInfoMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IPeerInfoMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PeerInfoMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PeerInfoMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.PeerInfoMessage;

            /**
             * Decodes a PeerInfoMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PeerInfoMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.PeerInfoMessage;
        }

        /** Properties of a PeerInfoListMessage. */
        interface IPeerInfoListMessage {

            /** PeerInfoListMessage peerInfoList */
            peerInfoList?: (peerInterface.IPeerInfoMessage[]|null);
        }

        /** Represents a PeerInfoListMessage. */
        class PeerInfoListMessage implements IPeerInfoListMessage {

            /**
             * Constructs a new PeerInfoListMessage.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IPeerInfoListMessage);

            /** PeerInfoListMessage peerInfoList. */
            public peerInfoList: peerInterface.IPeerInfoMessage[];

            /**
             * Creates a new PeerInfoListMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PeerInfoListMessage instance
             */
            public static create(properties?: peerInterface.IPeerInfoListMessage): peerInterface.PeerInfoListMessage;

            /**
             * Encodes the specified PeerInfoListMessage message. Does not implicitly {@link peerInterface.PeerInfoListMessage.verify|verify} messages.
             * @param m PeerInfoListMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IPeerInfoListMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PeerInfoListMessage message, length delimited. Does not implicitly {@link peerInterface.PeerInfoListMessage.verify|verify} messages.
             * @param message PeerInfoListMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IPeerInfoListMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PeerInfoListMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PeerInfoListMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.PeerInfoListMessage;

            /**
             * Decodes a PeerInfoListMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PeerInfoListMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.PeerInfoListMessage;
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
            constructor(p?: peerInterface.IErrorMessage);

            /** ErrorMessage error. */
            public error: string;

            /**
             * Creates a new ErrorMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ErrorMessage instance
             */
            public static create(properties?: peerInterface.IErrorMessage): peerInterface.ErrorMessage;

            /**
             * Encodes the specified ErrorMessage message. Does not implicitly {@link peerInterface.ErrorMessage.verify|verify} messages.
             * @param m ErrorMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IErrorMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ErrorMessage message, length delimited. Does not implicitly {@link peerInterface.ErrorMessage.verify|verify} messages.
             * @param message ErrorMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IErrorMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an ErrorMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns ErrorMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.ErrorMessage;

            /**
             * Decodes an ErrorMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ErrorMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.ErrorMessage;
        }

        /** NatMessageType enum. */
        enum NatMessageType {
            UDP_ADDRESS = 0,
            DIRECT_CONNECTION = 1,
            HOLE_PUNCH_CONNECTION = 2,
            RELAY_CONNECTION = 3
        }

        /** Properties of a NatMessage. */
        interface INatMessage {

            /** NatMessage type */
            type?: (peerInterface.NatMessageType|null);

            /** NatMessage isResponse */
            isResponse?: (boolean|null);

            /** NatMessage subMessage */
            subMessage?: (Uint8Array|null);
        }

        /** Represents a NatMessage. */
        class NatMessage implements INatMessage {

            /**
             * Constructs a new NatMessage.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.INatMessage);

            /** NatMessage type. */
            public type: peerInterface.NatMessageType;

            /** NatMessage isResponse. */
            public isResponse: boolean;

            /** NatMessage subMessage. */
            public subMessage: Uint8Array;

            /**
             * Creates a new NatMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns NatMessage instance
             */
            public static create(properties?: peerInterface.INatMessage): peerInterface.NatMessage;

            /**
             * Encodes the specified NatMessage message. Does not implicitly {@link peerInterface.NatMessage.verify|verify} messages.
             * @param m NatMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.INatMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified NatMessage message, length delimited. Does not implicitly {@link peerInterface.NatMessage.verify|verify} messages.
             * @param message NatMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.INatMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a NatMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns NatMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.NatMessage;

            /**
             * Decodes a NatMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns NatMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.NatMessage;
        }

        /** Properties of a UDPAddressMessage. */
        interface IUDPAddressMessage {

            /** UDPAddressMessage address */
            address?: (string|null);

            /** UDPAddressMessage token */
            token?: (string|null);
        }

        /** Represents a UDPAddressMessage. */
        class UDPAddressMessage implements IUDPAddressMessage {

            /**
             * Constructs a new UDPAddressMessage.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IUDPAddressMessage);

            /** UDPAddressMessage address. */
            public address: string;

            /** UDPAddressMessage token. */
            public token: string;

            /**
             * Creates a new UDPAddressMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns UDPAddressMessage instance
             */
            public static create(properties?: peerInterface.IUDPAddressMessage): peerInterface.UDPAddressMessage;

            /**
             * Encodes the specified UDPAddressMessage message. Does not implicitly {@link peerInterface.UDPAddressMessage.verify|verify} messages.
             * @param m UDPAddressMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IUDPAddressMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified UDPAddressMessage message, length delimited. Does not implicitly {@link peerInterface.UDPAddressMessage.verify|verify} messages.
             * @param message UDPAddressMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IUDPAddressMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a UDPAddressMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns UDPAddressMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.UDPAddressMessage;

            /**
             * Decodes a UDPAddressMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns UDPAddressMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.UDPAddressMessage;
        }

        /** Properties of a DirectConnectionMessage. */
        interface IDirectConnectionMessage {

            /** DirectConnectionMessage peerId */
            peerId?: (string|null);
        }

        /** Represents a DirectConnectionMessage. */
        class DirectConnectionMessage implements IDirectConnectionMessage {

            /**
             * Constructs a new DirectConnectionMessage.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IDirectConnectionMessage);

            /** DirectConnectionMessage peerId. */
            public peerId: string;

            /**
             * Creates a new DirectConnectionMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns DirectConnectionMessage instance
             */
            public static create(properties?: peerInterface.IDirectConnectionMessage): peerInterface.DirectConnectionMessage;

            /**
             * Encodes the specified DirectConnectionMessage message. Does not implicitly {@link peerInterface.DirectConnectionMessage.verify|verify} messages.
             * @param m DirectConnectionMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IDirectConnectionMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified DirectConnectionMessage message, length delimited. Does not implicitly {@link peerInterface.DirectConnectionMessage.verify|verify} messages.
             * @param message DirectConnectionMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IDirectConnectionMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a DirectConnectionMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns DirectConnectionMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.DirectConnectionMessage;

            /**
             * Decodes a DirectConnectionMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns DirectConnectionMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.DirectConnectionMessage;
        }

        /** Properties of a HolePunchConnectionMessage. */
        interface IHolePunchConnectionMessage {

            /** HolePunchConnectionMessage targetPeerId */
            targetPeerId?: (string|null);

            /** HolePunchConnectionMessage originPeerId */
            originPeerId?: (string|null);

            /** HolePunchConnectionMessage udpAddress */
            udpAddress?: (string|null);
        }

        /** Represents a HolePunchConnectionMessage. */
        class HolePunchConnectionMessage implements IHolePunchConnectionMessage {

            /**
             * Constructs a new HolePunchConnectionMessage.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IHolePunchConnectionMessage);

            /** HolePunchConnectionMessage targetPeerId. */
            public targetPeerId: string;

            /** HolePunchConnectionMessage originPeerId. */
            public originPeerId: string;

            /** HolePunchConnectionMessage udpAddress. */
            public udpAddress: string;

            /**
             * Creates a new HolePunchConnectionMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns HolePunchConnectionMessage instance
             */
            public static create(properties?: peerInterface.IHolePunchConnectionMessage): peerInterface.HolePunchConnectionMessage;

            /**
             * Encodes the specified HolePunchConnectionMessage message. Does not implicitly {@link peerInterface.HolePunchConnectionMessage.verify|verify} messages.
             * @param m HolePunchConnectionMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IHolePunchConnectionMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified HolePunchConnectionMessage message, length delimited. Does not implicitly {@link peerInterface.HolePunchConnectionMessage.verify|verify} messages.
             * @param message HolePunchConnectionMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IHolePunchConnectionMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a HolePunchConnectionMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns HolePunchConnectionMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.HolePunchConnectionMessage;

            /**
             * Decodes a HolePunchConnectionMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns HolePunchConnectionMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.HolePunchConnectionMessage;
        }

        /** Properties of a RelayConnectionMessage. */
        interface IRelayConnectionMessage {

            /** RelayConnectionMessage targetPeerId */
            targetPeerId?: (string|null);

            /** RelayConnectionMessage originPeerId */
            originPeerId?: (string|null);

            /** RelayConnectionMessage relayAddress */
            relayAddress?: (string|null);
        }

        /** Represents a RelayConnectionMessage. */
        class RelayConnectionMessage implements IRelayConnectionMessage {

            /**
             * Constructs a new RelayConnectionMessage.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IRelayConnectionMessage);

            /** RelayConnectionMessage targetPeerId. */
            public targetPeerId: string;

            /** RelayConnectionMessage originPeerId. */
            public originPeerId: string;

            /** RelayConnectionMessage relayAddress. */
            public relayAddress: string;

            /**
             * Creates a new RelayConnectionMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RelayConnectionMessage instance
             */
            public static create(properties?: peerInterface.IRelayConnectionMessage): peerInterface.RelayConnectionMessage;

            /**
             * Encodes the specified RelayConnectionMessage message. Does not implicitly {@link peerInterface.RelayConnectionMessage.verify|verify} messages.
             * @param m RelayConnectionMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IRelayConnectionMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RelayConnectionMessage message, length delimited. Does not implicitly {@link peerInterface.RelayConnectionMessage.verify|verify} messages.
             * @param message RelayConnectionMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IRelayConnectionMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RelayConnectionMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns RelayConnectionMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.RelayConnectionMessage;

            /**
             * Decodes a RelayConnectionMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RelayConnectionMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.RelayConnectionMessage;
        }

        /** CAMessageType enum. */
        enum CAMessageType {
            ROOT_CERT = 0,
            REQUEST_CERT = 1
        }

        /** Properties of a CAMessage. */
        interface ICAMessage {

            /** CAMessage type */
            type?: (peerInterface.CAMessageType|null);

            /** CAMessage isResponse */
            isResponse?: (boolean|null);

            /** CAMessage subMessage */
            subMessage?: (Uint8Array|null);
        }

        /** Represents a CAMessage. */
        class CAMessage implements ICAMessage {

            /**
             * Constructs a new CAMessage.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.ICAMessage);

            /** CAMessage type. */
            public type: peerInterface.CAMessageType;

            /** CAMessage isResponse. */
            public isResponse: boolean;

            /** CAMessage subMessage. */
            public subMessage: Uint8Array;

            /**
             * Creates a new CAMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CAMessage instance
             */
            public static create(properties?: peerInterface.ICAMessage): peerInterface.CAMessage;

            /**
             * Encodes the specified CAMessage message. Does not implicitly {@link peerInterface.CAMessage.verify|verify} messages.
             * @param m CAMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.ICAMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CAMessage message, length delimited. Does not implicitly {@link peerInterface.CAMessage.verify|verify} messages.
             * @param message CAMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.ICAMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CAMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns CAMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.CAMessage;

            /**
             * Decodes a CAMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns CAMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.CAMessage;
        }

        /** PeerDHTMessageType enum. */
        enum PeerDHTMessageType {
            PING = 0,
            FIND_NODE = 1
        }

        /** Properties of a PeerDHTMessage. */
        interface IPeerDHTMessage {

            /** PeerDHTMessage type */
            type?: (peerInterface.PeerDHTMessageType|null);

            /** PeerDHTMessage isResponse */
            isResponse?: (boolean|null);

            /** PeerDHTMessage subMessage */
            subMessage?: (Uint8Array|null);
        }

        /** Represents a PeerDHTMessage. */
        class PeerDHTMessage implements IPeerDHTMessage {

            /**
             * Constructs a new PeerDHTMessage.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IPeerDHTMessage);

            /** PeerDHTMessage type. */
            public type: peerInterface.PeerDHTMessageType;

            /** PeerDHTMessage isResponse. */
            public isResponse: boolean;

            /** PeerDHTMessage subMessage. */
            public subMessage: Uint8Array;

            /**
             * Creates a new PeerDHTMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PeerDHTMessage instance
             */
            public static create(properties?: peerInterface.IPeerDHTMessage): peerInterface.PeerDHTMessage;

            /**
             * Encodes the specified PeerDHTMessage message. Does not implicitly {@link peerInterface.PeerDHTMessage.verify|verify} messages.
             * @param m PeerDHTMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IPeerDHTMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PeerDHTMessage message, length delimited. Does not implicitly {@link peerInterface.PeerDHTMessage.verify|verify} messages.
             * @param message PeerDHTMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IPeerDHTMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PeerDHTMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PeerDHTMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.PeerDHTMessage;

            /**
             * Decodes a PeerDHTMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PeerDHTMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.PeerDHTMessage;
        }

        /** Properties of a PeerDHTPingNodeMessage. */
        interface IPeerDHTPingNodeMessage {

            /** PeerDHTPingNodeMessage peerId */
            peerId?: (string|null);

            /** PeerDHTPingNodeMessage randomChallenge */
            randomChallenge?: (string|null);
        }

        /** Represents a PeerDHTPingNodeMessage. */
        class PeerDHTPingNodeMessage implements IPeerDHTPingNodeMessage {

            /**
             * Constructs a new PeerDHTPingNodeMessage.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IPeerDHTPingNodeMessage);

            /** PeerDHTPingNodeMessage peerId. */
            public peerId: string;

            /** PeerDHTPingNodeMessage randomChallenge. */
            public randomChallenge: string;

            /**
             * Creates a new PeerDHTPingNodeMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PeerDHTPingNodeMessage instance
             */
            public static create(properties?: peerInterface.IPeerDHTPingNodeMessage): peerInterface.PeerDHTPingNodeMessage;

            /**
             * Encodes the specified PeerDHTPingNodeMessage message. Does not implicitly {@link peerInterface.PeerDHTPingNodeMessage.verify|verify} messages.
             * @param m PeerDHTPingNodeMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IPeerDHTPingNodeMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PeerDHTPingNodeMessage message, length delimited. Does not implicitly {@link peerInterface.PeerDHTPingNodeMessage.verify|verify} messages.
             * @param message PeerDHTPingNodeMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IPeerDHTPingNodeMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PeerDHTPingNodeMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PeerDHTPingNodeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.PeerDHTPingNodeMessage;

            /**
             * Decodes a PeerDHTPingNodeMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PeerDHTPingNodeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.PeerDHTPingNodeMessage;
        }

        /** Properties of a PeerDHTFindNodeMessage. */
        interface IPeerDHTFindNodeMessage {

            /** PeerDHTFindNodeMessage peerId */
            peerId?: (string|null);

            /** PeerDHTFindNodeMessage closestPeers */
            closestPeers?: (peerInterface.IPeerInfoMessage[]|null);
        }

        /** Represents a PeerDHTFindNodeMessage. */
        class PeerDHTFindNodeMessage implements IPeerDHTFindNodeMessage {

            /**
             * Constructs a new PeerDHTFindNodeMessage.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IPeerDHTFindNodeMessage);

            /** PeerDHTFindNodeMessage peerId. */
            public peerId: string;

            /** PeerDHTFindNodeMessage closestPeers. */
            public closestPeers: peerInterface.IPeerInfoMessage[];

            /**
             * Creates a new PeerDHTFindNodeMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PeerDHTFindNodeMessage instance
             */
            public static create(properties?: peerInterface.IPeerDHTFindNodeMessage): peerInterface.PeerDHTFindNodeMessage;

            /**
             * Encodes the specified PeerDHTFindNodeMessage message. Does not implicitly {@link peerInterface.PeerDHTFindNodeMessage.verify|verify} messages.
             * @param m PeerDHTFindNodeMessage message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IPeerDHTFindNodeMessage, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PeerDHTFindNodeMessage message, length delimited. Does not implicitly {@link peerInterface.PeerDHTFindNodeMessage.verify|verify} messages.
             * @param message PeerDHTFindNodeMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IPeerDHTFindNodeMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PeerDHTFindNodeMessage message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PeerDHTFindNodeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.PeerDHTFindNodeMessage;

            /**
             * Decodes a PeerDHTFindNodeMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PeerDHTFindNodeMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.PeerDHTFindNodeMessage;
        }

        /** Properties of a MTPPacket. */
        interface IMTPPacket {

            /** MTPPacket id */
            id?: (number|null);

            /** MTPPacket peerId */
            peerId?: (string|null);

            /** MTPPacket connection */
            connection?: (number|null);

            /** MTPPacket timestamp */
            timestamp?: (number|null);

            /** MTPPacket timediff */
            timediff?: (number|null);

            /** MTPPacket window */
            window?: (number|null);

            /** MTPPacket seq */
            seq?: (number|null);

            /** MTPPacket ack */
            ack?: (number|null);

            /** MTPPacket data */
            data?: (Uint8Array|null);

            /** MTPPacket sent */
            sent?: (number|null);
        }

        /** Represents a MTPPacket. */
        class MTPPacket implements IMTPPacket {

            /**
             * Constructs a new MTPPacket.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IMTPPacket);

            /** MTPPacket id. */
            public id: number;

            /** MTPPacket peerId. */
            public peerId: string;

            /** MTPPacket connection. */
            public connection: number;

            /** MTPPacket timestamp. */
            public timestamp: number;

            /** MTPPacket timediff. */
            public timediff: number;

            /** MTPPacket window. */
            public window: number;

            /** MTPPacket seq. */
            public seq: number;

            /** MTPPacket ack. */
            public ack: number;

            /** MTPPacket data. */
            public data: Uint8Array;

            /** MTPPacket sent. */
            public sent: number;

            /**
             * Creates a new MTPPacket instance using the specified properties.
             * @param [properties] Properties to set
             * @returns MTPPacket instance
             */
            public static create(properties?: peerInterface.IMTPPacket): peerInterface.MTPPacket;

            /**
             * Encodes the specified MTPPacket message. Does not implicitly {@link peerInterface.MTPPacket.verify|verify} messages.
             * @param m MTPPacket message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IMTPPacket, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified MTPPacket message, length delimited. Does not implicitly {@link peerInterface.MTPPacket.verify|verify} messages.
             * @param message MTPPacket message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IMTPPacket, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a MTPPacket message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns MTPPacket
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.MTPPacket;

            /**
             * Decodes a MTPPacket message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns MTPPacket
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.MTPPacket;
        }
    }
}
