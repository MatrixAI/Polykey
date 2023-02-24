import type { RPCRequestParams, RPCResponseResult } from '../types';
import type KeyRing from 'keys/KeyRing';
import type { DataMessage, SignatureMessage } from './types';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const keysSign = new UnaryCaller<
  RPCRequestParams<DataMessage>,
  RPCResponseResult<SignatureMessage>
>();

class KeysSignHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  RPCRequestParams<DataMessage>,
  RPCResponseResult<SignatureMessage>
> {
  public async handle(
    input: RPCRequestParams<DataMessage>,
  ): Promise<RPCResponseResult<SignatureMessage>> {
    const { keyRing } = this.container;
    const signature = keyRing.sign(Buffer.from(input.data, 'binary'));
    return {
      signature: signature.toString('binary'),
    };
  }
}

export { keysSign, KeysSignHandler };
