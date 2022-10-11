import type {
  PermissionId,
  CertId,
  CertIdEncoded,
  NodeId,
  NodeIdEncoded,
  VaultId,
  VaultIdEncoded,
  TaskId,
  TaskIdEncoded,
  ClaimId,
  ClaimIdEncoded,
  NotificationId,
} from './types';
import { IdInternal, IdSortable, IdRandom } from '@matrixai/id';

function createPermIdGenerator() {
  const generator = new IdRandom<PermissionId>();
  return () => generator.get();
}

/**
 * Encodes the NodeId as a `base32hex` string
 */
function encodeNodeId(nodeId: NodeId): NodeIdEncoded {
  return nodeId.toMultibase('base32hex') as NodeIdEncoded;
}

/**
 * Decodes an encoded NodeId string into a NodeId
 */
function decodeNodeId(nodeIdEncoded: any): NodeId | undefined {
  if (typeof nodeIdEncoded !== 'string') {
    return;
  }
  const nodeId = IdInternal.fromMultibase<NodeId>(nodeIdEncoded);
  if (nodeId == null) {
    return;
  }
  // All NodeIds are 32 bytes long
  // The NodeGraph requires a fixed size for Node Ids
  if (nodeId.length !== 32) {
    return;
  }
  return nodeId;
}

/**
 * Generates CertId
 */
function createCertIdGenerator(lastCertId?: CertId): () => CertId {
  const generator = new IdSortable<CertId>({
    lastId: lastCertId,
  });
  return () => generator.get();
}

/**
 * Encodes `CertId` to `CertIdEncoded`
 */
function encodeCertId(certId: CertId): CertIdEncoded {
  return certId.toBuffer().toString('hex') as CertIdEncoded;
}

/**
 * Decodes `CertIdEncoded` to `CertId`
 */
function decodeCertId(certIdEncoded: unknown): CertId | undefined {
  if (typeof certIdEncoded !== 'string') {
    return;
  }
  const certIdBuffer = Buffer.from(certIdEncoded, 'hex');
  const certId = IdInternal.fromBuffer<CertId>(certIdBuffer);
  if (certId == null) {
    return;
  }
  // All `CertId` are 16 bytes long
  if (certId.length !== 16) {
    return;
  }
  return certId;
}

function createVaultIdGenerator(): () => VaultId {
  const generator = new IdRandom<VaultId>();
  return () => generator.get();
}

function encodeVaultId(vaultId: VaultId): VaultIdEncoded {
  return vaultId.toMultibase('base58btc') as VaultIdEncoded;
}

function decodeVaultId(vaultIdEncoded: any): VaultId | undefined {
  if (typeof vaultIdEncoded !== 'string') return;
  const vaultId = IdInternal.fromMultibase<VaultId>(vaultIdEncoded);
  if (vaultId == null) return;
  // All VaultIds are 16 bytes long
  if (vaultId.length !== 16) return;
  return vaultId;
}

/**
 * Generates TaskId
 * TaskIds are lexicographically sortable 128 bit IDs
 * They are strictly monotonic and unique with respect to the `nodeId`
 * When the `NodeId` changes, make sure to regenerate this generator
 */
function createTaskIdGenerator(lastTaskId?: TaskId) {
  const generator = new IdSortable<TaskId>({
    lastId: lastTaskId,
  });
  return () => generator.get();
}

/**
 * Encodes the TaskId as a `base32hex` string
 */
function encodeTaskId(taskId: TaskId): TaskIdEncoded {
  return taskId.toMultibase('base32hex') as TaskIdEncoded;
}

/**
 * Decodes an encoded TaskId string into a TaskId
 */
function decodeTaskId(taskIdEncoded: any): TaskId | undefined {
  if (typeof taskIdEncoded !== 'string') {
    return;
  }
  const taskId = IdInternal.fromMultibase<TaskId>(taskIdEncoded);
  if (taskId == null) {
    return;
  }
  // All TaskIds are 16 bytes long
  if (taskId.length !== 16) {
    return;
  }
  return taskId;
}

/**
 * Generator for `ClaimId`
 * Make sure the `nodeId` is set to this node's own `NodeId`
 */
function createClaimIdGenerator(nodeId: NodeId, lastClaimId?: ClaimId) {
  const generator = new IdSortable<ClaimId>({
    lastId: lastClaimId,
    nodeId,
  });
  return () => generator.get();
}

function encodeClaimId(claimId: ClaimId): ClaimIdEncoded {
  return claimId.toMultibase('base32hex') as ClaimIdEncoded;
}

function decodeClaimId(claimIdEncoded: string): ClaimId | undefined {
  const claimId = IdInternal.fromMultibase<ClaimId>(claimIdEncoded);
  if (claimId == null) {
    return;
  }
  return claimId;
}

function createNotificationIdGenerator(
  lastId?: NotificationId,
): () => NotificationId {
  const generator = new IdSortable<NotificationId>({
    lastId,
  });
  return () => generator.get();
}

export {
  createPermIdGenerator,
  encodeNodeId,
  decodeNodeId,
  createCertIdGenerator,
  encodeCertId,
  decodeCertId,
  createVaultIdGenerator,
  encodeVaultId,
  decodeVaultId,
  createTaskIdGenerator,
  encodeTaskId,
  decodeTaskId,
  createClaimIdGenerator,
  encodeClaimId,
  decodeClaimId,
  createNotificationIdGenerator,
};

export * from './types';
