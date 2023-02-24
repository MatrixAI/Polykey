import type { Class } from '@matrixai/errors';
import type { ClientMetadata } from './types';
import * as nodesUtils from '../nodes/utils';
import { ErrorPolykey, sysexits } from '../errors';

class ErrorRpc<T> extends ErrorPolykey<T> {}

class ErrorRpcDestroyed<T> extends ErrorRpc<T> {
  static description = 'Rpc is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorRpcStopping<T> extends ErrorRpc<T> {
  static description = 'Rpc is stopping';
  exitCode = sysexits.USAGE;
}

class ErrorRpcParse<T> extends ErrorRpc<T> {
  static description = 'Failed to parse Buffer stream';
  exitCode = sysexits.SOFTWARE;
}

/**
 * This is an internal error, it should not reach the top level.
 */
class ErrorRpcHandlerFailed<T> extends ErrorRpc<T> {
  static description = 'Failed to handle stream';
  exitCode = sysexits.SOFTWARE;
}

class ErrorRpcMessageLength<T> extends ErrorRpc<T> {
  static description = 'RPC Message exceeds maximum size';
  exitCode = sysexits.DATAERR;
}

class ErrorRpcMissingResponse<T> extends ErrorRpc<T> {
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

class ErrorRpcNoMessageError<T> extends ErrorRpc<T> {
  static description = 'For errors not to be conveyed to the client';
}

class ErrorRpcPlaceholderConnectionError<T> extends ErrorRpcNoMessageError<T> {
  static description = 'placeholder error for connection stream failure';
  exitCode = sysexits.UNAVAILABLE;
}

export {
  ErrorRpc,
  ErrorRpcDestroyed,
  ErrorRpcStopping,
  ErrorRpcParse,
  ErrorRpcHandlerFailed,
  ErrorRpcMessageLength,
  ErrorRpcMissingResponse,
  ErrorPolykeyRemote,
  ErrorRpcNoMessageError,
  ErrorRpcPlaceholderConnectionError,
};
