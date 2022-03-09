import type { Host, Port } from 'network/types';
import type ReverseProxy from 'network/ReverseProxy';
import type { ConnectionInfoGet } from './types';
import type { ServerSurfaceCall } from '@grpc/grpc-js/build/src/server-call';

function connectionInfoGetter(revProxy: ReverseProxy): ConnectionInfoGet {
  return (call: ServerSurfaceCall) => {
    let urlString = call.getPeer();
    if (!/^.*:\/\//.test(urlString)) urlString = 'pk://' + urlString;
    const url = new URL(urlString);
    return revProxy.getConnectionInfoByProxy(
      url.hostname as Host,
      parseInt(url.port) as Port,
    );
  };
}

export { connectionInfoGetter };
