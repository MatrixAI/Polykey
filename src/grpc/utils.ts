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
import type { ChannelCredentials, ClientOptions, Client } from '@grpc/grpc-js';
import type { CertificatePemChain, PrivateKeyPem } from '../keys/types';

import { Buffer } from 'buffer';
import * as grpc from '@grpc/grpc-js';
import * as grpcErrors from './errors';
import * as errors from '../errors';
import { promisify } from '../utils';

function clientInsecureCredentials(): grpc.ChannelCredentials {
  return grpc.ChannelCredentials.createInsecure();
}

function serverInsecureCredentials(): grpc.ServerCredentials {
  return grpc.ServerCredentials.createInsecure();
}

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
 * This only works during a secure GRPC connection
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
 * Takes a serialized GRPC error, and converts it to an ErrorPolykey
 */
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
  read(v?: null): Promise<IteratorResult<TRead | null>>;
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
  read(v?: null): Promise<IteratorResult<TRead | null>>;
  write(v: TWrite | null): Promise<void>;
}

function generatorReadable<TRead>(
  stream: ClientReadableStream<TRead>,
): AsyncGeneratorReadableStream<TRead, ClientReadableStream<TRead>>;
function generatorReadable<TRead>(
  stream: ServerReadableStream<TRead, any>,
): AsyncGeneratorReadableStream<TRead, ServerReadableStream<TRead, any>>;
function generatorReadable(stream: any) {
  const gf = async function* () {
    stream.on('end', () => {
      return null;
    });

    stream.on('error', () => {
      return null;
    });

    for await (const data of stream) {
      const d = yield data;
      if (d === null) {
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
          // Close the writing
          // End has no callback when called without a value,
          // hence is not promisified.
          stream.end();
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
    let errored: boolean;
    let vR: any, vW: any;
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
