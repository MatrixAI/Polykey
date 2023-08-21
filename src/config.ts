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
   * File/directory paths
   */
  paths: {
    statusBase: 'status.json',
    statusLockBase: 'status.lock',
    stateBase: 'state',
    stateVersionBase: 'version',
    dbBase: 'db',
    keysBase: 'keys',
    vaultsBase: 'vaults',
    efsBase: 'efs',
    tokenBase: 'token',
  },
  /**
   * This is not used by the `PolykeyAgent` which defaults to `{}`
   * In the future this will be replaced by `mainnet.polykey.com` and `testnet.polykey.com`.
   * Along with the domain we will have the root public key too.
   *
   * Information that is pre-configured during distribution:
   *
   * - Domain
   * - Root public key
   *
   * Information that is discovered over DNS (Authenticated DNS is optional):
   *
   * - IP address
   * - Port
   *
   * As long as the root public key is provided, it is sufficient to defeat poisoning
   * the network. The root public key should also be changed often to reduce the impact
   * of compromises. Finally the root public key can also be signed by a third party CA
   * providing an extra level of confidence. However this is not required.
   */
  network: {
    mainnet: mainnet,
    testnet: testnet,
  },
  /**
   * Default system configuration.
   * These are not meant to be changed by the user.
   * These constants are tuned for optimal operation by the developers.
   */
  defaultsSystem: {
    /**
     * Timeout for each stream used in RPC.
     * The timer is reset upon sending or receiving any data on the stream.
     * This is a one-shot timer on unary calls.
     * This repeats for every chunk of data on streaming calls.
     * This is the default for both client calls and server handlers.
     * Note that the server handler will always choose the minimum of the timeouts between
     * client and server, and it is possible for the handler to override this default timeout
     */
    rpcTimeoutTime: 15_000, // 15 seconds
    /**
     * This buffer size sets the largest parseable JSON message.
     * Any JSON RPC message that is greater than this is rejected.
     * The stream is then closed with an error.
     * This has no effect on raw streams as raw streams do not use a parser.
     */
    rpcParserBufferSize: 64 * 1024, // 64 KiB

    clientConnectTimeoutTime: 15_000, // 15 seconds
    clientKeepAliveTimeoutTime: 30_000, // 30 seconds (3x of interval time)
    clientKeepAliveIntervalTime: 10_000, // 10 seconds

    nodesConnectionFindConcurrencyLimit: 3,
    /**
     * This is the timeout for idle node connections.
     * A node connection is idle, if nothing is using the connection.
     * This has nothing to do with the data being sent or received on the connection.
     * It's intended as a way of garbage collecting unused connections.
     */
    nodesConnectionIdleTimeoutTime: 60_000, // 60 seconds

    /**
     * Default timeout for connecting to a node.
     * This is used when you connect node forward or reverse.
     * This means this time includes any potential hole punching operation.
     */
    nodesConnectionConnectTimeoutTime: 15_000, // 15 seconds

    /**
     * Agent service transport keep alive interval time.
     * This the maxmum time between keep alive messages.
     * This only has effect if `agentMaxIdleTimeout` is greater than 0.
     * See the transport layer for further details.
     */
    nodesConnectionKeepAliveTimeoutTime: 30_000, // 30 seconds (3x of interval time)

    /**
     * Minimum interval time between keep alive messages.
     * This is the minimum because optimisations may increase the effective
     * interval time when a keep alive message is not necessary.
     */
    nodesConnectionKeepAliveIntervalTime: 10_000, // 10 seconds

    /**
     * Hole punching interval time.
     * Note that the time spent hole punching is determined by the handler.
     * As it is a fire and forget operation, and ultimately part of the connect timeout.
     */
    nodesConnectionHolePunchIntervalTime: 1_000, // 1 second
  },
  /**
   * Default user configuration.
   * These are meant to be changed by the user.
   * However the defaults here provide the average user experience.
   */
  defaultsUser: {
    nodePath: getDefaultNodePath(),
    rootCertDuration: 31536000,
    /**
     * If using dual stack `::`, then this forces only IPv6 bindings.
     */
    ipv6Only: false,
    /**
     * Agent host defaults to `::` dual stack.
     * This is because the agent service is supposed to be public.
     */
    agentServiceHost: '::',
    agentServicePort: 0,
    /**
     * Client host defaults to `localhost`.
     * This will depend on the OS configuration.
     * Usually it will be IPv4 `127.0.0.1` or IPv6 `::1`.
     * This is because the client service is private most of the time.
     */
    clientServiceHost: 'localhost',
    clientServicePort: 0,
  },
};

type Config = typeof config;

export default config;

export type { Config };
