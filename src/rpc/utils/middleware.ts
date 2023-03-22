import type {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCResponseResult,
  MiddlewareFactory,
} from '../types';
import { TransformStream } from 'stream/web';
import * as rpcUtils from './utils';
import * as rpcErrors from '../errors';
import { promise } from '../../utils/index';
const jsonStreamParsers = require('@streamparser/json');

/**
 * This function is a factory to create a TransformStream that will
 * transform a `Uint8Array` stream to a JSONRPC message stream.
 * The parsed messages will be validated with the provided messageParser, this
 * also infers the type of the stream output.
 * @param messageParser - Validates the JSONRPC messages, so you can select for a
 *  specific type of message
 * @param byteLimit - sets the number of bytes buffered before throwing an
 *  error. This is used to avoid infinitely buffering the input.
 * @param firstMessage - This is a single message that is inserted into the
 *  front of the stream.
 */
function binaryToJsonMessageStream<T extends JSONRPCMessage>(
  messageParser: (message: unknown) => T,
  byteLimit: number = 1024 * 1024,
  firstMessage?: T,
): TransformStream<Uint8Array, T> {
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
        throw new rpcErrors.ErrorRPCParse(undefined, { cause: e });
      }
      if (bytesWritten > byteLimit) {
        throw new rpcErrors.ErrorRPCMessageLength();
      }
    },
  });
}

/**
 * This function is a factory for a TransformStream that will transform
 * JsonRPCMessages into the `Uint8Array` form. This is used for the stream
 * output.
 */
function jsonMessageToBinaryStream(): TransformStream<
  JSONRPCMessage,
  Uint8Array
> {
  return new TransformStream<JSONRPCMessage, Uint8Array>({
    transform: (chunk, controller) => {
      controller.enqueue(Buffer.from(JSON.stringify(chunk)));
    },
  });
}

/**
 * This function is a factory for creating a pass-through streamPair. It is used
 * as the default middleware for the middleware wrappers.
 */
const defaultMiddleware: MiddlewareFactory<
  JSONRPCRequest,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCResponse
> = () => {
  return {
    forward: new TransformStream(),
    reverse: new TransformStream(),
  };
};

/**
 * This convenience factory for creating wrapping middleware with the basic
 * message processing and parsing for the server middleware.
 * In the forward path, it will transform the binary stream into the validated
 * JsonRPCMessages and pipe it through the provided middleware.
 * The reverse path will pipe the output stream through the provided middleware
 * and then transform it back to a binary stream.
 * @param middleware - The provided middleware
 */
const defaultServerMiddlewareWrapper = (
  middleware: MiddlewareFactory<
    JSONRPCRequest,
    JSONRPCRequest,
    JSONRPCResponse,
    JSONRPCResponse
  > = defaultMiddleware,
) => {
  return (header: JSONRPCRequest) => {
    const inputTransformStream = binaryToJsonMessageStream(
      rpcUtils.parseJSONRPCRequest,
      undefined,
      header,
    );
    const outputTransformStream = new TransformStream<
      JSONRPCResponseResult,
      JSONRPCResponseResult
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

/**
 * This convenience factory for creating wrapping middleware with the basic
 * message processing and parsing for the server middleware.
 * The forward path will pipe the input through the provided middleware and then
 * transform it to the binary stream.
 * The reverse path will parse and validate the output and pipe it through the
 * provided middleware.
 * @param middleware - the provided middleware
 */
const defaultClientMiddlewareWrapper = (
  middleware: MiddlewareFactory<
    JSONRPCRequest,
    JSONRPCRequest,
    JSONRPCResponse,
    JSONRPCResponse
  > = defaultMiddleware,
): MiddlewareFactory<
  Uint8Array,
  JSONRPCRequest,
  JSONRPCResponse,
  Uint8Array
> => {
  return () => {
    const outputTransformStream = binaryToJsonMessageStream(
      rpcUtils.parseJSONRPCResponse,
      undefined,
    );
    const inputTransformStream = new TransformStream<
      JSONRPCRequest,
      JSONRPCRequest
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
