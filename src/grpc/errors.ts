import type { Class } from '@matrixai/errors';
import type { ClientMetadata } from './types';
import { ErrorPolykey, sysexits } from '../errors';
import * as nodesUtils from '../nodes/utils';

class ErrorGRPC<T> extends ErrorPolykey<T> {}

class ErrorGRPCClientTimeout<T> extends ErrorGRPC<T> {
  static description = 'Client connection timed out';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorGRPCClientVerification<T> extends ErrorGRPC<T> {
  static description = 'Client could not verify server certificate';
  exitCode = sysexits.UNAVAILABLE;
}
ErrorPolykeyRemote
class ErrorGRPCClientChannelNotReady<T> extends ErrorGRPC<T> {
  static description = 'Client channel or subchannel is not ready';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorGRPCClientCall<T> extends ErrorGRPC<T> {
  static description = 'Generic call error';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorGRPCServerNotRunning<T> extends ErrorGRPC<T> {
  static description = 'GRPC Server is not running';
  exitCode = sysexits.USAGE;
}

class ErrorGRPCServerBind<T> extends ErrorGRPC<T> {
  static description = 'Could not bind to server';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorGRPCServerShutdown<T> extends ErrorGRPC<T> {
  static description = 'Error during shutdown';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorGRPCServerNotSecured<T> extends ErrorGRPC<T> {
  static description = 'Server is not secured';
  exitCode = sysexits.NOPERM;
}

class ErrorGRPCServerVerification<T> extends ErrorGRPC<T> {
  static description = 'Failed to verify server certificate';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorPolykeyRemoteOLD<T> extends ErrorPolykey<T> {
  static description = 'Remote error from RPC call';
  exitCode: number = sysexits.UNAVAILABLE;
  metadata: ClientMetadata;

  constructor(metadata: ClientMetadata, message?: string, options?) {
    super(message, options);
    this.metadata = metadata;
  }

  public static fromJSON<T extends Class<any>>(
    this: T,
    json: any,
  ): InstanceType<T> {
    if (
      typeof json !== 'object' ||
      json.type !== this.name ||
      typeof json.data !== 'object' ||
      typeof json.data.message !== 'string' ||
      isNaN(Date.parse(json.data.timestamp)) ||
      typeof json.data.metadata !== 'object' ||
      typeof json.data.data !== 'object' ||
      typeof json.data.exitCode !== 'number' ||
      ('stack' in json.data && typeof json.data.stack !== 'string')
    ) {
      throw new TypeError(`Cannot decode JSON to ${this.name}`);
    }
    const parsedMetadata: ClientMetadata = {
      ...json.data.metadata,
      nodeId: nodesUtils.decodeNodeId(json.data.metadata.nodeId),
    };
    const e = new this(parsedMetadata, json.data.message, {
      timestamp: new Date(json.data.timestamp),
      data: json.data.data,
      cause: json.data.cause,
    });
    e.exitCode = json.data.exitCode;
    e.stack = json.data.stack;
    return e;
  }

  public toJSON(): any {
    const json = super.toJSON();
    json.data.metadata = {
      ...this.metadata,
      nodeId: nodesUtils.encodeNodeId(this.metadata.nodeId),
    };
    return json;
  }
}

export {
  ErrorGRPC,
  ErrorGRPCClientTimeout,
  ErrorGRPCClientVerification,
  ErrorGRPCClientChannelNotReady,
  ErrorGRPCClientCall,
  ErrorGRPCServerNotRunning,
  ErrorGRPCServerBind,
  ErrorGRPCServerShutdown,
  ErrorGRPCServerNotSecured,
  ErrorGRPCServerVerification,
  ErrorPolykeyRemoteOLD,
};
