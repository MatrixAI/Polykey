import type { HandlerTypes } from '@matrixai/rpc';
import type KeysPublicKey from '../handlers/keysPublicKey';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<KeysPublicKey>;

const keysPublicKey = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default keysPublicKey;
