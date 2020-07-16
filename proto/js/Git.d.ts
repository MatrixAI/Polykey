import * as $protobuf from "protobufjs";
/** Namespace git. */
export namespace git {

    /** Represents a GitServer */
    class GitServer extends $protobuf.rpc.Service {

        /**
         * Constructs a new GitServer service.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         */
        constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);

        /**
         * Creates new GitServer service using the specified rpc implementation.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         * @returns RPC service. Useful where requests and/or responses are streamed.
         */
        public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): GitServer;

        /**
         * Calls RequestInfo.
         * @param request InfoRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and InfoReply
         */
        public requestInfo(request: git.IInfoRequest, callback: git.GitServer.RequestInfoCallback): void;

        /**
         * Calls RequestInfo.
         * @param request InfoRequest message or plain object
         * @returns Promise
         */
        public requestInfo(request: git.IInfoRequest): Promise<git.InfoReply>;

        /**
         * Calls RequestPack.
         * @param request PackRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and PackReply
         */
        public requestPack(request: git.IPackRequest, callback: git.GitServer.RequestPackCallback): void;

        /**
         * Calls RequestPack.
         * @param request PackRequest message or plain object
         * @returns Promise
         */
        public requestPack(request: git.IPackRequest): Promise<git.PackReply>;
    }

    namespace GitServer {

        /**
         * Callback as used by {@link git.GitServer#requestInfo}.
         * @param error Error, if any
         * @param [response] InfoReply
         */
        type RequestInfoCallback = (error: (Error|null), response?: git.InfoReply) => void;

        /**
         * Callback as used by {@link git.GitServer#requestPack}.
         * @param error Error, if any
         * @param [response] PackReply
         */
        type RequestPackCallback = (error: (Error|null), response?: git.PackReply) => void;
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
        constructor(p?: git.IInfoRequest);

        /** InfoRequest vaultName. */
        public vaultName: string;

        /**
         * Creates a new InfoRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns InfoRequest instance
         */
        public static create(properties?: git.IInfoRequest): git.InfoRequest;

        /**
         * Encodes the specified InfoRequest message. Does not implicitly {@link git.InfoRequest.verify|verify} messages.
         * @param m InfoRequest message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: git.IInfoRequest, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an InfoRequest message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns InfoRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): git.InfoRequest;
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
        constructor(p?: git.IInfoReply);

        /** InfoReply vaultName. */
        public vaultName: string;

        /** InfoReply body. */
        public body: Uint8Array;

        /**
         * Creates a new InfoReply instance using the specified properties.
         * @param [properties] Properties to set
         * @returns InfoReply instance
         */
        public static create(properties?: git.IInfoReply): git.InfoReply;

        /**
         * Encodes the specified InfoReply message. Does not implicitly {@link git.InfoReply.verify|verify} messages.
         * @param m InfoReply message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: git.IInfoReply, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an InfoReply message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns InfoReply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): git.InfoReply;
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
        constructor(p?: git.IPackRequest);

        /** PackRequest vaultName. */
        public vaultName: string;

        /** PackRequest body. */
        public body: Uint8Array;

        /**
         * Creates a new PackRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PackRequest instance
         */
        public static create(properties?: git.IPackRequest): git.PackRequest;

        /**
         * Encodes the specified PackRequest message. Does not implicitly {@link git.PackRequest.verify|verify} messages.
         * @param m PackRequest message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: git.IPackRequest, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PackRequest message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns PackRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): git.PackRequest;
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
        constructor(p?: git.IPackReply);

        /** PackReply vaultName. */
        public vaultName: string;

        /** PackReply body. */
        public body: Uint8Array;

        /**
         * Creates a new PackReply instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PackReply instance
         */
        public static create(properties?: git.IPackReply): git.PackReply;

        /**
         * Encodes the specified PackReply message. Does not implicitly {@link git.PackReply.verify|verify} messages.
         * @param m PackReply message or plain object to encode
         * @param [w] Writer to encode to
         * @returns Writer
         */
        public static encode(m: git.IPackReply, w?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PackReply message from the specified reader or buffer.
         * @param r Reader or buffer to decode from
         * @param [l] Message length if known beforehand
         * @returns PackReply
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(r: ($protobuf.Reader|Uint8Array), l?: number): git.PackReply;
    }
}
