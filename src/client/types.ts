import type { JSONValue } from '../types';

// eslint-disable-next-line
type NoData = {};

// Prevent overwriting the metadata type with `Omit<>`
type ClientRPCRequestParams<T extends Record<string, JSONValue> = NoData> = {
  metadata?: {
    [Key: string]: JSONValue;
  } & Partial<{
    authorization: string;
    timeout: number;
  }>;
} & Omit<T, 'metadata'>;

// Prevent overwriting the metadata type with `Omit<>`
type ClientRPCResponseResult<T extends Record<string, JSONValue> = NoData> = {
  metadata?: {
    [Key: string]: JSONValue;
  } & Partial<{
    authorization: string;
    timeout: number;
  }>;
} & Omit<T, 'metadata'>;

export type { ClientRPCRequestParams, ClientRPCResponseResult, NoData };
