import type { JSONValue } from '../types';

// eslint-disable-next-line
type NoData = {};

// Prevent overwriting the metadata type with `Omit<>`
type AgentRPCRequestParams<T extends Record<string, JSONValue> = NoData> = {
  metadata?: {
    [Key: string]: JSONValue;
  } & Partial<{
    authorization: string;
    timeout: number;
  }>;
} & Omit<T, 'metadata'>;

// Prevent overwriting the metadata type with `Omit<>`
type AgentRPCResponseResult<T extends Record<string, JSONValue> = NoData> = {
  metadata?: {
    [Key: string]: JSONValue;
  } & Partial<{
    authorization: string;
    timeout: number;
  }>;
} & Omit<T, 'metadata'>;

export type { AgentRPCRequestParams, AgentRPCResponseResult, NoData };
