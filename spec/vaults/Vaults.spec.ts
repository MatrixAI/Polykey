import { Machine } from 'xstate';
import { strict as assert } from 'assert';
import VaultManager from '../../src/vaults/VaultManager';

interface VaultsStateSchema {
  states: {
    idle: {};
    creatingVault: {};
    cloningVault: {};
    pullingVault: {};
    deletingVault: {};
  };
}

type VaultsEvent =
  | { type: 'CREATE_VAULT' }
  | { type: 'CLONE_VAULT' }
  | { type: 'PULL_VAULT' }
  | { type: 'DELETE_VAULT' }
  | { type: 'SUCCESS' }
  | { type: 'FAILURE' };

const vaultsMachine = Machine<VaultsStateSchema, VaultsEvent>({
  id: 'vaults',
  initial: 'idle',
  states: {
    idle: {
      on: {
        CREATE_VAULT: 'creatingVault',
        CLONE_VAULT: 'cloningVault',
        PULL_VAULT: 'pullingVault',
        DELETE_VAULT: 'deletingVault',
      },
      meta: {
        test: async (vm: VaultManager) => {
          const status = vm.Status;
          assert(status.creatingVault === false);
          assert(status.cloningVault === false);
          assert(status.pullingVault === false);
          assert(status.deletingVault === false);
        },
      },
    },
    creatingVault: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle'
      },
      meta: {
        test: async (vm: VaultManager) => {
          const status = vm.Status;
          assert(status.creatingVault === true);
          assert(status.cloningVault === false);
          assert(status.pullingVault === false);
          assert(status.deletingVault === false);
        },
      },
    },
    cloningVault: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle'
      },
      meta: {
        test: async (vm: VaultManager) => {
          const status = vm.Status;
          assert(status.creatingVault === false);
          assert(status.cloningVault === true);
          assert(status.pullingVault === false);
          assert(status.deletingVault === false);
        },
      },
    },
    pullingVault: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle'
      },
      meta: {
        test: async (vm: VaultManager) => {
          const status = vm.Status;
          assert(status.creatingVault === false);
          assert(status.cloningVault === false);
          assert(status.pullingVault === true);
          assert(status.deletingVault === false);
        },
      },
    },
    deletingVault: {
      on: {
        SUCCESS: 'idle',
        FAILURE: 'idle'
      },
      meta: {
        test: async (vm: VaultManager) => {
          const status = vm.Status;
          assert(status.creatingVault === false);
          assert(status.cloningVault === false);
          assert(status.pullingVault === false);
          assert(status.deletingVault === true);
        },
      },
    },
  },
});

export { vaultsMachine, VaultsStateSchema, VaultsEvent };
