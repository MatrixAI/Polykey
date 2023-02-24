import type { RPCRequestParams, RPCResponseResult } from '../types';
import type KeyRing from 'keys/KeyRing';
import type { DataMessage } from './types';
import { never } from 'utils/index';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const keysDecrypt = new UnaryCaller<
  RPCRequestParams<DataMessage>,
  RPCResponseResult<DataMessage>
>();

class KeysDecryptHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  RPCRequestParams<DataMessage>,
  RPCResponseResult<DataMessage>
> {
  public async handle(
    input: RPCRequestParams<DataMessage>,
  ): Promise<RPCResponseResult<DataMessage>> {
    const { keyRing } = this.container;
    const data = keyRing.decrypt(Buffer.from(input.data, 'binary'));
    if (data == null) never();
    return {
      data: data.toString('binary'),
    };
  }
}

export { keysDecrypt, KeysDecryptHandler };
