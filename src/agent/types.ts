import type { JSONValue, ObjectEmpty } from '../types';

// Prevent overwriting the metadata type with `Omit<>`
type AgentRPCRequestParams<T extends Record<string, JSONValue> = ObjectEmpty> =
  {
    metadata?: {
      [Key: string]: JSONValue;
    } & Partial<{
      authorization: string;
      timeout: number;
    }>;
  } & Omit<T, 'metadata'>;

// Prevent overwriting the metadata type with `Omit<>`
type AgentRPCResponseResult<T extends Record<string, JSONValue> = ObjectEmpty> =
  {
    metadata?: {
      [Key: string]: JSONValue;
    } & Partial<{
      authorization: string;
      timeout: number;
    }>;
  } & Omit<T, 'metadata'>;

export type { AgentRPCRequestParams, AgentRPCResponseResult };
