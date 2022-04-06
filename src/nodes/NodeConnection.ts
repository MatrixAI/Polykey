import type { NodeId } from './types';
import type { Host, Hostname, Port } from '../network/types';
import type KeyManager from '../keys/KeyManager';
import type { Certificate, PublicKey, PublicKeyPem } from '../keys/types';
import type Proxy from '../network/Proxy';
import type GRPCClient from '../grpc/GRPCClient';
import type NodeConnectionManager from './NodeConnectionManager';
import Logger from '@matrixai/logger';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import * as asyncInit from '@matrixai/async-init';
import * as nodesErrors from './errors';
import * as keysUtils from '../keys/utils';
import * as grpcErrors from '../grpc/errors';
import * as networkUtils from '../network/utils';

/**
 * Encapsulates the unidirectional client-side connection of one node to another.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- False positive for T
interface NodeConnection<T extends GRPCClient> extends CreateDestroy {}
@CreateDestroy()
class NodeConnection<T extends GRPCClient> {
  public readonly host: Host;
  public readonly port: Port;
  /**
   * Hostname is defined if the target's host was resolved from this hostname
   * Undefined if a Host was directly provided
   */
  public readonly hostname?: Hostname;

  protected logger: Logger;
  protected destroyCallback: () => Promise<void>;
  protected proxy: Proxy;
  protected client: T;

  static async createNodeConnection<T extends GRPCClient>({
    targetNodeId,
    targetHost,
    targetPort,
    targetHostname,
    connConnectTime = 20000,
    proxy,
    keyManager,
    clientFactory,
    nodeConnectionManager,
    destroyCallback = async () => {},
    logger = new Logger(this.name),
  }: {
    targetNodeId: NodeId;
    targetHost: Host;
    targetPort: Port;
    targetHostname?: Hostname;
    connConnectTime?: number;
    proxy: Proxy;
    keyManager: KeyManager;
    clientFactory: (...args) => Promise<T>;
    nodeConnectionManager: NodeConnectionManager;
    destroyCallback?: () => Promise<void>;
    logger?: Logger;
  }): Promise<NodeConnection<T>> {
    logger.info(`Creating ${this.name}`);
    // Checking if attempting to connect to a wildcard IP
    if (networkUtils.isHostWildcard(targetHost)) {
      throw new nodesErrors.ErrorNodeConnectionHostWildcard();
    }
    const proxyConfig = {
      host: proxy.getForwardHost(),
      port: proxy.getForwardPort(),
      authToken: proxy.authToken,
    };
    // 1. Get the proxy port of the fwdProxy (used for hole punching)
    const proxyAddress = networkUtils.buildAddress(
      proxy.getProxyHost(),
      proxy.getProxyPort(),
    );
    const signature = await keyManager.signWithRootKeyPair(
      Buffer.from(proxyAddress),
    );
    // 2. Ask fwdProxy for connection to target (the revProxy of other node)
    // 2. Start sending hole-punching packets to the target (via the client start -
    // this establishes a HTTP CONNECT request with the forward proxy)
    // 3. Relay the proxy port to the broker/s (such that they can inform the other node)
    // 4. Start sending hole-punching packets to other node (done in openConnection())
    // Done in parallel
    const nodeConnection = new NodeConnection<T>({
      host: targetHost,
      port: targetPort,
      hostname: targetHostname,
      proxy: proxy,
      destroyCallback,
      logger,
    });
    let client;
    try {
      // Start the hole punching only if we are not connecting to seed nodes
      let holePunchPromises: Promise<void>[] = [];
      const seedNodes = nodeConnectionManager.getSeedNodes();
      const isSeedNode = !!seedNodes.find((nodeId) => {
        return nodeId.equals(targetNodeId);
      });
      if (!isSeedNode) {
        holePunchPromises = Array.from(seedNodes, (nodeId) => {
          return nodeConnectionManager.sendHolePunchMessage(
            nodeId,
            keyManager.getNodeId(),
            targetNodeId,
            proxyAddress,
            signature,
          );
        });
      }
      [client] = await Promise.all([
        clientFactory({
          nodeId: targetNodeId,
          host: targetHost,
          port: targetPort,
          proxyConfig: proxyConfig,
          // Think about this
          logger: logger.getChild(clientFactory.name),
          destroyCallback: async () => {
            if (
              nodeConnection[asyncInit.status] !== 'destroying' &&
              !nodeConnection[asyncInit.destroyed]
            ) {
              await nodeConnection.destroy();
            }
          },
          timeout: connConnectTime,
        }),
        holePunchPromises,
      ]);
      // 5. When finished, you have a connection to other node
      // The GRPCClient is ready to be used for requests
    } catch (e) {
      await nodeConnection.destroy();
      // If the connection times out, re-throw this with a higher level nodes exception
      if (e instanceof grpcErrors.ErrorGRPCClientTimeout) {
        throw new nodesErrors.ErrorNodeConnectionTimeout();
      }
      throw e;
    }
    // TODO: This is due to chicken or egg problem
    // see if we can move to CreateDestroyStartStop to resolve this
    nodeConnection.client = client;
    logger.info(`Created ${this.name}`);
    return nodeConnection;
  }

  constructor({
    host,
    port,
    hostname,
    proxy,
    destroyCallback,
    logger,
  }: {
    host: Host;
    port: Port;
    hostname?: Hostname;
    proxy: Proxy;
    destroyCallback: () => Promise<void>;
    logger: Logger;
  }) {
    this.logger = logger;
    this.host = host;
    this.port = port;
    this.hostname = hostname;
    this.proxy = proxy;
    this.destroyCallback = destroyCallback;
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    if (
      this.client != null &&
      this.client[asyncInit.status] !== 'destroying' &&
      !this.client[asyncInit.destroyed]
    ) {
      await this.client.destroy();
    }
    await this.destroyCallback();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Gets GRPCClient for this node connection
   */
  public getClient(): T {
    return this.client;
  }

  /**
   * Get the root certificate chain (i.e. the entire chain) of the node at the
   * end of this connection.
   * Ordered from newest to oldest.
   */
  @ready(new nodesErrors.ErrorNodeConnectionDestroyed())
  public getRootCertChain(): Array<Certificate> {
    const connInfo = this.proxy.getConnectionInfoByProxy(this.host, this.port);
    if (connInfo == null) {
      throw new nodesErrors.ErrorNodeConnectionInfoNotExist();
    }
    return connInfo.remoteCertificates;
  }

  /**
   * Finds the public key of a corresponding node ID, from the certificate chain
   * of the node at the end of this connection.
   * Because a keynode's root key can be refreshed, its node ID can also change.
   * Sometimes these previous root keys are also still valid - these would be
   * found in the certificate chain.
   */
  @ready(new nodesErrors.ErrorNodeConnectionDestroyed())
  public getExpectedPublicKey(expectedNodeId: NodeId): PublicKeyPem | null {
    const certificates = this.getRootCertChain();
    let publicKey: PublicKeyPem | null = null;
    for (const cert of certificates) {
      if (keysUtils.certNodeId(cert)!.equals(expectedNodeId)) {
        publicKey = keysUtils.publicKeyToPem(
          cert.publicKey as PublicKey,
        ) as PublicKeyPem;
      }
    }
    return publicKey;
  }
}

export default NodeConnection;
