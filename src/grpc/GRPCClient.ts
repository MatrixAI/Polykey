import { ChannelCredentials, ClientOptions, Client } from '@grpc/grpc-js';
import Logger from '@matrixai/logger';
import { utils as networkUtils } from '../network';
import { promisify } from '../utils';
import { errors } from '.';

abstract class GRPCClient<T extends Client> {
  protected host: string;
  protected port: number;
  protected logger: Logger;
  protected client?: T;

  constructor({
    host,
    port,
    logger,
  }: {
    host: string;
    port: number;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger('GRPCClient');
    this.host = host;
    this.port = port;
  }

  public async start({
    clientConstructor,
    credentials,
    options,
    timeout,
  }: {
    clientConstructor: new (
      address: string,
      credentials: ChannelCredentials,
      options?: ClientOptions,
    ) => T;
    credentials: ChannelCredentials;
    options?: Partial<ClientOptions>;
    timeout?: number;
  }): Promise<void> {
    const address = networkUtils.buildAddress(this.host, this.port);
    this.logger.info(`Starting GRPC Client at ${address}`);

    const client = new clientConstructor(address, credentials, options);

    const waitForReady = promisify(client.waitForReady).bind(client);
    try {
      const currentTime = new Date().getTime();
      await waitForReady(currentTime + (timeout ?? 30000));
    } catch (err) {
      throw new errors.ErrorGRPCConnectionTimeout(
        `Could not connect to GRPC Server within ${timeout ?? 30000} ms`,
      );
    }
    this.client = client;
    this.logger.info(`Started GRPC Client at ${address}`);
  }

  public async stop(): Promise<void> {
    const address = `${this.host}:${this.port}`;
    this.logger.info(`Stopping GRPC Client at ${address}`);
    // this currently doesn't stop all inflight requests
    // https://github.com/grpc/grpc-node/issues/1340
    this.client?.close();
    this.logger.info(`Stopped GRPC Client at ${address}`);
  }
}

export default GRPCClient;
