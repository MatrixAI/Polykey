import type { JSONValue } from 'types';
import type { ContainerType } from 'rpc/types';
import type { ReadableStream } from 'stream/web';
import type { JSONRPCRequest } from 'rpc/types';
import type { ConnectionInfo } from './types';
import type { ContextTimed } from '../contexts/types';

abstract class Handler<
  Container extends ContainerType = ContainerType,
  Input extends JSONValue = JSONValue,
  Output extends JSONValue = JSONValue,
> {
  protected _inputType: Input;
  protected _outputType: Output;
  public timeout?: number;

  constructor(protected container: Container) {}
}

abstract class RawHandler<
  Container extends ContainerType = ContainerType,
> extends Handler<Container> {
  abstract handle(
    input: [JSONRPCRequest, ReadableStream<Uint8Array>],
    connectionInfo: ConnectionInfo,
    ctx: ContextTimed,
  ): ReadableStream<Uint8Array>;
}

abstract class DuplexHandler<
  Container extends ContainerType = ContainerType,
  Input extends JSONValue = JSONValue,
  Output extends JSONValue = JSONValue,
> extends Handler<Container, Input, Output> {
  /**
   * Note that if the output has an error, the handler will not see this as an
   * error. If you need to handle any clean up it should be handled in a
   * `finally` block and check the abort signal for potential errors.
   */
  abstract handle(
    input: AsyncIterable<Input>,
    connectionInfo: ConnectionInfo,
    ctx: ContextTimed,
  ): AsyncIterable<Output>;
}

abstract class ServerHandler<
  Container extends ContainerType = ContainerType,
  Input extends JSONValue = JSONValue,
  Output extends JSONValue = JSONValue,
> extends Handler<Container, Input, Output> {
  abstract handle(
    input: Input,
    connectionInfo: ConnectionInfo,
    ctx: ContextTimed,
  ): AsyncIterable<Output>;
}

abstract class ClientHandler<
  Container extends ContainerType = ContainerType,
  Input extends JSONValue = JSONValue,
  Output extends JSONValue = JSONValue,
> extends Handler<Container, Input, Output> {
  abstract handle(
    input: AsyncIterable<Input>,
    connectionInfo: ConnectionInfo,
    ctx: ContextTimed,
  ): Promise<Output>;
}

abstract class UnaryHandler<
  Container extends ContainerType = ContainerType,
  Input extends JSONValue = JSONValue,
  Output extends JSONValue = JSONValue,
> extends Handler<Container, Input, Output> {
  abstract handle(
    input: Input,
    connectionInfo: ConnectionInfo,
    ctx: ContextTimed,
  ): Promise<Output>;
}

export {
  Handler,
  RawHandler,
  DuplexHandler,
  ServerHandler,
  ClientHandler,
  UnaryHandler,
};
