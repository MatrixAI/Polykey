import type { PublicKeyPem } from '@/keys/types';
import type { AbstractConstructorParameters } from '@/types';

import type { Host, Port } from '@/network/types';
import type ForwardProxy from '@/network/ForwardProxy';
import type GRPCClientAgent from '@/agent/GRPCClientAgent';
import Logger from '@matrixai/logger';
import NodeConnection from '@/nodes/NodeConnection';

/**
 * A dummy NodeConnection object. Currently used for when a connection isn't
 * required to be established, but we are required to get the public key from
 * the other node.
 */
class TestNodeConnection extends NodeConnection<GRPCClientAgent> {
  protected publicKey: PublicKeyPem | null;

  static async createTestNodeConnection({
    publicKey,
    targetHost,
    targetPort,
    fwdProxy,
    destroyCallback,
    logger,
  }: {
    publicKey: PublicKeyPem | null;
    targetHost: Host;
    targetPort: Port;
    fwdProxy: ForwardProxy;
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
      fwdProxy,
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
