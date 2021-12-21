import net from 'net';
import { utils as keysUtils } from './src/keys';
import { utils as networkUtils } from './src/network';

async function main () {

  const clientKeyPair = await keysUtils.generateKeyPair(1024);
  const clientKeyPairPem = keysUtils.keyPairToPem(clientKeyPair);
  const clientCert = keysUtils.generateCertificate(
    clientKeyPair.publicKey,
    clientKeyPair.privateKey,
    clientKeyPair.privateKey,
    12332432423,
  );
  const clientCertPem = keysUtils.certToPem(clientCert);
  const clientNodeId = networkUtils.certNodeId(clientCert);

  let socket;
  const p = new Promise<void>((resolve) => {
    socket = net.connect(
      {
        port: 80,
        host: '142.250.66.206',
        allowHalfOpen: false
      },
      () => {
        resolve();
      }
    );
    socket.on('close', () => {
      console.log('CLOSE EVENT EMITTED');
    });
  });

  const p2 = new Promise<void>((resolve) => {
    socket.on('end', () => {
      resolve();
    });
  });
  socket.end();
  await p2;

  console.log('allow half open', socket.allowHalfOpen);
  console.log('ready state', socket.readyState);
  console.log('destroyed', socket.destroyed);


}

main();
