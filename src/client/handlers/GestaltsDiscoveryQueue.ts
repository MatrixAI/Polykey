import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type Discovery from '../../discovery/Discovery';
import type { DiscoveryQueueInfo } from '../../discovery/types';
import { ServerHandler } from '@matrixai/rpc';

class GestaltsDiscoveryQueue extends ServerHandler<
  {
    discovery: Discovery;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<DiscoveryQueueInfo>
> {
  public async *handle(): AsyncGenerator<
    ClientRPCResponseResult<DiscoveryQueueInfo>
  > {
    const { discovery } = this.container;
    for await (const discoveryQueueInfo of discovery.getDiscoveryQueue()) {
      yield discoveryQueueInfo;
    }
  }
}

export default GestaltsDiscoveryQueue;
