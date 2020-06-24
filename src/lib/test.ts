import net from 'net'
import http from 'http'
import HttpMessageBuilder from './git/http-message/http-message-builder'


const port = 5001
const host = 'localhost'
async function startServer() {
  return new Promise((resolve, reject) => {
    const requestListener = function (req, res) {
      res.statusCode = 404
      res.end('not found')
    };

    const server = http.createServer(requestListener);
    server.listen(port, host, () => {
        console.log(`Server is running on http://${host}:${port}`);
        resolve()
    });
  })
}
async function startCustomServer() {
  return new Promise((resolve, reject) => {
    const requestListener = function (socket: net.Socket) {
      const message = new HttpMessageBuilder()
      message.addHeader('content-type', 'application/x-git-' + 'service' + '-result')
      message.appendToBody('My first server!')
      message.appendToBody('0008NAK')
      socket.write(message.build())
      socket.end()
    };

    const server = net.createServer(requestListener);
    server.listen(port, host, () => {
        console.log(`Server is running on http://${host}:${port}`);
        resolve()
    });
  })
}

async function main() {
  // await startServer()
  await startCustomServer()
  //============= client =============//
  const clientSocket = new net.Socket()

  clientSocket.connect(port, '127.0.0.1')

  clientSocket.on('data', data => {
    console.log('==============');
    console.log('Received: ' + data);
    console.log('==============');
    // clientSocket.destroy(); // kill client after server's response
  })

  const options: http.RequestOptions = {
    host: host,
    port: port,
    path: '/',
    method: 'GET',
    createConnection: () => {
      return clientSocket
    }
  }


  const req = http.request(options, (res) => {
    res.on('data', data => {
      console.log('http data');

      console.log(data.toString());

    })
  });
  req.end()
}

main()
