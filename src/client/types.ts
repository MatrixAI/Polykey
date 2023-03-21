import type { JSONValue } from '../types';

// eslint-disable-next-line
type NoData = {};

type ClientRPCRequestParams<T extends Record<string, JSONValue> = NoData> = {
  metadata?: {
    [Key: string]: JSONValue;
  } & Partial<{ authorization: string }>;
} & Omit<T, 'metadata'>;

type ClientRPCResponseResult<T extends Record<string, JSONValue> = NoData> = {
  metadata?: {
    [Key: string]: JSONValue;
  } & Partial<{ authorization: string }>;
} & Omit<T, 'metadata'>;

export type { ClientRPCRequestParams, ClientRPCResponseResult, NoData };
