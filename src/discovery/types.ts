import type { Opaque } from '../types';
import type { Id } from '../GenericIdTypes';

/**
 * Used to preserve order in the Discovery Queue.
 */
type DiscoveryQueueId = Opaque<'DiscoveryQueueId', Id>;

type DiscoveryQueueIdGenerator = () => DiscoveryQueueId;

export type { DiscoveryQueueId, DiscoveryQueueIdGenerator };
