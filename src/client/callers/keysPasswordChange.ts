import type { HandlerTypes } from '@matrixai/rpc';
import type KeysPasswordChange from '../handlers/keysPasswordChange';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<KeysPasswordChange>;

const keysPasswordChange = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default keysPasswordChange;
