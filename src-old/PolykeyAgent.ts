// top level module that sets up the Agent
// apparently this extends the IAgentServer
// but i don't want this
// i want the agent to represent the live context process
// the configuration of polykey should really be in the top level of PK
// not at the agent

import Polykey from './Polykey';
import Logger from "@matrixai/logger";
import { IAgentServer } from "./proto/js/Agent_grpc_pb";

class PolykeyAgent {

  protected pk: Polykey;
  protected grpcServer: IAgentServer;
  protected logger: Logger;

  // when we start the logger here

  constructor (pk: Polykey, logger: Logger) {
    // all subdomains receive a logger
    // logger.getChild('...');
    this.logger = logger ?? new Logger('agent');

    // we don't getChild
    // we expect to be constructed with the logger

    this.pk = pk ?? new Polykey(logger.getChild('polykey'));

    this.grpcServer = {};
  }

  async start () {
    // this is where we actually start and stop
    // the process
  }

  async stop () {

  }

}

export default PolykeyAgent;
