import { utils as keysUtils } from './src/keys';
import net from 'net';
import tls from 'tls';

async function main () {

  const clientKeyPair = await keysUtils.generateKeyPair(1024);
  const clientKeyPairPem = keysUtils.keyPairToPem(clientKeyPair);
  const clientCert = keysUtils.generateCertificate(
    clientKeyPair.publicKey,
    clientKeyPair.privateKey,
    clientKeyPair.privateKey,
    86400,
  );
  const clientCertPem = keysUtils.certToPem(clientCert);

  const socket = net.createConnection({
    port: 55555,
    host: '127.0.0.1',
    allowHalfOpen: true
   }, () => {

    const tlsSocket = tls.connect(
      {
        key: Buffer.from(clientKeyPairPem.privateKey, 'ascii'),
        cert: Buffer.from(clientCertPem, 'ascii'),
        socket: socket,
        rejectUnauthorized: false,
      },
      () => {

        tlsSocket.on('end', () => {
          console.log('RECEIVED END AFTER SENDING end');
        });

        console.log('SENDING END');
        tlsSocket.end();

      },
    );
  });
}

main();
