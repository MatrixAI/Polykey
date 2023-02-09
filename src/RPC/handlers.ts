import type { JSONValue } from 'types';
import type {
  ClientHandlerImplementation,
  DuplexHandlerImplementation,
  RawHandlerImplementation,
  ServerHandlerImplementation,
  UnaryHandlerImplementation,
  ContainerType,
} from 'RPC/types';

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
  abstract handle: RawHandlerImplementation;
}

abstract class DuplexHandler<
  Container extends ContainerType = ContainerType,
  Input extends JSONValue = JSONValue,
  Output extends JSONValue = JSONValue,
> extends Handler<Container, Input, Output> {
  abstract handle: DuplexHandlerImplementation<Input, Output>;
}

abstract class ServerHandler<
  Container extends ContainerType = ContainerType,
  Input extends JSONValue = JSONValue,
  Output extends JSONValue = JSONValue,
> extends Handler<Container, Input, Output> {
  abstract handle: ServerHandlerImplementation<Input, Output>;
}

abstract class ClientHandler<
  Container extends ContainerType = ContainerType,
  Input extends JSONValue = JSONValue,
  Output extends JSONValue = JSONValue,
> extends Handler<Container, Input, Output> {
  abstract handle: ClientHandlerImplementation<Input, Output>;
}

abstract class UnaryHandler<
  Container extends ContainerType = ContainerType,
  Input extends JSONValue = JSONValue,
  Output extends JSONValue = JSONValue,
> extends Handler<Container, Input, Output> {
  abstract handle: UnaryHandlerImplementation<Input, Output>;
}

export {
  Handler,
  RawHandler,
  DuplexHandler,
  ServerHandler,
  ClientHandler,
  UnaryHandler,
};
