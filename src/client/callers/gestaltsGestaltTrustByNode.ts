import type { HandlerTypes } from '@matrixai/rpc';
import type GestaltsGestaltTrustByNode from '../handlers/GestaltsGestaltTrustByNode.js';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<GestaltsGestaltTrustByNode>;

const gestaltsGestaltTrustByNode = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default gestaltsGestaltTrustByNode;
