import type { HandlerTypes } from '@matrixai/rpc';
import type NodesAuthenticateConnection from '../handlers/NodesAuthenticateConnection.js';
import { DuplexCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesAuthenticateConnection>;

const nodesAuthenticateConnection = new DuplexCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesAuthenticateConnection;
