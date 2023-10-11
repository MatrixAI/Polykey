import type { HandlerTypes } from '@matrixai/rpc';
import type IdentitiesInvite from '../handlers/IdentitiesInvite';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<IdentitiesInvite>;

const identitiesInvite = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default identitiesInvite;
