import Path from 'path'
import protobuf, { Root } from 'protobufjs'
import PeerInfo from '@polykey/PeerStore/PeerInfo'

type HandshakeMessage = {
  targetPubKey: Buffer
  requestingPubKey: Buffer
  message: Buffer
  responsePeerInfo?: PeerInfo
}
console.log(__filename);

class RPCMessage {
  static loadProto(name: string): Root {
    // Load root
    const root: Root = new protobuf.Root()
    root.resolvePath = (origin, target) => {
      return Path.join(__filename, target)
    }

    return root.loadSync(name)
  }
  static encodePeerInfo(peerInfo: PeerInfo): Uint8Array {
    const root = this.loadProto("PeerInfoMessage.proto")

    // Obtain a message type
    const PeerInfoMessage = root!.lookupType("peerinfopackage.PeerInfoMessage");

    // Encode address set to array
    const addresses: string[] = []
    for (const addr of peerInfo.addresses) {
      addresses.push(addr.toString())
    }

    // Exemplary payload
    const payload = {
      pubKey: peerInfo.publicKey,
      addresses: addresses,
      connectedAddr: peerInfo.connectedAddr?.toString()
    };

    // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
    const errMsg = PeerInfoMessage.verify(payload);
    if (errMsg)
        throw Error(errMsg);

    // Create a new message
    const message = PeerInfoMessage.create(payload); // or use .fromObject if conversion is necessary

    // Encode a message to an Uint8Array (browser) or Buffer (node)
    const buffer = PeerInfoMessage.encode(message).finish();

    return buffer
  }

  static decodePeerInfo(buffer: Uint8Array): PeerInfo {
    const root = this.loadProto("PeerInfoMessage.proto")

    // Obtain a message type
    const PeerInfoMessage = root!.lookupType("peerinfopackage.PeerInfoMessage");

    // Decode an Uint8Array (browser) or Buffer (node) to a message
    const message = PeerInfoMessage.decode(buffer);

    // Convert the message back to a plain object
    const object = PeerInfoMessage.toObject(message, {
      enums: String,  // enums as string names
      longs: String,  // longs as strings (requires long.js)
      bytes: String,  // bytes as base64 encoded strings
      defaults: true, // includes default values
      arrays: true,   // populates empty arrays (repeated fields) even if defaults=false
      objects: true,  // populates empty objects (map fields) even if defaults=false
      oneofs: true    // includes virtual oneof fields set to the present field's name
    });

    return new PeerInfo(
      object.pubKey,
      object.addresses,
      object.connectedAddr
    )
  }

  static encodeHandshakeMessage(targetPubKey: Buffer, requestingPubKey: Buffer, messageBuf: Buffer, responsePeerInfo?: PeerInfo): Uint8Array {
    const root = this.loadProto("HandshakeMessage.proto")

    // Obtain a message type
    const HandshakeMessage = root!.lookupType("handshakepackage.HandshakeMessage");

    // Exemplary payload
    const payload = {
      targetPubKey: targetPubKey,
      requestingPubKey: requestingPubKey,
      message: messageBuf,
      responsePeerInfo: (responsePeerInfo) ? this.encodePeerInfo(responsePeerInfo) : undefined
    };

    // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
    const errMsg = HandshakeMessage.verify(payload);
    if (errMsg)
        throw Error(errMsg);

    // Create a new message
    const message = HandshakeMessage.create(payload); // or use .fromObject if conversion is necessary

    // Encode a message to an Uint8Array (browser) or Buffer (node)
    const buffer = HandshakeMessage.encode(message).finish();

    return buffer
  }

  static decodeHandshakeMessage(buffer: Uint8Array): HandshakeMessage {
    const root = this.loadProto("HandshakeMessage.proto")

    // Obtain a message type
    const HandshakeMessage = root!.lookupType("handshakepackage.HandshakeMessage");

    // Decode an Uint8Array (browser) or Buffer (node) to a message
    const message = HandshakeMessage.decode(buffer);

    // Convert the message back to a plain object
    const object = HandshakeMessage.toObject(message, {
      enums: String,  // enums as string names
      longs: String,  // longs as strings (requires long.js)
      bytes: String,  // bytes as base64 encoded strings
      defaults: true, // includes default values
      arrays: true,   // populates empty arrays (repeated fields) even if defaults=false
      objects: true,  // populates empty objects (map fields) even if defaults=false
      oneofs: true    // includes virtual oneof fields set to the present field's name
    });

    return {
      targetPubKey: Buffer.from(object.targetPubKey, 'base64'),
      requestingPubKey: Buffer.from(object.requestingPubKey, 'base64'),
      message: Buffer.from(object.message, 'base64'),
      responsePeerInfo: (object.responsePeerInfo) ? this.decodePeerInfo(Buffer.from(object.responsePeerInfo, 'base64')) : undefined
    }
  }
}

export default RPCMessage
