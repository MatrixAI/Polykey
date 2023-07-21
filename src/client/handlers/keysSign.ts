import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type KeyRing from '../../keys/KeyRing';
import type { DataMessage, SignatureMessage } from './types';
import { UnaryHandler } from '../../rpc/handlers';

class KeysSignHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams<DataMessage>,
  ClientRPCResponseResult<SignatureMessage>
> {
  public async handle(
    input: ClientRPCRequestParams<DataMessage>,
  ): Promise<ClientRPCResponseResult<SignatureMessage>> {
    const { keyRing } = this.container;
    const signature = keyRing.sign(Buffer.from(input.data, 'binary'));
    return {
      signature: signature.toString('binary'),
    };
  }
}

export { KeysSignHandler };
