export { default as createClientService, ClientService } from './clientService';
export { default as GRPCClientClient } from './GRPCClientClient';
export * as errors from './errors';
export * as messages from './clientPB';
export * as utils from './utils';

/**
 * This allows us to create a MetaData() object without explicitly importing `@grpc/grpc-js`.
 */
export { Metadata } from '@grpc/grpc-js';
