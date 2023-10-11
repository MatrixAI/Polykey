import type { HandlerTypes } from '@matrixai/rpc';
import type GestaltsActionsSetByNode from '../handlers/gestaltsActionsSetByNode';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<GestaltsActionsSetByNode>;

const gestaltsActionsSetByNode = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default gestaltsActionsSetByNode;
