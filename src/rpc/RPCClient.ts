import type {
  HandlerType,
  JSONRPCRequestMessage,
  StreamFactory,
  ClientManifest,
} from './types';
import type { JSONValue } from 'types';
import type {
  ReadableWritablePair,
  WritableStream,
  ReadableStream,
} from 'stream/web';
import type {
  JSONRPCRequest,
  JSONRPCResponse,
  MiddlewareFactory,
  MapCallers,
} from './types';
import type { NodeId } from 'ids/index';
import type { ContextTimed } from '../contexts/types';
import { TransformStream } from 'stream/web';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import { Timer } from '@matrixai/timer';
import * as middlewareUtils from './utils/middleware';
import * as rpcErrors from './errors';
import * as rpcUtils from './utils/utils';
import { never, promise } from '../utils';

// eslint-disable-next-line
interface RPCClient<M extends ClientManifest> extends CreateDestroy {}
@CreateDestroy()
class RPCClient<M extends ClientManifest> {
  /**
   * @param obj
   * @param obj.manifest - Client manifest that defines the types for the rpc
   * methods.
   * @param obj.streamFactory - An arrow function that when called, creates a
   * new stream for each rpc method call.
   * @param obj.middlewareFactory - Middleware used to process the rpc messages.
   * The middlewareFactory needs to be a function that creates a pair of
   * transform streams that convert `JSONRPCRequest` to `Uint8Array` on the forward
   * path and `Uint8Array` to `JSONRPCResponse` on the reverse path.
   * @param obj.defaultTimeout - default timeout to be used if none is provided
   * for a client call.
   * @param obj.logger
   */
  static async createRPCClient<M extends ClientManifest>({
    manifest,
    streamFactory,
    middlewareFactory = middlewareUtils.defaultClientMiddlewareWrapper(),
    defaultTimeout = 60_000, // 1 minuet
    logger = new Logger(this.name),
  }: {
    manifest: M;
    streamFactory: StreamFactory;
    middlewareFactory?: MiddlewareFactory<
      Uint8Array,
      JSONRPCRequest,
      JSONRPCResponse,
      Uint8Array
    >;
    defaultTimeout?: number;
    logger?: Logger;
  }) {
    logger.info(`Creating ${this.name}`);
    const rpcClient = new this({
      manifest,
      streamFactory,
      middlewareFactory,
      defaultTimeout,
      logger,
    });
    logger.info(`Created ${this.name}`);
    return rpcClient;
  }

  protected logger: Logger;
  protected streamFactory: StreamFactory;
  protected middlewareFactory: MiddlewareFactory<
    Uint8Array,
    JSONRPCRequest,
    JSONRPCResponse,
    Uint8Array
  >;
  protected callerTypes: Record<string, HandlerType>;
  // Method proxies
  public readonly defaultTimeout: number;
  public readonly methodsProxy = new Proxy(
    {},
    {
      get: (_, method) => {
        if (typeof method === 'symbol') throw never();
        switch (this.callerTypes[method]) {
          case 'UNARY':
            return (params, ctx) => this.unaryCaller(method, params, ctx);
          case 'SERVER':
            return (params, ctx) =>
              this.serverStreamCaller(method, params, ctx);
          case 'CLIENT':
            return (ctx) => this.clientStreamCaller(method, ctx);
          case 'DUPLEX':
            return (ctx) => this.duplexStreamCaller(method, ctx);
          case 'RAW':
            return (header, ctx) => this.rawStreamCaller(method, header, ctx);
          default:
            return;
        }
      },
    },
  );

  public constructor({
    manifest,
    streamFactory,
    middlewareFactory,
    defaultTimeout,
    logger,
  }: {
    manifest: M;
    streamFactory: StreamFactory;
    middlewareFactory: MiddlewareFactory<
      Uint8Array,
      JSONRPCRequest,
      JSONRPCResponse,
      Uint8Array
    >;
    defaultTimeout: number;
    logger: Logger;
  }) {
    this.callerTypes = rpcUtils.getHandlerTypes(manifest);
    this.streamFactory = streamFactory;
    this.middlewareFactory = middlewareFactory;
    this.defaultTimeout = defaultTimeout;
    this.logger = logger;
  }

  public async destroy(): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new rpcErrors.ErrorRPCDestroyed())
  public get methods(): MapCallers<M> {
    return this.methodsProxy as MapCallers<M>;
  }

  @ready(new rpcErrors.ErrorRPCDestroyed())
  public async unaryCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    parameters: I,
    ctx: Partial<ContextTimed> = {},
  ): Promise<O> {
    const callerInterface = await this.duplexStreamCaller<I, O>(method, ctx);
    const reader = callerInterface.readable.getReader();
    const writer = callerInterface.writable.getWriter();
    await writer.write(parameters);
    const output = await reader.read();
    if (output.done) {
      throw new rpcErrors.ErrorRPCMissingResponse();
    }
    await reader.cancel();
    await writer.close();
    return output.value;
  }

  @ready(new rpcErrors.ErrorRPCDestroyed())
  public async serverStreamCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    parameters: I,
    ctx: Partial<ContextTimed> = {},
  ): Promise<ReadableStream<O>> {
    const callerInterface = await this.duplexStreamCaller<I, O>(method, ctx);
    const writer = callerInterface.writable.getWriter();
    await writer.write(parameters);
    await writer.close();

    return callerInterface.readable;
  }

  @ready(new rpcErrors.ErrorRPCDestroyed())
  public async clientStreamCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    ctx: Partial<ContextTimed> = {},
  ): Promise<{
    output: Promise<O>;
    writable: WritableStream<I>;
  }> {
    const callerInterface = await this.duplexStreamCaller<I, O>(method, ctx);
    const reader = callerInterface.readable.getReader();
    const output = reader.read().then(({ value, done }) => {
      if (done) {
        throw new rpcErrors.ErrorRPCMissingResponse();
      }
      return value;
    });
    return {
      output,
      writable: callerInterface.writable,
    };
  }

  @ready(new rpcErrors.ErrorRPCDestroyed())
  public async duplexStreamCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    ctx: Partial<ContextTimed> = {},
  ): Promise<ReadableWritablePair<O, I>> {
    const abortController = new AbortController();
    const signal = abortController.signal;
    // A promise that will reject if there is an abort signal or timeout
    const abortRaceProm = promise<never>();
    abortRaceProm.p.catch(() => {});
    let abortHandler: () => void;
    if (ctx.signal != null) {
      // Propagate signal events
      abortHandler = () => {
        abortController.abort(ctx.signal?.reason);
        abortRaceProm.rejectP(ctx.signal?.reason);
      };
      if (ctx.signal.aborted) abortHandler();
      ctx.signal.addEventListener('abort', abortHandler);
    }
    const timer =
      ctx.timer ??
      new Timer({
        delay: this.defaultTimeout,
      });
    const cleanUp = () => {
      // Clean up the timer and signal
      if (ctx.timer == null) timer.cancel(Error('TMP Clean up reason'));
      signal.removeEventListener('abort', abortHandler);
    };
    const timeoutError = new rpcErrors.ErrorRpcTimedOut();
    void timer.then(
      () => {
        abortController.abort(timeoutError);
        abortRaceProm.rejectP(timeoutError);
      },
      () => {},
    );
    // Deciding if we want to allow refreshing
    // We want to refresh timer if none was provided
    const refreshingTimer: Timer | undefined =
      ctx.timer == null ? timer : undefined;
    // Providing empty metadata here. we don't support it yet.
    const outputMessageTransformStream =
      rpcUtils.clientOutputTransformStream<O>(
        {
          nodeId: IdInternal.fromBuffer<NodeId>(Buffer.alloc(32, 0)), // FIXME
          host: '',
          port: 0,
          command: method,
        },
        refreshingTimer,
      );
    const inputMessageTransformStream = rpcUtils.clientInputTransformStream<I>(
      method,
      refreshingTimer,
    );
    const middleware = this.middlewareFactory({ signal, timer });
    // Hooking up agnostic stream side
    let streamPair: ReadableWritablePair<Uint8Array, Uint8Array>;
    try {
      streamPair = await Promise.race([
        this.streamFactory({ signal, timer }),
        abortRaceProm.p,
      ]);
    } catch (e) {
      cleanUp();
      throw e;
    }
    void Promise.allSettled([
      streamPair.readable
        .pipeThrough(middleware.reverse)
        .pipeTo(outputMessageTransformStream.writable)
        .catch(() => {}),
      inputMessageTransformStream.readable
        .pipeThrough(middleware.forward)
        .pipeTo(streamPair.writable)
        .catch(() => {}),
    ]).finally(() => {
      cleanUp();
    });

    // Returning interface
    return {
      readable: outputMessageTransformStream.readable,
      writable: inputMessageTransformStream.writable,
    };
  }

  @ready(new rpcErrors.ErrorRPCDestroyed())
  public async rawStreamCaller(
    method: string,
    headerParams: JSONValue,
    ctx: Partial<ContextTimed> = {},
  ): Promise<ReadableWritablePair<Uint8Array, Uint8Array>> {
    const abortController = new AbortController();
    const signal = abortController.signal;
    // A promise that will reject if there is an abort signal or timeout
    const abortRaceProm = promise<never>();
    abortRaceProm.p.catch(() => {});
    let abortHandler: () => void;
    if (ctx.signal != null) {
      // Propagate signal events
      abortHandler = () => {
        abortController.abort(ctx.signal?.reason);
        abortRaceProm.rejectP(ctx.signal?.reason);
      };
      if (ctx.signal.aborted) abortHandler();
      ctx.signal.addEventListener('abort', abortHandler);
    }
    const timer =
      ctx.timer ??
      new Timer({
        delay: this.defaultTimeout,
      });
    // Ignore unhandled rejections
    const cleanUp = () => {
      // Clean up the timer and signal
      if (ctx.timer == null) timer.cancel(Error('TMP Clean up reason'));
      signal.removeEventListener('abort', abortHandler);
    };
    const timeoutError = new rpcErrors.ErrorRpcTimedOut();
    void timer.then(
      () => {
        abortController.abort(timeoutError);
        abortRaceProm.rejectP(timeoutError);
      },
      () => {},
    );
    let streamPair: ReadableWritablePair<Uint8Array, Uint8Array>;
    const setupStream = async () => {
      const streamPair = await this.streamFactory({ signal, timer });
      const tempWriter = streamPair.writable.getWriter();
      const header: JSONRPCRequestMessage = {
        jsonrpc: '2.0',
        method,
        params: headerParams,
        id: null,
      };
      await tempWriter.write(Buffer.from(JSON.stringify(header)));
      tempWriter.releaseLock();
      return streamPair;
    };
    try {
      streamPair = await Promise.race([setupStream(), abortRaceProm.p]);
    } catch (e) {
      cleanUp();
      throw e;
    }
    // Need to tell when a stream has ended to clean up the timer
    const forwardStream = new TransformStream<Uint8Array, Uint8Array>();
    const reverseStream = new TransformStream<Uint8Array, Uint8Array>();

    void Promise.all([
      streamPair.readable.pipeTo(reverseStream.writable),
      forwardStream.readable.pipeTo(streamPair.writable),
    ]).finally(() => {
      cleanUp();
    });

    return {
      writable: forwardStream.writable,
      readable: reverseStream.readable,
    };
  }
}

export default RPCClient;
