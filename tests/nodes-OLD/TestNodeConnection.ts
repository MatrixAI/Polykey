import type { PublicKey } from '@/keys/types';
import type { AbstractConstructorParameters } from '@/types';
import type { Host, Port } from '@/network/types';
import type Proxy from '@/network/Proxy';
import type GRPCClientAgent from '@/agent/GRPCClientAgent';
import Logger from '@matrixai/logger';
import NodeConnection from '@/nodes/NodeConnection';

/**
 * A dummy NodeConnection object. Currently used for when a connection isn't
 * required to be established, but we are required to get the public key from
 * the other node.
 */
class TestNodeConnection extends NodeConnection<GRPCClientAgent> {
  protected publicKey: PublicKey | null;

  static async createTestNodeConnection({
    publicKey,
    targetHost,
    targetPort,
    proxy,
    destroyCallback,
    logger,
  }: {
    publicKey: PublicKey | null;
    targetHost: Host;
    targetPort: Port;
    proxy: Proxy;
    destroyCallback: () => Promise<void>;
    logger?: Logger;
  }): Promise<TestNodeConnection> {
    const logger_ = logger ?? new Logger('NodeConnection');
    return new TestNodeConnection({
      publicKey,
      logger: logger_,
      host: targetHost,
      port: targetPort,
      destroyCallback,
      proxy,
    });
  }

  public constructor({
    publicKey = null,
    ...rest
  }: {
    publicKey?: PublicKey | null;
  } & AbstractConstructorParameters<typeof NodeConnection>[0]) {
    super(rest);
    this.publicKey = publicKey;
  }

  public getExpectedPublicKey(): PublicKey | null {
    return this.publicKey;
  }
}

export default TestNodeConnection;
