import type { Opaque } from '../types';
import * as grpc from '@grpc/grpc-js';

type SessionToken = Opaque<'SessionToken', string>;

type SessionCredentials = Opaque<
  'SessionCredentials',
  Partial<grpc.CallOptions>
>;

export type { SessionToken, SessionCredentials };
