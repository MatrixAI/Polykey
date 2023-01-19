import type {
  Transformer,
  TransformerTransformCallback,
  TransformerStartCallback,
} from 'stream/web';
import type {
  JsonRpcError,
  JsonRpcMessage,
  JsonRpcRequestNotification,
  JsonRpcRequestMessage,
  JsonRpcResponseError,
  JsonRpcResponseResult,
  JsonRpcRequest,
  JsonRpcResponse,
} from 'RPC/types';
import type { JSONValue } from '../types';
import { TransformStream } from 'stream/web';
import * as rpcErrors from './errors';
import * as utils from '../utils';
import * as validationErrors from '../validation/errors';
const jsonStreamParsers = require('@streamparser/json');

class JsonToJsonMessage<T extends JsonRpcMessage>
  implements Transformer<Buffer, T>
{
  protected bytesWritten: number = 0;

  constructor(
    protected messageParser: (message: unknown) => T,
    protected byteLimit: number,
  ) {}

  protected parser = new jsonStreamParsers.JSONParser({
    separator: '',
    paths: ['$'],
  });

  start: TransformerStartCallback<T> = async (controller) => {
    this.parser.onValue = (value) => {
      const jsonMessage = this.messageParser(value.value);
      controller.enqueue(jsonMessage);
      this.bytesWritten = 0;
    };
  };

  transform: TransformerTransformCallback<Buffer, T> = async (chunk) => {
    try {
      this.bytesWritten += chunk.byteLength;
      this.parser.write(chunk);
    } catch (e) {
      throw new rpcErrors.ErrorRpcParse(undefined, { cause: e });
    }
    if (this.bytesWritten > this.byteLimit) {
      throw new rpcErrors.ErrorRpcMessageLength();
    }
  };
}

// TODO: rename to something more descriptive?
class JsonToJsonMessageStream<T extends JsonRpcMessage> extends TransformStream<
  Buffer,
  T
> {
  constructor(
    messageParser: (message: unknown) => T,
    byteLimit: number = 1024 * 1024,
  ) {
    super(new JsonToJsonMessage(messageParser, byteLimit));
  }
}

class JsonMessageToJson implements Transformer<JsonRpcMessage, Buffer> {
  transform: TransformerTransformCallback<JsonRpcMessage, Buffer> = async (
    chunk,
    controller,
  ) => {
    controller.enqueue(Buffer.from(JSON.stringify(chunk)));
  };
}

// TODO: rename to something more descriptive?
class JsonMessageToJsonStream extends TransformStream<JsonRpcMessage, Buffer> {
  constructor() {
    super(new JsonMessageToJson());
  }
}

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
 * Serializes Error instances into GRPC errors
 * Use this on the sending side to send exceptions
 * Do not send exceptions to clients you do not trust
 * If sending to an agent (rather than a client), set sensitive to true to
 * prevent sensitive information from being sent over the network
 */
function fromError(error: Error, sensitive: boolean = false) {
  if (sensitive) {
    return { error: JSON.stringify(error, sensitiveReplacer) };
  } else {
    return { error: JSON.stringify(error, replacer) };
  }
}

export {
  JsonToJsonMessageStream,
  JsonMessageToJsonStream,
  parseJsonRpcRequest,
  parseJsonRpcRequestMessage,
  parseJsonRpcRequestNotification,
  parseJsonRpcResponseResult,
  parseJsonRpcResponseError,
  parseJsonRpcResponse,
  parseJsonRpcMessage,
  fromError,
};
