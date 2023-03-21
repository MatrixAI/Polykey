import type { Class } from '@matrixai/errors';
import type { ClientMetadata } from './types';
import * as nodesUtils from '../nodes/utils';
import { ErrorPolykey, sysexits } from '../errors';

class ErrorRPC<T> extends ErrorPolykey<T> {}

class ErrorRPCDestroyed<T> extends ErrorRPC<T> {
  static description = 'Rpc is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorRPCStopping<T> extends ErrorRPC<T> {
  static description = 'Rpc is stopping';
  exitCode = sysexits.USAGE;
}

class ErrorRPCParse<T> extends ErrorRPC<T> {
  static description = 'Failed to parse Buffer stream';
  exitCode = sysexits.SOFTWARE;
}

/**
 * This is an internal error, it should not reach the top level.
 */
class ErrorRPCHandlerFailed<T> extends ErrorRPC<T> {
  static description = 'Failed to handle stream';
  exitCode = sysexits.SOFTWARE;
}

class ErrorRPCMessageLength<T> extends ErrorRPC<T> {
  static description = 'RPC Message exceeds maximum size';
  exitCode = sysexits.DATAERR;
}

class ErrorRPCMissingResponse<T> extends ErrorRPC<T> {
  static description = 'Stream ended before response';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorPolykeyRemote<T> extends ErrorPolykey<T> {
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

class ErrorSendErrorFailed<T> extends ErrorRPC<T> {
  static description = 'Failed to send error message';
  exitCode = sysexits.UNAVAILABLE;
}

export {
  ErrorRPC,
  ErrorRPCDestroyed,
  ErrorRPCStopping,
  ErrorRPCParse,
  ErrorRPCHandlerFailed,
  ErrorRPCMessageLength,
  ErrorRPCMissingResponse,
  ErrorPolykeyRemote,
  ErrorSendErrorFailed,
};
