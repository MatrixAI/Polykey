import type { HandlerTypes } from '@matrixai/rpc';
import type KeysCertsGet from '../handlers/keysCertsGet';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<KeysCertsGet>;

const keysCertsGet = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default keysCertsGet;
