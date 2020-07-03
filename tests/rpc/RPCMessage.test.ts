import crypto from 'crypto'
import PeerInfo from '../../src/lib/peers/PeerInfo'
import RPCMessage from '../../src/lib/rpc/RPCMessage'

// TODO add tests as part of testing PR
describe('RPCMessage class', () => {

	beforeAll(() => {
	})

	afterAll(() => {
	})

	test('encoding peerInfo', () => {
    const peerInfo = new PeerInfo('this is a pubkey', ['0.0.0.0:2020'], '0.0.0.0:2020')
    const message = RPCMessage.encodePeerInfo(peerInfo)

    const decodedPeerInfo: PeerInfo = RPCMessage.decodePeerInfo(message)

    expect(decodedPeerInfo.publicKey).toEqual(peerInfo.publicKey)
    expect(decodedPeerInfo.addresses).toEqual(peerInfo.addresses)
    expect(decodedPeerInfo.connectedAddr).toEqual(peerInfo.connectedAddr)
	})

	test('encoding handshake message', () => {
    const targetPubKey = Buffer.from('target pubkey')
    const requestingPubKey = Buffer.from('requesting pubkey')
    const randomMessage = crypto.randomBytes(16)
    const peerInfo = new PeerInfo(targetPubKey.toString(), ['0.0.0.0:2020'], '0.0.0.0:2020')
    const encodedMessage = RPCMessage.encodeHandshakeMessage(targetPubKey, requestingPubKey, randomMessage, peerInfo)

    const decodedMessage = RPCMessage.decodeHandshakeMessage(encodedMessage)

    expect(decodedMessage.targetPubKey).toEqual(targetPubKey)
    expect(decodedMessage.requestingPubKey).toEqual(requestingPubKey)
    expect(decodedMessage.message).toEqual(randomMessage)
    expect(decodedMessage.responsePeerInfo).toEqual(peerInfo)
	})
})
