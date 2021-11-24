import type { ClientUnaryCall } from '@grpc/grpc-js/build/src/call';
import type {
  ObjectReadable,
  ObjectWritable,
} from '@grpc/grpc-js/build/src/object-stream';
import type {
  ServiceDefinition,
  UntypedServiceImplementation,
  Metadata,
} from '@grpc/grpc-js';

type Services = Array<
  [
    ServiceDefinition<UntypedServiceImplementation>,
    UntypedServiceImplementation,
  ]
>;

/**
 * Promisified Unary Call
 * Provides a pull-based API
 */
class PromiseUnaryCall<T> extends Promise<T> {
  call: ClientUnaryCall;
  meta: Promise<Metadata>;
}

/**
 * Promisified Readable Stream
 * Wraps GRPC readable stream as an asynchronous generator
 * Provides a pull-based API
 */
interface AsyncGeneratorReadableStream<
  TRead,
  TStream extends ObjectReadable<TRead>,
> extends AsyncGenerator<TRead, void, null | void> {
  stream: TStream;
  read(v?: null): Promise<IteratorResult<TRead, void>>;
}

/**
 * Promisifed readable stream for client side
 * Has the meta property to acquire the leading metadata
 */
interface AsyncGeneratorReadableStreamClient<
  TRead,
  TStream extends ObjectReadable<TRead>,
> extends AsyncGeneratorReadableStream<TRead, TStream> {
  meta: Promise<Metadata>;
}

/**
 * Promisified Writable Stream
 * Wraps GRPC writable stream as an asynchronous generator
 * Provides a pull-based API
 */
interface AsyncGeneratorWritableStream<
  TWrite,
  TStream extends ObjectWritable<TWrite>,
> extends AsyncGenerator<void, void, TWrite | null> {
  stream: TStream;
  write(v: TWrite | null): Promise<void>;
}

/**
 * Promisifed writable stream for client side
 * Has the meta property to acquire the leading metadata
 */
interface AsyncGeneratorWritableStreamClient<
  TWrite,
  TStream extends ObjectWritable<TWrite>,
> extends AsyncGeneratorWritableStream<TWrite, TStream> {
  meta: Promise<Metadata>;
}

/**
 * Promisified Duplex Stream
 * Wraps GRPC duplex stream as an asynchronous generator
 * Provides a pull-based API
 */
interface AsyncGeneratorDuplexStream<
  TRead,
  TWrite,
  TStream extends ObjectReadable<TRead> & ObjectWritable<TWrite>,
> extends AsyncGenerator<TRead, void, TWrite | null> {
  stream: TStream;
  read(v?: null): Promise<IteratorResult<TRead, void>>;
  write(v: TWrite | null): Promise<void>;
}

/**
 * Promisifed duplex stream for client side
 * Has the meta property to acquire the leading metadata
 */
interface AsyncGeneratorDuplexStreamClient<
  TRead,
  TWrite,
  TStream extends ObjectReadable<TRead> & ObjectWritable<TWrite>,
> extends AsyncGeneratorDuplexStream<TRead, TWrite, TStream> {
  meta: Promise<Metadata>;
}

export type {
  Services,
  PromiseUnaryCall,
  AsyncGeneratorReadableStream,
  AsyncGeneratorReadableStreamClient,
  AsyncGeneratorWritableStream,
  AsyncGeneratorWritableStreamClient,
  AsyncGeneratorDuplexStream,
  AsyncGeneratorDuplexStreamClient,
};
