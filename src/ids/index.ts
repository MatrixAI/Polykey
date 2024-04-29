import type {
  PermissionId,
  CertId,
  CertIdEncoded,
  NodeId,
  NodeIdString,
  NodeIdEncoded,
  VaultId,
  VaultIdEncoded,
  TaskId,
  TaskIdEncoded,
  ClaimId,
  ClaimIdEncoded,
  ProviderId,
  IdentityId,
  ProviderIdentityId,
  ProviderIdentityIdEncoded,
  GestaltId,
  GestaltIdEncoded,
  GestaltLinkId,
  NotificationId,
  NotificationIdEncoded,
  AuditEventId,
  AuditEventIdEncoded,
} from './types';
import { IdInternal, IdSortable, IdRandom } from '@matrixai/id';
import * as keysUtilsRandom from '../keys/utils/random';
import * as validationErrors from '../validation/errors';

/**
 * Generates an auditId from an epoch timestamp.
 *
 * @param epoch
 * @param randomSource
 */
function generateSortableIdFromTimestamp<T extends IdInternal & number>(
  epoch: number,
  randomSource: (size: number) => Uint8Array = keysUtilsRandom.getRandomBytes,
): T {
  const generator = new IdSortable<T>({
    timeSource: () => () => epoch,
    randomSource,
  });
  return generator.get();
}

function createPermIdGenerator(): () => PermissionId {
  const generator = new IdRandom<PermissionId>({
    randomSource: keysUtilsRandom.getRandomBytes,
  });
  return () => generator.get();
}

function createAuditEventIdGenerator(
  lastAuditEventId?: AuditEventId,
): () => AuditEventId {
  const generator = new IdSortable<AuditEventId>({
    lastId: lastAuditEventId,
    randomSource: keysUtilsRandom.getRandomBytes,
  });
  return () => generator.get();
}

/**
 * Encodes `AuditEventId` to `AuditEventIdEncoded`
 */
function encodeAuditEventId(auditEventId: AuditEventId): AuditEventIdEncoded {
  return auditEventId.toBuffer().toString('hex') as AuditEventIdEncoded;
}

/**
 * Decodes `AuditEventIdEncoded` to `AuditEventId`
 */
function decodeAuditEventId(
  auditEventIdEncoded: unknown,
): AuditEventId | undefined {
  if (typeof auditEventIdEncoded !== 'string') {
    return;
  }
  const auditEventIdBuffer = Buffer.from(auditEventIdEncoded, 'hex');
  const auditEventId = IdInternal.fromBuffer<AuditEventId>(auditEventIdBuffer);
  if (auditEventId == null) {
    return;
  }
  // All `AuditEventId` are 16 bytes long
  if (auditEventId.length !== 16) {
    return;
  }
  return auditEventId;
}

/**
 * Generates an auditId from an epoch timestamp.
 *
 * @param epoch
 * @param randomSource
 */
const generateAuditEventIdFromTimestamp =
  generateSortableIdFromTimestamp<AuditEventId>;

/**
 * Creates a NodeId generator.
 * This does not use `IdRandom` because it is not a UUID4.
 * Instead this just generates random 32 bytes.
 */
function createNodeIdGenerator(): () => NodeId {
  return () => {
    return IdInternal.fromBuffer<NodeId>(keysUtilsRandom.getRandomBytes(32));
  };
}

function isNodeId(nodeId: any): nodeId is NodeId {
  if (!(nodeId instanceof IdInternal)) {
    return false;
  }
  if (nodeId.length !== 32) {
    return false;
  }
  return true;
}

function assertNodeId(nodeId: unknown): asserts nodeId is NodeId {
  if (!(nodeId instanceof IdInternal)) {
    throw new validationErrors.ErrorParse('must be instance of Id');
  }
  if (nodeId.length !== 32) {
    throw new validationErrors.ErrorParse('must be 32 bytes long');
  }
}

function generateNodeId(nodeId: NodeId): NodeIdEncoded {
  return encodeNodeId(nodeId);
}

function parseNodeId(nodeIdEncoded: unknown): NodeId {
  const nodeId = decodeNodeId(nodeIdEncoded);
  if (nodeId == null) {
    throw new validationErrors.ErrorParse(
      'Node ID must be multibase base32hex encoded public-keys',
    );
  }
  return nodeId;
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
function decodeNodeId(nodeIdEncoded: unknown): NodeId | undefined {
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

function encodeNodeIdString(nodeId: NodeId): NodeIdString {
  return nodeId.toString() as NodeIdString;
}

function decodeNodeIdString(nodeIdString: unknown): NodeId | undefined {
  if (typeof nodeIdString !== 'string') {
    return;
  }
  const nodeId = IdInternal.fromString<NodeId>(nodeIdString);
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
    randomSource: keysUtilsRandom.getRandomBytes,
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

function parseVaultId(data: any): VaultId {
  data = decodeVaultId(data);
  if (data == null) {
    throw new validationErrors.ErrorParse(
      'Vault ID must be multibase base58btc encoded strings',
    );
  }
  return data;
}

function createVaultIdGenerator(): () => VaultId {
  const generator = new IdRandom<VaultId>({
    randomSource: keysUtilsRandom.getRandomBytes,
  });
  return () => generator.get();
}

function encodeVaultId(vaultId: VaultId): VaultIdEncoded {
  return vaultId.toMultibase('base58btc') as VaultIdEncoded;
}

function decodeVaultId(vaultIdEncoded: unknown): VaultId | undefined {
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
    randomSource: keysUtilsRandom.getRandomBytes,
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
function decodeTaskId(taskIdEncoded: unknown): TaskId | undefined {
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

function parseClaimId(data: any): ClaimId {
  data = decodeClaimId(data);
  if (data == null) {
    throw new validationErrors.ErrorParse(
      'Claim ID must be multibase base32hex encoded strings',
    );
  }
  return data;
}

/**
 * Generator for `ClaimId`
 * Make sure the `nodeId` is set to this node's own `NodeId`
 */
function createClaimIdGenerator(nodeId: NodeId, lastClaimId?: ClaimId) {
  const generator = new IdSortable<ClaimId>({
    nodeId,
    lastId: lastClaimId,
    randomSource: keysUtilsRandom.getRandomBytes,
  });
  return () => generator.get();
}

function encodeClaimId(claimId: ClaimId): ClaimIdEncoded {
  return claimId.toMultibase('base32hex') as ClaimIdEncoded;
}

function decodeClaimId(claimIdEncoded: unknown): ClaimId | undefined {
  if (typeof claimIdEncoded !== 'string') {
    return;
  }
  const claimId = IdInternal.fromMultibase<ClaimId>(claimIdEncoded);
  if (claimId == null) {
    return;
  }
  return claimId;
}

function parseProviderId(data: any): ProviderId {
  if (typeof data !== 'string') {
    throw new validationErrors.ErrorParse('Provider ID must be a string');
  }
  if (data.length < 1) {
    throw new validationErrors.ErrorParse(
      'Provider ID length must be greater than 0',
    );
  }
  return data as ProviderId;
}

function parseIdentityId(data: any): IdentityId {
  if (typeof data !== 'string') {
    throw new validationErrors.ErrorParse('Provider ID must be a string');
  }
  if (data.length < 1) {
    throw new validationErrors.ErrorParse(
      'Identity ID length must be greater than 0',
    );
  }
  return data as IdentityId;
}

function encodeProviderIdentityId(
  providerIdentityId: ProviderIdentityId,
): ProviderIdentityIdEncoded {
  return JSON.stringify(providerIdentityId) as ProviderIdentityIdEncoded;
}

function decodeProviderIdentityId(
  providerIdentityIdEncoded: unknown,
): ProviderIdentityId | undefined {
  if (typeof providerIdentityIdEncoded !== 'string') {
    return;
  }
  let providerIdentityId: unknown;
  try {
    providerIdentityId = JSON.parse(providerIdentityIdEncoded);
  } catch {
    return;
  }
  if (
    !Array.isArray(providerIdentityId) ||
    providerIdentityId.length !== 2 ||
    typeof providerIdentityId[0] !== 'string' ||
    typeof providerIdentityId[1] !== 'string'
  ) {
    return;
  }
  return providerIdentityId as ProviderIdentityId;
}

function parseGestaltId(data: any): GestaltId {
  if (typeof data !== 'string') {
    throw new validationErrors.ErrorParse('Gestalt ID must be string');
  }
  const nodeId = decodeNodeId(data);
  if (nodeId != null) {
    return ['node', nodeId];
  }
  const match = (data as string).match(/^(.+):(.+)$/);
  if (match == null) {
    throw new validationErrors.ErrorParse(
      'Gestalt ID must be either a Node ID or `Provider ID:Identity ID`',
    );
  }
  const providerId = parseProviderId(match[1]);
  const identityId = parseIdentityId(match[2]);
  return ['identity', [providerId, identityId]];
}

function parseGestaltIdentityId(data: any): ['identity', ProviderIdentityId] {
  if (typeof data !== 'string') {
    throw new validationErrors.ErrorParse('Gestalt identity ID must be string');
  }
  const match = (data as string).match(/^(.+):(.+)$/);
  if (match == null) {
    throw new validationErrors.ErrorParse(
      'Gestalt identity ID must be `Provider ID:Identity ID`',
    );
  }
  const providerId = parseProviderId(match[1]);
  const identityId = parseIdentityId(match[2]);
  return ['identity', [providerId, identityId]];
}

function encodeGestaltId(gestaltId: GestaltId): GestaltIdEncoded {
  switch (gestaltId[0]) {
    case 'node':
      return encodeGestaltNodeId(gestaltId);
    case 'identity':
      return encodeGestaltIdentityId(gestaltId);
  }
}

function encodeGestaltNodeId(
  gestaltNodeId: ['node', NodeId],
): GestaltIdEncoded {
  return (gestaltNodeId[0] +
    '-' +
    encodeNodeId(gestaltNodeId[1])) as GestaltIdEncoded;
}

function encodeGestaltIdentityId(
  gestaltIdentityId: ['identity', ProviderIdentityId],
): GestaltIdEncoded {
  return (gestaltIdentityId[0] +
    '-' +
    encodeProviderIdentityId(gestaltIdentityId[1])) as GestaltIdEncoded;
}

function decodeGestaltId(gestaltIdEncoded: unknown): GestaltId | undefined {
  if (typeof gestaltIdEncoded !== 'string') {
    return;
  }
  switch (gestaltIdEncoded[0]) {
    case 'n':
      return decodeGestaltNodeId(gestaltIdEncoded);
    case 'i':
      return decodeGestaltIdentityId(gestaltIdEncoded);
  }
}

function decodeGestaltNodeId(
  gestaltNodeIdEncoded: unknown,
): ['node', NodeId] | undefined {
  if (typeof gestaltNodeIdEncoded !== 'string') {
    return;
  }
  if (!gestaltNodeIdEncoded.startsWith('node-')) {
    return;
  }
  const nodeIdEncoded = gestaltNodeIdEncoded.slice(5);
  const nodeId = decodeNodeId(nodeIdEncoded);
  if (nodeId == null) {
    return;
  }
  return ['node', nodeId];
}

function decodeGestaltIdentityId(
  gestaltIdentityId: unknown,
): ['identity', ProviderIdentityId] | undefined {
  if (typeof gestaltIdentityId !== 'string') {
    return;
  }
  if (!gestaltIdentityId.startsWith('identity-')) {
    return;
  }
  const providerIdentityIdEncoded = gestaltIdentityId.slice(9);
  const providerIdentityId = decodeProviderIdentityId(
    providerIdentityIdEncoded,
  );
  if (providerIdentityId == null) {
    return;
  }
  return ['identity', providerIdentityId];
}

function createGestaltLinkIdGenerator() {
  const generator = new IdRandom<GestaltLinkId>({
    randomSource: keysUtilsRandom.getRandomBytes,
  });
  return () => generator.get();
}

function createNotificationIdGenerator(
  lastId?: NotificationId,
): () => NotificationId {
  const generator = new IdSortable<NotificationId>({
    lastId,
    randomSource: keysUtilsRandom.getRandomBytes,
  });
  return () => generator.get();
}

function encodeNotificationId(
  notificationId: NotificationId,
): NotificationIdEncoded {
  return notificationId.toMultibase('base32hex') as NotificationIdEncoded;
}

function decodeNotificationId(
  notificationIdEncoded: string,
): NotificationId | undefined {
  const notificationId = IdInternal.fromMultibase<NotificationId>(
    notificationIdEncoded,
  );
  if (notificationId == null) {
    return;
  }
  return notificationId;
}

/**
 * Generates a NotificationId from an epoch timestamp.
 *
 * @param epoch
 * @param randomSource
 */
const generateNotificationIdFromTimestamp =
  generateSortableIdFromTimestamp<NotificationId>;

export {
  createPermIdGenerator,
  createAuditEventIdGenerator,
  generateAuditEventIdFromTimestamp,
  encodeAuditEventId,
  decodeAuditEventId,
  createNodeIdGenerator,
  isNodeId,
  assertNodeId,
  generateNodeId,
  parseNodeId,
  encodeNodeId,
  decodeNodeId,
  encodeNodeIdString,
  decodeNodeIdString,
  createCertIdGenerator,
  encodeCertId,
  decodeCertId,
  createVaultIdGenerator,
  parseVaultId,
  encodeVaultId,
  decodeVaultId,
  createTaskIdGenerator,
  encodeTaskId,
  decodeTaskId,
  parseClaimId,
  createClaimIdGenerator,
  encodeClaimId,
  decodeClaimId,
  parseProviderId,
  parseIdentityId,
  encodeProviderIdentityId,
  decodeProviderIdentityId,
  parseGestaltId,
  parseGestaltIdentityId,
  encodeGestaltId,
  encodeGestaltNodeId,
  encodeGestaltIdentityId,
  decodeGestaltId,
  decodeGestaltNodeId,
  decodeGestaltIdentityId,
  createGestaltLinkIdGenerator,
  createNotificationIdGenerator,
  encodeNotificationId,
  decodeNotificationId,
  generateNotificationIdFromTimestamp,
};

export * from './types';
