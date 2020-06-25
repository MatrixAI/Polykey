import tls from 'tls'
import createX509Certificate from './src/lib/pki/PublicKeyInfrastructure'

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
