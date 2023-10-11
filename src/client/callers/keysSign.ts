import type { HandlerTypes } from '@matrixai/rpc';
import type KeysSign from '../handlers/KeysSign';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<KeysSign>;

const keysSign = new UnaryCaller<CallerTypes['input'], CallerTypes['output']>();

export default keysSign;
