import type { HandlerTypes } from '@matrixai/rpc';
import type GestaltsGestaltTrustByIdentity from '../handlers/GestaltsGestaltTrustByIdentity';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<GestaltsGestaltTrustByIdentity>;

const gestaltsGestaltTrustByIdentity = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default gestaltsGestaltTrustByIdentity;
