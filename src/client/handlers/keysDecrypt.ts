import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type KeyRing from '../../keys/KeyRing';
import type { DataMessage } from './types';
import { never } from '../../utils/index';
import { UnaryHandler } from '../../rpc/handlers';

class KeysDecryptHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams<DataMessage>,
  ClientRPCResponseResult<DataMessage>
> {
  public async handle(
    input: ClientRPCRequestParams<DataMessage>,
  ): Promise<ClientRPCResponseResult<DataMessage>> {
    const { keyRing } = this.container;
    const data = keyRing.decrypt(Buffer.from(input.data, 'binary'));
    if (data == null) never();
    return {
      data: data.toString('binary'),
    };
  }
}

export { KeysDecryptHandler };
