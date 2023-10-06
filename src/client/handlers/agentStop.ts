import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type PolykeyAgent from '../../PolykeyAgent';
import { running, status } from '@matrixai/async-init';
import { UnaryHandler } from '@matrixai/rpc/dist/handlers';

class AgentStopHandler extends UnaryHandler<
  {
    pkAgentProm: Promise<PolykeyAgent>;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult
> {
  public handle = async(): Promise<ClientRPCResponseResult> => {
    const { pkAgentProm } = this.container;
    const pkAgent = await pkAgentProm;
    // If not running or in stopping status, then respond successfully
    if (!pkAgent[running] || pkAgent[status] === 'stopping') {
      return {};
    }
    // Stop PK agent in the background, allow the RPC time to respond
    setTimeout(async () => {
      await pkAgent.stop();
    }, 500);
    return {};
  }
}

export { AgentStopHandler };
