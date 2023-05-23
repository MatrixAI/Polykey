import type { JSONValue } from '../types';

// eslint-disable-next-line
type NoData = {};

type AgentRPCRequestParams<T extends Record<string, JSONValue> = NoData> = {
  metadata?: {
    [Key: string]: JSONValue;
  } & Partial<{
    authorization: string;
    timeout: number;
  }>;
} & Omit<T, 'metadata'>;

type AgentRPCResponseResult<T extends Record<string, JSONValue> = NoData> = {
  metadata?: {
    [Key: string]: JSONValue;
  } & Partial<{
    authorization: string;
    timeout: number;
  }>;
} & Omit<T, 'metadata'>;

export type { AgentRPCRequestParams, AgentRPCResponseResult, NoData };
