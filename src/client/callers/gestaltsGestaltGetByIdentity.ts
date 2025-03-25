import type { HandlerTypes } from '@matrixai/rpc';
import type GestaltsGestaltGetByIdentity from '../handlers/GestaltsGestaltGetByIdentity.js';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<GestaltsGestaltGetByIdentity>;

const gestaltsGestaltGetByIdentity = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default gestaltsGestaltGetByIdentity;
