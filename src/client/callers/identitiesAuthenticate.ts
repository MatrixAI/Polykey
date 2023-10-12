import type { HandlerTypes } from '@matrixai/rpc';
import type IdentitiesAuthenticate from '../handlers/IdentitiesAuthenticate';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<IdentitiesAuthenticate>;

const identitiesAuthenticate = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default identitiesAuthenticate;
