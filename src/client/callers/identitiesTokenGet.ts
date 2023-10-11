import type { HandlerTypes } from '@matrixai/rpc';
import type IdentitiesTokenGet from '../handlers/identitiesTokenGet';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<IdentitiesTokenGet>;

const identitiesTokenGet = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default identitiesTokenGet;
