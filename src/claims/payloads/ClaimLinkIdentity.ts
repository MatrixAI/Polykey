import type { Claim } from '../types';
import type { NodeIdEncoded, ProviderIdentityId } from '../../ids/types';

/**
 * Linking node and digital identity together
 */
interface ClaimLinkIdentity extends Claim {
  iss: NodeIdEncoded;
  sub: ProviderIdentityId;
}

export default ClaimLinkIdentity;
