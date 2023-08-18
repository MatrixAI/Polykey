import type {
  ClientManifest,
  HandlerType,
  JSONRPCError,
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCRequestMessage,
  JSONRPCRequestNotification,
  JSONRPCResponse,
  JSONRPCResponseError,
  JSONRPCResponseResult,
} from '../types';
import type { JSONValue } from '../../types';
import type { Timer } from '@matrixai/timer';
import { TransformStream } from 'stream/web';
import { JSONParser } from '@streamparser/json';
import { AbstractError } from '@matrixai/errors';
import * as rpcErrors from '../errors';
import * as utils from '../../utils';
import * as validationErrors from '../../validation/errors';
import * as errors from '../../errors';

function parseJSONRPCRequest<T extends JSONValue>(
  message: unknown,
): JSONRPCRequest<T> {
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
  return message as JSONRPCRequest<T>;
}

function parseJSONRPCRequestMessage<T extends JSONValue>(
  message: unknown,
): JSONRPCRequestMessage<T> {
  const jsonRequest = parseJSONRPCRequest(message);
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
  return jsonRequest as JSONRPCRequestMessage<T>;
}

function parseJSONRPCRequestNotification<T extends JSONValue>(
  message: unknown,
): JSONRPCRequestNotification<T> {
  const jsonRequest = parseJSONRPCRequest(message);
  if ('id' in jsonRequest) {
    throw new validationErrors.ErrorParse('`id` property must not be defined');
  }
  return jsonRequest as JSONRPCRequestNotification<T>;
}

function parseJSONRPCResponseResult<T extends JSONValue>(
  message: unknown,
): JSONRPCResponseResult<T> {
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
  return message as JSONRPCResponseResult<T>;
}

function parseJSONRPCResponseError(message: unknown): JSONRPCResponseError {
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
  parseJSONRPCError(message.error);
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
  return message as JSONRPCResponseError;
}

function parseJSONRPCError(message: unknown): JSONRPCError {
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
  return message as JSONRPCError;
}

function parseJSONRPCResponse<T extends JSONValue>(
  message: unknown,
): JSONRPCResponse<T> {
  if (!utils.isObject(message)) {
    throw new validationErrors.ErrorParse('must be a JSON POJO');
  }
  try {
    return parseJSONRPCResponseResult(message);
  } catch (e) {
    // Do nothing
  }
  try {
    return parseJSONRPCResponseError(message);
  } catch (e) {
    // Do nothing
  }
  throw new validationErrors.ErrorParse(
    'structure did not match a `JSONRPCResponse`',
  );
}

function parseJSONRPCMessage<T extends JSONValue>(
  message: unknown,
): JSONRPCMessage<T> {
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
    return parseJSONRPCRequest(message);
  } catch {
    // Do nothing
  }
  try {
    return parseJSONRPCResponse(message);
  } catch {
    // Do nothing
  }
  throw new validationErrors.ErrorParse(
    'Message structure did not match a `JSONRPCMessage`',
  );
}

/**
 * Replacer function for serialising errors over RPC (used by `JSON.stringify`
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
 * Allows these errors to be reconstructed from RPC metadata
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
 * Reviver function for deserialising errors sent over RPC (used by
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

function toError(
  errorData,
  metadata?: JSONValue,
): rpcErrors.ErrorPolykeyRemote<unknown> {
  if (errorData == null) {
    return new rpcErrors.ErrorPolykeyRemote(metadata);
  }
  const error: Error = JSON.parse(errorData, reviver);
  const remoteError = new rpcErrors.ErrorPolykeyRemote(
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
}

/**
 * This constructs a transformation stream that converts any input into a
 * JSONRCPRequest message. It also refreshes a timer each time a message is processed if
 * one is provided.
 * @param method - Name of the method that was called, used to select the
 * server side.
 * @param timer - Timer that gets refreshed each time a message is provided.
 */
function clientInputTransformStream<I extends JSONValue>(
  method: string,
  timer?: Timer,
): TransformStream<I, JSONRPCRequest> {
  return new TransformStream<I, JSONRPCRequest>({
    transform: (chunk, controller) => {
      timer?.refresh();
      const message: JSONRPCRequest = {
        method,
        jsonrpc: '2.0',
        id: null,
        params: chunk,
      };
      controller.enqueue(message);
    },
  });
}

/**
 * This constructs a transformation stream that converts any error messages
 * into errors. It also refreshes a timer each time a message is processed if
 * one is provided.
 * @param clientMetadata - Metadata that is attached to an error when one is
 * created.
 * @param timer - Timer that gets refreshed each time a message is provided.
 */
function clientOutputTransformStream<O extends JSONValue>(
  clientMetadata?: JSONValue,
  timer?: Timer,
): TransformStream<JSONRPCResponse<O>, O> {
  return new TransformStream<JSONRPCResponse<O>, O>({
    transform: (chunk, controller) => {
      timer?.refresh();
      // `error` indicates it's an error message
      if ('error' in chunk) {
        throw toError(chunk.error.data, clientMetadata);
      }
      controller.enqueue(chunk.result);
    },
  });
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

/**
 * This function is a factory to create a TransformStream that will
 * transform a `Uint8Array` stream to a JSONRPC message stream.
 * The parsed messages will be validated with the provided messageParser, this
 * also infers the type of the stream output.
 * @param messageParser - Validates the JSONRPC messages, so you can select for a
 *  specific type of message
 * @param bufferByteLimit - sets the number of bytes buffered before throwing an
 *  error. This is used to avoid infinitely buffering the input.
 */
function parseHeadStream<T extends JSONRPCMessage>(
  messageParser: (message: unknown) => T,
  bufferByteLimit: number = 1024 * 1024,
): TransformStream<Uint8Array, T | Uint8Array> {
  const parser = new JSONParser({
    separator: '',
    paths: ['$'],
  });
  let bytesWritten: number = 0;
  let parsing = true;
  let ended = false;

  const endP = utils.promise();
  parser.onEnd = () => endP.resolveP();

  return new TransformStream<Uint8Array, T | Uint8Array>(
    {
      flush: async () => {
        if (!parser.isEnded) parser.end();
        await endP.p;
      },
      start: (controller) => {
        parser.onValue = async (value) => {
          const jsonMessage = messageParser(value.value);
          controller.enqueue(jsonMessage);
          bytesWritten = 0;
          parsing = false;
        };
      },
      transform: async (chunk, controller) => {
        if (parsing) {
          try {
            bytesWritten += chunk.byteLength;
            parser.write(chunk);
          } catch (e) {
            throw new rpcErrors.ErrorRPCParse(undefined, { cause: e });
          }
          if (bytesWritten > bufferByteLimit) {
            throw new rpcErrors.ErrorRPCMessageLength();
          }
        } else {
          // Wait for parser to end
          if (!ended) {
            parser.end();
            await endP.p;
            ended = true;
          }
          // Pass through normal chunks
          controller.enqueue(chunk);
        }
      },
    },
    { highWaterMark: 1 },
  );
}

export {
  parseJSONRPCRequest,
  parseJSONRPCRequestMessage,
  parseJSONRPCRequestNotification,
  parseJSONRPCResponseResult,
  parseJSONRPCResponseError,
  parseJSONRPCResponse,
  parseJSONRPCMessage,
  fromError,
  toError,
  clientInputTransformStream,
  clientOutputTransformStream,
  getHandlerTypes,
  parseHeadStream,
};
