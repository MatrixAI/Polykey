import type {
  ClientManifest,
  HandlerType,
  JsonRpcError,
  JsonRpcMessage,
  JsonRpcRequest,
  JsonRpcRequestMessage,
  JsonRpcRequestNotification,
  JsonRpcResponse,
  JsonRpcResponseError,
  JsonRpcResponseResult,
} from 'RPC/types';
import type { JSONValue } from '../types';
import { TransformStream } from 'stream/web';
import { AbstractError } from '@matrixai/errors';
import * as rpcErrors from './errors';
import * as utils from '../utils';
import { promise } from '../utils';
import * as validationErrors from '../validation/errors';
import * as errors from '../errors';
const jsonStreamParsers = require('@streamparser/json');

function parseJsonRpcRequest<T extends JSONValue>(
  message: unknown,
): JsonRpcRequest<T> {
  if (!utils.isObject(message)) {
    throw new validationErrors.ErrorParse('must be a JSON POJO');
  }
  if (!('method' in message)) {
    throw new validationErrors.ErrorParse('`method` property must be defined');
  }
  if (typeof message.method !== 'string') {
    throw new validationErrors.ErrorParse('`method` property must be a string');
  }
  // If ('params' in message && !utils.isObject(message.params)) {
  //   throw new validationErrors.ErrorParse('`params` property must be a POJO');
  // }
  return message as JsonRpcRequest<T>;
}

function parseJsonRpcRequestMessage<T extends JSONValue>(
  message: unknown,
): JsonRpcRequestMessage<T> {
  const jsonRequest = parseJsonRpcRequest(message);
  if (!('id' in jsonRequest)) {
    throw new validationErrors.ErrorParse('`id` property must be defined');
  }
  if (
    typeof jsonRequest.id !== 'string' &&
    typeof jsonRequest.id !== 'number' &&
    jsonRequest.id !== null
  ) {
    throw new validationErrors.ErrorParse(
      '`id` property must be a string, number or null',
    );
  }
  return jsonRequest as JsonRpcRequestMessage<T>;
}

function parseJsonRpcRequestNotification<T extends JSONValue>(
  message: unknown,
): JsonRpcRequestNotification<T> {
  const jsonRequest = parseJsonRpcRequest(message);
  if ('id' in jsonRequest) {
    throw new validationErrors.ErrorParse('`id` property must not be defined');
  }
  return jsonRequest as JsonRpcRequestNotification<T>;
}

function parseJsonRpcResponseResult<T extends JSONValue>(
  message: unknown,
): JsonRpcResponseResult<T> {
  if (!utils.isObject(message)) {
    throw new validationErrors.ErrorParse('must be a JSON POJO');
  }
  if (!('result' in message)) {
    throw new validationErrors.ErrorParse('`result` property must be defined');
  }
  if ('error' in message) {
    throw new validationErrors.ErrorParse(
      '`error` property must not be defined',
    );
  }
  // If (!utils.isObject(message.result)) {
  //   throw new validationErrors.ErrorParse('`result` property must be a POJO');
  // }
  if (!('id' in message)) {
    throw new validationErrors.ErrorParse('`id` property must be defined');
  }
  if (
    typeof message.id !== 'string' &&
    typeof message.id !== 'number' &&
    message.id !== null
  ) {
    throw new validationErrors.ErrorParse(
      '`id` property must be a string, number or null',
    );
  }
  return message as JsonRpcResponseResult<T>;
}

function parseJsonRpcResponseError(message: unknown): JsonRpcResponseError {
  if (!utils.isObject(message)) {
    throw new validationErrors.ErrorParse('must be a JSON POJO');
  }
  if ('result' in message) {
    throw new validationErrors.ErrorParse(
      '`result` property must not be defined',
    );
  }
  if (!('error' in message)) {
    throw new validationErrors.ErrorParse('`error` property must be defined');
  }
  parseJsonRpcError(message.error);
  if (!('id' in message)) {
    throw new validationErrors.ErrorParse('`id` property must be defined');
  }
  if (
    typeof message.id !== 'string' &&
    typeof message.id !== 'number' &&
    message.id !== null
  ) {
    throw new validationErrors.ErrorParse(
      '`id` property must be a string, number or null',
    );
  }
  return message as JsonRpcResponseError;
}

function parseJsonRpcError(message: unknown): JsonRpcError {
  if (!utils.isObject(message)) {
    throw new validationErrors.ErrorParse('must be a JSON POJO');
  }
  if (!('code' in message)) {
    throw new validationErrors.ErrorParse('`code` property must be defined');
  }
  if (typeof message.code !== 'number') {
    throw new validationErrors.ErrorParse('`code` property must be a number');
  }
  if (!('message' in message)) {
    throw new validationErrors.ErrorParse('`message` property must be defined');
  }
  if (typeof message.message !== 'string') {
    throw new validationErrors.ErrorParse(
      '`message` property must be a string',
    );
  }
  // If ('data' in message && !utils.isObject(message.data)) {
  //   throw new validationErrors.ErrorParse('`data` property must be a POJO');
  // }
  return message as JsonRpcError;
}

function parseJsonRpcResponse<T extends JSONValue>(
  message: unknown,
): JsonRpcResponse<T> {
  if (!utils.isObject(message)) {
    throw new validationErrors.ErrorParse('must be a JSON POJO');
  }
  try {
    return parseJsonRpcResponseResult(message);
  } catch (e) {
    // Do nothing
  }
  try {
    return parseJsonRpcResponseError(message);
  } catch (e) {
    // Do nothing
  }
  throw new validationErrors.ErrorParse(
    'structure did not match a `JsonRpcResponse`',
  );
}

function parseJsonRpcMessage<T extends JSONValue>(
  message: unknown,
): JsonRpcMessage<T> {
  if (!utils.isObject(message)) {
    throw new validationErrors.ErrorParse('must be a JSON POJO');
  }
  if (!('jsonrpc' in message)) {
    throw new validationErrors.ErrorParse('`jsonrpc` property must be defined');
  }
  if (message.jsonrpc !== '2.0') {
    throw new validationErrors.ErrorParse(
      '`jsonrpc` property must be a string of "2.0"',
    );
  }
  try {
    return parseJsonRpcRequest(message);
  } catch {
    // Do nothing
  }
  try {
    return parseJsonRpcResponse(message);
  } catch {
    // Do nothing
  }
  throw new validationErrors.ErrorParse(
    'Message structure did not match a `JsonRpcMessage`',
  );
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
 * Serializes Error instances into RPC errors
 * Use this on the sending side to send exceptions
 * Do not send exceptions to clients you do not trust
 * If sending to an agent (rather than a client), set sensitive to true to
 * prevent sensitive information from being sent over the network
 */
function fromError(error: Error, sensitive: boolean = false) {
  if (sensitive) {
    return JSON.stringify(error, sensitiveReplacer);
  } else {
    return JSON.stringify(error, replacer);
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
    return new errors.ErrorPolykeyUnknown('Unknown error JSON', {
      data: {
        json: value,
      },
    });
  } else {
    return value;
  }
}

function toError(errorData) {
  if (errorData == null) return new rpcErrors.ErrorRpcRemoteError();
  const error = JSON.parse(errorData, reviver);
  return new rpcErrors.ErrorRpcRemoteError(error.message, {
    cause: error,
  });
}

function clientInputTransformStream<I extends JSONValue>(method: string) {
  return new TransformStream<I, JsonRpcRequest>({
    transform: (chunk, controller) => {
      const message: JsonRpcRequest = {
        method,
        jsonrpc: '2.0',
        id: null,
        params: chunk,
      };
      controller.enqueue(message);
    },
  });
}

function clientOutputTransformStream<O extends JSONValue>() {
  return new TransformStream<JsonRpcResponse<O>, O>({
    transform: (chunk, controller) => {
      if ('error' in chunk) {
        throw toError(chunk.error.data);
      }
      controller.enqueue(chunk.result);
    },
  });
}

function isReturnableError(e: Error): boolean {
  return !(e instanceof rpcErrors.ErrorRpcNoMessageError);
}

class RPCErrorEvent extends Event {
  public detail: {
    error: any;
  };

  constructor(
    options: EventInit & {
      detail: {
        error: any;
      };
    },
  ) {
    super('error', options);
    this.detail = options.detail;
  }
}

function extractFirstMessageTransform<T extends JsonRpcMessage>(
  messageParser: (message: unknown) => T,
  byteLimit: number = 1024 * 1024,
) {
  const parser = new jsonStreamParsers.JSONParser({
    separator: '',
    paths: ['$'],
  });
  const messageProm = promise<T | undefined>();
  let bytesWritten = 0;
  let lastChunk: Uint8Array | null = null;
  let passThrough = false;
  const headTransformStream = new TransformStream<Uint8Array, Uint8Array>({
    start: (controller) => {
      parser.onValue = (value) => {
        let jsonMessage: T;
        try {
          jsonMessage = messageParser(value.value);
        } catch (e) {
          const error = new rpcErrors.ErrorRpcParse(undefined, { cause: e });
          messageProm.rejectP(error);
          controller.error(error);
          return;
        }
        messageProm.resolveP(jsonMessage);
        const firstMessageBuffer = Buffer.from(JSON.stringify(jsonMessage));
        const difference = bytesWritten - firstMessageBuffer.length;
        // Write empty value for the first read that initializes the stream
        controller.enqueue(new Uint8Array());
        if (difference > 0) {
          controller.enqueue(
            lastChunk?.slice(lastChunk?.byteLength - difference),
          );
        }
        parser.end();
        passThrough = true;
      };
    },
    transform: (chunk, controller) => {
      if (passThrough) {
        controller.enqueue(chunk);
        return;
      }
      try {
        bytesWritten += chunk.byteLength;
        lastChunk = chunk;
        parser.write(chunk);
      } catch (e) {
        // Ignore error
      }
      if (bytesWritten > byteLimit) {
        messageProm.rejectP(new rpcErrors.ErrorRpcMessageLength());
      }
    },
    flush: () => {
      messageProm.resolveP(undefined);
    },
  });
  return { headTransformStream, firstMessageProm: messageProm.p };
}

function getHandlerTypes(
  manifest: ClientManifest,
): Record<string, HandlerType> {
  const out: Record<string, HandlerType> = {};
  for (const [k, v] of Object.entries(manifest)) {
    out[k] = v.type;
  }
  return out;
}

export {
  parseJsonRpcRequest,
  parseJsonRpcRequestMessage,
  parseJsonRpcRequestNotification,
  parseJsonRpcResponseResult,
  parseJsonRpcResponseError,
  parseJsonRpcResponse,
  parseJsonRpcMessage,
  fromError,
  toError,
  clientInputTransformStream,
  clientOutputTransformStream,
  isReturnableError,
  RPCErrorEvent,
  extractFirstMessageTransform,
  getHandlerTypes,
};
