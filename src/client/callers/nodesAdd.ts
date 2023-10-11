import type { HandlerTypes } from '@matrixai/rpc';
import type NodesAdd from '../handlers/nodesAdd';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesAdd>;

const nodesAdd = new UnaryCaller<CallerTypes['input'], CallerTypes['output']>();

export default nodesAdd;
