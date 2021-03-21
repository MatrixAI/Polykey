import { Machine } from 'xstate';

interface APIStateSchema {
  states: {
    idle: {};
    gettingCertificateChain: {
      states: {
        checkingAuthorization: {};
        fulfillingRequest: {};
      };
    };
    gettingSignedCertificate: {
      states: {
        checkingAuthorization: {};
        fulfillingRequest: {};
      };
    };
    creatingVault: {
      states: {
        checkingAuthorization: {};
        fulfillingRequest: {};
      };
    };
    gettingVaultsList: {
      states: {
        checkingAuthorization: {};
        fulfillingRequest: {};
      };
    };
    deletingVault: {
      states: {
        checkingAuthorization: {};
        fulfillingRequest: {};
      };
    };
    gettingSecretsList: {
      states: {
        checkingAuthorization: {};
        fulfillingRequest: {};
      };
    };
    creatingSecret: {
      states: {
        checkingAuthorization: {};
        fulfillingRequest: {};
      };
    };
    gettingSecretContent: {
      states: {
        checkingAuthorization: {};
        fulfillingRequest: {};
      };
    };
    deletingSecret: {
      states: {
        checkingAuthorization: {};
        fulfillingRequest: {};
      };
    };
  };
}

type APIEvent =
  | { type: 'RESPONSE_200' }
  | { type: 'RESPONSE_401' }
  | { type: 'RESPONSE_403' }
  | { type: 'RESPONSE_500' }
  | { type: 'CHECK_AUTHORIZATION' }
  | { type: 'AUTHORIZED' }
  | { type: 'NOT_AUTHORIZED' }
  | { type: 'GET_CERTIFICATE_CHAIN' }
  | { type: 'GET_SIGNED_CERTIFICATE' }
  | { type: 'CREATE_VAULT' }
  | { type: 'GET_VAULT_LIST' }
  | { type: 'DELETE_VAULT' }
  | { type: 'GET_SECRET_LIST' }
  | { type: 'CREATE_SECRET' }
  | { type: 'GET_SECRET_CONTENT' }
  | { type: 'DELETE_SECRET' };

const apiMachine = Machine<APIStateSchema, APIEvent>({
  id: 'api',
  initial: 'idle',
  states: {
    idle: {
      on: {
        CHECK_AUTHORIZATION: 'checkingAuthorization',
      },
    },
    checkingAuthorization: {
      on: {
        RESPONSE_401: { target: 'idle', in: '#api.checkingAuthorization.notAuthorized' },
        GET_CERTIFICATE_CHAIN: { target: 'gettingCertificateChain', in: '#api.checkingAuthorization.authorized' },
        GET_SIGNED_CERTIFICATE: { target: 'gettingSignedCertificate', in: '#api.checkingAuthorization.authorized' },
        CREATE_VAULT: { target: 'creatingVault', in: '#api.checkingAuthorization.authorized' },
        GET_VAULT_LIST: { target: 'gettingVaultsList', in: '#api.checkingAuthorization.authorized' },
        DELETE_VAULT: { target: 'deletingVault', in: '#api.checkingAuthorization.authorized' },
        GET_SECRET_LIST: { target: 'gettingSecretsList', in: '#api.checkingAuthorization.authorized' },
        CREATE_SECRET: { target: 'creatingSecret', in: '#api.checkingAuthorization.authorized' },
        GET_SECRET_CONTENT: { target: 'gettingSecretContent', in: '#api.checkingAuthorization.authorized' },
        DELETE_SECRET: { target: 'deletingSecret', in: '#api.checkingAuthorization.authorized' },
      },
      initial: 'checkingToken',
      states: {
        checkingToken: {
          on: {
            AUTHORIZED: 'authorized',
            NOT_AUTHORIZED: 'notAuthorized',
          },
        },
        authorized: { type: 'final' },
        notAuthorized: { type: 'final' },
      },
    },
    gettingCertificateChain: {
      on: {
        RESPONSE_200: { target: 'idle', in: '#api.gettingCertificateChain.servingContent' },
        RESPONSE_403: { target: 'idle', in: '#api.gettingCertificateChain.forbidden' },
      },
      initial: 'checkingScopes',
      states: {
        checkingScopes: {
          on: {
            AUTHORIZED: 'servingContent',
            NOT_AUTHORIZED: 'forbidden',
          },
        },
        servingContent: { type: 'final' },
        forbidden: { type: 'final' },
      },
    },
    gettingSignedCertificate: {
      on: {
        RESPONSE_200: { target: 'idle', in: '#api.gettingSignedCertificate.servingContent' },
        RESPONSE_403: { target: 'idle', in: '#api.gettingSignedCertificate.forbidden' },
      },
      initial: 'checkingScopes',
      states: {
        checkingScopes: {
          on: {
            AUTHORIZED: 'servingContent',
            NOT_AUTHORIZED: 'forbidden',
          },
        },
        servingContent: { type: 'final' },
        forbidden: { type: 'final' },
      },
    },
    creatingVault: {
      on: {
        RESPONSE_200: { target: 'idle', in: '#api.creatingVault.servingContent' },
        RESPONSE_403: { target: 'idle', in: '#api.creatingVault.forbidden' },
      },
      initial: 'checkingScopes',
      states: {
        checkingScopes: {
          on: {
            AUTHORIZED: 'servingContent',
            NOT_AUTHORIZED: 'forbidden',
          },
        },
        servingContent: { type: 'final' },
        forbidden: { type: 'final' },
      },
    },
    gettingVaultsList: {
      on: {
        RESPONSE_200: { target: 'idle', in: '#api.gettingVaultsList.servingContent' },
        RESPONSE_403: { target: 'idle', in: '#api.gettingVaultsList.forbidden' },
      },
      initial: 'checkingScopes',
      states: {
        checkingScopes: {
          on: {
            AUTHORIZED: 'servingContent',
            NOT_AUTHORIZED: 'forbidden',
          },
        },
        servingContent: { type: 'final' },
        forbidden: { type: 'final' },
      },
    },
    deletingVault: {
      on: {
        RESPONSE_200: { target: 'idle', in: '#api.deletingVault.servingContent' },
        RESPONSE_403: { target: 'idle', in: '#api.deletingVault.forbidden' },
      },
      initial: 'checkingScopes',
      states: {
        checkingScopes: {
          on: {
            AUTHORIZED: 'servingContent',
            NOT_AUTHORIZED: 'forbidden',
          },
        },
        servingContent: { type: 'final' },
        forbidden: { type: 'final' },
      },
    },
    gettingSecretsList: {
      on: {
        RESPONSE_200: { target: 'idle', in: '#api.gettingSecretsList.servingContent' },
        RESPONSE_403: { target: 'idle', in: '#api.gettingSecretsList.forbidden' },
      },
      initial: 'checkingScopes',
      states: {
        checkingScopes: {
          on: {
            AUTHORIZED: 'servingContent',
            NOT_AUTHORIZED: 'forbidden',
          },
        },
        servingContent: { type: 'final' },
        forbidden: { type: 'final' },
      },
    },
    creatingSecret: {
      on: {
        RESPONSE_200: { target: 'idle', in: '#api.creatingSecret.servingContent' },
        RESPONSE_403: { target: 'idle', in: '#api.creatingSecret.forbidden' },
      },
      initial: 'checkingScopes',
      states: {
        checkingScopes: {
          on: {
            AUTHORIZED: 'servingContent',
            NOT_AUTHORIZED: 'forbidden',
          },
        },
        servingContent: { type: 'final' },
        forbidden: { type: 'final' },
      },
    },
    gettingSecretContent: {
      on: {
        RESPONSE_200: { target: 'idle', in: '#api.gettingSecretContent.servingContent' },
        RESPONSE_403: { target: 'idle', in: '#api.gettingSecretContent.forbidden' },
      },
      initial: 'checkingScopes',
      states: {
        checkingScopes: {
          on: {
            AUTHORIZED: 'servingContent',
            NOT_AUTHORIZED: 'forbidden',
          },
        },
        servingContent: { type: 'final' },
        forbidden: { type: 'final' },
      },
    },
    deletingSecret: {
      on: {
        RESPONSE_200: { target: 'idle', in: '#api.deletingSecret.servingContent' },
        RESPONSE_403: { target: 'idle', in: '#api.deletingSecret.forbidden' },
      },
      initial: 'checkingScopes',
      states: {
        checkingScopes: {
          on: {
            AUTHORIZED: 'servingContent',
            NOT_AUTHORIZED: 'forbidden',
          },
        },
        servingContent: { type: 'final' },
        forbidden: { type: 'final' },
      },
    },
  },
});

export { apiMachine, APIStateSchema, APIEvent };
