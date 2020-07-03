"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const dgram_1 = __importDefault(require("dgram"));
const crypto_1 = __importDefault(require("crypto"));
const events_1 = require("events");
const RPCMessage_1 = __importDefault(require("../rpc/RPCMessage"));
// This module is based heavily on libp2p's mDNS module:
// https://github.com/libp2p/js-libp2p-mdns
// It is supposed to discover peers on the local network
// This module was also generated with the help of:
// https://nrempel.com/using-udp-multicast-with-node-js/
//
// """
// In computer networking, the multicast DNS (mDNS) protocol
// resolves hostnames to IP addresses within small networks
// that do not include a local name server
// """
const UDP_MULTICAST_PORT = parseInt((_a = process.env.UDP_MULTICAST_PORT) !== null && _a !== void 0 ? _a : '5353');
const UDP_MULTICAST_ADDR = (_b = process.env.UDP_MULTICAST_ADDR) !== null && _b !== void 0 ? _b : "224.0.0.251";
class MulticastBroadcaster extends events_1.EventEmitter {
    constructor(addPeer, localPeerInfo, keyManager) {
        super();
        this.peerPubKeyMessages = new Map();
        this.addPeer = addPeer;
        this.localPeerInfo = localPeerInfo;
        this.keyManager = keyManager;
        this.interval = (1e3);
        this.queryInterval = null;
        // Create socket
        this.socket = dgram_1.default.createSocket({ type: "udp4", reuseAddr: true });
        this.socket.bind(UDP_MULTICAST_PORT);
        // Set up listener
        this.socket.on("listening", (() => {
            this.socket.addMembership(UDP_MULTICAST_ADDR);
            const address = this.socket.address();
        }).bind(this));
        // Handle messages
        this.socket.on("message", this.handleHandshakeMessages.bind(this));
        // Start the query process
        this.queryInterval = this.queryLAN();
    }
    /**
     * Request a peer contact for the multicast peer discovery to check for
     * @param publicKey Public key of the desired peer
     */
    async requestPeerContact(publicKey) {
        const pubKeyBuf = Buffer.from(publicKey);
        const randomMessage = crypto_1.default.randomBytes(16);
        // Encrypt message
        const encryptedPeerPubKey = await this.keyManager.encryptData(pubKeyBuf, pubKeyBuf);
        const encryptedRandomMessage = await this.keyManager.encryptData(randomMessage, pubKeyBuf);
        const encryptedLocalPubKey = await this.keyManager.encryptData(Buffer.from(this.keyManager.getPublicKey()), pubKeyBuf);
        // Add to peer messages to be sent over multicast
        this.peerPubKeyMessages.set(publicKey, {
            encryptedLocalPubKey: Buffer.from(encryptedLocalPubKey),
            encryptedPeerPubKey: Buffer.from(encryptedPeerPubKey),
            rawRandomMessage: randomMessage,
            encryptedRandomMessage: Buffer.from(encryptedRandomMessage)
        });
    }
    // ==== Helper methods ==== //
    queryLAN() {
        const query = () => {
            for (const pubKey of this.peerPubKeyMessages.keys()) {
                const peerMessage = this.peerPubKeyMessages.get(pubKey);
                if (peerMessage) {
                    const handshakeMessage = RPCMessage_1.default.encodeHandshakeMessage(peerMessage.encryptedPeerPubKey, peerMessage.encryptedLocalPubKey, peerMessage.encryptedRandomMessage);
                    this.socket.send(handshakeMessage, 0, handshakeMessage.length, UDP_MULTICAST_PORT, UDP_MULTICAST_ADDR, () => {
                        console.info(`Sending message to peer`);
                    });
                }
            }
        };
        // Immediately start a query, then do it every interval.
        query();
        return setInterval(query, this.interval);
    }
    async handleHandshakeMessages(message, rinfo) {
        var _a;
        try {
            const decodedMessage = RPCMessage_1.default.decodeHandshakeMessage(message);
            console.info(`Message from: ${rinfo.address}:${rinfo.port}`);
            // Try to decrypt message and pubKey
            const decryptedMessage = await this.keyManager.decryptData(decodedMessage.message);
            const decryptedTargetPubKey = await this.keyManager.decryptData(decodedMessage.targetPubKey);
            const decryptedRequestingPubKey = await this.keyManager.decryptData(decodedMessage.requestingPubKey);
            const myPubKey = this.keyManager.getPublicKey();
            if (decryptedRequestingPubKey.toString() == myPubKey) { // Response
                // Make sure decrypted bytes equal raw bytes in memory
                const originalMessage = (_a = this.peerPubKeyMessages.get(decryptedTargetPubKey.toString())) === null || _a === void 0 ? void 0 : _a.rawRandomMessage;
                if (decryptedMessage.toString() == (originalMessage === null || originalMessage === void 0 ? void 0 : originalMessage.toString())) { // Validated!
                    // Add peer info to peerStore
                    const newPeerInfo = decodedMessage.responsePeerInfo;
                    if (newPeerInfo) {
                        this.addPeer(newPeerInfo);
                        // Remove peerId from requested messages
                        const pubKey = newPeerInfo.publicKey;
                        this.peerPubKeyMessages.delete(pubKey);
                        console.log(`New peer added to the store`);
                        this.emit('found', newPeerInfo);
                    }
                    else {
                        this.emit('error', "I got a validated response. But no peerInfo");
                    }
                }
            }
            else { // Requests on target node
                // Try decrypting message
                // Re-encrypt the data and send it on its way
                const encryptedTargetPubKey = await this.keyManager.encryptData(Buffer.from(myPubKey), decryptedRequestingPubKey);
                const encryptedMessage = await this.keyManager.encryptData(decryptedMessage, decryptedRequestingPubKey);
                const encryptedPubKey = await this.keyManager.encryptData(decryptedRequestingPubKey, decryptedRequestingPubKey);
                const handshakeMessage = RPCMessage_1.default.encodeHandshakeMessage(Buffer.from(encryptedTargetPubKey), Buffer.from(encryptedPubKey), Buffer.from(encryptedMessage), this.localPeerInfo);
                this.socket.send(handshakeMessage, 0, handshakeMessage.length, UDP_MULTICAST_PORT, UDP_MULTICAST_ADDR);
            }
        }
        catch (err) { // Couldn't decode message
            // We don't want the multicast discovery to error on every message it coudln't decode!
        }
    }
}
exports.default = MulticastBroadcaster;
//# sourceMappingURL=MulticastBroadcaster.js.map