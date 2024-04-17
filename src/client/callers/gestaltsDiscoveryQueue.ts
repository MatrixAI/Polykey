import type { HandlerTypes } from '@matrixai/rpc';
import type GestaltsDiscoveryQueue from '../handlers/GestaltsDiscoveryQueue';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<GestaltsDiscoveryQueue>;

const gestaltsDiscoveryQueue = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default gestaltsDiscoveryQueue;
