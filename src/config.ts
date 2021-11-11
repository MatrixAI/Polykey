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
    stateBase: 'state',
    dbBase: 'db',
    keysBase: 'keys',
    vaultsBase: 'vaults',
    tokenBase: 'token',
    keysConfig: {
      rootKeyPairBits: 4096,
      rootCertDuration: 31536000,
      dbKeyBits: 256,
    },
    networkConfig: {
      // ForwardProxy
      proxyHost: '127.0.0.1' as Host,
      proxyPort: 0 as Port,
      egressHost: '0.0.0.0' as Host,
      egressPort: 0 as Port,
      // ReverseProxy
      ingressHost: '0.0.0.0' as Host,
      ingressPort: 0 as Port,
      // GRPCServer for agent service
      agentHost: '127.0.0.1' as Host,
      agentPort: 0 as Port,
      // GRPCServer for client service
      clientHost: '127.0.0.1' as Host,
      clientPort: 0 as Port,
    },
    forwardProxyConfig: {
      connConnectTime: 20000,
      connTimeoutTime: 20000,
      connPingIntervalTime: 1000,
    },
    reverseProxyConfig: {
      connConnectTime: 20000,
      connTimeoutTime: 20000,
    },
    // Note: this is not used by the `PolykeyAgent`, that is defaulting to `{}`.
    network: {
      mainnet: {
        v359vgrgmqf1r5g4fvisiddjknjko6bmm4qv7646jr7fi9enbfuug: {
          host: 'testnet.polykey.io',
          port: 1314,
        },
      },
      testnet: {
        v359vgrgmqf1r5g4fvisiddjknjko6bmm4qv7646jr7fi9enbfuug: {
          host: '127.0.0.3',
          port: 1314,
        },
      },
    },
  },
};

export default config;
