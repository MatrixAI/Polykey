import type { NodeId } from '../../ids/types';
import type { CertificatePEM } from '../../keys/types';
import { utils as quicUtils } from '@matrixai/quic';
import * as keysUtils from '../../keys/utils';

/**
 * Used to extract the NodeId from the connection metadata.
 * Used by the RPC handlers when they need to know the NodeId of the requester.
 * @param meta
 */
function nodeIdFromMeta(meta: any): NodeId | undefined {
  const remoteCerts = meta.remoteCertsChain;
  if (remoteCerts == null) return;
  const leafCertDER = remoteCerts[0] as Uint8Array;
  if (leafCertDER == null) return;
  const leafCert = keysUtils.certFromPEM(
    quicUtils.derToPEM(leafCertDER) as CertificatePEM,
  );
  if (leafCert == null) return;
  const nodeId = keysUtils.certNodeId(leafCert);
  if (nodeId == null) return;
  return nodeId;
}

export { nodeIdFromMeta };
