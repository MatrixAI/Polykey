import type { HandlerTypes } from '@matrixai/rpc';
import type GestaltsGestaltList from '../handlers/GestaltsGestaltList';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<GestaltsGestaltList>;

const gestaltsGestaltList = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default gestaltsGestaltList;
