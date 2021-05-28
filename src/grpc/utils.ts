import type { Http2Session } from 'http2';
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
import type {
  ChannelCredentials,
  ClientOptions,
  Client,
  ServiceError,
} from '@grpc/grpc-js';
import type { CertificatePemChain, PrivateKeyPem } from '../keys/types';

import { Buffer } from 'buffer';
import * as grpc from '@grpc/grpc-js';
import * as grpcErrors from './errors';
import * as errors from '../errors';
import { promisify } from '../utils';

/**
 * GRPC insecure credentials for the client
 * This is used when the GRPC client connects through the forward proxy
 * The proxy will perform TLS termination
 */
function clientInsecureCredentials(): grpc.ChannelCredentials {
  return grpc.ChannelCredentials.createInsecure();
}

/**
 * GRPC insecure credentials for the server
 * This is used when the GRPC server is connected from the reverse proxy
 * The proxy will perform TLS termination
 */
function serverInsecureCredentials(): grpc.ServerCredentials {
  return grpc.ServerCredentials.createInsecure();
}

/**
 * GRPC secure credentials for the client
 * This is used when the GRPC client is directly connecting to the GRPC server
 */
function clientSecureCredentials(
  keyPrivatePem: PrivateKeyPem,
  certChainPem: CertificatePemChain,
): grpc.ChannelCredentials {
  const credentials = grpc.ChannelCredentials.createSsl(
    null,
    Buffer.from(keyPrivatePem, 'ascii'),
    Buffer.from(certChainPem, 'ascii'),
  );
  // @ts-ignore hack for undocumented property
  const connectionOptions = credentials.connectionOptions;
  // disable default certificate path validation logic
  // polykey has custom certificate path validation logic
  connectionOptions['rejectUnauthorized'] = false;
  return credentials;
}

/**
 * GRPC secure credentials for the server
 * This is used when the GRPC server is connected directly from the GRPC client
 */
function serverSecureCredentials(
  keyPrivatePem: PrivateKeyPem,
  certChainPem: CertificatePemChain,
): grpc.ServerCredentials {
  // this ensures that we get the client certificate
  const checkClientCertificate = true;
  const credentials = grpc.ServerCredentials.createSsl(
    null,
    [
      {
        private_key: Buffer.from(keyPrivatePem, 'ascii'),
        cert_chain: Buffer.from(certChainPem, 'ascii'),
      },
    ],
    checkClientCertificate,
  );
  // @ts-ignore hack for undocumented property
  const options = credentials.options;
  // disable default certificate path validation logic
  // polykey has custom certificate path validation logic
  options['rejectUnauthorized'] = false;
  return credentials;
}

/**
 * Acquire the HTTP2 session in a secure GRPC connection
 * Note that this does not work for insecure connections
 */
function getClientSession(
  client: Client,
  clientOptions: ClientOptions,
  clientCredentials: ChannelCredentials,
  host: string,
  port: number,
): Http2Session {
  const channel = client.getChannel();
  // @ts-ignore
  const channelTarget = channel.target;
  const subchannelTarget = { host, port };
  // @ts-ignore
  const subchannelPool = channel.subchannelPool;
  const subchannel = subchannelPool.getOrCreateSubchannel(
    channelTarget,
    subchannelTarget,
    clientOptions,
    clientCredentials,
  );
  const session: Http2Session = subchannel.session;
  return session;
}

/**
 * Serializes ErrorPolykey instances into GRPC errors
 * Use this on the sending side to send exceptions
 * Do not send exceptions to clients you do not trust
 */
function fromError(error: errors.ErrorPolykey): ServerStatusResponse {
  const metadata = new grpc.Metadata();
  metadata.set('name', error.name);
  metadata.set('message', error.message);
  metadata.set('data', JSON.stringify(error.data));
  return {
    metadata,
  };
}

/**
 * Deserialized GRPC errors into ErrorPolykey
 * Use this on the receiving side to receive exceptions
 */
function toError(e: ServiceError): errors.ErrorPolykey {
  const errorName = e.metadata.get('name')[0] as string;
  const errorMessage = e.metadata.get('message')[0] as string;
  const errorData = e.metadata.get('data')[0] as string;
  // grpc.status is an enum
  // this will iterate the enum values then enum keys
  // they will all be of string type
  for (const key in grpc.status) {
    // skip all enum values and
    // check if the error code matches a known grpc status
    // @ts-ignore grpc.status[key] is in fact a string
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

/**
 * Promisified Unary Call
 * Provides a pull-based API
 */
class PromiseUnaryCall<T> extends Promise<T> {
  call: ClientUnaryCall;
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
 * Converts GRPC unary call to promisified unary call
 * Used on the client side
 * There is no way to promisify server side unary response
 */
function promisifyUnaryCall<T>(
  client: Client,
  f: (...args: any[]) => ClientUnaryCall,
): (...args: any[]) => PromiseUnaryCall<T> {
  return (...args) => {
    let resolveP, rejectP;
    const p: any = new Promise((resolve, reject) => {
      resolveP = resolve;
      rejectP = reject;
    });
    const callback = (error: ServiceError, ...values) => {
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

/**
 * Converts a GRPC readable stream to an async generator
 * Used for both client and server
 * To end the stream, send the generator a null
 */
function generatorReadable<TRead>(
  stream: ClientReadableStream<TRead>,
): AsyncGeneratorReadableStream<TRead, ClientReadableStream<TRead>>;
function generatorReadable<TRead>(
  stream: ServerReadableStream<TRead, any>,
): AsyncGeneratorReadableStream<TRead, ServerReadableStream<TRead, any>>;
function generatorReadable(stream: any) {
  const gf = async function* () {
    try {
      let vR = yield;
      if (vR === null) {
        // destroying the stream at the beginning can trigger an error
        // here we just ignore it
        stream.once('error', () => {});
        stream.destroy();
        return;
      }
      // stream is destroyed when iteration finishes
      for await (const data of stream) {
        vR = yield data;
        if (vR === null) {
          stream.destroy();
          return;
        }
      }
    } catch (e) {
      stream.destroy();
      throw toError(e);
    }
  };
  const g: any = gf();
  // start the generator to the first yield
  g.next();
  g.stream = stream;
  g.read = g.next;
  return g;
}

/**
 * Converts GRPC readable stream call to async generator call
 * Used on the client side
 */
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

/**
 * Converts a GRPC writable stream to an async generator
 * Used for both client and server
 * To end the stream, send the generator a null
 * Throwing an error to the generator only works from the server side
 * Client side errors cannot be thrown, it will result in undefined behaviour
 */
function generatorWritable<TWrite>(
  stream: ClientWritableStream<TWrite>,
): AsyncGeneratorWritableStream<TWrite, ClientWritableStream<TWrite>>;
function generatorWritable<TWrite>(
  stream: ServerWritableStream<any, TWrite>,
): AsyncGeneratorWritableStream<TWrite, ServerWritableStream<any, TWrite>>;
function generatorWritable(stream: any) {
  const streamWrite = promisify(stream.write).bind(stream);
  const gf = async function* () {
    let vW;
    while (true) {
      try {
        vW = yield;
      } catch (e) {
        stream.emit('error', fromError(e));
        stream.end();
        return;
      }
      if (vW === null) {
        stream.end();
        return;
      } else {
        await streamWrite(vW);
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

/**
 * Converts GRPC writable stream call to async generator call
 * Used on the client side
 */
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

/**
 * Converts a GRPC duplex stream to an async generator
 * Used for both client and server
 * To end the stream, send the generator a null
 * This will first end the write-side then destroy the read side
 * Throwing an error to the generator only works from the server side
 * Client side errors cannot be thrown, it will result in undefined behaviour
 */
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
    let vR: any, vW: any;
    while (true) {
      try {
        if (vR === undefined) {
          vW = yield;
        } else {
          vW = yield vR;
        }
      } catch (e) {
        await gW.throw(e);
        await gR.next(null);
        return;
      }
      if (vW === null) {
        await gW.next(null);
        await gR.next(null);
        return;
      } else {
        const [writeStatus, readStatus] = await Promise.all([
          gW.next(vW),
          gR.next(),
        ]);
        if (writeStatus.done) {
          await gR.next(null);
          return;
        } else if (readStatus.done) {
          await gW.next(null);
          return;
        }
        vR = readStatus.value;
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

/**
 * Converts GRPC duplex stream call to async generator call
 * Used on the client side
 */
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
  clientInsecureCredentials,
  serverInsecureCredentials,
  clientSecureCredentials,
  serverSecureCredentials,
  getClientSession,
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
