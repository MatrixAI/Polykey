import type * as grpc from '@grpc/grpc-js';

type Authenticate = (
  metadataClient: grpc.Metadata,
  metadataServer?: grpc.Metadata,
) => Promise<grpc.Metadata>;

export type {
  Authenticate
};
