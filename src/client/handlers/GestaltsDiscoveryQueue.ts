import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type Discovery from '../../discovery/Discovery';
import type { DiscoveryQueueInfo } from '../../discovery/types';
import type { ContextTimed } from '@matrixai/contexts';
import { ServerHandler } from '@matrixai/rpc';

class GestaltsDiscoveryQueue extends ServerHandler<
  {
    discovery: Discovery;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<DiscoveryQueueInfo>
> {
  public async *handle(
    _input: ClientRPCRequestParams,
    _cancel,
    _meta,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<DiscoveryQueueInfo>> {
    const { discovery } = this.container;
    for await (const discoveryQueueInfo of discovery.getDiscoveryQueue()) {
      ctx.signal.throwIfAborted();
      yield discoveryQueueInfo;
    }
  }
}

export default GestaltsDiscoveryQueue;
