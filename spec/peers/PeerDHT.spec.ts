import { Machine } from 'xstate';
import { strict as assert } from 'assert';
import PeerDHT from '../../src/peers/peer-dht/PeerDHT';

interface PeerDHTStateSchema {
  states: {
    idle: {};
    addingPeers: {};
    addingPeer: {};
    deletingingPeer: {};
    findingLocalPeer: {};
    findingPeer: {};
  };
}

type PeerDHTEvent =
  | { type: 'ADD_PEERS' }
  | { type: 'ADD_PEER' }
  | { type: 'DELETE_PEER' }
  | { type: 'FIND_LOCAL_PEER' }
  | { type: 'FIND_PEER' }
  | { type: 'SUCCESS' }
  | { type: 'FAILURE' };

const peerDHTMachine = Machine<PeerDHTStateSchema, PeerDHTEvent>({
  id: 'peerDHT',
  initial: 'idle',
  states: {
    idle: {
      on: {
        ADD_PEERS: 'addingPeers',
        ADD_PEER: 'addingPeer',
        DELETE_PEER: 'deletingingPeer',
        FIND_LOCAL_PEER: 'findingLocalPeer',
        FIND_PEER: 'findingPeer'
      },
      meta: {
        test: async (peerDHT: PeerDHT) => {
          const status = peerDHT.Status;
          assert(status.findingLocalPeer === false);
          assert(status.findingPeer === false);
          assert(status.addingPeers === false);
          assert(status.addingPeer === false);
          assert(status.deletingPeer === false);
        },
      },
    },
    findingLocalPeer: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle',
      },
      meta: {
        test: async (peerDHT: PeerDHT) => {
          const status = peerDHT.Status;
          assert(status.findingLocalPeer === true);
          assert(status.findingPeer === false);
          assert(status.addingPeers === false);
          assert(status.addingPeer === false);
          assert(status.deletingPeer === false);
        },
      },
    },
    findingPeer: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle',
      },
      meta: {
        test: async (peerDHT: PeerDHT) => {
          const status = peerDHT.Status;
          assert(status.findingLocalPeer === false);
          assert(status.findingPeer === true);
          assert(status.addingPeers === false);
          assert(status.addingPeer === false);
          assert(status.deletingPeer === false);
        },
      },
    },
    addingPeers: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle',
      },
      meta: {
        test: async (peerDHT: PeerDHT) => {
          const status = peerDHT.Status;
          assert(status.findingLocalPeer === false);
          assert(status.findingPeer === false);
          assert(status.addingPeers === true);
          assert(status.addingPeer === false);
          assert(status.deletingPeer === false);
        },
      },
    },
    addingPeer: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle',
      },
      meta: {
        test: async (peerDHT: PeerDHT) => {
          const status = peerDHT.Status;
          assert(status.findingLocalPeer === false);
          assert(status.findingPeer === false);
          assert(status.addingPeers === false);
          assert(status.addingPeer === true);
          assert(status.deletingPeer === false);
        },
      },
    },
    deletingingPeer: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle',
      },
      meta: {
        test: async (peerDHT: PeerDHT) => {
          const status = peerDHT.Status;
          assert(status.findingLocalPeer === false);
          assert(status.findingPeer === false);
          assert(status.addingPeers === false);
          assert(status.addingPeer === false);
          assert(status.deletingPeer === true);
        },
      },
    },
  },
});

export { peerDHTMachine, PeerDHTStateSchema, PeerDHTEvent };
