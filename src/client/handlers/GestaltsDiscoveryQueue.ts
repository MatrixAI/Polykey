import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
} from '../types.js';
import type Discovery from '../../discovery/Discovery.js';
import type { DiscoveryQueueInfo } from '../../discovery/types.js';
import type { ContextTimed } from '@matrixai/contexts';
import { ServerHandler } from '@matrixai/rpc';

class GestaltsDiscoveryQueue extends ServerHandler<
  {
    discovery: Discovery;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<DiscoveryQueueInfo>
> {
  public handle = async function* (
    _input: ClientRPCRequestParams,
    _cancel,
    _meta,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<DiscoveryQueueInfo>> {
    const { discovery }: { discovery: Discovery } = this.container;
    for await (const discoveryQueueInfo of discovery.getDiscoveryQueue()) {
      ctx.signal.throwIfAborted();
      yield discoveryQueueInfo;
    }
  };
}

export default GestaltsDiscoveryQueue;
