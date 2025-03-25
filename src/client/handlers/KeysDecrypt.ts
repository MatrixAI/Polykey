import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  DataMessage,
} from '../types.js';
import type KeyRing from '../../keys/KeyRing.js';
import { UnaryHandler } from '@matrixai/rpc';
import { never } from '../../utils/index.js';

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
    const { keyRing }: { keyRing: KeyRing } = this.container;
    const data = keyRing.decrypt(Buffer.from(input.data, 'binary'));
    if (data == null) never('failed to decrypt DataMessage');
    return {
      data: data.toString('binary'),
    };
  };
}

export default KeysDecrypt;
