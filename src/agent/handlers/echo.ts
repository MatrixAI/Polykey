import type { EchoMessage } from './types';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  NoData,
} from '../types';
import { UnaryHandler } from '../../rpc/handlers';

class EchoHandler extends UnaryHandler<
  NoData,
  AgentRPCRequestParams<EchoMessage>,
  AgentRPCResponseResult<EchoMessage>
> {
  public async handle(
    input: AgentRPCRequestParams<EchoMessage>,
  ): Promise<AgentRPCResponseResult<EchoMessage>> {
    return {
      message: input.message,
    };
  }
}

export { EchoHandler };
