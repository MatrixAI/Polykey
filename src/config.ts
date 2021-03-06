import type { Host, Port } from './network/types';
import { getDefaultNodePath } from './utils';
// @ts-ignore package.json is outside rootDir
import { version } from '../package.json';

/**
 * Polykey static configuration
 * This is intended only for static properties
 * These properties are embedded in the source code
 * And they are not to be changed during runtime
 */
const config = {
  /**
   * Version of source code
   * This must match the package.json
   */
  sourceVersion: version,
  /**
   * Version of the state, persisted into the node state
   * It is only incremented on breaking changes
   * Use this to know if you have to do a schema-upgrade
   */
  stateVersion: 1,
  /**
   * Version of the gRPC and HTTP service
   * It is only incremented on breaking changes
   * Use this to know if you must upgrade your service client
   */
  serviceVersion: 1,
  /**
   * Default provider configuration
   * These are managed by Matrix AI and Polykey developers
   */
  providers: {
    'github.com': {
      clientId: 'ca5c4c520da868387c52',
    },
  },
  /**
   * Polykey OIDs
   * These are used by the root X.509 certificates
   * These are managed by Matrix AI and Polykey developers
   * Starts on 1.3.6.1.4.1.57167.2
   * See: http://oid-info.com/get/1.3.6.1.4.1.57167
   */
  oids: {
    // Extensions start on 1.3.6.1.4.1.57167.2.2
    extensions: {
      polykeyVersion: '1.3.6.1.4.1.57167.2.2.1',
      nodeSignature: '1.3.6.1.4.1.57167.2.2.2',
    },
  },
  /**
   * Default configuration
   */
  defaults: {
    nodePath: getDefaultNodePath(),
    statusBase: 'status.json',
    statusLockBase: 'status.lock',
    stateBase: 'state',
    stateVersionBase: 'version',
    dbBase: 'db',
    keysBase: 'keys',
    vaultsBase: 'vaults',
    efsBase: 'efs',
    tokenBase: 'token',
    keysConfig: {
      rootKeyPairBits: 4096,
      rootCertDuration: 31536000,
      dbKeyBits: 256,
    },
    networkConfig: {
      // ForwardProxy
      forwardHost: '127.0.0.1' as Host,
      forwardPort: 0 as Port,
      proxyHost: '0.0.0.0' as Host,
      proxyPort: 0 as Port,
      // GRPCServer for agent service
      agentHost: '127.0.0.1' as Host,
      agentPort: 0 as Port,
      // GRPCServer for client service
      clientHost: '127.0.0.1' as Host,
      clientPort: 0 as Port,
    },
    proxyConfig: {
      connConnectTime: 20000,
      connKeepAliveTimeoutTime: 20000,
      connEndTime: 1000,
      connPunchIntervalTime: 1000,
      connKeepAliveIntervalTime: 1000,
    },
    nodeConnectionManagerConfig: {
      connConnectTime: 20000,
      connTimeoutTime: 60000,
      initialClosestNodes: 3,
    },
    // This is not used by the `PolykeyAgent` which defaults to `{}`
    network: {
      mainnet: {},
      testnet: {},
    },
  },
};

export default config;
