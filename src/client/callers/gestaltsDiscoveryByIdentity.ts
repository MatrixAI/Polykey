import type { HandlerTypes } from '@matrixai/rpc';
import type GestaltsDiscoveryByIdentity from '../handlers/GestaltsDiscoveryByIdentity';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<GestaltsDiscoveryByIdentity>;

const gestaltsDiscoveryByIdentity = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default gestaltsDiscoveryByIdentity;
