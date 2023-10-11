import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type PolykeyAgent from '../../PolykeyAgent';
import { running, status } from '@matrixai/async-init';
import { UnaryHandler } from '@matrixai/rpc';

class AgentStop extends UnaryHandler<
  {
    polykeyAgent: PolykeyAgent;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult
> {
  public handle = async (): Promise<ClientRPCResponseResult> => {
    const { polykeyAgent } = this.container;
    // If not running or in stopping status, then respond successfully
    if (!polykeyAgent[running] || polykeyAgent[status] === 'stopping') {
      return {};
    }
    // Stop PK agent in the background, allow the RPC time to respond
    setTimeout(async () => {
      await polykeyAgent.stop();
    }, 500);
    return {};
  };
}

export default AgentStop;
