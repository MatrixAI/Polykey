import type { HandlerTypes } from '@matrixai/rpc';
import type IdentitiesInfoGet from '../handlers/IdentitiesInfoGet';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<IdentitiesInfoGet>;

const identitiesInfoGet = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default identitiesInfoGet;
