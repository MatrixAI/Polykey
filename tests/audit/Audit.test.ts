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
import * as auditEvents from '@/audit/events';
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
      discovery: new EventTarget() as any,
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
  test('audit cleanup', async () => {
    const nodeId = testNodesUtils.generateRandomNodeId();
    const audit = await Audit.createAudit({
      db,
      nodeConnectionManager: new EventTarget() as any,
      discovery: new EventTarget() as any,
      logger,
    });
    // @ts-ignore: kidnap protected
    const handlerMap = audit.eventHandlerMap;
    const eventDetail: ConnectionData = {
      remoteHost: '::' as Host,
      remoteNodeId: nodeId,
      remotePort: 0 as Port,
    };
    await handlerMap
      .get(nodeEvents.EventNodeConnectionManagerConnectionReverse)
      ?.handler(
        new nodeEvents.EventNodeConnectionManagerConnectionReverse({
          detail: eventDetail,
        }),
      );
    // Audit is able to stop when iterator is exhausted
    let iterator = audit.getAuditEvents(['node', 'connection', 'reverse']);
    await iterator.next();
    await iterator.next();
    await audit.stop({ force: false });
    await audit.start();
    // Audit is able to stop when iterator is not exhausted
    await audit.start();
    iterator = audit.getAuditEvents(['node', 'connection', 'reverse']);
    await iterator.next();
    await audit.stop({ force: true });
    await audit.start();
    iterator = audit.getAuditEventsLongRunning([
      'node',
      'connection',
      'reverse',
    ]);
    await iterator.next();
    await audit.stop({ force: true });
    await expect(iterator.next()).rejects.toBeInstanceOf(
      auditErrors.ErrorAuditNotRunning,
    );
  });
  describe('AuditEvent', () => {
    test('event dispatch', async () => {
      const nodeId = testNodesUtils.generateRandomNodeId();
      const audit = await Audit.createAudit({
        db,
        nodeConnectionManager: mockNodeConnectionManager,
        discovery: new EventTarget() as any,
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

      const { p: eventP, resolveP: resolveEventP } = utils.promise();
      audit.addEventListener(auditEvents.EventAuditAuditEventSet.name, () =>
        resolveEventP(),
      );

      // @ts-ignore: kidnap protected
      const handlerMap = audit.eventHandlerMap;
      void handlerMap
        .get(nodeEvents.EventNodeConnectionManagerConnectionReverse)
        ?.handler(
          new nodeEvents.EventNodeConnectionManagerConnectionReverse({
            detail: eventDetail,
          }),
        );
      await eventP;
      const iterator = audit.getAuditEvents(['node']);
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'reverse',
        },
      );
    });
    test('order', async () => {
      const nodeId = testNodesUtils.generateRandomNodeId();
      const audit = await Audit.createAudit({
        db,
        nodeConnectionManager: mockNodeConnectionManager,
        discovery: new EventTarget() as any,
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
          type: 'reverse',
        },
      );
      iterator = audit.getAuditEvents(['node', 'connection'], {
        order: 'desc',
      });
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'forward',
        },
      );
      await audit.stop();
    });
    test('limit', async () => {
      const nodeId = testNodesUtils.generateRandomNodeId();
      const audit = await Audit.createAudit({
        db,
        nodeConnectionManager: mockNodeConnectionManager,
        discovery: new EventTarget() as any,
        logger,
      });
      const eventDetail: ConnectionData = {
        remoteHost: '::' as Host,
        remoteNodeId: nodeId,
        remotePort: 0 as Port,
      };
      // @ts-ignore: kidnap protected
      const handlerMap = audit.eventHandlerMap;
      for (let i = 0; i < 10; i++) {
        await handlerMap
          .get(nodeEvents.EventNodeConnectionManagerConnectionReverse)
          ?.handler(
            new nodeEvents.EventNodeConnectionManagerConnectionReverse({
              detail: eventDetail,
            }),
          );
      }
      const limit = 5;
      let count = 0;
      for await (const _ of audit.getAuditEvents(
        ['node', 'connection', 'reverse'],
        { limit },
      )) {
        count++;
      }
      expect(count).toBe(limit);
      await audit.stop();
    });
    test('metadata', async () => {
      const nodeId = testNodesUtils.generateRandomNodeId();
      const audit = await Audit.createAudit({
        db,
        nodeConnectionManager: mockNodeConnectionManager,
        discovery: new EventTarget() as any,
        logger,
      });
      const eventDetail: ConnectionData = {
        remoteHost: '::' as Host,
        remoteNodeId: nodeId,
        remotePort: 0 as Port,
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
      const topicPath = ['node', 'connection', 'reverse'] as const;
      for await (const event of audit.getAuditEvents(topicPath)) {
        expect(event.id).toBeInstanceOf(Uint8Array);
        expect(event.path).toEqual(topicPath);
      }
      for await (const event of audit.getAuditEvents([])) {
        expect(event.id).toBeInstanceOf(Uint8Array);
        expect(event.path).toEqual(topicPath);
      }
      await audit.stop();
    });
    test('topic nesting', async () => {
      const nodeId = testNodesUtils.generateRandomNodeId();
      const audit = await Audit.createAudit({
        db,
        nodeConnectionManager: mockNodeConnectionManager,
        discovery: new EventTarget() as any,
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
      const auditEvent = audit.eventHandlerMap;
      await auditEvent
        .get(nodeEvents.EventNodeConnectionManagerConnectionReverse)
        ?.handler(
          new nodeEvents.EventNodeConnectionManagerConnectionReverse({
            detail: eventDetail,
          }),
        );
      await auditEvent
        .get(nodeEvents.EventNodeConnectionManagerConnectionForward)
        ?.handler(
          new nodeEvents.EventNodeConnectionManagerConnectionForward({
            detail: eventDetail,
          }),
        );
      let iterator: AsyncGenerator<any, any, any> = audit.getAuditEvents([
        'node',
        'connection',
      ]);
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'reverse',
        },
      );
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'forward',
        },
      );
      iterator = audit.getAuditEvents(['node']);
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'reverse',
        },
      );
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'forward',
        },
      );
      iterator = audit.getAuditEvents([]);
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'reverse',
        },
      );
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'forward',
        },
      );
      await audit.stop();
    });
    test('long running', async () => {
      const nodeId = testNodesUtils.generateRandomNodeId();
      const audit = await Audit.createAudit({
        db,
        nodeConnectionManager: mockNodeConnectionManager,
        discovery: new EventTarget() as any,
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
      const handleEvent = async (evt) => {
        await handlerMap.get(evt.constructor)!.handler(evt);
      };
      const streamP = (async () => {
        const iterator = audit.getAuditEventsLongRunning(['node']);
        let count = 0;
        for await (const result of iterator) {
          expect(result.data).toEqual({
            ...auditEventData,
            type: 'reverse',
          });
          if (++count === 3) break;
        }
      })();
      const eventsP = (async () => {
        await handleEvent(
          new nodeEvents.EventNodeConnectionManagerConnectionReverse({
            detail: eventDetail,
          }),
        );
        await handleEvent(
          new nodeEvents.EventNodeConnectionManagerConnectionReverse({
            detail: eventDetail,
          }),
        );
        await handleEvent(
          new nodeEvents.EventNodeConnectionManagerConnectionReverse({
            detail: eventDetail,
          }),
        );
      })();

      await Promise.all([eventsP, streamP]);

      await audit.stop();
    });
    test('long running with limit', async () => {
      const nodeId = testNodesUtils.generateRandomNodeId();
      const audit = await Audit.createAudit({
        db,
        nodeConnectionManager: mockNodeConnectionManager,
        discovery: new EventTarget() as any,
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
      let iterator = audit.getAuditEventsLongRunning(['node'], { limit: 1 });
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
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'reverse',
        },
      );
      await expect(iterator.next().then((e) => e.done)).resolves.toBe(true);
      iterator = audit.getAuditEventsLongRunning(['node'], { limit: 3 });
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'reverse',
        },
      );
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'forward',
        },
      );
      await handlerMap
        .get(nodeEvents.EventNodeConnectionManagerConnectionReverse)
        ?.handler(
          new nodeEvents.EventNodeConnectionManagerConnectionReverse({
            detail: eventDetail,
          }),
        );
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'reverse',
        },
      );
      await expect(iterator.next().then((e) => e.done)).resolves.toBe(true);
      await audit.stop();
    });
    test('long running with seekEnd', async () => {
      const nodeId = testNodesUtils.generateRandomNodeId();
      const audit = await Audit.createAudit({
        db,
        nodeConnectionManager: mockNodeConnectionManager,
        discovery: new EventTarget() as any,
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
      const date = Date.now();
      // @ts-ignore: kidnap protected
      await audit.setAuditEvent(['node', 'connection', 'forward'], {
        id: ids.generateAuditEventIdFromTimestamp(date),
        path: ['node', 'connection', 'forward'],
        data: {
          ...auditEventData,
          type: 'forward',
        },
      });
      let iterator = audit.getAuditEventsLongRunning(['node'], {
        seekEnd: date - 10,
      });
      await expect(iterator.next().then((e) => e.done)).resolves.toBe(true);
      iterator = audit.getAuditEventsLongRunning(['node'], {
        seekEnd: date,
      });
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'forward',
        },
      );
      // Need to do this to bump the promise
      // @ts-ignore: kidnap protected
      await audit.setAuditEvent(['node', 'connection', 'forward'], {
        id: ids.generateAuditEventIdFromTimestamp(date + 10),
        path: ['node', 'connection', 'forward'],
        data: {
          ...auditEventData,
          type: 'forward',
        },
      });
      await expect(iterator.next().then((e) => e.done)).resolves.toBe(true);
      await audit.stop();
    });
    test('node connection topic', async () => {
      const nodeId = testNodesUtils.generateRandomNodeId();
      const audit = await Audit.createAudit({
        db,
        nodeConnectionManager: mockNodeConnectionManager,
        discovery: new EventTarget() as any,
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
      let iterator: AsyncGenerator<any, any, any> = audit.getAuditEvents([
        'node',
        'connection',
      ]);
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'reverse',
        },
      );
      await expect(iterator.next().then((e) => e.value!.data)).resolves.toEqual(
        {
          ...auditEventData,
          type: 'forward',
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
        discovery: new EventTarget() as any,
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
          id: ids.generateAuditEventIdFromTimestamp(iterDate),
          path: ['node', 'connection', 'reverse'],
          data: {
            ...auditEventData,
            type: 'reverse',
          },
        });
      }
      for (const iterDate of dates) {
        // @ts-ignore: kidnap protected
        await audit.setAuditEvent(['node', 'connection', 'forward'], {
          id: ids.generateAuditEventIdFromTimestamp(iterDate),
          path: ['node', 'connection', 'forward'],
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
            seek: date1DayAgo,
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
            seekEnd: date1MinuteAgo,
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
