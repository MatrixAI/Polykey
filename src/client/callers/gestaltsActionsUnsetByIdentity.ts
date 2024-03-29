import type { HandlerTypes } from '@matrixai/rpc';
import type GestaltsActionsUnsetByIdentity from '../handlers/GestaltsActionsUnsetByIdentity';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<GestaltsActionsUnsetByIdentity>;

const gestaltsActionsUnsetByIdentity = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default gestaltsActionsUnsetByIdentity;
