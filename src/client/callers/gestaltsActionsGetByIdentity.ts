import type { HandlerTypes } from '@matrixai/rpc';
import type GestaltsActionsGetByIdentity from '../handlers/gestaltsActionsGetByIdentity';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<GestaltsActionsGetByIdentity>;

const gestaltsActionsGetByIdentity = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default gestaltsActionsGetByIdentity;
