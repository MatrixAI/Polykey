import { Machine } from 'xstate';
import { strict as assert } from 'assert';
import NodeDHT from '../../src/nodes/dht/NodeDHT';

interface NodeDHTStateSchema {
  states: {
    idle: {};
    addingNodes: {};
    addingNode: {};
    deletingingNode: {};
    findingLocalNode: {};
    findingNode: {};
  };
}

type NodeDHTEvent =
  | { type: 'ADD_PEERS' }
  | { type: 'ADD_PEER' }
  | { type: 'DELETE_PEER' }
  | { type: 'FIND_LOCAL_PEER' }
  | { type: 'FIND_PEER' }
  | { type: 'SUCCESS' }
  | { type: 'FAILURE' };

const nodeDHTMachine = Machine<NodeDHTStateSchema, NodeDHTEvent>({
  id: 'nodeDHT',
  initial: 'idle',
  states: {
    idle: {
      on: {
        ADD_PEERS: 'addingNodes',
        ADD_PEER: 'addingNode',
        DELETE_PEER: 'deletingingNode',
        FIND_LOCAL_PEER: 'findingLocalNode',
        FIND_PEER: 'findingNode'
      },
      meta: {
        test: async (nodeDHT: NodeDHT) => {
          const status = nodeDHT.Status;
          assert(status.findingLocalNode === false);
          assert(status.findingNode === false);
          assert(status.addingNodes === false);
          assert(status.addingNode === false);
          assert(status.deletingNode === false);
        },
      },
    },
    findingLocalNode: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle',
      },
      meta: {
        test: async (nodeDHT: NodeDHT) => {
          const status = nodeDHT.Status;
          assert(status.findingLocalNode === true);
          assert(status.findingNode === false);
          assert(status.addingNodes === false);
          assert(status.addingNode === false);
          assert(status.deletingNode === false);
        },
      },
    },
    findingNode: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle',
      },
      meta: {
        test: async (nodeDHT: NodeDHT) => {
          const status = nodeDHT.Status;
          assert(status.findingLocalNode === false);
          assert(status.findingNode === true);
          assert(status.addingNodes === false);
          assert(status.addingNode === false);
          assert(status.deletingNode === false);
        },
      },
    },
    addingNodes: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle',
      },
      meta: {
        test: async (nodeDHT: NodeDHT) => {
          const status = nodeDHT.Status;
          assert(status.findingLocalNode === false);
          assert(status.findingNode === false);
          assert(status.addingNodes === true);
          assert(status.addingNode === false);
          assert(status.deletingNode === false);
        },
      },
    },
    addingNode: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle',
      },
      meta: {
        test: async (nodeDHT: NodeDHT) => {
          const status = nodeDHT.Status;
          assert(status.findingLocalNode === false);
          assert(status.findingNode === false);
          assert(status.addingNodes === false);
          assert(status.addingNode === true);
          assert(status.deletingNode === false);
        },
      },
    },
    deletingingNode: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle',
      },
      meta: {
        test: async (nodeDHT: NodeDHT) => {
          const status = nodeDHT.Status;
          assert(status.findingLocalNode === false);
          assert(status.findingNode === false);
          assert(status.addingNodes === false);
          assert(status.addingNode === false);
          assert(status.deletingNode === true);
        },
      },
    },
  },
});

export { nodeDHTMachine, NodeDHTStateSchema, NodeDHTEvent };
