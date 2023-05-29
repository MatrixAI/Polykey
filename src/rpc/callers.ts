import type { HandlerType } from './types';
import type { JSONValue } from '../types';

abstract class Caller<
  Input extends JSONValue = JSONValue,
  Output extends JSONValue = JSONValue,
> {
  protected _inputType: Input;
  protected _outputType: Output;
  // Need this to distinguish the classes when inferring types
  abstract type: HandlerType;
}

class RawCaller extends Caller {
  public type: 'RAW' = 'RAW' as const;
}

class DuplexCaller<
  Input extends JSONValue = JSONValue,
  Output extends JSONValue = JSONValue,
> extends Caller<Input, Output> {
  public type: 'DUPLEX' = 'DUPLEX' as const;
}

class ServerCaller<
  Input extends JSONValue = JSONValue,
  Output extends JSONValue = JSONValue,
> extends Caller<Input, Output> {
  public type: 'SERVER' = 'SERVER' as const;
}

class ClientCaller<
  Input extends JSONValue = JSONValue,
  Output extends JSONValue = JSONValue,
> extends Caller<Input, Output> {
  public type: 'CLIENT' = 'CLIENT' as const;
}

class UnaryCaller<
  Input extends JSONValue = JSONValue,
  Output extends JSONValue = JSONValue,
> extends Caller<Input, Output> {
  public type: 'UNARY' = 'UNARY' as const;
}

export {
  Caller,
  RawCaller,
  DuplexCaller,
  ServerCaller,
  ClientCaller,
  UnaryCaller,
};
