import type { HandlerTypes } from '@matrixai/rpc';
import type IdentitiesTokenPut from '../handlers/identitiesTokenPut';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<IdentitiesTokenPut>;

const identitiesTokenPut = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default identitiesTokenPut;
