import type { HandlerTypes } from '@matrixai/rpc';
import type IdentitiesAuthenticatedGet from '../handlers/IdentitiesAuthenticatedGet';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<IdentitiesAuthenticatedGet>;

const identitiesAuthenticatedGet = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default identitiesAuthenticatedGet;
