import type { HandlerTypes } from '@matrixai/rpc';
import type GestaltsGestaltGetByNode from '../handlers/GestaltsGestaltGetByNode';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<GestaltsGestaltGetByNode>;

const gestaltsGestaltGetByNode = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default gestaltsGestaltGetByNode;
