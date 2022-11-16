import { rpc, RpcKernel } from '@deepkit/rpc';
// import { RpcClient } from '@deepkit/rpc';
import { RpcWebSocketClient } from '@deepkit/rpc';
// import { RpcTcpClientAdapter } from '@deepkit/rpc-tcp';

interface ControllerI {
  hello(title: string): string;
  getUser(): Promise<string>;
}

@rpc.controller('clientController')
class Controller {
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

  const client = new RpcWebSocketClient('ws://localhost:8081');
  client.registerController(Controller, 'clientController');

  const controller = client.controller<ControllerI>('myController');


  // const result1 = await controller.hello('world');
  // const result2 = await controller.getUser();

  // console.log(result1);
  // console.log(result2);

  // client.disconnect();
}

main();



// instresting
