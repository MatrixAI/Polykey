"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const protobufjs_1 = __importDefault(require("protobufjs"));
const PeerInfo_1 = __importDefault(require("../peers/PeerInfo"));
class RPCMessage {
    /**
     * Encode peer info into a protocol buffer
     * @param peerInfo The peerInfo to be encoded
     */
    static encodePeerInfo(peerInfo) {
        var _a;
        const root = this.loadProto("PeerInfoMessage.proto");
        // Obtain a message type
        const PeerInfoMessage = root.lookupType("peerinfopackage.PeerInfoMessage");
        // Encode address set to array
        const addresses = [];
        for (const addr of peerInfo.addresses) {
            addresses.push(addr.toString());
        }
        // Exemplary payload
        const payload = {
            pubKey: peerInfo.publicKey,
            addresses: addresses,
            connectedAddr: (_a = peerInfo.connectedAddr) === null || _a === void 0 ? void 0 : _a.toString()
        };
        // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
        const errMsg = PeerInfoMessage.verify(payload);
        if (errMsg)
            throw Error(errMsg);
        // Create a new message
        const message = PeerInfoMessage.create(payload); // or use .fromObject if conversion is necessary
        // Encode a message to an Uint8Array (browser) or Buffer (node)
        const buffer = PeerInfoMessage.encode(message).finish();
        return buffer;
    }
    /**
     * Deccode a protocol buffer into peer info
     * @param buffer
     */
    static decodePeerInfo(buffer) {
        const root = this.loadProto("PeerInfoMessage.proto");
        // Obtain a message type
        const PeerInfoMessage = root.lookupType("peerinfopackage.PeerInfoMessage");
        // Decode an Uint8Array (browser) or Buffer (node) to a message
        const message = PeerInfoMessage.decode(buffer);
        // Convert the message back to a plain object
        const object = PeerInfoMessage.toObject(message, {
            enums: String,
            longs: String,
            bytes: String,
            defaults: true,
            arrays: true,
            objects: true,
            oneofs: true // includes virtual oneof fields set to the present field's name
        });
        return new PeerInfo_1.default(object.pubKey, object.addresses, object.connectedAddr);
    }
    /**
     * Encode a handshake message into a protocol buffer
     * @param targetPubKey
     * @param requestingPubKey
     * @param message
     * @param responsePeerInfo
     */
    static encodeHandshakeMessage(targetPubKey, requestingPubKey, message, responsePeerInfo) {
        const root = this.loadProto("HandshakeMessage.proto");
        // Obtain a message type
        const HandshakeMessage = root.lookupType("handshakepackage.HandshakeMessage");
        // Exemplary payload
        const payload = {
            targetPubKey: targetPubKey,
            requestingPubKey: requestingPubKey,
            message: message,
            responsePeerInfo: (responsePeerInfo) ? this.encodePeerInfo(responsePeerInfo) : undefined
        };
        // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
        const errMsg = HandshakeMessage.verify(payload);
        if (errMsg)
            throw Error(errMsg);
        // Create a new message
        const encodedMmessage = HandshakeMessage.create(payload); // or use .fromObject if conversion is necessary
        // Encode a message to an Uint8Array (browser) or Buffer (node)
        const buffer = HandshakeMessage.encode(encodedMmessage).finish();
        return buffer;
    }
    /**
     * Deccode a protocol buffer into a handshake message
     * @param buffer
     */
    static decodeHandshakeMessage(buffer) {
        const root = this.loadProto("HandshakeMessage.proto");
        // Obtain a message type
        const HandshakeMessage = root.lookupType("handshakepackage.HandshakeMessage");
        // Decode an Uint8Array (browser) or Buffer (node) to a message
        const message = HandshakeMessage.decode(buffer);
        // Convert the message back to a plain object
        const object = HandshakeMessage.toObject(message, {
            enums: String,
            longs: String,
            bytes: String,
            defaults: true,
            arrays: true,
            objects: true,
            oneofs: true // includes virtual oneof fields set to the present field's name
        });
        return {
            targetPubKey: Buffer.from(object.targetPubKey, 'base64'),
            requestingPubKey: Buffer.from(object.requestingPubKey, 'base64'),
            message: Buffer.from(object.message, 'base64'),
            responsePeerInfo: (object.responsePeerInfo) ? this.decodePeerInfo(Buffer.from(object.responsePeerInfo, 'base64')) : undefined
        };
    }
    // ==== Helper methods ==== //
    static loadProto(name) {
        // Load root
        const root = new protobufjs_1.default.Root();
        root.resolvePath = (origin, target) => {
            return path_1.default.join(path_1.default.dirname(__filename), target);
        };
        return root.loadSync(name);
    }
}
exports.default = RPCMessage;
//# sourceMappingURL=RPCMessage.js.map