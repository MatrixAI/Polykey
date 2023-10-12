import type { HandlerTypes } from '@matrixai/rpc';
import type KeysEncrypt from '../handlers/KeysEncrypt';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<KeysEncrypt>;

const keysEncrypt = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default keysEncrypt;
