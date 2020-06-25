import tls from 'tls'
import createX509Certificate from './src/lib/pki/PublicKeyInfrastructure';

const {keyPem, certPem} = createX509Certificate()

const clientOptions: tls.TlsOptions = {
  key: keyPem,
  cert: certPem,
  requestCert: true,
  rejectUnauthorized: false,
};

const server = tls.createServer(clientOptions);
server.addListener('secureConnection', (socket) => {
  socket.on('data', data => {
    socket.write(Buffer.from('====Echoing===='))
    socket.write(data)
  })
})

server.listen(8000, () => {
  console.log(server.address());
  console.log('server bound');
});


// === client === //
const x = createX509Certificate()
const serverOptions: tls.ConnectionOptions = {
  host: '127.0.0.1',
  port: 8000,
  key: x.keyPem,
  cert: x.certPem,
  requestCert: true,
  rejectUnauthorized: false
};

var socket = tls.connect(serverOptions);
socket.on('data', (data) => {
  console.log(data.toString());
});

socket.on('end', () => {
  console.log('Ended')
});

socket.write(Buffer.from('hellow wef wef wef we fwef '))
socket.end()
