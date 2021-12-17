/**
 * Use this module when contacting Polykey
 * If you use the upstream `@grpc/grpc-js`, it may give you mismatched dependencies
 * For example the `Metadata` object has to be used when calling `PolykeyClient`
 */
export * as grpc from '@grpc/grpc-js';
export { default as GRPCServer } from './GRPCServer';
export { default as GRPCClient } from './GRPCClient';
export * as utils from './utils';
export * as types from './types';
export * as errors from './errors';
