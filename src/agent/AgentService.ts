import type NodeConnectionManager from '../nodes/NodeConnectionManager';
import Logger from '@matrixai/logger';
import { CreateDestroy } from '@matrixai/async-init/dist/CreateDestroy';
import * as agentEvents from './events';
import RPCServer from '../rpc/RPCServer';

interface AgentService extends CreateDestroy {}
@CreateDestroy({
  eventDestroy: agentEvents.EventAgentServiceDestroy,
  eventDestroyed: agentEvents.EventAgentServiceDestroyed,
})
class AgentService {
  public static async createAgentService({
    nodeConnectionManager,
    logger = new Logger(this.name),
  }: {
    nodeConnectionManager: NodeConnectionManager;
    logger?: Logger;
  }) {
    logger.info(`Create ${this.name}`);
    const rpcServer = await RPCServer.createRPCServer({

    });
    const agentService = new AgentService({
      nodeConnectionManager,
      rpcServer,
      logger
    });
    logger.info(`Created ${this.name}`);
    return agentService;
  }

  protected logger: Logger;
  protected nodeConnectionManager: NodeConnectionManager;
  protected rpcServer: RPCServer;

  public constructor({
    nodeConnectionManager,
    rpcServer,
    logger,
  }: {
    nodeConnectionManager: NodeConnectionManager
    rpcServer: RPCServer;
    logger: Logger;
  }) {
    this.logger = logger;
    this.nodeConnectionManager = nodeConnectionManager;
    this.rpcServer = rpcServer;
  }

  /**
   * @param opts
   * @param opts.force - force cancel active streams
   * @param opts.reason - the reason for cancelling streams
   */
  public async destroy({
    force = true,
    reason,
  }: {
    force?: boolean;
    reason?: any;
  }) {
    this.logger.info(
      `Destroy ${this.constructor.name}`,
    );
    await this.rpcServer.destroy({ force, reason });
    this.logger.info(
      `Destroyed ${this.constructor.name}`,
    );
  }
}

export default AgentService;
