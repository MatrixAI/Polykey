import type { HandlerTypes } from '@matrixai/rpc';
import type KeysEncrypt from '../handlers/keysEncrypt';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<KeysEncrypt>;

const keysEncrypt = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default keysEncrypt;
