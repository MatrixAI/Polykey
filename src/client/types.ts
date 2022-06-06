import type * as grpc from '@grpc/grpc-js';
import type { Class } from '@matrixai/errors';
import type ErrorPolykey from '../ErrorPolykey';

type Authenticate = (
  metadataClient: grpc.Metadata,
  metadataServer?: grpc.Metadata,
) => Promise<grpc.Metadata>;

type ClientClientErrors = Array<
  Class<ErrorPolykey<any>> | Array<Class<ErrorPolykey<any>>>
>;

export type { Authenticate, ClientClientErrors };
