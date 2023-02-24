import type {
  JsonRpcMessage,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcResponseResult,
  MiddlewareFactory,
} from './types';
import { TransformStream } from 'stream/web';
import * as rpcErrors from './errors';
import * as rpcUtils from './utils';
import { promise } from '../utils';
const jsonStreamParsers = require('@streamparser/json');

function binaryToJsonMessageStream<T extends JsonRpcMessage>(
  messageParser: (message: unknown) => T,
  byteLimit: number = 1024 * 1024,
  firstMessage?: T,
) {
  const parser = new jsonStreamParsers.JSONParser({
    separator: '',
    paths: ['$'],
  });
  let bytesWritten: number = 0;

  return new TransformStream<Uint8Array, T>({
    flush: async () => {
      // Avoid potential race conditions by allowing parser to end first
      const waitP = promise();
      parser.onEnd = () => waitP.resolveP();
      parser.end();
      await waitP.p;
    },
    start: (controller) => {
      if (firstMessage != null) controller.enqueue(firstMessage);
      parser.onValue = (value) => {
        const jsonMessage = messageParser(value.value);
        controller.enqueue(jsonMessage);
        bytesWritten = 0;
      };
    },
    transform: (chunk) => {
      try {
        bytesWritten += chunk.byteLength;
        parser.write(chunk);
      } catch (e) {
        throw new rpcErrors.ErrorRpcParse(undefined, { cause: e });
      }
      if (bytesWritten > byteLimit) {
        throw new rpcErrors.ErrorRpcMessageLength();
      }
    },
  });
}

function jsonMessageToBinaryStream() {
  return new TransformStream<JsonRpcMessage, Uint8Array>({
    transform: (chunk, controller) => {
      controller.enqueue(Buffer.from(JSON.stringify(chunk)));
    },
  });
}

const defaultMiddleware: MiddlewareFactory<
  JsonRpcRequest,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcResponse
> = () => {
  return {
    forward: new TransformStream(),
    reverse: new TransformStream(),
  };
};

const defaultServerMiddlewareWrapper = (
  middleware: MiddlewareFactory<
    JsonRpcRequest,
    JsonRpcRequest,
    JsonRpcResponse,
    JsonRpcResponse
  > = defaultMiddleware,
) => {
  return (header: JsonRpcRequest) => {
    const inputTransformStream = binaryToJsonMessageStream(
      rpcUtils.parseJsonRpcRequest,
      undefined,
      header,
    );
    const outputTransformStream = new TransformStream<
      JsonRpcResponseResult,
      JsonRpcResponseResult
    >();

    const middleMiddleware = middleware(header);

    const forwardReadable = inputTransformStream.readable.pipeThrough(
      middleMiddleware.forward,
    ); // Usual middleware here
    const reverseReadable = outputTransformStream.readable
      .pipeThrough(middleMiddleware.reverse) // Usual middleware here
      .pipeThrough(jsonMessageToBinaryStream());

    return {
      forward: {
        readable: forwardReadable,
        writable: inputTransformStream.writable,
      },
      reverse: {
        readable: reverseReadable,
        writable: outputTransformStream.writable,
      },
    };
  };
};

const defaultClientMiddlewareWrapper = (
  middleware: MiddlewareFactory<
    JsonRpcRequest,
    JsonRpcRequest,
    JsonRpcResponse,
    JsonRpcResponse
  > = defaultMiddleware,
): MiddlewareFactory<
  Uint8Array,
  JsonRpcRequest,
  JsonRpcResponse,
  Uint8Array
> => {
  return () => {
    const outputTransformStream = binaryToJsonMessageStream(
      rpcUtils.parseJsonRpcResponse,
      undefined,
    );
    const inputTransformStream = new TransformStream<
      JsonRpcRequest,
      JsonRpcRequest
    >();

    const middleMiddleware = middleware();
    const forwardReadable = inputTransformStream.readable
      .pipeThrough(middleMiddleware.forward) // Usual middleware here
      .pipeThrough(jsonMessageToBinaryStream());
    const reverseReadable = outputTransformStream.readable.pipeThrough(
      middleMiddleware.reverse,
    ); // Usual middleware here

    return {
      forward: {
        readable: forwardReadable,
        writable: inputTransformStream.writable,
      },
      reverse: {
        readable: reverseReadable,
        writable: outputTransformStream.writable,
      },
    };
  };
};

export {
  binaryToJsonMessageStream,
  jsonMessageToBinaryStream,
  defaultMiddleware,
  defaultServerMiddlewareWrapper,
  defaultClientMiddlewareWrapper,
};
