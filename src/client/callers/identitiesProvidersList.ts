import type { HandlerTypes } from '@matrixai/rpc';
import type IdentitiesProvidersList from '../handlers/IdentitiesProvidersList';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<IdentitiesProvidersList>;

const identitiesProvidersList = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default identitiesProvidersList;
