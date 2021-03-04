import NodeManager from '../nodes/NodeManager';
import Logger from '@matrixai/logger';
import { NodeId } from '../types';
import { promisifyGrpc } from '../bin/utils';
import * as nodeInterface from '../../proto/js/Node_pb';
import * as agentInterface from '../../proto/js/Agent_pb';

class NodeNotifications {
  protected nodeManager: NodeManager;
  protected messages: Array<string> = [];

  public constructor(nodeManager: NodeManager, logger: Logger) {
    this.nodeManager = nodeManager;
  }

  public async send(nodeId: NodeId, message: string) {
    const nodeConnection = this.nodeManager.connectToNode(nodeId);
    const client = await nodeConnection.getNodeClient();
    const request = new nodeInterface.MessageRequest();
    request.setMessage(message);
    const response = (await promisifyGrpc(client.receiveMessage.bind(client))(
      request,
    )) as agentInterface.EmptyMessage;
    return response.toString();
  }

  public receive(message: string) {
    this.messages.push(message);
  }

  public read() {
    return this.messages.shift();
  }

  public more() {
    return this.messages.length;
  }
}

export default NodeNotifications;
