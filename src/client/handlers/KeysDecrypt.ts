import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  DataMessage,
} from '../types';
import type KeyRing from '../../keys/KeyRing';
import { UnaryHandler } from '@matrixai/rpc';
import { never } from '../../utils';

class KeysDecrypt extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams<DataMessage>,
  ClientRPCResponseResult<DataMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<DataMessage>,
  ): Promise<ClientRPCResponseResult<DataMessage>> => {
    const { keyRing } = this.container;
    const data = keyRing.decrypt(Buffer.from(input.data, 'binary'));
    if (data == null) never();
    return {
      data: data.toString('binary'),
    };
  };
}

export default KeysDecrypt;
