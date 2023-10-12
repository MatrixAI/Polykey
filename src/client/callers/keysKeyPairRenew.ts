import type { HandlerTypes } from '@matrixai/rpc';
import type KeysKeyPairRenew from '../handlers/KeysKeyPairRenew';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<KeysKeyPairRenew>;

const keysKeyPairRenew = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default keysKeyPairRenew;
