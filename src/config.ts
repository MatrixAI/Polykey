import type { Host, Port } from './network/types';
import type { NodeAddress } from './nodes/types';
import { getDefaultNodePath } from './utils';
// @ts-ignore package.json is outside rootDir
import { version } from '../package.json';

/**
 * Configuration for testnet node addresses.
 * Extracted here to enforce types properly.
 */
const testnet: Record<string, NodeAddress> = {
  vg9a9e957878s2qgtbdmu2atvli8ms7muukb1dk4dpbm4llkki3h0: {
    host: 'testnet.polykey.io' as Host,
    port: 1314 as Port,
  },
  vh9oqtvct10eaiv3cl4ebm0ko33sl0qqpvb59vud8cngfvqs4p4ng: {
    host: 'testnet.polykey.io' as Host,
    port: 1314 as Port,
  },
};

/**
 * Configuration for main net node addresses.
 * Extracted here to enforce types properly.
 */
const mainnet: Record<string, NodeAddress> = {};

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
   * Version of the RPC and HTTP service
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
    certManagerConfig: {
      certDuration: 31536000,
    },
    networkConfig: {
      // Config for the QUICSocket
      agentHost: '127.0.0.1',
      agentPort: 0,
      ipv6Only: false,
      // Config for the websocket server
      clientHost: '127.0.0.1',
      clientPort: 0,
      // Websocket server config
      maxReadableStreamBytes: 1_000_000_000, // About 1 GB
      maxIdleTimeout: 120, // 2 minutes
      pingIntervalTime: 1_000, // 1 second
      pingTimeoutTimeTime: 10_000, // 10 seconds
      // RPC config
      clientParserBufferByteLimit: 1_000_000, // About 1MB
      handlerTimeoutTime: 60_000, // 1 minute
      handlerTimeoutGraceTime: 2_000, // 2 seconds
    },
    quicServerConfig: {
      keepAliveIntervalTime: 10_000, // 10 seconds
      maxIdleTimeout: 60_000, // 1 minute
    },
    quicClientConfig: {
      keepAliveIntervalTime: 10_000, // 10 seconds
      maxIdleTimeout: 60_000, // 1 minute
    },
    nodeConnectionManagerConfig: {
      connectionConnectTime: 2000,
      connectionTimeoutTime: 60000,
      initialClosestNodes: 3,
      pingTimeoutTime: 2000,
      connectionHolePunchTimeoutTime: 4000,
      connectionHolePunchIntervalTime: 250,
    },
    // This is not used by the `PolykeyAgent` which defaults to `{}`
    network: {
      mainnet: mainnet,
      testnet: testnet,
    },
  },
};

export default config;
