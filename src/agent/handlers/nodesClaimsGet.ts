import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  NoData,
} from '../types';
import { UnaryHandler } from '../../rpc/handlers';

/**
 * Retrieves all claims (of a specific type) of this node (within its sigchain).
 * TODO: Currently not required. Will need to refactor once we filter on what
 * claims we desire from the sigchain (e.g. in discoverGestalt).
 */

class NodesClaimsGetHandler extends UnaryHandler<
  NoData,
  AgentRPCRequestParams,
  AgentRPCResponseResult
> {
  public async handle(): Promise<AgentRPCResponseResult> {
    return {};
  }
}

export { NodesClaimsGetHandler };
