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
            CERTIFICATE_AUTHORITY = 3
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

            /** PeerInfoMessage relayPublicKey */
            relayPublicKey?: (string|null);

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

            /** PeerInfoMessage relayPublicKey. */
            public relayPublicKey: string;

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
            ERROR = 0,
            RELAY_CONNECTION = 1,
            PEER_CONNECTION = 2,
            UDP_ADDRESS = 3,
            PEER_UDP_ADDRESS = 4
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

        /** Properties of a RelayConnectionRequest. */
        interface IRelayConnectionRequest {

            /** RelayConnectionRequest publicKey */
            publicKey?: (string|null);
        }

        /** Represents a RelayConnectionRequest. */
        class RelayConnectionRequest implements IRelayConnectionRequest {

            /**
             * Constructs a new RelayConnectionRequest.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IRelayConnectionRequest);

            /** RelayConnectionRequest publicKey. */
            public publicKey: string;

            /**
             * Creates a new RelayConnectionRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RelayConnectionRequest instance
             */
            public static create(properties?: peerInterface.IRelayConnectionRequest): peerInterface.RelayConnectionRequest;

            /**
             * Encodes the specified RelayConnectionRequest message. Does not implicitly {@link peerInterface.RelayConnectionRequest.verify|verify} messages.
             * @param m RelayConnectionRequest message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IRelayConnectionRequest, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RelayConnectionRequest message, length delimited. Does not implicitly {@link peerInterface.RelayConnectionRequest.verify|verify} messages.
             * @param message RelayConnectionRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IRelayConnectionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RelayConnectionRequest message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns RelayConnectionRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.RelayConnectionRequest;

            /**
             * Decodes a RelayConnectionRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RelayConnectionRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.RelayConnectionRequest;
        }

        /** Properties of a RelayConnectionResponse. */
        interface IRelayConnectionResponse {

            /** RelayConnectionResponse serverAddress */
            serverAddress?: (string|null);
        }

        /** Represents a RelayConnectionResponse. */
        class RelayConnectionResponse implements IRelayConnectionResponse {

            /**
             * Constructs a new RelayConnectionResponse.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IRelayConnectionResponse);

            /** RelayConnectionResponse serverAddress. */
            public serverAddress: string;

            /**
             * Creates a new RelayConnectionResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RelayConnectionResponse instance
             */
            public static create(properties?: peerInterface.IRelayConnectionResponse): peerInterface.RelayConnectionResponse;

            /**
             * Encodes the specified RelayConnectionResponse message. Does not implicitly {@link peerInterface.RelayConnectionResponse.verify|verify} messages.
             * @param m RelayConnectionResponse message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IRelayConnectionResponse, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RelayConnectionResponse message, length delimited. Does not implicitly {@link peerInterface.RelayConnectionResponse.verify|verify} messages.
             * @param message RelayConnectionResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IRelayConnectionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RelayConnectionResponse message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns RelayConnectionResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.RelayConnectionResponse;

            /**
             * Decodes a RelayConnectionResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RelayConnectionResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.RelayConnectionResponse;
        }

        /** Properties of a PeerConnectionRequest. */
        interface IPeerConnectionRequest {

            /** PeerConnectionRequest publicKey */
            publicKey?: (string|null);
        }

        /** Represents a PeerConnectionRequest. */
        class PeerConnectionRequest implements IPeerConnectionRequest {

            /**
             * Constructs a new PeerConnectionRequest.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IPeerConnectionRequest);

            /** PeerConnectionRequest publicKey. */
            public publicKey: string;

            /**
             * Creates a new PeerConnectionRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PeerConnectionRequest instance
             */
            public static create(properties?: peerInterface.IPeerConnectionRequest): peerInterface.PeerConnectionRequest;

            /**
             * Encodes the specified PeerConnectionRequest message. Does not implicitly {@link peerInterface.PeerConnectionRequest.verify|verify} messages.
             * @param m PeerConnectionRequest message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IPeerConnectionRequest, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PeerConnectionRequest message, length delimited. Does not implicitly {@link peerInterface.PeerConnectionRequest.verify|verify} messages.
             * @param message PeerConnectionRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IPeerConnectionRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PeerConnectionRequest message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PeerConnectionRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.PeerConnectionRequest;

            /**
             * Decodes a PeerConnectionRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PeerConnectionRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.PeerConnectionRequest;
        }

        /** Properties of a PeerConnectionResponse. */
        interface IPeerConnectionResponse {

            /** PeerConnectionResponse peerAddress */
            peerAddress?: (string|null);
        }

        /** Represents a PeerConnectionResponse. */
        class PeerConnectionResponse implements IPeerConnectionResponse {

            /**
             * Constructs a new PeerConnectionResponse.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IPeerConnectionResponse);

            /** PeerConnectionResponse peerAddress. */
            public peerAddress: string;

            /**
             * Creates a new PeerConnectionResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PeerConnectionResponse instance
             */
            public static create(properties?: peerInterface.IPeerConnectionResponse): peerInterface.PeerConnectionResponse;

            /**
             * Encodes the specified PeerConnectionResponse message. Does not implicitly {@link peerInterface.PeerConnectionResponse.verify|verify} messages.
             * @param m PeerConnectionResponse message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IPeerConnectionResponse, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PeerConnectionResponse message, length delimited. Does not implicitly {@link peerInterface.PeerConnectionResponse.verify|verify} messages.
             * @param message PeerConnectionResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IPeerConnectionResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PeerConnectionResponse message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PeerConnectionResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.PeerConnectionResponse;

            /**
             * Decodes a PeerConnectionResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PeerConnectionResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.PeerConnectionResponse;
        }

        /** Properties of a UDPAddressResponse. */
        interface IUDPAddressResponse {

            /** UDPAddressResponse address */
            address?: (string|null);
        }

        /** Represents a UDPAddressResponse. */
        class UDPAddressResponse implements IUDPAddressResponse {

            /**
             * Constructs a new UDPAddressResponse.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IUDPAddressResponse);

            /** UDPAddressResponse address. */
            public address: string;

            /**
             * Creates a new UDPAddressResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns UDPAddressResponse instance
             */
            public static create(properties?: peerInterface.IUDPAddressResponse): peerInterface.UDPAddressResponse;

            /**
             * Encodes the specified UDPAddressResponse message. Does not implicitly {@link peerInterface.UDPAddressResponse.verify|verify} messages.
             * @param m UDPAddressResponse message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IUDPAddressResponse, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified UDPAddressResponse message, length delimited. Does not implicitly {@link peerInterface.UDPAddressResponse.verify|verify} messages.
             * @param message UDPAddressResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IUDPAddressResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a UDPAddressResponse message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns UDPAddressResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.UDPAddressResponse;

            /**
             * Decodes a UDPAddressResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns UDPAddressResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.UDPAddressResponse;
        }

        /** Properties of a HolePunchRegisterRequest. */
        interface IHolePunchRegisterRequest {

            /** HolePunchRegisterRequest publicKey */
            publicKey?: (string|null);
        }

        /** Represents a HolePunchRegisterRequest. */
        class HolePunchRegisterRequest implements IHolePunchRegisterRequest {

            /**
             * Constructs a new HolePunchRegisterRequest.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IHolePunchRegisterRequest);

            /** HolePunchRegisterRequest publicKey. */
            public publicKey: string;

            /**
             * Creates a new HolePunchRegisterRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns HolePunchRegisterRequest instance
             */
            public static create(properties?: peerInterface.IHolePunchRegisterRequest): peerInterface.HolePunchRegisterRequest;

            /**
             * Encodes the specified HolePunchRegisterRequest message. Does not implicitly {@link peerInterface.HolePunchRegisterRequest.verify|verify} messages.
             * @param m HolePunchRegisterRequest message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IHolePunchRegisterRequest, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified HolePunchRegisterRequest message, length delimited. Does not implicitly {@link peerInterface.HolePunchRegisterRequest.verify|verify} messages.
             * @param message HolePunchRegisterRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IHolePunchRegisterRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a HolePunchRegisterRequest message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns HolePunchRegisterRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.HolePunchRegisterRequest;

            /**
             * Decodes a HolePunchRegisterRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns HolePunchRegisterRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.HolePunchRegisterRequest;
        }

        /** Properties of a HolePunchRegisterResponse. */
        interface IHolePunchRegisterResponse {

            /** HolePunchRegisterResponse connectedAddress */
            connectedAddress?: (string|null);
        }

        /** Represents a HolePunchRegisterResponse. */
        class HolePunchRegisterResponse implements IHolePunchRegisterResponse {

            /**
             * Constructs a new HolePunchRegisterResponse.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IHolePunchRegisterResponse);

            /** HolePunchRegisterResponse connectedAddress. */
            public connectedAddress: string;

            /**
             * Creates a new HolePunchRegisterResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns HolePunchRegisterResponse instance
             */
            public static create(properties?: peerInterface.IHolePunchRegisterResponse): peerInterface.HolePunchRegisterResponse;

            /**
             * Encodes the specified HolePunchRegisterResponse message. Does not implicitly {@link peerInterface.HolePunchRegisterResponse.verify|verify} messages.
             * @param m HolePunchRegisterResponse message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IHolePunchRegisterResponse, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified HolePunchRegisterResponse message, length delimited. Does not implicitly {@link peerInterface.HolePunchRegisterResponse.verify|verify} messages.
             * @param message HolePunchRegisterResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IHolePunchRegisterResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a HolePunchRegisterResponse message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns HolePunchRegisterResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.HolePunchRegisterResponse;

            /**
             * Decodes a HolePunchRegisterResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns HolePunchRegisterResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.HolePunchRegisterResponse;
        }

        /** Properties of a PeerUdpAddressRequest. */
        interface IPeerUdpAddressRequest {

            /** PeerUdpAddressRequest publicKey */
            publicKey?: (string|null);
        }

        /** Represents a PeerUdpAddressRequest. */
        class PeerUdpAddressRequest implements IPeerUdpAddressRequest {

            /**
             * Constructs a new PeerUdpAddressRequest.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IPeerUdpAddressRequest);

            /** PeerUdpAddressRequest publicKey. */
            public publicKey: string;

            /**
             * Creates a new PeerUdpAddressRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PeerUdpAddressRequest instance
             */
            public static create(properties?: peerInterface.IPeerUdpAddressRequest): peerInterface.PeerUdpAddressRequest;

            /**
             * Encodes the specified PeerUdpAddressRequest message. Does not implicitly {@link peerInterface.PeerUdpAddressRequest.verify|verify} messages.
             * @param m PeerUdpAddressRequest message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IPeerUdpAddressRequest, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PeerUdpAddressRequest message, length delimited. Does not implicitly {@link peerInterface.PeerUdpAddressRequest.verify|verify} messages.
             * @param message PeerUdpAddressRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IPeerUdpAddressRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PeerUdpAddressRequest message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PeerUdpAddressRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.PeerUdpAddressRequest;

            /**
             * Decodes a PeerUdpAddressRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PeerUdpAddressRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.PeerUdpAddressRequest;
        }

        /** Properties of a PeerUdpAddressResponse. */
        interface IPeerUdpAddressResponse {

            /** PeerUdpAddressResponse address */
            address?: (string|null);
        }

        /** Represents a PeerUdpAddressResponse. */
        class PeerUdpAddressResponse implements IPeerUdpAddressResponse {

            /**
             * Constructs a new PeerUdpAddressResponse.
             * @param [p] Properties to set
             */
            constructor(p?: peerInterface.IPeerUdpAddressResponse);

            /** PeerUdpAddressResponse address. */
            public address: string;

            /**
             * Creates a new PeerUdpAddressResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PeerUdpAddressResponse instance
             */
            public static create(properties?: peerInterface.IPeerUdpAddressResponse): peerInterface.PeerUdpAddressResponse;

            /**
             * Encodes the specified PeerUdpAddressResponse message. Does not implicitly {@link peerInterface.PeerUdpAddressResponse.verify|verify} messages.
             * @param m PeerUdpAddressResponse message or plain object to encode
             * @param [w] Writer to encode to
             * @returns Writer
             */
            public static encode(m: peerInterface.IPeerUdpAddressResponse, w?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PeerUdpAddressResponse message, length delimited. Does not implicitly {@link peerInterface.PeerUdpAddressResponse.verify|verify} messages.
             * @param message PeerUdpAddressResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: peerInterface.IPeerUdpAddressResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PeerUdpAddressResponse message from the specified reader or buffer.
             * @param r Reader or buffer to decode from
             * @param [l] Message length if known beforehand
             * @returns PeerUdpAddressResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): peerInterface.PeerUdpAddressResponse;

            /**
             * Decodes a PeerUdpAddressResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PeerUdpAddressResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): peerInterface.PeerUdpAddressResponse;
        }

        /** CAMessageType enum. */
        enum CAMessageType {
            ERROR = 0,
            ROOT_CERT = 1,
            REQUEST_CERT = 2
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
    }
}
