import type { Http2Session } from 'http2';
import type {
  ClientUnaryCall,
  ClientReadableStream,
  ClientWritableStream,
  ClientDuplexStream,
} from '@grpc/grpc-js/build/src/call';
import type {
  ServerSurfaceCall,
  ServerStatusResponse,
  ServerReadableStream,
  ServerWritableStream,
  ServerDuplexStream,
} from '@grpc/grpc-js/build/src/server-call';
import type {
  ChannelCredentials,
  ChannelOptions,
  Client,
  ServiceError,
} from '@grpc/grpc-js';
import type {
  PromiseUnaryCall,
  AsyncGeneratorReadableStream,
  AsyncGeneratorReadableStreamClient,
  AsyncGeneratorWritableStream,
  AsyncGeneratorWritableStreamClient,
  AsyncGeneratorDuplexStream,
  AsyncGeneratorDuplexStreamClient,
} from '../types';
import type { CertificatePEMChain, PrivateKeyPEM } from '../../keys/types';
import type { POJO } from '../../types';
import type { ClientMetadata } from '../types';
import type { NodeId } from '../../ids/types';
import { Buffer } from 'buffer';
import { AbstractError } from '@matrixai/errors';
import * as grpc from '@grpc/grpc-js';
import * as grpcErrors from '../errors';
import * as errors from '../../errors';
import * as networkUtils from '../../network/utils';
import { promisify, promise, never } from '../../utils/utils';

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
 * When used without a key or certificate, this will result in
 * encrypted communication only without authentication
 */
function clientSecureCredentials(
  keyPrivatePem?: PrivateKeyPEM,
  certChainPem?: CertificatePEMChain,
): grpc.ChannelCredentials {
  const credentials = grpc.ChannelCredentials.createSsl(
    null,
    keyPrivatePem != null ? Buffer.from(keyPrivatePem, 'ascii') : undefined,
    certChainPem != null ? Buffer.from(certChainPem, 'ascii') : undefined,
  );
  // @ts-ignore hack for undocumented property
  const connectionOptions = credentials.connectionOptions;
  // Disable default certificate path validation logic
  // polykey has custom certificate path validation logic
  connectionOptions['rejectUnauthorized'] = false;
  return credentials;
}

/**
 * GRPC secure credentials for the server
 * This is used when the GRPC server is connected directly from the GRPC client
 */
function serverSecureCredentials(
  keyPrivatePem: PrivateKeyPEM,
  certChainPem: CertificatePEMChain,
): grpc.ServerCredentials {
  // This ensures that we get the client certificate
  const checkClientCertificate = false;
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
  credentials.options['rejectUnauthorized'] = false;
  // Disable default certificate path validation logic
  // polykey has custom certificate path validation logic
  // options['rejectUnauthorized'] = false;
  return credentials;
}

/**
 * Acquire the HTTP2 session in a secure GRPC connection
 * Note that this does not work for insecure connections
 * This relies on monkey patching the gRPC library internals
 */
function getClientSession(
  client: Client,
  channelOptions: ChannelOptions,
  channelCredentials: ChannelCredentials,
  host: string,
  port: number,
): Http2Session {
  const channel = client.getChannel();
  // Channel state must be READY to acquire the session
  if (channel.getConnectivityState(false) !== grpc.connectivityState.READY) {
    throw grpcErrors.ErrorGRPCClientChannelNotReady;
  }
  // @ts-ignore: accessing private property
  const channelTarget = channel.target;
  const subchannelTarget = { host, port };
  // @ts-ignore: accessing private property
  const subchannelPool = channel.subchannelPool;
  // This must acquire the first channel in the subchannel pool
  // Only the first channel is in ready state and therefore has the session property
  // If this creates a new channel, then either channelOptions or
  // channelCredentials is incorrect
  const subchannel = subchannelPool.getOrCreateSubchannel(
    channelTarget,
    subchannelTarget,
    channelOptions,
    channelCredentials,
  );
  // Subchannel state must be READY to acquire the session
  if (subchannel.getConnectivityState() !== grpc.connectivityState.READY) {
    throw grpcErrors.ErrorGRPCClientChannelNotReady;
  }
  const session: Http2Session = subchannel.session;
  return session;
}

/**
 * Acquire the HTTP2 session for a GRPC connection from the server side
 * This relies on monkey patching the gRPC library internals
 * The `ServerSurfaceCall` is expected to be an instance of `Http2ServerCallStream`
 * It will contain `stream` property, which will contain the `session` property
 */
function getServerSession(call: ServerSurfaceCall): Http2Session {
  // @ts-ignore: accessing private property
  return call.stream.session;
}

/**
 * Serializes Error instances into GRPC errors
 * Use this on the sending side to send exceptions
 * Do not send exceptions to clients you do not trust
 * If sending to an agent (rather than a client), set sensitive to true to
 * prevent sensitive information from being sent over the network
 */
function fromError(
  error: Error,
  sensitive: boolean = false,
): ServerStatusResponse {
  const metadata = new grpc.Metadata();
  if (sensitive) {
    metadata.set('error', JSON.stringify(error, sensitiveReplacer));
  } else {
    metadata.set('error', JSON.stringify(error, replacer));
  }
  return {
    metadata,
  };
}

/**
 * Deserialized GRPC errors into ErrorPolykey
 * Use this on the receiving side to receive exceptions
 */
function toError(
  e: ServiceError,
  metadata: ClientMetadata,
): errors.ErrorPolykey<any> {
  const errorData = e.metadata.get('error')[0] as string;
  // Grpc.status is an enum
  // this will iterate the enum values then enum keys
  // they will all be of string type
  for (const key in grpc.status) {
    // Skip all enum values and
    // check if the error code matches a known grpc status
    // @ts-ignore grpc.status[key] is in fact a string
    if (isNaN(parseInt(key)) && e.code === grpc.status[key]) {
      if (key === 'UNKNOWN' && errorData != null) {
        const error: Error = JSON.parse(errorData, reviver);
        const remoteError = new grpcErrors.ErrorPolykeyRemoteOLD(
          metadata,
          error.message,
          {
            cause: error,
          },
        );
        if (error instanceof errors.ErrorPolykey) {
          remoteError.exitCode = error.exitCode;
        }
        return remoteError;
      } else {
        return new grpcErrors.ErrorGRPCClientCall(e.message, {
          data: {
            code: e.code,
            details: e.details,
            metadata: e.metadata.getMap(),
          },
        });
      }
    }
  }
  never();
}

/**
 * Replacer function for serialising errors over GRPC (used by `JSON.stringify`
 * in `fromError`)
 * Polykey errors are handled by their inbuilt `toJSON` method , so this only
 * serialises other errors
 */
function replacer(key: string, value: any): any {
  if (value instanceof AggregateError) {
    // AggregateError has an `errors` property
    return {
      type: value.constructor.name,
      data: {
        errors: value.errors,
        message: value.message,
        stack: value.stack,
      },
    };
  } else if (value instanceof Error) {
    // If it's some other type of error then only serialise the message and
    // stack (and the type of the error)
    return {
      type: value.name,
      data: {
        message: value.message,
        stack: value.stack,
      },
    };
  } else {
    // If it's not an error then just leave as is
    return value;
  }
}

/**
 * The same as `replacer`, however this will additionally filter out any
 * sensitive data that should not be sent over the network when sending to an
 * agent (as opposed to a client)
 */
function sensitiveReplacer(key: string, value: any) {
  if (key === 'stack') {
    return;
  } else {
    return replacer(key, value);
  }
}

/**
 * Error constructors for non-Polykey errors
 * Allows these errors to be reconstructed from GRPC metadata
 */
const standardErrors = {
  Error,
  TypeError,
  SyntaxError,
  ReferenceError,
  EvalError,
  RangeError,
  URIError,
  AggregateError,
  AbstractError,
};

/**
 * Reviver function for deserialising errors sent over GRPC (used by
 * `JSON.parse` in `toError`)
 * The final result returned will always be an error - if the deserialised
 * data is of an unknown type then this will be wrapped as an
 * `ErrorPolykeyUnknown`
 */
function reviver(key: string, value: any): any {
  // If the value is an error then reconstruct it
  if (
    typeof value === 'object' &&
    typeof value.type === 'string' &&
    typeof value.data === 'object'
  ) {
    try {
      let eClass = errors[value.type];
      if (eClass != null) return eClass.fromJSON(value);
      eClass = standardErrors[value.type];
      if (eClass != null) {
        let e;
        switch (eClass) {
          case AbstractError:
            return eClass.fromJSON();
          case AggregateError:
            if (
              !Array.isArray(value.data.errors) ||
              typeof value.data.message !== 'string' ||
              ('stack' in value.data && typeof value.data.stack !== 'string')
            ) {
              throw new TypeError(`cannot decode JSON to ${value.type}`);
            }
            e = new eClass(value.data.errors, value.data.message);
            e.stack = value.data.stack;
            break;
          default:
            if (
              typeof value.data.message !== 'string' ||
              ('stack' in value.data && typeof value.data.stack !== 'string')
            ) {
              throw new TypeError(`Cannot decode JSON to ${value.type}`);
            }
            e = new eClass(value.data.message);
            e.stack = value.data.stack;
            break;
        }
        return e;
      }
    } catch (e) {
      // If `TypeError` which represents decoding failure
      // then return value as-is
      // Any other exception is a bug
      if (!(e instanceof TypeError)) {
        throw e;
      }
    }
    // Other values are returned as-is
    return value;
  } else if (key === '') {
    // Root key will be ''
    // Reaching here means the root JSON value is not a valid exception
    // Therefore ErrorPolykeyUnknown is only ever returned at the top-level
    const error = new errors.ErrorPolykeyUnknown('Unknown error JSON', {
      data: {
        json: value,
      },
    });
    return error;
  } else {
    return value;
  }
}

/**
 * Converts GRPC unary call to promisified unary call
 * Used on the client side
 * There is no way to promisify server side unary response
 */
function promisifyUnaryCall<T>(
  client: Client,
  metadata: ClientMetadata,
  f: (...args: any[]) => ClientUnaryCall,
): (...args: any[]) => PromiseUnaryCall<T> {
  return (...args) => {
    const { p, resolveP, rejectP } = promise<T>() as {
      p: PromiseUnaryCall<T>;
      resolveP: (value: T | PromiseLike<T>) => void;
      rejectP: (reason?: any) => void;
    };
    const { p: pMeta, resolveP: resolveMetaP } = promise<grpc.Metadata>();
    const callback = (error: ServiceError, ...values) => {
      if (error != null) {
        rejectP(toError(error, metadata));
        return;
      }
      resolveP(values.length === 1 ? values[0] : values);
      return;
    };
    args.push(callback);
    const call: ClientUnaryCall = f.apply(client, args);
    // Leading metadata is always returned when unary call finishes
    call.once('metadata', (meta) => {
      resolveMetaP(meta);
    });
    p.call = call;
    p.meta = pMeta;
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
  metadata: { nodeId: NodeId; command: string } & POJO,
): AsyncGeneratorReadableStream<TRead, ClientReadableStream<TRead>>;
function generatorReadable<TRead>(
  stream: ServerReadableStream<TRead, any>,
  metadata: { nodeId: NodeId; command: string } & POJO,
): AsyncGeneratorReadableStream<TRead, ServerReadableStream<TRead, any>>;
function generatorReadable<TRead>(
  stream: ClientReadableStream<TRead> | ServerReadableStream<TRead, any>,
  metadata: { nodeId: NodeId; command: string } & POJO,
) {
  const peerAddress = stream
    .getPeer()
    .match(
      /([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}:\d{1,5}|(\d{1,3}\.){3}\d{1,3}:\d{1,5}/,
    );
  if (!('host' in metadata) && peerAddress != null) {
    metadata.host = networkUtils.parseAddress(peerAddress[0])[0];
  }
  if (!('port' in metadata) && peerAddress != null) {
    metadata.port = networkUtils.parseAddress(peerAddress[0])[1];
  }
  const clientMetadata: ClientMetadata = {
    nodeId: metadata.nodeId,
    host: metadata.host,
    port: metadata.port,
    command: metadata.command,
  };
  const gf = async function* () {
    try {
      let vR = yield;
      if (vR === null) {
        // Destroying the stream at the beginning can trigger an error
        // here we just ignore it
        stream.once('error', () => {});
        stream.destroy();
        return;
      }
      // Stream is destroyed when iteration finishes
      for await (const data of stream) {
        vR = yield data;
        if (vR === null) {
          stream.destroy();
          return;
        }
      }
    } catch (e) {
      stream.destroy();
      throw toError(e, clientMetadata);
    }
  };
  const g: any = gf();
  // Start the generator to the first yield
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
  metadata: ClientMetadata,
  f: (...args: any[]) => ClientReadableStream<TRead>,
): (
  ...args: any[]
) => AsyncGeneratorReadableStreamClient<TRead, ClientReadableStream<TRead>> {
  return (...args) => {
    const stream = f.apply(client, args);
    const { p: pMeta, resolveP: resolveMetaP } = promise<grpc.Metadata>();
    stream.once('metadata', (meta) => {
      resolveMetaP(meta);
    });
    const g = generatorReadable<TRead>(
      stream,
      metadata,
    ) as AsyncGeneratorReadableStreamClient<TRead, ClientReadableStream<TRead>>;
    g.meta = pMeta;
    return g;
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
  sensitive: boolean,
): AsyncGeneratorWritableStream<TWrite, ClientWritableStream<TWrite>>;
function generatorWritable<TWrite>(
  stream: ServerWritableStream<any, TWrite>,
  sensitive: boolean,
): AsyncGeneratorWritableStream<TWrite, ServerWritableStream<any, TWrite>>;
function generatorWritable<TWrite>(
  stream: ClientWritableStream<TWrite> | ServerWritableStream<any, TWrite>,
  sensitive: boolean = false,
) {
  const streamWrite = promisify(stream.write).bind(stream);
  const gf = async function* () {
    let vW;
    while (true) {
      try {
        vW = yield;
      } catch (e) {
        stream.emit('error', fromError(e, sensitive));
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
  // Start the generator to the first yield
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
  metadata: ClientMetadata,
  f: (...args: any[]) => ClientWritableStream<TWrite>,
): (
  ...args: any[]
) => [
  AsyncGeneratorWritableStreamClient<TWrite, ClientWritableStream<TWrite>>,
  Promise<TReturn>,
] {
  return (...args) => {
    const { p, resolveP, rejectP } = promise<TReturn>() as {
      p: PromiseUnaryCall<TReturn>;
      resolveP: (value: TReturn | PromiseLike<TReturn>) => void;
      rejectP: (reason?: any) => void;
    };
    const callback = (error, ...values) => {
      if (error != null) {
        return rejectP(toError(error, metadata));
      }
      return resolveP(values.length === 1 ? values[0] : values);
    };
    args.push(callback);
    const stream = f.apply(client, args);
    const { p: pMeta, resolveP: resolveMetaP } = promise<grpc.Metadata>();
    stream.once('metadata', (meta) => {
      resolveMetaP(meta);
    });
    const g = generatorWritable<TWrite>(
      stream,
      false,
    ) as AsyncGeneratorWritableStreamClient<
      TWrite,
      ClientWritableStream<TWrite>
    >;
    g.meta = pMeta;
    return [g, p];
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
  metadata: { nodeId: NodeId; command: string } & POJO,
  sensitive: boolean,
): AsyncGeneratorDuplexStream<TRead, TWrite, ClientDuplexStream<TWrite, TRead>>;
function generatorDuplex<TRead, TWrite>(
  stream: ServerDuplexStream<TRead, TWrite>,
  metadata: { nodeId: NodeId; command: string } & POJO,
  sensitive: boolean,
): AsyncGeneratorDuplexStream<TRead, TWrite, ServerDuplexStream<TRead, TWrite>>;
function generatorDuplex<TRead, TWrite>(
  stream: ClientDuplexStream<TWrite, TRead> | ServerDuplexStream<TRead, TWrite>,
  metadata: { nodeId: NodeId; command: string } & POJO,
  sensitive: boolean = false,
) {
  const gR = generatorReadable(stream as any, metadata);
  const gW = generatorWritable(stream as any, sensitive);
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
  metadata: ClientMetadata,
  f: (...args: any[]) => ClientDuplexStream<TWrite, TRead>,
): (
  ...args: any[]
) => AsyncGeneratorDuplexStreamClient<
  TRead,
  TWrite,
  ClientDuplexStream<TWrite, TRead>
> {
  return (...args) => {
    const stream = f.apply(client, args);
    const { p: pMeta, resolveP: resolveMetaP } = promise<grpc.Metadata>();
    stream.once('metadata', (meta) => {
      resolveMetaP(meta);
    });
    const g = generatorDuplex<TRead, TWrite>(
      stream,
      metadata,
      false,
    ) as AsyncGeneratorDuplexStreamClient<
      TRead,
      TWrite,
      ClientDuplexStream<TWrite, TRead>
    >;
    g.meta = pMeta;
    return g;
  };
}

export {
  clientInsecureCredentials,
  serverInsecureCredentials,
  clientSecureCredentials,
  serverSecureCredentials,
  getClientSession,
  getServerSession,
  generatorReadable,
  generatorWritable,
  generatorDuplex,
  promisifyUnaryCall,
  promisifyReadableStreamCall,
  promisifyWritableStreamCall,
  promisifyDuplexStreamCall,
  toError,
  fromError,
  replacer,
  reviver,
};
