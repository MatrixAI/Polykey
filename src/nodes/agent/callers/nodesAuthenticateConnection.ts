import type { HandlerTypes } from '@matrixai/rpc';
import type NodesAuthenticateConnection from '../handlers/NodesAuthenticateConnection';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesAuthenticateConnection>;

const nodesAuthenticateConnection = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesAuthenticateConnection;
