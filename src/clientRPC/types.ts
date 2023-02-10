import type { JSONValue } from '../types';

// eslint-disable-next-line
type NoData = {};

type WithMetadata<T extends Record<string, JSONValue> = NoData> = {
  metadata?: {
    [Key: string]: JSONValue;
  } & Partial<{ Authorization: string }>;
} & Omit<T, 'metadata'>;

export type { WithMetadata, NoData };
