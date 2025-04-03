import type { ReadableStream } from 'stream/web';
import type { HandlerTypes } from '@matrixai/rpc';
import type { ContextTimedInput } from '@matrixai/contexts';
import type { AuditEventIdEncoded } from '../../ids/index.js';
import type {
  AuditEventToAuditEventSerialized,
  TopicSubPath,
  TopicSubPathToAuditEvent,
} from '../../audit/types.js';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
} from '../types.js';
import type AuditEventsGet from '../handlers/AuditEventsGet.js';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<AuditEventsGet>;

type AuditEventsGetTypeOverride = <T extends Array<TopicSubPath>>(
  input: ClientRPCRequestParams<{
    seek?: AuditEventIdEncoded | number;
    seekEnd?: AuditEventIdEncoded | number;
    order?: 'asc' | 'desc';
    limit?: number;
    awaitFutureEvents?: boolean;
  }> & {
    paths: T;
  },
  ctx?: Partial<ContextTimedInput>,
) => Promise<
  ReadableStream<
    ClientRPCResponseResult<
      AuditEventToAuditEventSerialized<TopicSubPathToAuditEvent<T[number]>>
    >
  >
>;

const auditEventsGet = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default auditEventsGet;

export type { AuditEventsGetTypeOverride };
