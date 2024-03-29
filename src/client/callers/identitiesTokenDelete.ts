import type { HandlerTypes } from '@matrixai/rpc';
import type IdentitiesTokenDelete from '../handlers/IdentitiesTokenDelete';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<IdentitiesTokenDelete>;

const identitiesTokenDelete = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default identitiesTokenDelete;
