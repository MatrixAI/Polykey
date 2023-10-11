import type { HandlerTypes } from '@matrixai/rpc';
import type KeysDecrypt from '../handlers/keysDecrypt';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<KeysDecrypt>;

const keysDecrypt = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default keysDecrypt;
