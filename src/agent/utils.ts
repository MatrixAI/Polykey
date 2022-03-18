import type { Host, Port } from 'network/types';
import type Proxy from 'network/Proxy';
import type { ConnectionInfoGet } from './types';
import type { ServerSurfaceCall } from '@grpc/grpc-js/build/src/server-call';

function connectionInfoGetter(proxy: Proxy): ConnectionInfoGet {
  return (call: ServerSurfaceCall) => {
    let urlString = call.getPeer();
    if (!/^.*:\/\//.test(urlString)) urlString = 'pk://' + urlString;
    const url = new URL(urlString);
    return proxy.getConnectionInfoByReverse(
      url.hostname as Host,
      parseInt(url.port) as Port,
    );
  };
}

export { connectionInfoGetter };
