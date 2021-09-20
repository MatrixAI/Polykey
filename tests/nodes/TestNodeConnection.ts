import type { PublicKeyPem } from '@/keys/types';
import type { AbstractConstructorParameters } from '@/types';

import { NodeConnection } from '@/nodes';

/**
 * A dummy NodeConnection object. Currently used for when a connection isn't
 * required to be established, but we are required to get the public key from
 * the other node.
 */
class TestNodeConnection extends NodeConnection {
  protected publicKey: PublicKeyPem | null;

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
