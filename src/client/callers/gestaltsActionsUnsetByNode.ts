import type { HandlerTypes } from '@matrixai/rpc';
import type GestaltsActionsUnsetByNode from '../handlers/gestaltsActionsUnsetByNode';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<GestaltsActionsUnsetByNode>;

const gestaltsActionsUnsetByNode = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default gestaltsActionsUnsetByNode;
