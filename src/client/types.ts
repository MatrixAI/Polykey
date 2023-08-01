import type { JSONValue, ObjectEmpty } from '../types';

// Prevent overwriting the metadata type with `Omit<>`
type ClientRPCRequestParams<T extends Record<string, JSONValue> = ObjectEmpty> =
  {
    metadata?: {
      [Key: string]: JSONValue;
    } & Partial<{
      authorization: string;
      timeout: number;
    }>;
  } & Omit<T, 'metadata'>;

// Prevent overwriting the metadata type with `Omit<>`
type ClientRPCResponseResult<
  T extends Record<string, JSONValue> = ObjectEmpty,
> = {
  metadata?: {
    [Key: string]: JSONValue;
  } & Partial<{
    authorization: string;
    timeout: number;
  }>;
} & Omit<T, 'metadata'>;

export type { ClientRPCRequestParams, ClientRPCResponseResult };
