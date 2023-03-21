import type { JSONValue } from 'types';
import type { ContainerType } from 'rpc/types';
import type { ReadableStream } from 'stream/web';
import type { JsonRpcRequest } from 'rpc/types';
import type { ConnectionInfo } from './types';
import type { ContextCancellable } from '../contexts/types';

abstract class Handler<
  Container extends ContainerType = ContainerType,
  Input extends JSONValue = JSONValue,
  Output extends JSONValue = JSONValue,
> {
  protected _inputType: Input;
  protected _outputType: Output;

  constructor(protected container: Container) {}
}

abstract class RawHandler<
  Container extends ContainerType = ContainerType,
> extends Handler<Container> {
  abstract handle(
    input: [ReadableStream<Uint8Array>, JsonRpcRequest],
    connectionInfo: ConnectionInfo,
    ctx: ContextCancellable,
  ): ReadableStream<Uint8Array>;
}

abstract class DuplexHandler<
  Container extends ContainerType = ContainerType,
  Input extends JSONValue = JSONValue,
  Output extends JSONValue = JSONValue,
> extends Handler<Container, Input, Output> {
  abstract handle(
    input: AsyncIterable<Input>,
    connectionInfo: ConnectionInfo,
    ctx: ContextCancellable,
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
    ctx: ContextCancellable,
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
    ctx: ContextCancellable,
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
    ctx: ContextCancellable,
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
