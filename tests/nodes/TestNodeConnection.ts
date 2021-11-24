import type { PublicKeyPem } from '@/keys/types';
import type { AbstractConstructorParameters } from '@/types';

import type { NodeId } from '@/nodes/types';
import type { Host, Port, ProxyConfig } from '@/network/types';
import type { ForwardProxy } from '@/network';
import type { KeyManager } from '@/keys';
import Logger from '@matrixai/logger';
import { NodeConnection } from '@/nodes';

/**
 * A dummy NodeConnection object. Currently used for when a connection isn't
 * required to be established, but we are required to get the public key from
 * the other node.
 */
class TestNodeConnection extends NodeConnection {
  protected publicKey: PublicKeyPem | null;

  static async createTestNodeConnection({
    publicKey,
    targetNodeId,
    targetHost,
    targetPort,
    forwardProxy,
    keyManager,
    logger,
  }: {
    publicKey: PublicKeyPem | null;
    targetNodeId: NodeId;
    targetHost: Host;
    targetPort: Port;
    forwardProxy: ForwardProxy;
    keyManager: KeyManager;
    logger?: Logger;
  }): Promise<TestNodeConnection> {
    const logger_ = logger ?? new Logger('NodeConnection');
    const proxyConfig_ = {
      host: forwardProxy.proxyHost,
      port: forwardProxy.proxyPort,
      authToken: forwardProxy.authToken,
    } as ProxyConfig;
    return new TestNodeConnection({
      publicKey,
      forwardProxy,
      keyManager,
      logger: logger_,
      targetHost,
      targetNodeId,
      targetPort,
      proxyConfig: proxyConfig_,
    });
  }

  public constructor({
    publicKey = null,
    ...rest
  }: {
    publicKey?: PublicKeyPem | null;
  } & AbstractConstructorParameters<typeof NodeConnection>[0]) {
    super(rest);
    this.publicKey = publicKey;
  }

  public getExpectedPublicKey(): PublicKeyPem | null {
    return this.publicKey;
  }
}

export default TestNodeConnection;
