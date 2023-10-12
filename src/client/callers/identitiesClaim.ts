import type { HandlerTypes } from '@matrixai/rpc';
import type IdentitiesClaim from '../handlers/IdentitiesClaim';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<IdentitiesClaim>;

const identitiesClaim = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default identitiesClaim;
