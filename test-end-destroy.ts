import { utils as keysUtils } from './src/keys';
import net from 'net';
import tls from 'tls';

async function main () {
  const serverKeyPair = await keysUtils.generateKeyPair(1024);
  const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
  const serverCert = keysUtils.generateCertificate(
    serverKeyPair.publicKey,
    serverKeyPair.privateKey,
    serverKeyPair.privateKey,
    86400,
  );
  const serverCertPem = keysUtils.certToPem(serverCert);
  const server = net.createServer({ allowHalfOpen: true }, (c) => {
    console.log('received connection');
    const tlsSocket = new tls.TLSSocket(c, {
      key: Buffer.from(serverKeyPairPem.privateKey, 'ascii'),
      cert: Buffer.from(serverCertPem, 'ascii'),
      isServer: true,
      requestCert: true,
      rejectUnauthorized: false,
    });
    tlsSocket.once('secure', () => {
      console.log('established secure conn');
    });
    tlsSocket.on('end', async () => {
      console.log('received end');
      tlsSocket.end(() => {
        console.log('HELLO WORLD');
      });
      console.log('destroying');
      tlsSocket.destroy();
    });
    tlsSocket.on('close', () => {
      console.log('destroyed');
    });
  });
  server.listen(55555, () => {
    console.log('server bound');
  });
}

main();
