import { Machine } from 'xstate';

interface NatTraversalStateSchema {
  states: {
    initial: {};
    toggleStealthModeActive: {};
    toggleStealthModeInactive: {};
    connectingToPeer: {};
  };
}

type NatTraversalEvent = { type: 'CONNECT' } | { type: 'TIMEOUT' } | { type: 'FAILURE' } | { type: 'CONNECTED' };

const natTraversalMachine = Machine<NatTraversalStateSchema, NatTraversalEvent>({
  id: 'natTraversal',
  initial: 'idle',
  states: {
    idle: {
      on: {
        CONNECT: 'traversingNat',
      },
    },
    traversingNat: {
      on: {
        CONNECTED: { target: 'idle', in: '#natTraversal.traversingNat.connected' },
        FAILURE: { target: 'idle', in: '#natTraversal.traversingNat.failure' },
      },
      initial: 'requestingDirectConnection',
      states: {
        requestingDirectConnection: {
          on: {
            CONNECTED: 'connected',
            TIMEOUT: 'requestingHolePunchConnection',
          },
        },
        requestingHolePunchConnection: {
          on: {
            CONNECTED: 'connected',
            TIMEOUT: 'requestingDirectRelayConnection',
          },
        },
        requestingDirectRelayConnection: {
          on: {
            CONNECTED: 'connected',
            FAILURE: 'failure',
          },
        },
        connected: {
          type: 'final',
        },
        failure: {
          type: 'final',
        },
      },
    },
  },
});

export { natTraversalMachine, NatTraversalStateSchema, NatTraversalEvent };
