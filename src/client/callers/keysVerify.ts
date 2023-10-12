import type { HandlerTypes } from '@matrixai/rpc';
import type KeysVerify from '../handlers/KeysVerify';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<KeysVerify>;

const keysVerify = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default keysVerify;
