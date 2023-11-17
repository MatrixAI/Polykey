import type { Key } from '@/keys/types';
import type { ConnectionData, Host, Port } from '@/network/types';
import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import Audit from '@/audit/Audit';
import * as utils from '@/utils';
import * as auditErrors from '@/audit/errors';
import * as keysUtils from '@/keys/utils';
import * as nodeEvents from '@/nodes/events';
import * as nodeUtils from '@/nodes/utils';
import * as ids from '@/ids';
import * as testNodesUtils from '../nodes/utils';

describe(Audit.name, () => {
  const logger = new Logger(`${Audit.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);

  let dataDir: string;
  let db: DB;
  let mockNodeConnectionManager: NodeConnectionManager;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const dbKey = keysUtils.generateKey();
    const dbPath = `${dataDir}/db`;
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: dbKey,
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(plainText),
            );
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(cipherText),
            );
          },
        },
      },
    });
    mockNodeConnectionManager = new EventTarget() as NodeConnectionManager;
  });
  afterEach(async () => {
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('audit readiness', async () => {
    const audit = await Audit.createAudit({
      db,
      nodeConnectionManager: new EventTarget() as any,
      logger,
    });
    await expect(async () => {
      await audit.destroy();
    }).rejects.toThrow(auditErrors.ErrorAuditRunning);
    // Should be a noop
    await audit.start();
    await audit.stop();
    await audit.destroy();
    await expect(async () => {
      await audit.start();
    }).rejects.toThrow(auditErrors.ErrorAuditDestroyed);
    await expect(audit.getLastAuditEventId()).rejects.toThrow(
      auditErrors.ErrorAuditNotRunning,
    );
    await expect(audit.getAuditMetric(['node', 'connection'])).rejects.toThrow(
      auditErrors.ErrorAuditNotRunning,
    );
  });
  // Test('long running', async () => {
  //   const nodeId = testNodesUtils.generateRandomNodeId();
  //   const audit = await Audit.createAudit({
  //     db,
  //     nodeConnectionManager: mockNodeConnectionManager,
  //     logger,
  //   });
  //   const eventDetail: ConnectionData = {
  //     remoteHost: '::' as Host,
  //     remoteNodeId: nodeId,
  //     remotePort: 0 as Port,
  //   };
  //   const auditEventData = {
  //     ...eventDetail,
  //     remoteNodeId: nodeUtils.encodeNodeId(eventDetail.remoteNodeId),
  //   };
  //   // @ts-ignore: kidnap protected
  //   const handlerMap = audit.eventHandlerMap;
  //   await handlerMap
  //     .get(nodeEvents.EventNodeConnectionManagerConnectionReverse)
  //     ?.handler(
  //       new nodeEvents.EventNodeConnectionManagerConnectionReverse({
  //         detail: eventDetail,
  //       }),
  //     );

  //   for await (const s of audit.getAuditEventsLongRunning(['node'])) {

  //   }
  //   await audit.stop();
  // });
  describe('AuditEvent', () => {
    test('node connection', async () => {
      const nodeId = testNodesUtils.generateRandomNodeId();
      const audit = await Audit.createAudit({
        db,
        nodeConnectionManager: mockNodeConnectionManager,
        logger,
      });
      const eventDetail: ConnectionData = {
        remoteHost: '::' as Host,
        remoteNodeId: nodeId,
        remotePort: 0 as Port,
      };
      const auditEventData = {
        ...eventDetail,
        remoteNodeId: nodeUtils.encodeNodeId(eventDetail.remoteNodeId),
      };
      // @ts-ignore: kidnap protected
      const handlerMap = audit.eventHandlerMap;
      await handlerMap
        .get(nodeEvents.EventNodeConnectionManagerConnectionReverse)
        ?.handler(
          new nodeEvents.EventNodeConnectionManagerConnectionReverse({
            detail: eventDetail,
          }),
        );
      await handlerMap
        .get(nodeEvents.EventNodeConnectionManagerConnectionForward)
        ?.handler(
          new nodeEvents.EventNodeConnectionManagerConnectionForward({
            detail: eventDetail,
          }),
        );
      let iterator = audit.getAuditEvents(['node', 'connection']);
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'forward',
        },
      );
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'reverse',
        },
      );
      iterator = audit.getAuditEvents(['node', 'connection', 'forward']);
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'forward',
        },
      );
      iterator = audit.getAuditEvents(['node', 'connection', 'reverse']);
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'reverse',
        },
      );
      await audit.stop();
    });
  });
  describe('AuditMetric', () => {
    test('node connection', async () => {
      const audit = await Audit.createAudit({
        db,
        nodeConnectionManager: mockNodeConnectionManager,
        logger,
      });
      const nodeId = testNodesUtils.generateRandomNodeId();
      const auditEventData = {
        remoteHost: '::',
        remoteNodeId: nodeUtils.encodeNodeId(nodeId),
        remotePort: 0,
      };
      const date = Date.now();
      const date1MinuteAgo = date - 60_000;
      const date1HourAgo = date - 60 * 60_000;
      const date1DayAgo = date - 24 * 60 * 60_000;
      const date1MonthAgo = date - 30 * 24 * 60 * 60_000;
      const dates = [
        date,
        date1MinuteAgo,
        date1HourAgo,
        date1DayAgo,
        date1MonthAgo,
      ];
      for (const iterDate of dates) {
        // @ts-ignore: kidnap protected
        await audit.setAuditEvent(['node', 'connection', 'reverse'], {
          id: ids.generateAuditEventIdFromEpoch(iterDate),
          data: {
            ...auditEventData,
            type: 'reverse',
          },
        });
      }
      for (const iterDate of dates) {
        // @ts-ignore: kidnap protected
        await audit.setAuditEvent(['node', 'connection', 'forward'], {
          id: ids.generateAuditEventIdFromEpoch(iterDate),
          data: {
            ...auditEventData,
            type: 'forward',
          },
        });
      }
      // Range from first element to now
      await expect(
        audit
          .getAuditMetric(['node', 'connection', 'inbound'])
          .then((e) => e.data),
      ).resolves.toEqual({
        total: dates.length,
        averagePerDay: dates.length / 30,
        averagePerHour: dates.length / (30 * 24),
        averagePerMinute: dates.length / (30 * 24 * 60),
      });
      await expect(
        audit
          .getAuditMetric(['node', 'connection', 'outbound'])
          .then((e) => e.data),
      ).resolves.toEqual({
        total: dates.length,
        averagePerDay: dates.length / 30,
        averagePerHour: dates.length / (30 * 24),
        averagePerMinute: dates.length / (30 * 24 * 60),
      });
      await expect(
        audit.getAuditMetric(['node', 'connection']).then((e) => e.data),
      ).resolves.toEqual({
        total: dates.length * 2,
        averagePerDay: (dates.length * 2) / 30,
        averagePerHour: (dates.length * 2) / (30 * 24),
        averagePerMinute: (dates.length * 2) / (30 * 24 * 60),
      });
      // Range from day to now
      await expect(
        audit
          .getAuditMetric(['node', 'connection', 'inbound'], {
            from: date1DayAgo,
          })
          .then((e) => e.data),
      ).resolves.toEqual({
        total: dates.length - 1,
        averagePerDay: dates.length - 1,
        averagePerHour: (dates.length - 1) / 24,
        averagePerMinute: (dates.length - 1) / (24 * 60),
      });
      // Range from first element to minute
      await expect(
        audit
          .getAuditMetric(['node', 'connection', 'inbound'], {
            to: date1MinuteAgo,
          })
          .then((e) => e.data),
      ).resolves.toEqual({
        total: dates.length - 1,
        averagePerDay: (dates.length - 1) / 30,
        averagePerHour: (dates.length - 1) / (30 * 24),
        averagePerMinute: (dates.length - 1) / (60 * 30 * 24 - 1),
      });
      await audit.stop();
    });
  });
});
