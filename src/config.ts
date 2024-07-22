import type { PasswordMemLimit, PasswordOpsLimit } from './keys/types';
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
   * Compound version string made up of all version values.
   * Formatted as `${sourceVersion}-${stateVersion}-${networkVersion}`
   */
  get version() {
    return `${this.sourceVersion}-${this.stateVersion}-${this.networkVersion}`;
  },
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
  networkVersion: 1,
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
   * In the future this will have the root public key too.
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
    mainnet: 'mainnet.polykey.com',
    testnet: 'testnet.polykey.com',
  },
  /**
   * Default system configuration.
   * These are not meant to be changed by the user.
   * These constants are tuned for optimal operation by the developers.
   */
  defaultsSystem: {
    /**
     * Timeout for each RPC stream.
     *
     * The semantics of this timeout changes depending on the context of how it
     * is used.
     *
     * It is reset upon sending or receiving any data on the stream. This is a
     * one-shot timer on unary calls. This repeats for every chunk of data on
     * streaming calls.
     *
     * This is the default for both client calls and server handlers. Both the
     * client callers and server handlers can optionally override this default.
     *
     * When the server handler receives a desired timeout from the client call,
     * the server handler will always choose the minimum of the timeouts between
     * the client call and server handler.
     *
     * With respect to client calls, this timeout bounds the time that the client
     * will wait for responses from the server, as well as the time to wait for
     * additional to be sent to the server.
     *
     * With respect to server handlers, this timeout bounds the time that the
     * server waits to send data back to the client, as well as the time to wait
     * for additional client data.
     *
     * Therefore it is expected that specific clients calls and server handlers
     * will override this timeout to cater to their specific circumstances.
     */
    rpcCallTimeoutTime: 15_000, // 15 seconds
    /**
     * Buffer size of the JSON RPC parser.
     *
     * This limits the largest parseable JSON message. Any JSON RPC message
     * greater than this byte size will be rejecte by closing the RPC stream
     * with an error.
     *
     * This has no effect on raw streams as raw streams do not use any parser.
     */
    rpcParserBufferSize: 64 * 1024, // 64 KiB
    /**
     * Timeout for the transport connecting to the client service.
     *
     * This bounds the amount of time that the client transport will wait to
     * establish a connection to the client service of a Polykey Agent.
     */
    clientConnectTimeoutTime: 15_000, // 15 seconds
    /**
     * Timeout for the keep alive of the transport connection to the client
     * service.
     *
     * It is reset upon sending or receiving any data on the client service
     * transport connection.
     *
     * This is the default for both sides (client and server) of the connection.
     *
     * This should always be greater than the connect timeout.
     */
    clientKeepAliveTimeoutTime: 30_000, // 30 seconds (3x of interval time)
    /**
     * Interval for the keep alive of the transport connection to the client
     * service.
     *
     * This is the minimum interval time because transport optimisations may
     * increase the effective interval time when a keep alive message is not
     * necessary, possibly due to other data being sent or received on the
     * connection.
     */
    clientKeepAliveIntervalTime: 10_000, // 10 seconds
    /**
     * Concurrency pool limit when finding other nodes.
     *
     * This is the parallel constant in the kademlia algorithm. It controls
     * how many parallel connections when attempting to find a node across
     * the network.
     */
    nodesConnectionFindConcurrencyLimit: 3,
    /**
     * Timeout for finding local nodes via MDNS.
     *
     * When `NodeConnectionManager.findNodeLocal` is executed, `js-mdns` will
     * start up a query for any Polykey agent services. The timeout determines
     * how long the query should sit before it is cancelled.
     *
     * During this time, if `js-mdns` manages to find a service relating to the
     * nodeId that `NodeConnectionManager.findNodeLocal` is looking for, the
     * timeout will be disregarded.
     *
     * The default value should allow some leeway for at least 2 query packets
     * to be sent out, and for `js-mdns` to wait some time before receiving
     * the corresponding answer packets from devices on the network.
     */
    nodesConnectionFindLocalTimeoutTime: 1_500, // 1.5 seconds
    /**
     * Minimum timeout for idle node connections.
     *
     * A node connection is idle, if nothing is using the connection. A
     * connection is being used when its resource counter is above 0.
     *
     * The resource counter of node connections is incremented above 0
     * when a reference to the node connection is maintained, usually with
     * the bracketing pattern.
     *
     * This has nothing to do with the data being sent or received on the
     * connection. It's intended as a way of garbage collecting unused
     * connections.
     *
     * This should always be greater than the keep alive timeout.
     */
    nodesConnectionIdleTimeoutTimeMin: 60_000, // 60 seconds
    /**
     * Scale factor for timeout for idle node connections
     *
     * This scales
     */
    nodesConnectionIdleTimeoutTimeScale: 7_200_000, // 2 hours
    /**
     * Timeout for establishing a node connection.
     *
     * This applies to both normal "forward" connections and "reverse"
     * connections started by hole punching. Reverse connections
     * is started by signalling requests that result in hole punching.
     *
     * This is the default for both client and server sides of the connection.
     *
     * Due to transport layer implementation peculiarities, this should never
     * be greater than the keep alive timeout.
     */
    nodesConnectionConnectTimeoutTime: 15_000, // 15 seconds
    /**
     * Timeout for the keep alive of the node connection.
     *
     * It is reset upon sending or receiving any data on the connection.
     *
     * This is the default for both sides (client and server) of the connection.
     *
     * This should always be greater than the connect timeout.
     */
    nodesConnectionKeepAliveTimeoutTime: 30_000, // 30 seconds (3x of interval time)
    /**
     * Interval for the keep alive of the node connection.
     *
     * This is the minimum interval time because transport optimisations may
     * increase the effective interval time when a keep alive message is not
     * necessary, possibly due to other data being sent or received on the
     * connection.
     */
    nodesConnectionKeepAliveIntervalTime: 10_000, // 10 seconds
    /**
     * Interval for hole punching reverse node connections.
     */
    nodesConnectionHolePunchIntervalTime: 1_000, // 1 second
    /**
     * Interval for refreshing buckets.
     *
     * A bucket that hasn't had any lookups for this amount of time will be
     * refreshed. Lookups can be successful or unsuccessful. A look up will
     * generally result in updates to the node graph.
     */
    nodesRefreshBucketIntervalTime: 3_600_000, // 1 hour
    /**
     * Interval time jitter multiplier for refreshing buckets.
     *
     * For example, if the interval is 60 seconds, and the jitter is configured
     * as 0.5 (50%), the actual interval could vary between 30 seconds
     * (60 * 0.5) and 90 seconds (60 * 1.5).
     */
    nodesRefreshBucketIntervalTimeJitter: 0.5,
    /**
     * Node graph bucket limit. The node graph keeps record of all node
     * addresses of the network.
     *
     * A smaller limit reduces how many node addresses each node needs to
     * keep track of. This can increase stability and fault toelrance
     * because it can be kept up to date more quickly, and when nodes
     * leave the network, it has a smaller impact on the network. However,
     * it may increase the number hops required to find a node.
     *
     * A larger limit increases how many node addresses each node needs to
     * keep track of. This can decrease stability and fault tolerance
     * because it can take longer to keep it up to date, and when nodes
     * leave the network, it has a larger impact on the network. However,
     * it may decrease the number hops required to find a node.
     *
     * This must be balannced between an efficient number of hops to look up
     * a node and resource usage per node and across the network.
     */
    nodesGraphBucketLimit: 20,
    /**
     * Node graph node specific NodeContactAddress limit. The node graph keeps
     * a list of addresses for each node. This sets the limit on the number of
     * different addresses we keep track of. If an added address exceeds this
     * limit then the oldest addresses are removed first.
     */
    nodesGraphNodeContactAddressLimit: 5,
    /**
     * The retries that the NotificationsManager will attempt in sending a
     * notification.
     */
    notificationsManagerSendNotificationRetries: 8,
    /**
     * The minimum interval time that the NotifciationsManager will wait before
     * attempting to resend a failed notification. This is the interval time for
     * the first retry of a pending notification. Every following retry will
     * have double the interval time of the last retry. This is capped by
     * sendNotificationRetryIntervalTimeMax.
     */
    notificationsManagerSendNotificationRetryIntervalTimeMin: 3_600_000, // 1 hour
    /**
     * The maximum interval time that the NotifciationsManager will wait before
     * attempting to resend a failed notification. This is the interval time cap
     * for the retries of pending notifications.
     */
    notificationsManagerSendNotificationRetryIntervalTimeMax: 86_400_000, // 1 day
    /**
     * Multicast group addresses that the MDNS stack will operate on.
     *
     * These values are well-known, and hence must not be changed by the user.
     *
     * The default values of these groups must start with either `224.0` (IPv4) or `ff02` (IPv6).
     * The default values of `224.0.0.250` and `ff02::fa17` have been selected due to
     * the resemblance of `fa17` to the latin word `fait`, and `250` being the decimal representation of that.
     */
    mdnsGroups: ['224.0.0.250', 'ff02::fa17'],
    /**
     * The port that the MDNS stack will operate on.
     *
     * This is well-known, and hence must not be changed by the user.
     *
     * The default value has been selected as the decimal decimal representation of `fa17`,
     * which resembles the latin word `fait`.
     */
    mdnsPort: 64023,
  },
  /**
   * Default user configuration.
   * These are meant to be changed by the user.
   * However the defaults here provide the average user experience.
   */
  defaultsUser: {
    nodePath: getDefaultNodePath(),
    /**
     * Ops limit for password hashing.
     *
     * This is the moderate choice: 0.7 seconds on 2.8 Ghz Intel Core i7.
     * This can only be set when a new password is set.
     * If this changes, the password hash for the same password will change.
     */
    passwordOpsLimit: 3 as PasswordOpsLimit,
    /**
     * Memory limit for password hashing.
     *
     * This is the moderate choice: requiring at least 512 MiB of memory.
     * This can only be set when a new password is set.
     * If this changes, the password hash for the same password will change.
     */
    passwordMemLimit: 268435456 as PasswordMemLimit,
    /**
     * Locking sensitive memory from being swapped to disk.
     *
     * Locks the memory used for keys and password hashes to prevent swapping.
     * On some systems, this can also prevent the memory being included during
     * core dumps.
     *
     * This should be disabled during testing, as only a limited amount of
     * memory is allowed to be locked.
     */
    strictMemoryLock: true,
    certDuration: 31536000,
    certRenewLeadTime: 86400,
    /**
     * Client host defaults to `localhost`.
     * This will depend on the OS configuration.
     * Usually it will be IPv4 `127.0.0.1` or IPv6 `::1`.
     * This is because the client service is private most of the time.
     */
    clientServiceHost: 'localhost',
    clientServicePort: 0,
    /**
     * Agent host defaults to `::` dual stack.
     * This is because the agent service is supposed to be public.
     */
    agentServiceHost: '::',
    agentServicePort: 0,
    /**
     * Hostname of network to connect to.
     *
     * This is defaulted to 'mainnet.polykey.com'.
     */
    network: 'mainnet.polykey.com',
    /**
     * Seed nodes.
     *
     * This is defaulted to `{}` at the object-level.
     *
     * However Polykey-CLI will use use the `network` to fill this.
     */
    seedNodes: {},
    /**
     * Number of workers to spin up by default.
     *
     * Using `undefined` means all cores. Using `0` means no workers at all.
     */
    workers: undefined,
    /**
     * If using dual stack `::`, then this forces only IPv6 bindings.
     */
    ipv6Only: false,
  },
};

type Config = typeof config;

export default config;

export type { Config };
