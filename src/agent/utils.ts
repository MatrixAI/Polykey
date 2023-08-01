import type { NodeId } from '../ids/types';
import * as keysUtils from '../keys/utils';

/**
 * Used to extract the NodeId from the connection metadata.
 * Used by the RPC handlers when they need to know the NodeId of the requester.
 * @param meta
 */
function nodeIdFromMeta(meta: any): NodeId | undefined {
  const remoteCerts = meta.remoteCertificates;
  if (remoteCerts == null) return;
  const leafCertPEM = remoteCerts[0];
  if (leafCertPEM == null) return;
  const leafCert = keysUtils.certFromPEM(leafCertPEM);
  if (leafCert == null) return;
  const nodeId = keysUtils.certNodeId(leafCert);
  if (nodeId == null) return;
  return nodeId;
}

export { nodeIdFromMeta };
