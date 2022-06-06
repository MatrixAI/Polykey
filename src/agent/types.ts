import type { ServerSurfaceCall } from '@grpc/grpc-js/build/src/server-call';
import type { Class } from '@matrixai/errors';
import type { ConnectionInfo } from '../network/types';
import type ErrorPolykey from '../ErrorPolykey';

type ConnectionInfoGet = (
  call: ServerSurfaceCall,
) => ConnectionInfo | undefined;

type AgentClientErrors = Array<
  Class<ErrorPolykey<any>> | Array<Class<ErrorPolykey<any>>>
>;

export type { ConnectionInfoGet, AgentClientErrors };
