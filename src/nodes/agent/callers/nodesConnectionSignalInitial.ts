import type { HandlerTypes } from '@matrixai/rpc';
import type NodesConnectionSignalInitial from '../handlers/NodesConnectionSignalInitial.js';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesConnectionSignalInitial>;

const nodesConnectionSignalInitial = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesConnectionSignalInitial;
