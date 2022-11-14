// we are going to try to use deepkit rpc to figure out if it works for us
// but we are unlikely to use the library itself because it uses a different ecosystem from us
// it's so much dependencies
// you end up needing isomorphic-ws too
// to get websockets available in nodejs

import { rpc, RpcKernel } from '@deepkit/rpc';
import { RpcWebSocketServer } from '@deepkit/rpc-tcp';

@rpc.controller('myController');
class Controller {
    @rpc.action()
    hello(title: string): string {
        return 'Hello ' + title;
    }
}

// instresting
