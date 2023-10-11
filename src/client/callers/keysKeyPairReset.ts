import type { HandlerTypes } from '@matrixai/rpc';
import type KeysKeyPairReset from '../handlers/keysKeyPairReset';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<KeysKeyPairReset>;

const keysKeyPairReset = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default keysKeyPairReset;
