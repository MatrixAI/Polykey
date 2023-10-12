import type { HandlerTypes } from '@matrixai/rpc';
import type GestaltsActionsGetByNode from '../handlers/GestaltsActionsGetByNode';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<GestaltsActionsGetByNode>;

const gestaltsActionsGetByNode = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default gestaltsActionsGetByNode;
