import PeerInfo from '../PeerInfo';
import PeerManager from '../PeerManager';
import { peerInterface } from '../../../proto/js/Peer';
import { MTPConnection, createServer, UTPServer, connect } from './MicroTransportProtocol';

class UDPHolePunchServer {
  peerManager: PeerManager;

  server: UTPServer;
  // publicKey -> Server
  private clientList: Map<string, MTPConnection> = new Map();

  getAddress(publicKey: string) {
    return this.clientList.get(PeerInfo.formatPublicKey(publicKey))?.remoteAddress.toString();
  }

  constructor(peerManager: PeerManager) {
    this.peerManager = peerManager;
    this.server = createServer((conn: MTPConnection) => {
      this.handleConnection(conn);
    });
    this.server.listenPort(0, () => {
      console.log(`UDP Server listening on ` + this.server.address().host + ':' + this.server.address().port);
    });
  }

  private handleConnection(conn: MTPConnection) {
    let buf: Buffer[] = [];
    conn.on('data', (data: Buffer) => {
      buf.push(data);
      // try decoding
      try {
        const { publicKey } = peerInterface.HolePunchRegisterRequest.decodeDelimited(Buffer.concat(buf));

        const remote = conn.remoteAddress;
        this.clientList.set(PeerInfo.formatPublicKey(publicKey), connect(remote.port, remote.host));

        const response = peerInterface.HolePunchRegisterResponse.encodeDelimited({
          connectedAddress: remote.toString(),
        }).finish();
        conn.write(response);
      } catch (error) {}
    });
  }
}

export default UDPHolePunchServer;
