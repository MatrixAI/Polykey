import { Machine } from 'xstate';
import { strict as assert } from 'assert';
import KeyManager from '../../src/keys/KeyManager';

interface KeysStateSchema {
  states: {
    idle: {};
    generateKeyPair: {};
    loadKeyPair: {};
    unlockIdentity: {};
    lockIdentity: {};
  };
}

type KeysEvent =
  | { type: 'GENERATE_KEYPAIR' }
  | { type: 'LOAD_KEYPAIR' }
  | { type: 'UNLOCK_IDENTITY' }
  | { type: 'LOCK_IDENTITY' }
  | { type: 'SUCCESS' }
  | { type: 'FAILURE' };

const keysMachine = Machine<KeysStateSchema, KeysEvent>({
  id: 'keys',
  initial: 'idle',
  states: {
    idle: {
      on: {
        GENERATE_KEYPAIR: 'generateKeyPair',
        LOAD_KEYPAIR: 'loadKeyPair',
        UNLOCK_IDENTITY: 'unlockIdentity',
        LOCK_IDENTITY: 'lockIdentity',
      },
      meta: {
        test: async (km: KeyManager) => {},
      },
    },
    generateKeyPair: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle',
      },
      meta: {
        test: async (km: KeyManager) => {
          const status = km.Status;
          assert(status.keypairUnlocked === true);
          assert(status.keypairLoaded === true);
        },
      },
    },
    loadKeyPair: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle',
      },
      meta: {
        test: async (km: KeyManager) => {
          const status = km.Status;
          assert(status.keypairUnlocked === false);
          assert(status.keypairLoaded === true);
        },
      },
    },
    unlockIdentity: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle',
      },
      meta: {
        test: async (km: KeyManager) => {
          const status = km.Status;
          assert(status.keypairUnlocked === true);
          assert(status.keypairLoaded === true);
        },
      },
    },
    lockIdentity: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle',
      },
      meta: {
        test: async (km: KeyManager) => {
          const status = km.Status;
          assert(status.keypairUnlocked === false);
          assert(status.keypairLoaded === true);
        },
      },
    },
  },
});

export {keysMachine, KeysStateSchema, KeysEvent };
