import type { Transformer, TransformerTransformCallback } from 'stream/web';
import type {
  JsonRpcError,
  JsonRpcMessage,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponseError,
  JsonRpcResponseResult,
} from 'rpc/types';
import type { POJO } from '../types';
import { TransformStream } from 'stream/web';
import * as rpcErrors from './errors';
import * as utils from '../utils';
import * as validationErrors from '../validation/errors';
import { promise } from '../utils';
const jsonStreamParsers = require('@streamparser/json');

class JsonToJsonMessage implements Transformer<Buffer, POJO> {
  protected buffer = Buffer.alloc(0);

  /**
   * This function finds the index of the closing `}` bracket of the top level
   * JSON object. It makes use of a JSON parser tokenizer to find the `{}`
   * tokens that are not within strings and counts them to find the top level
   * matching `{}` pair.
   */
  protected async findCompleteMessageIndex(input: Buffer): Promise<number> {
    const tokenizer = new jsonStreamParsers.Tokenizer();
    let braceCount = 0;
    let escapes = 0;
    const foundOffset = promise<number>();
    tokenizer.onToken = (tokenData) => {
      if (tokenData.token === jsonStreamParsers.TokenType.LEFT_BRACE) {
        braceCount += 1;
      } else if (tokenData.token === jsonStreamParsers.TokenType.RIGHT_BRACE) {
        braceCount += -1;
        if (braceCount === 0) foundOffset.resolveP(tokenData.offset + escapes);
      } else if (tokenData.token === jsonStreamParsers.TokenType.STRING) {
        const string = tokenData.value as string;
        // `JSON.stringify` changes the length of a string when special
        //  characters are present. This makes the offset we find wrong when
        //  getting the substring. We need to compensate for this by getting the
        //  difference in string length.
        escapes += JSON.stringify([string]).length - string.length - 4;
      }
    };
    tokenizer.onEnd = () => foundOffset.resolveP(-1);
    try {
      tokenizer.write(input);
    } catch (e) {
      throw new rpcErrors.ErrorRpcParse('TMP StreamParseError', { cause: e });
    }
    try {
      tokenizer.end();
    } catch {
      foundOffset.resolveP(-1);
    }
    return await foundOffset.p;
  }

  transform: TransformerTransformCallback<Buffer, POJO> = async (
    chunk,
    controller,
  ) => {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length > 0) {
      const index = await this.findCompleteMessageIndex(this.buffer);
      if (index <= 0) break;
      const outputBuffer = this.buffer.subarray(0, index + 1);
      try {
        controller.enqueue(JSON.parse(outputBuffer.toString('utf-8')));
      } catch (e) {
        throw new rpcErrors.ErrorRpcParse(undefined, { cause: e });
      }
      this.buffer = this.buffer.subarray(index + 1);
    }
  };
}

// TODO: rename to something more descriptive?
class JsonToJsonMessageStream extends TransformStream {
  constructor() {
    super(new JsonToJsonMessage());
  }
}

function parseJsonRpcRequest<T extends POJO>(
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
  if ('params' in message && !utils.isObject(message.params)) {
    throw new validationErrors.ErrorParse('`params` property must be a POJO');
  }
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

function parseJsonRpcNotification<T extends POJO>(
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
  if ('params' in message && !utils.isObject(message.params)) {
    throw new validationErrors.ErrorParse('`params` property must be a POJO');
  }
  if ('id' in message) {
    throw new validationErrors.ErrorParse('`id` property must not be defined');
  }
  return message as JsonRpcNotification<T>;
}

function parseJsonRpcResponseResult<T extends POJO>(
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
  if (!utils.isObject(message.result)) {
    throw new validationErrors.ErrorParse('`result` property must be a POJO');
  }
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

function parseJsonRpcResponseError<T extends POJO>(
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

function parseJsonRpcError<T extends POJO>(message: unknown): JsonRpcError<T> {
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
  if ('data' in message && !utils.isObject(message.data)) {
    throw new validationErrors.ErrorParse('`data` property must be a POJO');
  }
  return message as JsonRpcError<T>;
}

function parseJsonRpcMessage<T extends POJO>(
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
  parseJsonRpcRequest,
  parseJsonRpcNotification,
  parseJsonRpcResponseResult,
  parseJsonRpcResponseError,
  parseJsonRpcMessage,
};
