import type { DB, DBTransaction, LevelPath } from '@matrixai/db';
import type {
  TopicSubPath,
  TopicPath,
  TopicSubPathToAuditEvent,
  MetricPath,
  MetricPathToAuditMetric,
  AuditMetricNodeConnection,
  AuditEventToAuditEventDB,
} from './types';
import type { AuditEventId } from '../ids/types';
import type NodeConnectionManager from '../nodes/NodeConnectionManager';
import type { AbstractEvent } from '@matrixai/events';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as sortableIdUtils from '@matrixai/id/dist/IdSortable';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import * as auditErrors from './errors';
import * as auditEvents from './events';
import * as auditUtils from './utils';
import * as nodesEvents from '../nodes/events';
import * as ids from '../ids';
import * as utils from '../utils';

interface Audit extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new auditErrors.ErrorAuditRunning(),
  new auditErrors.ErrorAuditDestroyed(),
  {
    eventStart: auditEvents.EventAuditStart,
    eventStarted: auditEvents.EventAuditStarted,
    eventStop: auditEvents.EventAuditStop,
    eventStopped: auditEvents.EventAuditStopped,
    eventDestroy: auditEvents.EventAuditDestroy,
    eventDestroyed: auditEvents.EventAuditDestroyed,
  },
)
class Audit {
  static async createAudit({
    db,
    nodeConnectionManager,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    nodeConnectionManager: NodeConnectionManager;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<Audit> {
    logger.info(`Creating ${this.name}`);
    const audit = new this({ db, nodeConnectionManager, logger });
    await audit.start({ fresh });
    logger.info(`Created ${this.name}`);
    return audit;
  }

  protected logger: Logger;
  protected db: DB;
  protected nodeConnectionManager: NodeConnectionManager;

  protected eventHandlerMap: Map<
    typeof AbstractEvent,
    {
      target: EventTarget;
      handler: (evt: AbstractEvent<unknown>) => Promise<void>;
    }
  > = new Map();
  protected taskPromises: Set<PromiseCancellable<void>> = new Set();
  protected auditDbPath: LevelPath = [this.constructor.name];
  protected dbLastAuditEventIdPath: LevelPath = [
    this.constructor.name,
    'lastAuditEventId',
  ];
  protected auditEventDbPath: LevelPath = [this.constructor.name, 'event'];
  protected auditTopicDbPath: LevelPath = [this.constructor.name, 'topic'];
  protected generateAuditEventId: () => AuditEventId;

  constructor({
    db,
    nodeConnectionManager,
    logger,
  }: {
    db: DB;
    nodeConnectionManager: NodeConnectionManager;
    logger: Logger;
  }) {
    this.logger = logger;
    this.nodeConnectionManager = nodeConnectionManager;
    this.db = db;
  }

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.auditDbPath);
    }
    const lastAuditEventId = await this.getLastAuditEventId();
    this.generateAuditEventId =
      auditUtils.createAuditEventIdGenerator(lastAuditEventId);
    // Setup event handlers
    this.setEventHandler(
      this.nodeConnectionManager,
      nodesEvents.EventNodeConnectionManagerConnectionForward,
      auditUtils.nodeConnectionForwardTopicPath,
      auditUtils.fromEventNodeConnectionManagerConnectionForward,
    );
    this.setEventHandler(
      this.nodeConnectionManager,
      nodesEvents.EventNodeConnectionManagerConnectionReverse,
      auditUtils.nodeConnectionReverseTopicPath,
      auditUtils.fromEventNodeConnectionManagerConnectionReverse,
    );
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop({ force = true }: { force?: boolean } = {}): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    for (const [eventConstructor, { target, handler }] of this
      .eventHandlerMap) {
      target.removeEventListener(eventConstructor.name, handler);
    }
    if (force) {
      for (const promise of this.taskPromises) {
        promise.cancel(new auditErrors.ErrorAuditNotRunning());
      }
    }
    await Promise.all([...this.taskPromises]).catch(() => {});
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.db.clear(this.auditDbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new auditErrors.ErrorAuditNotRunning(), false, ['starting'])
  public async getLastAuditEventId(
    tran?: DBTransaction,
  ): Promise<AuditEventId | undefined> {
    const lastAuditEventIdBuffer = await (tran ?? this.db).get(
      this.dbLastAuditEventIdPath,
      true,
    );
    if (lastAuditEventIdBuffer == null) return;
    return IdInternal.fromBuffer<AuditEventId>(lastAuditEventIdBuffer);
  }

  @ready(new auditErrors.ErrorAuditNotRunning(), false, ['starting'])
  protected setEventHandler<
    T extends typeof AbstractEvent,
    P extends TopicPath,
  >(
    target: EventTarget,
    event: T,
    topicPath: P,
    toAuditEvent: (
      evt: InstanceType<T>,
    ) =>
      | Promise<TopicSubPathToAuditEvent<P>['data']>
      | TopicSubPathToAuditEvent<P>['data'],
  ) {
    const handler = async (evt: InstanceType<T>) => {
      const eventData = await toAuditEvent(evt);
      await this.db.withTransactionF(async (tran) => {
        const auditEventId = this.generateAuditEventId();
        await this.setAuditEvent(
          topicPath,
          { id: auditEventId, data: eventData } as any,
          tran,
        );
      });
    };
    target.addEventListener(event.name, handler);
    this.eventHandlerMap.set(event, { target, handler: handler as any });
  }

  @ready(new auditErrors.ErrorAuditNotRunning())
  protected async setAuditEvent<T extends TopicPath>(
    topicPath: TopicPath,
    auditEvent: TopicSubPathToAuditEvent<T>,
    tran?: DBTransaction,
  ) {
    if (tran == null) {
      return await this.db.withTransactionF((tran) =>
        this.setAuditEvent(topicPath, auditEvent, tran),
      );
    }
    const clonedAuditEvent: AuditEventToAuditEventDB<
      TopicSubPathToAuditEvent<T>
    > = {
      ...auditEvent,
    };
    delete (clonedAuditEvent as any).id;
    const auditEventIdBuffer = auditEvent.id.toBuffer();
    await tran.put(
      [...this.auditEventDbPath, auditEventIdBuffer],
      clonedAuditEvent,
    );
    const subTopicArray: Array<string> = [];
    for (const topic of topicPath) {
      subTopicArray.push(topic);
      await tran.put(
        [...this.auditTopicDbPath, subTopicArray.join('.'), auditEventIdBuffer],
        true,
      );
    }
    tran.queueFinally(() => {
      this.dispatchEvent(
        new auditEvents.EventAuditAuditEventSet({
          detail: {
            topicPath,
            auditEvent,
          },
        }),
      );
    });
  }

  @ready(new auditErrors.ErrorAuditNotRunning())
  public async *getAuditEventsLongRunning<T extends TopicSubPath>(
    topicPath: T,
    {
      seek,
    }: {
      seek?: AuditEventId;
    } = {},
  ): AsyncGenerator<TopicSubPathToAuditEvent<T>> {
    let blockP: PromiseCancellable<void> | undefined;
    let resolveBlockP: (() => void) | undefined;
    let blockPSignal: AbortSignal | undefined;
    const handleEventAuditAuditEventSet = (
      evt: auditEvents.EventAuditAuditEventSet,
    ) => {
      let isSupTopic = true;
      for (let i = 0; i < topicPath.length; i++) {
        if (evt.detail.topicPath.at(i) !== topicPath[i]) {
          isSupTopic = false;
        }
      }
      if (isSupTopic) {
        resolveBlockP?.();
      }
    };
    try {
      let seekCursor = seek;
      let firstRunComplete = false;
      this.addEventListener(
        auditEvents.EventAuditAuditEventSet.name,
        handleEventAuditAuditEventSet,
      );
      while (true) {
        if (blockP != null) {
          this.taskPromises.delete(blockP);
        }
        blockP = new PromiseCancellable((resolveP, _, signal) => {
          resolveBlockP = resolveP;
          blockPSignal = signal;
        });
        this.taskPromises.add(blockP);

        const iterator = this.getAuditEvents(topicPath, {
          seek: seekCursor,
          order: 'asc',
        });
        let i = 0;
        for await (const auditEvent of iterator) {
          seekCursor = auditEvent.id;
          // Skip the first element if this is not the first run
          if (firstRunComplete && i === 0) {
            i++;
            blockPSignal?.throwIfAborted();
            continue;
          }
          yield auditEvent;
          i++;
          blockPSignal?.throwIfAborted();
        }
        firstRunComplete = true;
        await blockP;
      }
    } finally {
      this.removeEventListener(
        auditEvents.EventAuditAuditEventSet.name,
        handleEventAuditAuditEventSet,
      );
      resolveBlockP?.();
      if (blockP != null) {
        this.taskPromises.delete(blockP);
      }
    }
  }

  @ready(new auditErrors.ErrorAuditNotRunning())
  public async *getAuditEvents<T extends TopicSubPath>(
    topicPath: T,
    {
      seek,
      order = 'asc',
      limit,
    }: {
      seek?: AuditEventId;
      order?: 'asc' | 'desc';
      limit?: number;
    } = {},
    tran?: DBTransaction,
  ): AsyncGenerator<TopicSubPathToAuditEvent<T>> {
    if (tran == null) {
      const getEvents = (tran) =>
        this.getAuditEvents(
          topicPath,
          {
            seek,
            order,
            limit,
          },
          tran,
        );
      return yield* this.db.withTransactionG(async function* (tran) {
        return yield* getEvents(tran);
      });
    }

    let resolveFinishedP: (() => void) | undefined;
    let finishedPSignal: AbortSignal | undefined;
    const finishedP = new PromiseCancellable<void>((resolveP, _, signal) => {
      resolveFinishedP = resolveP;
      finishedPSignal = signal;
    });
    this.taskPromises.add(finishedP);
    try {
      if (topicPath.length === 0) {
        const iterator = tran.iterator<TopicSubPathToAuditEvent<T>>(
          this.auditEventDbPath,
          {
            keys: false,
            values: true,
            valueAsBuffer: false,
            reverse: order !== 'asc',
            limit,
          },
        );
        if (seek != null) {
          iterator.seek(seek.toBuffer());
        }
        for await (const [, auditEvent] of iterator) {
          yield auditEvent;
          finishedPSignal?.throwIfAborted();
        }
        return;
      }
      const iterator = tran.iterator<void>(
        [...this.auditTopicDbPath, topicPath.join('.')],
        {
          keyAsBuffer: true,
          keys: true,
          values: false,
          valueAsBuffer: false,
          reverse: order !== 'asc',
          limit,
        },
      );
      if (seek != null) {
        iterator.seek(seek.toBuffer());
      }
      for await (const [keyPath] of iterator) {
        const key = keyPath.at(-1)! as Buffer;
        const event = await tran.get<TopicSubPathToAuditEvent<T>>([
          ...this.auditEventDbPath,
          key,
        ]);
        if (event != null) {
          event.id = IdInternal.fromBuffer<AuditEventId>(key);
          yield event;
          finishedPSignal?.throwIfAborted();
        }
      }
    } finally {
      resolveFinishedP?.();
      this.taskPromises.delete(finishedP);
    }
  }

  @ready(new auditErrors.ErrorAuditNotRunning())
  public async getAuditMetric<T extends MetricPath>(
    metricPath: T,
    options: { from?: Date | number; to?: Date | number } = {},
    tran?: DBTransaction,
  ): Promise<MetricPathToAuditMetric<T>> {
    if (tran == null) {
      return await this.db.withTransactionF((tran) =>
        this.getAuditMetric(metricPath, options, tran),
      );
    }

    let fromEpoch =
      options.from instanceof Date ? options.from.getTime() : options.from;
    let toEpoch =
      options.to instanceof Date ? options.to.getTime() : options.to;

    let fromIdBuffer: Buffer | undefined;
    if (fromEpoch != null) {
      fromIdBuffer = ids
        .generateAuditEventIdFromEpoch(
          fromEpoch,
          (size) => new Uint8Array(size),
        )
        .toBuffer();
    }
    let toIdBuffer: Buffer | undefined;
    if (toEpoch != null) {
      toIdBuffer = ids
        .generateAuditEventIdFromEpoch(toEpoch, (size) =>
          new Uint8Array(size).fill(0xff),
        )
        .toBuffer();
    }

    if (metricPath[0] === 'node') {
      if (metricPath[1] === 'connection') {
        let path: readonly string[] = auditUtils.nodeConnectionMetricPath;
        if (metricPath[2] === 'inbound') {
          path = auditUtils.nodeConnectionReverseTopicPath;
        } else if (metricPath[2] === 'outbound') {
          path = auditUtils.nodeConnectionForwardTopicPath;
        }
        const metric: AuditMetricNodeConnection = {
          data: {
            total: 0,
            averagePerMinute: 0,
            averagePerHour: 0,
            averagePerDay: 0,
          },
        };
        let lastKey: Buffer | undefined;
        for await (const [keyPath] of tran.iterator(
          [...this.auditTopicDbPath, path.join('.')],
          {
            keyAsBuffer: true,
            keys: true,
            values: false,
            gte: fromIdBuffer,
            lte: toIdBuffer,
          },
        )) {
          const key = keyPath.at(-1)! as Buffer;
          if (metric.data.total === 0) {
            fromEpoch = sortableIdUtils.extractTs(key) * 1000;
          } else {
            lastKey = key;
          }
          metric.data.total += 1;
        }
        if (fromEpoch != null) {
          if (lastKey != null) {
            toEpoch = sortableIdUtils.extractTs(lastKey) * 1000;
          } else {
            toEpoch = Date.now();
          }
          const timeframeTime = toEpoch - fromEpoch;
          const timeframeMinutes = timeframeTime / 60_000;
          const timeframeHours = timeframeMinutes / 60;
          const timeframeDays = timeframeHours / 24;
          metric.data.averagePerMinute =
            metric.data.total / Math.ceil(timeframeMinutes);
          metric.data.averagePerHour =
            metric.data.total / Math.ceil(timeframeHours);
          metric.data.averagePerDay =
            metric.data.total / Math.ceil(timeframeDays);
        }
        return metric as any;
      }
    }
    utils.never();
  }
}

export default Audit;
