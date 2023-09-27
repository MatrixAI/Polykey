import NodeConnectionManager from '../nodes/NodeConnectionManager';
import Logger from '@matrixai/logger';
import { AbstractEvent, EventAll } from '@matrixai/events';
import { CreateDestroy } from '@matrixai/async-init/dist/CreateDestroy';
import * as agentEvents from './events';
import RPCServer from '../rpc/RPCServer';
import * as nodesEvents from '../nodes/events';
import * as rpcEvents from '../rpc/events';

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
    rpcServer.addEventListener(
      EventAll.name,
      agentService.handleEventRPCServer
    );
    rpcServer.addEventListener(
      rpcEvents.EventRPCServerDestroyed.name,
      agentService.handleEventRPCServerDestroyed,
      { once: true }
    );
    nodeConnectionManager.addEventListener(
      nodesEvents.EventNodeConnectionStream.name,
      agentService.handleEventNodeConnectionStream,
    );
    logger.info(`Created ${this.name}`);
    return agentService;
  }

  protected logger: Logger;
  protected nodeConnectionManager: NodeConnectionManager;
  protected rpcServer: RPCServer;

  /**
   * Handles all `EventRPCServer` events.
   */
  protected handleEventRPCServer = (evt: EventAll) => {
    if (evt.detail instanceof AbstractEvent) {
      this.dispatchEvent(evt.detail.clone());
    }
  };

  /**
   * Handles `EventRPCServerDestroyed`.
   * Registered once.
   */
  protected handleEventRPCServerDestroyed = () => {
    this.removeEventListener(EventAll.name, this.handleEventRPCServer);
  };

  /**
   * Handles `EventNodeConnectionStream` events.
   */
  protected handleEventNodeConnectionStream = (
    evt: nodesEvents.EventNodeConnectionStream
  ) => {
    const stream = evt.detail;
    this.rpcServer.handleStream(stream);
  };

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
    // Stop handling any new streams
    this.nodeConnectionManager.removeEventListener(
      nodesEvents.EventNodeConnectionStream.name,
      this.handleEventNodeConnectionStream
    );
    await this.rpcServer.destroy({ force, reason });
    this.logger.info(
      `Destroyed ${this.constructor.name}`,
    );
  }
}

export default AgentService;
