import { rpc, RpcKernel } from '@deepkit/rpc';
import { RpcWebSocketServer } from '@deepkit/rpc-tcp';

@rpc.controller('Con')
class Con {
    @rpc.action()
    hello(title: string): string {
        return 'Hello ' + title;
    }

    @rpc.action()
    async getUser(): Promise<string> {
      return 'this is a user';
    }
}

async function main () {

  const kernel = new RpcKernel();
  kernel.registerController(Con, 'Con');
  kernel.controllers
  kernel.createConnection
  kernel.onConnection((conn) => {
    conn.clientAddress
    conn.controller
    conn.handleMessage
    conn.myPeerId
    conn.onClose
    conn.onMessage
    conn.writer
  });

  const server = new RpcWebSocketServer(kernel, 'ws://localhost:8081');

  server.start({
    host: 'localhost',
    port: 8081,
  });

  console.log('STARTED');
  // server.close();
}

main();
