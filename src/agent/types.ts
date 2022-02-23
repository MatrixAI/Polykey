import type { ConnectionInfo } from 'network/types';
import type { ServerSurfaceCall } from '@grpc/grpc-js/build/src/server-call';

type ConnectionInfoGet = (
  call: ServerSurfaceCall,
) => ConnectionInfo | undefined;

export type { ConnectionInfoGet };
