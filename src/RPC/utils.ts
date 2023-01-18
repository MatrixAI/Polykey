import type {
  Transformer,
  TransformerTransformCallback,
  TransformerStartCallback,
} from 'stream/web';
import type {
  JsonRpcError,
  JsonRpcMessage,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponseError,
  JsonRpcResponseResult,
} from 'RPC/types';
import type { JSONValue } from '../types';
import { TransformStream } from 'stream/web';
import * as rpcErrors from './errors';
import * as rpcUtils from './utils';
import * as utils from '../utils';
import * as validationErrors from '../validation/errors';
import { ErrorRpcMessageLength } from "./errors";
const jsonStreamParsers = require('@streamparser/json');

class JsonToJsonMessage implements Transformer<Buffer, JsonRpcMessage> {
  protected bytesWritten: number = 0;

  constructor(protected byteLimit: number) {}

  protected parser = new jsonStreamParsers.JSONParser({
    separator: '',
    paths: ['$'],
  });

  start: TransformerStartCallback<JsonRpcMessage> = async (controller) => {
    this.parser.onValue = (value) => {
      const jsonMessage = rpcUtils.parseJsonRpcMessage(value.value);
      controller.enqueue(jsonMessage);
      this.bytesWritten = 0;
    };
  };

  transform: TransformerTransformCallback<Buffer, JsonRpcMessage> = async (
    chunk,
    _controller,
  ) => {
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
class JsonToJsonMessageStream extends TransformStream<Buffer, JsonRpcMessage> {
  constructor(byteLimit: number = 1024 * 1024) {
    super(new JsonToJsonMessage(byteLimit));
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
  if (!('type' in message)) {
    throw new validationErrors.ErrorParse('`type` property must be defined');
  }
  if (typeof message.type !== 'string') {
    throw new validationErrors.ErrorParse('`type` property must be a string');
  }
  if (message.type !== 'JsonRpcRequest') {
    throw new validationErrors.ErrorParse(
      '`type` property must be "JsonRpcRequest"',
    );
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
  return message as JsonRpcRequest<T>;
}

function parseJsonRpcNotification<T extends JSONValue>(
  message: unknown,
): JsonRpcNotification<T> {
  if (!utils.isObject(message)) {
    throw new validationErrors.ErrorParse('must be a JSON POJO');
  }
  if (!('type' in message)) {
    throw new validationErrors.ErrorParse('`type` property must be defined');
  }
  if (typeof message.type !== 'string') {
    throw new validationErrors.ErrorParse('`type` property must be a string');
  }
  if (message.type !== 'JsonRpcNotification') {
    throw new validationErrors.ErrorParse(
      '`type` property must be "JsonRpcRequest"',
    );
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
  if ('id' in message) {
    throw new validationErrors.ErrorParse('`id` property must not be defined');
  }
  return message as JsonRpcNotification<T>;
}

function parseJsonRpcResponseResult<T extends JSONValue>(
  message: unknown,
): JsonRpcResponseResult<T> {
  if (!utils.isObject(message)) {
    throw new validationErrors.ErrorParse('must be a JSON POJO');
  }
  if (!('type' in message)) {
    throw new validationErrors.ErrorParse('`type` property must be defined');
  }
  if (typeof message.type !== 'string') {
    throw new validationErrors.ErrorParse('`type` property must be a string');
  }
  if (message.type !== 'JsonRpcResponseResult') {
    throw new validationErrors.ErrorParse(
      '`type` property must be "JsonRpcRequest"',
    );
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

function parseJsonRpcResponseError<T extends JSONValue>(
  message: unknown,
): JsonRpcResponseError<T> {
  if (!utils.isObject(message)) {
    throw new validationErrors.ErrorParse('must be a JSON POJO');
  }
  if (!('type' in message)) {
    throw new validationErrors.ErrorParse('`type` property must be defined');
  }
  if (typeof message.type !== 'string') {
    throw new validationErrors.ErrorParse('`type` property must be a string');
  }
  if (message.type !== 'JsonRpcResponseError') {
    throw new validationErrors.ErrorParse(
      '`type` property must be "JsonRpcResponseError"',
    );
  }
  if ('result' in message) {
    throw new validationErrors.ErrorParse(
      '`result` property must not be defined',
    );
  }
  if (!('error' in message)) {
    throw new validationErrors.ErrorParse('`error` property must be defined');
  }
  parseJsonRpcError<T>(message.error);
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
  return message as JsonRpcResponseError<T>;
}

function parseJsonRpcError<T extends JSONValue>(
  message: unknown,
): JsonRpcError<T> {
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
  return message as JsonRpcError<T>;
}

function parseJsonRpcMessage<T extends JSONValue>(
  message: unknown,
): JsonRpcMessage<T> {
  if (!utils.isObject(message)) {
    throw new validationErrors.ErrorParse('must be a JSON POJO');
  }
  if (!('type' in message)) {
    throw new validationErrors.ErrorParse('`type` property must be defined');
  }
  if (typeof message.type !== 'string') {
    throw new validationErrors.ErrorParse('`type` property must be a string');
  }
  if (!('jsonrpc' in message)) {
    throw new validationErrors.ErrorParse('`jsonrpc` property must be defined');
  }
  if (message.jsonrpc !== '2.0') {
    throw new validationErrors.ErrorParse(
      '`jsonrpc` property must be a string of "2.0"',
    );
  }
  switch (message.type) {
    case 'JsonRpcRequest':
      return parseJsonRpcRequest<T>(message);
    case 'JsonRpcNotification':
      return parseJsonRpcNotification<T>(message);
    case 'JsonRpcResponseResult':
      return parseJsonRpcResponseResult<T>(message);
    case 'JsonRpcResponseError':
      return parseJsonRpcResponseError<T>(message);
    default:
      throw new validationErrors.ErrorParse(
        '`type` property must be a valid type',
      );
  }
}

export {
  JsonToJsonMessageStream,
  JsonMessageToJsonStream,
  parseJsonRpcRequest,
  parseJsonRpcNotification,
  parseJsonRpcResponseResult,
  parseJsonRpcResponseError,
  parseJsonRpcMessage,
};
