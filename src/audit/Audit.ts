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
import type Discovery from '../discovery/Discovery';
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
import * as discoveryEvents from '../discovery/events';

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
    discovery,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    nodeConnectionManager: NodeConnectionManager;
    discovery: Discovery;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<Audit> {
    logger.info(`Creating ${this.name}`);
    const audit = new this({ db, nodeConnectionManager, discovery, logger });
    await audit.start({ fresh });
    logger.info(`Created ${this.name}`);
    return audit;
  }

  protected logger: Logger;
  protected db: DB;
  protected nodeConnectionManager: NodeConnectionManager;
  protected discovery: Discovery;

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
    discovery,
    logger,
  }: {
    db: DB;
    nodeConnectionManager: NodeConnectionManager;
    discovery: Discovery;
    logger: Logger;
  }) {
    this.logger = logger;
    this.nodeConnectionManager = nodeConnectionManager;
    this.discovery = discovery;
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
    // NodeConnectionManager handlers
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
    // Discovery Handlers
    this.setEventHandler(
      this.discovery,
      discoveryEvents.EventDiscoveryVertexQueued,
      auditUtils.discoveryVertexQueuedTopicPath,
      auditUtils.fromEventDiscoveryVertexQueued,
    );
    this.setEventHandler(
      this.discovery,
      discoveryEvents.EventDiscoveryVertexProcessed,
      auditUtils.discoveryVertexProcessedTopicPath,
      auditUtils.fromEventDiscoveryVertexProcessed,
    );
    this.setEventHandler(
      this.discovery,
      discoveryEvents.EventDiscoveryVertexFailed,
      auditUtils.discoveryVertexFailedTopicPath,
      auditUtils.fromEventDiscoveryVertexFailed,
    );
    this.setEventHandler(
      this.discovery,
      discoveryEvents.EventDiscoveryVertexCulled,
      auditUtils.discoveryVertexCulledTopicPath,
      auditUtils.fromEventDiscoveryVertexCulled,
    );
    this.setEventHandler(
      this.discovery,
      discoveryEvents.EventDiscoveryVertexCancelled,
      auditUtils.discoveryVertexCancelledTopicPath,
      auditUtils.fromEventDiscoveryVertexCancelled,
    );
    this.setEventHandler(
      this.discovery,
      discoveryEvents.EventDiscoveryCheckRediscovery,
      auditUtils.discoveryCheckRediscoveryTopicPath,
      auditUtils.fromEventDiscoveryCheckRediscovery,
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

  public async destroy(): Promise<void> {
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
  ): void {
    const handler = async (evt: InstanceType<T>) => {
      const eventData = await toAuditEvent(evt);
      await this.db.withTransactionF(async (tran) => {
        const auditEventId = this.generateAuditEventId();
        await this.setAuditEvent(
          topicPath,
          { id: auditEventId, data: eventData, path: topicPath } as any,
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
      seekEnd,
      limit,
    }: {
      seek?: AuditEventId | Date | number;
      seekEnd?: AuditEventId | Date | number;
      limit?: number;
    } = {},
  ): AsyncGenerator<TopicSubPathToAuditEvent<T>> {
    let blockP: PromiseCancellable<void> | undefined;
    let resolveBlockP: (() => void) | undefined;
    let blockPSignal: AbortSignal | undefined;
    const seekEndTime: number | undefined =
      seekEnd != null
        ? auditUtils.extractFromSeek(seekEnd, (size) =>
            new Uint8Array(size).fill(0xff),
          ).timestamp
        : undefined;
    let seekEndTimer: NodeJS.Timeout | undefined;
    if (seekEndTime != null) {
      // Create a timer that will resolve the block when the `seekEnd` has passed
      seekEndTimer = setTimeout(() => {
        resolveBlockP?.();
      }, seekEndTime - Date.now());
    }
    const handleEventAuditAuditEventSet = (
      evt: auditEvents.EventAuditAuditEventSet,
    ) => {
      // If the path equals or is a subpath of our topicPath then we resolve the block
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
      let remainingLimit = limit;
      let seekCursor = seek;
      let idPrevious: AuditEventId = IdInternal.fromBuffer<AuditEventId>(
        Buffer.alloc(0, 0),
      );
      this.addEventListener(
        auditEvents.EventAuditAuditEventSet.name,
        handleEventAuditAuditEventSet,
      );
      // There should be new entries every loop,
      // if not that means that the limit has been reached based on seekEnd or limit
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
          seekEnd,
          order: 'asc',
        });
        for await (const auditEvent of iterator) {
          // Clone auditEvent.id since its possible to modify after `auditEvent` is yielded
          const auditEventId: AuditEventId =
            IdInternal.fromBuffer<AuditEventId>(auditEvent.id.toBuffer());
          seekCursor = auditEventId;
          blockPSignal?.throwIfAborted();
          // Skip event if it is a duplicate with the previous yielded event
          if (Buffer.compare(auditEvent.id, idPrevious) === 0) continue;
          yield auditEvent;
          idPrevious = auditEventId;
          // Return if the remaining limit is 0, we no longer need to yield any more events.
          if (remainingLimit != null && --remainingLimit === 0) return;
        }
        if (seekEndTime != null && seekEndTime <= Date.now()) return;
        await blockP;
        if (seekEndTime != null && seekEndTime <= Date.now()) return;
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
      clearTimeout(seekEndTimer);
    }
  }

  @ready(new auditErrors.ErrorAuditNotRunning())
  public async *getAuditEvents<T extends TopicSubPath>(
    topicPath: T,
    {
      seek,
      seekEnd,
      order = 'asc',
      limit,
    }: {
      seek?: AuditEventId | Date | number;
      seekEnd?: AuditEventId | Date | number;
      order?: 'asc' | 'desc';
      limit?: number;
    } = {},
    tran?: DBTransaction,
  ): AsyncGenerator<TopicSubPathToAuditEvent<T>> {
    if (tran == null) {
      const getEvents = (tran: DBTransaction) =>
        this.getAuditEvents(
          topicPath,
          {
            seek,
            seekEnd,
            order,
            limit,
          },
          tran,
        );
      return yield* this.db.withTransactionG(async function* (tran) {
        return yield* getEvents(tran);
      });
    }

    const seekAuditEventId =
      seek != null
        ? auditUtils.extractFromSeek(seek, (size) => new Uint8Array(size))
            .auditEventId
        : undefined;
    const seekEndAuditEventId =
      seekEnd != null
        ? auditUtils.extractFromSeek(seekEnd, (size) =>
            new Uint8Array(size).fill(0xff),
          ).auditEventId
        : undefined;

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
            keyAsBuffer: true,
            keys: true,
            values: true,
            valueAsBuffer: false,
            reverse: order !== 'asc',
            limit,
            gte: seekAuditEventId?.toBuffer(),
            lte: seekEndAuditEventId?.toBuffer(),
          },
        );
        for await (const [key, auditEvent] of iterator) {
          auditEvent.id = IdInternal.fromBuffer<AuditEventId>(
            key.at(-1) as Buffer,
          );
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
          gte: seekAuditEventId?.toBuffer(),
          lte: seekEndAuditEventId?.toBuffer(),
        },
      );
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
    options: {
      seek?: AuditEventId | Date | number;
      seekEnd?: AuditEventId | Date | number;
    } = {},
    tran?: DBTransaction,
  ): Promise<MetricPathToAuditMetric<T>> {
    if (tran == null) {
      return await this.db.withTransactionF((tran) =>
        this.getAuditMetric(metricPath, options, tran),
      );
    }

    let seekIdBuffer: Buffer | undefined;
    let seekTimestamp: number | undefined;
    if (options.seek != null) {
      const seekData = auditUtils.extractFromSeek(
        options.seek,
        (size) => new Uint8Array(size),
      );
      seekIdBuffer = seekData.auditEventId.toBuffer();
      seekTimestamp = seekData.timestamp;
    }

    let seekEndIdBuffer: Buffer | undefined;
    let seekEndTimestamp: number | undefined;
    if (options.seekEnd != null) {
      const seekEndData = auditUtils.extractFromSeek(options.seekEnd, (size) =>
        new Uint8Array(size).fill(0xff),
      );
      seekEndIdBuffer = seekEndData.auditEventId.toBuffer();
      seekEndTimestamp = seekEndData.timestamp;
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
            gte: seekIdBuffer,
            lte: seekEndIdBuffer,
          },
        )) {
          const key = keyPath.at(-1)! as Buffer;
          if (metric.data.total === 0) {
            seekTimestamp = sortableIdUtils.extractTs(key) * 1000;
          } else {
            lastKey = key;
          }
          metric.data.total += 1;
        }
        if (seekTimestamp != null) {
          if (lastKey != null) {
            seekEndTimestamp = sortableIdUtils.extractTs(lastKey) * 1000;
          } else {
            seekEndTimestamp = Date.now();
          }
          const timeframeTime = seekEndTimestamp - seekTimestamp;
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
    // Throw in case user does not abide by type safety
    throw new auditErrors.ErrorAuditMetricPathMissing();
  }
}

export default Audit;
