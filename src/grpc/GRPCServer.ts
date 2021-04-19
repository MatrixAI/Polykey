import type { Services, ServerCredentials } from './types';

import Logger from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import * as grpcErrors from './errors';
import { utils as networkUtils } from '../network';
import { promisify } from '../utils';

// we can embed all the of the utility functions
// into this class if we don't want to use it that way
class GRPCServer {
  protected services: Services;
  protected logger: Logger;
  protected server?: grpc.Server;
  protected port?: number;

  constructor({ services, logger }: { services: Services; logger?: Logger }) {
    this.logger = logger ?? new Logger('GRPCServer');
    this.services = services;
  }

  public async start({
    host = '::',
    port = 0,
    credentials,
  }: {
    host?: string;
    port?: number;
    credentials: ServerCredentials;
  }): Promise<void> {
    let address = networkUtils.buildAddress(host, port);
    this.logger.info(`Starting GRPC Server on ${address}`);
    // grpc servers must be recreated after they are stopped
    // options are available here
    // grpc.ChannelOptions
    const server = new grpc.Server();
    for (const [serviceInterface, serviceImplementation] of this.services) {
      server.addService(serviceInterface, serviceImplementation);
    }
    const bindAsync = promisify(server.bindAsync).bind(server);
    try {
      port = await bindAsync(address, credentials);
    } catch (e) {
      throw new grpcErrors.ErrorGRPCBind(e.message);
    }
    server.start();
    this.server = server;
    this.port = port;
    address = networkUtils.buildAddress(host, port);
    this.logger.info(`Started GRPC Server on ${address}`);
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping GRPC Server');
    if (this.server) {
      const tryShutdown = promisify(this.server.tryShutdown).bind(this.server);
      try {
        await tryShutdown();
      } catch (e) {
        throw new grpcErrors.ErrorGRPCShutdown(e.message);
      }
    }
    this.logger.info('Stopped GRPC Server');
  }

  public getPort(): number | undefined {
    return this.port;
  }
}

export default GRPCServer;
