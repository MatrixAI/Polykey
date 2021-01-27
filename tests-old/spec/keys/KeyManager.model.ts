import { createModel } from '@xstate/test';
import { KeyManager } from '../../../src/Polykey';
import { keysMachine, KeysStateSchema } from '../../../spec/keys/Keys.spec'
import { randomString } from '../../../src/utils';

const keysModel = createModel<KeyManager, KeysStateSchema>(keysMachine).withEvents({
  GENERATE_KEYPAIR: {
    exec: async (km: KeyManager) => {
      return await km.generateKeyPair(randomString(), 'passphrase', true)
    }
  },
  LOAD_KEYPAIR: {
    exec: async (km: KeyManager) => {
      const keypair = await km.generateKeyPair(randomString(), 'passphrase')
      return km.loadKeyPair(Buffer.from(keypair.public), Buffer.from(keypair.private))
    }
  },
  UNLOCK_IDENTITY: {
    exec: async (km: KeyManager) => {
      return await km.unlockIdentity('passphrase')
    }
  },
  LOCK_IDENTITY: {
    exec: async (km: KeyManager) => {
      return km.lockIdentity()
    }
  },
  SUCCESS: {
    exec: async (km: KeyManager) => {

    }
  },
  FAILURE: {
    exec: async (km: KeyManager) => {

    }
  },
});

export { keysModel }
