import dgram from 'dgram'
import crypto from 'crypto'
import { EventEmitter } from 'events'
import KeyManager from '@polykey/keys/KeyManager'
import RPCMessage from '@polykey/rpc/RPCMessage'
import PeerInfo from './PeerInfo'

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

const UDP_MULTICAST_PORT = parseInt(process.env.UDP_MULTICAST_PORT ?? '5353');
const UDP_MULTICAST_ADDR = process.env.UDP_MULTICAST_ADDR ?? "224.0.0.251";

type PeerMessage = {
  encryptedLocalPubKey: Buffer
  encryptedPeerPubKey: Buffer
  rawRandomMessage: Buffer
  encryptedRandomMessage: Buffer
}

class MulticastBroadcaster extends EventEmitter {
  addPeer: (peerInfo: PeerInfo) => void
  localPeerInfo: PeerInfo
  keyManager: KeyManager

  socket: dgram.Socket

  interval: number
  queryInterval: NodeJS.Timeout | null
  peerPubKeyMessages: Map<string, PeerMessage> = new Map()
  constructor(
    addPeer: (peerInfo: PeerInfo) => void,
    localPeerInfo: PeerInfo,
    keyManager: KeyManager
  ) {
    super()

    this.addPeer = addPeer
    this.localPeerInfo = localPeerInfo
    this.keyManager = keyManager

    this.interval = (1e3)
    this.queryInterval = null

    // Create socket
    this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true })
    this.socket.bind(<number>UDP_MULTICAST_PORT)

    // Set up listener
    this.socket.on("listening", (() => {
      this.socket.addMembership(UDP_MULTICAST_ADDR);
      const address = this.socket.address();
    }).bind(this));

    // Handle messages
    this.socket.on("message", this.handleHandshakeMessages.bind(this));

    // Start the query process
    this.queryInterval = this.queryLAN()
  }


  queryLAN() {
    const query = () => {
      for (const pubKey of this.peerPubKeyMessages.keys()) {
        const peerMessage = this.peerPubKeyMessages.get(pubKey)
        if (peerMessage) {
          const handshakeMessage = RPCMessage.encodeHandshakeMessage(
            peerMessage.encryptedPeerPubKey,
            peerMessage.encryptedLocalPubKey,
            peerMessage.encryptedRandomMessage
          )

          this.socket.send(handshakeMessage, 0, handshakeMessage.length, UDP_MULTICAST_PORT, UDP_MULTICAST_ADDR, () => {
            console.info(`Sending message to peer`);
          });
        }

      }
    }

    // Immediately start a query, then do it every interval.
    query()
    return setInterval(query, this.interval)
  }

  private async handleHandshakeMessages(message: any, rinfo: any) {
    try {
      const decodedMessage = RPCMessage.decodeHandshakeMessage(message)
      console.info(`Message from: ${rinfo.address}:${rinfo.port}`);


      // Try to decrypt message and pubKey
      const decryptedMessage = await this.keyManager.decryptData(decodedMessage.message.toString())
      const decryptedTargetPubKey = await this.keyManager.decryptData(decodedMessage.targetPubKey.toString())
      const decryptedRequestingPubKey = await this.keyManager.decryptData(decodedMessage.requestingPubKey.toString())

      const myPubKey = this.keyManager.getPublicKey()

      if (decryptedRequestingPubKey.toString() == myPubKey) { // Response
        // Make sure decrypted bytes equal raw bytes in memory
        const originalMessage = this.peerPubKeyMessages.get(decryptedTargetPubKey.toString())?.rawRandomMessage

        if (decryptedMessage.toString() == originalMessage?.toString()) {  // Validated!
          // Add peer info to peerStore
          const newPeerInfo = decodedMessage.responsePeerInfo
          if (newPeerInfo) {
            this.addPeer(newPeerInfo)
            // Remove peerId from requested messages
            const pubKey = newPeerInfo.publicKey
            this.peerPubKeyMessages.delete(pubKey)
            console.log(`New peer added to the store`);
            this.emit('found', newPeerInfo)
          } else {
            this.emit('error', "I got a validated response. But no peerInfo");
          }
        }
      } else {  // Requests on target node
        // Try decrypting message
        // Re-encrypt the data and send it on its way

        const encryptedTargetPubKey = await this.keyManager.encryptData(Buffer.from(myPubKey), decryptedRequestingPubKey)
        const encryptedMessage = await this.keyManager.encryptData(decryptedMessage, decryptedRequestingPubKey)
        const encryptedPubKey = await this.keyManager.encryptData(decryptedRequestingPubKey, decryptedRequestingPubKey)
        const handshakeMessage = RPCMessage.encodeHandshakeMessage(
          Buffer.from(encryptedTargetPubKey),
          Buffer.from(encryptedPubKey),
          Buffer.from(encryptedMessage),
          this.localPeerInfo
        )
        this.socket.send(handshakeMessage, 0, handshakeMessage.length, <number>UDP_MULTICAST_PORT, UDP_MULTICAST_ADDR);
      }
    } catch (err) { // Couldn't decode message
      // We don't want the multicast discovery to error on every message it coudln't decode!
    }
  }

  async requestPeerContact(pubKey: string) {
    const pubKeyBuf = Buffer.from(pubKey)
    const randomMessage = crypto.randomBytes(16)
    // Encrypt message
    const encryptedPeerPubKey = await this.keyManager.encryptData(pubKeyBuf, pubKeyBuf)
    const encryptedRandomMessage = await this.keyManager.encryptData(randomMessage, pubKeyBuf)
    const encryptedLocalPubKey = await this.keyManager.encryptData(Buffer.from(this.keyManager.getPublicKey()), pubKeyBuf)

    // Add to peer messages to be sent over multicast
    this.peerPubKeyMessages.set(pubKey, {
      encryptedLocalPubKey: Buffer.from(encryptedLocalPubKey),
      encryptedPeerPubKey: Buffer.from(encryptedPeerPubKey),
      rawRandomMessage: randomMessage,
      encryptedRandomMessage: Buffer.from(encryptedRandomMessage)
    })
  }
}

export default MulticastBroadcaster
