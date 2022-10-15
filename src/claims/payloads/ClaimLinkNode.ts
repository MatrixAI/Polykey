import type { Claim } from '../types';
import type { NodeIdEncoded } from '../../ids/types';

/**
 * Linking 2 nodes together
 */
interface ClaimLinkNode extends Claim {
  iss: NodeIdEncoded;
  sub: NodeIdEncoded;
}

export default ClaimLinkNode;
