import type {
  ClientUnaryCall,
  ClientReadableStream,
  ClientWritableStream,
  ClientDuplexStream,
} from '@grpc/grpc-js/build/src/call';
import type {
  ServerStatusResponse,
  ServerReadableStream,
  ServerWritableStream,
  ServerDuplexStream,
} from '@grpc/grpc-js/build/src/server-call';
import type {
  ObjectReadable,
  ObjectWritable,
} from '@grpc/grpc-js/build/src/object-stream';

import * as grpc from '@grpc/grpc-js';
import * as grpcErrors from './errors';
import * as errors from '../errors';
import { promisify } from '../utils';

function clientCredentials(): grpc.ChannelCredentials {
  // static call to create insecure client creds
  return grpc.ChannelCredentials.createInsecure();
}

function serverCredentials(): grpc.ServerCredentials {
  // static call to create insecure server creds
  return grpc.ServerCredentials.createInsecure();
}

function toError(e): errors.ErrorPolykey {
  const errorName = e.metadata.get('name')[0];
  const errorMessage = e.metadata.get('message')[0];
  const errorData = e.metadata.get('data')[0];
  for (const key in grpc.status) {
    if (isNaN(parseInt(key)) && e.code === grpc.status[key]) {
      if (
        key === 'UNKNOWN' &&
        errorName != null &&
        errorMessage != null &&
        errorData != null &&
        errorName in errors
      ) {
        return new errors[errorName](errorMessage, JSON.parse(errorData));
      } else {
        return new grpcErrors.ErrorGRPCConnection(e.message, {
          code: e.code,
          details: e.details,
          metadata: e.metadata.getMap(),
        });
      }
    }
  }
  throw new errors.ErrorUndefinedBehaviour();
}

function fromError(error: errors.ErrorPolykey): ServerStatusResponse {
  const metadata = new grpc.Metadata();
  metadata.set('name', error.name);
  metadata.set('message', error.message);
  metadata.set('data', JSON.stringify(error.data));
  return {
    metadata,
  };
}

class PromiseUnaryCall<T> extends Promise<T> {
  call: ClientUnaryCall;
}

interface AsyncGeneratorReadableStream<
  TRead,
  TStream extends ObjectReadable<TRead>
> extends AsyncGenerator<TRead, null, null | void> {
  stream: TStream;
  read(v?: null): Promise<TRead | null>;
}

interface AsyncGeneratorWritableStream<
  TWrite,
  TStream extends ObjectWritable<TWrite>
> extends AsyncGenerator<void, null, TWrite | null> {
  stream: TStream;
  write(v: TWrite | null): Promise<void>;
}

interface AsyncGeneratorDuplexStream<
  TRead,
  TWrite,
  TStream extends ObjectReadable<TRead> & ObjectWritable<TWrite>
> extends AsyncGenerator<TRead, null, TWrite | null> {
  stream: TStream;
  read(v?: null): Promise<TRead | null>;
  write(v: TWrite | null): Promise<void>;
}

function generatorReadable<TRead>(
  stream: ClientReadableStream<TRead>,
): AsyncGeneratorReadableStream<TRead, ClientReadableStream<TRead>>;
function generatorReadable<TRead>(
  stream: ServerReadableStream<TRead, any>,
): AsyncGeneratorReadableStream<TRead, ServerReadableStream<TRead, any>>;
function generatorReadable<TRead>(stream: any) {
  const gf = async function* () {
    let close;
    let vR;
    while (true) {
      vR = await new Promise<TRead | null>((resolve, reject) => {
        const onData = (d) => {
          stream.off('error', onError);
          stream.off('end', onEnd);
          resolve(d);
        };
        const onEnd = () => {
          stream.off('data', onData);
          stream.off('error', onError);
          resolve(null);
        };
        const onError = (e) => {
          stream.off('data', onData);
          stream.off('end', onEnd);
          reject(toError(e));
        };
        stream.once('data', onData);
        stream.once('error', onError);
        stream.once('end', onEnd);
      });
      if (vR === null) {
        // closed from other side
        return null;
      }
      close = yield vR;
      if (close === null) {
        // close the reading
        return null;
      }
    }
  };
  const g: any = gf();
  g.stream = stream;
  g.read = g.next;
  return g;
}

function generatorWritable<TWrite>(
  stream: ClientWritableStream<TWrite>,
): AsyncGeneratorWritableStream<TWrite, ClientWritableStream<TWrite>>;
function generatorWritable<TWrite>(
  stream: ServerWritableStream<any, TWrite>,
): AsyncGeneratorWritableStream<TWrite, ServerWritableStream<any, TWrite>>;
function generatorWritable(stream: any) {
  const streamWrite = promisify(stream.write).bind(stream);
  const streamEnd = promisify(stream.end).bind(stream);
  const gf = async function* () {
    let errored;
    let vW;
    while (true) {
      errored = false;
      try {
        vW = yield;
      } catch (e) {
        errored = true;
        stream.emit('error', fromError(e));
      }
      if (!errored) {
        if (vW === null) {
          await streamEnd();
          // close the writing
          return null;
        } else {
          await streamWrite(vW);
        }
      }
    }
  };
  const g: any = gf();
  // start the generator to the first yield
  g.next();
  g.stream = stream;
  g.write = g.next;
  return g;
}

function generatorDuplex<TRead, TWrite>(
  stream: ClientDuplexStream<TWrite, TRead>,
): AsyncGeneratorDuplexStream<TRead, TWrite, ClientDuplexStream<TWrite, TRead>>;
function generatorDuplex<TRead, TWrite>(
  stream: ServerDuplexStream<TRead, TWrite>,
): AsyncGeneratorDuplexStream<TRead, TWrite, ServerDuplexStream<TRead, TWrite>>;
function generatorDuplex(stream: any) {
  const gR = generatorReadable(stream);
  const gW = generatorWritable(stream);
  const gf = async function* () {
    let errored;
    let vR, vW;
    while (true) {
      errored = false;
      try {
        if (vR === undefined) {
          vW = yield;
        } else {
          vW = yield vR;
        }
      } catch (e) {
        errored = true;
        gW.throw(e);
      }
      if (!errored) {
        if (vW === null) {
          await Promise.all([gR.next(null), gW.next(null)]);
          return null;
        } else {
          const [readStatus, writeStatus] = await Promise.all([
            gR.next(),
            gW.next(vW),
          ]);
          if (readStatus.done || writeStatus.done) {
            return null;
          }
          vR = readStatus.value;
        }
      }
    }
  };
  const g: any = gf();
  g.next();
  g.stream = stream;
  g.read = gR.next.bind(gR);
  g.write = gW.next.bind(gW);
  return g;
}

function promisifyUnaryCall<T>(
  client,
  f,
): (...args: any[]) => PromiseUnaryCall<T> {
  return (...args) => {
    let resolveP, rejectP;
    const p: any = new Promise((resolve, reject) => {
      resolveP = resolve;
      rejectP = reject;
    });
    const callback = (error, ...values) => {
      if (error) {
        return rejectP(toError(error));
      }
      return resolveP(values.length === 1 ? values[0] : values);
    };
    args.push(callback);
    const call: ClientUnaryCall = f.apply(client, args);
    p.call = call;
    return p;
  };
}

function promisifyReadableStreamCall<TRead>(
  client: grpc.Client,
  f: (...args: any[]) => ClientReadableStream<TRead>,
): (
  ...args: any[]
) => AsyncGeneratorReadableStream<TRead, ClientReadableStream<TRead>> {
  return (...args) => {
    const stream = f.apply(client, args);
    return generatorReadable<TRead>(stream);
  };
}

function promisifyWritableStreamCall<TWrite, TReturn>(
  client: grpc.Client,
  f: (...args: any[]) => ClientWritableStream<TWrite>,
): (
  ...args: any[]
) => [
  AsyncGeneratorWritableStream<TWrite, ClientWritableStream<TWrite>>,
  Promise<TReturn>,
] {
  return (...args) => {
    let resolveP, rejectP;
    const p = new Promise<TReturn>((resolve, reject) => {
      resolveP = resolve;
      rejectP = reject;
    });
    const callback = (error, ...values) => {
      if (error) {
        return rejectP(toError(error));
      }
      return resolveP(values.length === 1 ? values[0] : values);
    };
    args.push(callback);
    const stream = f.apply(client, args);
    return [generatorWritable<TWrite>(stream), p];
  };
}

function promisifyDuplexStreamCall<TRead, TWrite>(
  client: grpc.Client,
  f: (...args: any[]) => ClientDuplexStream<TWrite, TRead>,
): (
  ...args: any[]
) => AsyncGeneratorDuplexStream<
  TRead,
  TWrite,
  ClientDuplexStream<TWrite, TRead>
> {
  return (...args) => {
    const stream = f.apply(client, args);
    return generatorDuplex(stream);
  };
}

export {
  clientCredentials,
  serverCredentials,
  generatorReadable,
  generatorWritable,
  generatorDuplex,
  promisifyUnaryCall,
  promisifyReadableStreamCall,
  promisifyWritableStreamCall,
  promisifyDuplexStreamCall,
  toError,
  fromError,
};

export type {
  PromiseUnaryCall,
  AsyncGeneratorReadableStream,
  AsyncGeneratorWritableStream,
  AsyncGeneratorDuplexStream,
};
