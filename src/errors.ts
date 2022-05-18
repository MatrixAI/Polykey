import type { Class } from '@matrixai/errors';
import type { ClientMetadata } from './types';
import ErrorPolykey from './ErrorPolykey';
import sysexits from './utils/sysexits';
import * as nodesUtils from './nodes/utils';

class ErrorPolykeyRemote<T> extends ErrorPolykey<T> {
  static description = 'Remote error from RPC call';
  exitCode = sysexits.UNAVAILABLE;
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

class ErrorPolykeyUnimplemented<T> extends ErrorPolykey<T> {
  static description = 'This is an unimplemented functionality';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorPolykeyUnknown<T> extends ErrorPolykey<T> {
  static description = 'Unable to deserialise to known error';
  exitCode = sysexits.PROTOCOL;
}

class ErrorPolykeyAgentRunning<T> extends ErrorPolykey<T> {
  static description = 'PolykeyAgent is running';
  exitCode = sysexits.USAGE;
}

class ErrorPolykeyAgentNotRunning<T> extends ErrorPolykey<T> {
  static description = 'PolykeyAgent is not running';
  exitCode = sysexits.USAGE;
}

class ErrorPolykeyAgentDestroyed<T> extends ErrorPolykey<T> {
  static description = 'PolykeyAgent is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorPolykeyClientRunning<T> extends ErrorPolykey<T> {
  static description = 'PolykeyClient is running';
  exitCode = sysexits.USAGE;
}

class ErrorPolykeyClientNotRunning<T> extends ErrorPolykey<T> {
  static description = 'PolykeyClient is not running';
  exitCode = sysexits.USAGE;
}

class ErrorPolykeyClientDestroyed<T> extends ErrorPolykey<T> {
  static description = 'PolykeyClient is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorInvalidId<T> extends ErrorPolykey<T> {}

class ErrorInvalidConfigEnvironment<T> extends ErrorPolykey<T> {}

export {
  sysexits,
  ErrorPolykey,
  ErrorPolykeyUnimplemented,
  ErrorPolykeyUnknown,
  ErrorPolykeyRemote,
  ErrorPolykeyAgentRunning,
  ErrorPolykeyAgentNotRunning,
  ErrorPolykeyAgentDestroyed,
  ErrorPolykeyClientRunning,
  ErrorPolykeyClientNotRunning,
  ErrorPolykeyClientDestroyed,
  ErrorInvalidId,
  ErrorInvalidConfigEnvironment,
};

/**
 * Recursively export all domain-level error classes
 * This ensures that we have one place to construct and
 * reference all Polykey errors.
 * This is used by gRPC to serialize errors from agent to client.
 */
export * from './acl/errors';
export * from './sessions/errors';
export * from './keys/errors';
export * from './vaults/errors';
export * from './git/errors';
export * from './gestalts/errors';
export * from './identities/errors';
export * from './agent/errors';
export * from './client/errors';
export * from './grpc/errors';
export * from './network/errors';
export * from './nodes/errors';
export * from './claims/errors';
export * from './sigchain/errors';
export * from './bootstrap/errors';
export * from './notifications/errors';
export * from './schema/errors';
export * from './status/errors';
export * from './validation/errors';
export * from './utils/errors';
