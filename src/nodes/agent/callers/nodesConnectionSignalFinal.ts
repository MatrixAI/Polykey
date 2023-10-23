import type { HandlerTypes } from '@matrixai/rpc';
import type NodesConnectionSignalFinal from '../handlers/NodesConnectionSignalFinal';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesConnectionSignalFinal>;

const nodesConnectionSignalFinal = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesConnectionSignalFinal;
