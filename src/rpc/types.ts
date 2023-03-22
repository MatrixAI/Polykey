import type { ReadableStream, ReadableWritablePair } from 'stream/web';
import type { Handler } from './handlers';
import type { ContextCancellable } from '../contexts/types';
import type { JSONValue } from '../types';
import type {
  Caller,
  RawCaller,
  DuplexCaller,
  ServerCaller,
  ClientCaller,
  UnaryCaller,
} from './callers';
import type { NodeId } from '../nodes/types';
import type { Certificate } from '../keys/types';
import type { POJO } from '../types';

/**
 * This is the JSON RPC request object. this is the generic message type used for the RPC.
 */
type JSONRPCRequestMessage<T extends JSONValue = JSONValue> = {
  // A String specifying the version of the JSON-RPC protocol. MUST be exactly "2.0"
  jsonrpc: '2.0';
  // A String containing the name of the method to be invoked. Method names that begin with the word rpc followed by a
  //  period character (U+002E or ASCII 46) are reserved for rpc-internal methods and extensions and MUST NOT be used
  //  for anything else.
  method: string;
  // A Structured value that holds the parameter values to be used during the invocation of the method.
  //  This member MAY be omitted.
  params?: T;
  // An identifier established by the Client that MUST contain a String, Number, or NULL value if included.
  //  If it is not included it is assumed to be a notification. The value SHOULD normally not be Null [1] and Numbers
  //  SHOULD NOT contain fractional parts [2]
  id: string | number | null;
};

type JSONRPCRequestNotification<T extends JSONValue = JSONValue> = {
  // A String specifying the version of the JSON-RPC protocol. MUST be exactly "2.0"
  jsonrpc: '2.0';
  // A String containing the name of the method to be invoked. Method names that begin with the word rpc followed by a
  //  period character (U+002E or ASCII 46) are reserved for rpc-internal methods and extensions and MUST NOT be used
  //  for anything else.
  method: string;
  // A Structured value that holds the parameter values to be used during the invocation of the method.
  //  This member MAY be omitted.
  params?: T;
};

type JSONRPCResponseResult<T extends JSONValue = JSONValue> = {
  // A String specifying the version of the JSON-RPC protocol. MUST be exactly "2.0".
  jsonrpc: '2.0';
  // This member is REQUIRED on success.
  //  This member MUST NOT exist if there was an error invoking the method.
  //  The value of this member is determined by the method invoked on the Server.
  result: T;
  // This member is REQUIRED.
  //  It MUST be the same as the value of the id member in the Request Object.
  //  If there was an error in detecting the id in the Request object (e.g. Parse error/Invalid Request),
  //  it MUST be Null.
  id: string | number | null;
};

type JSONRPCResponseError = {
  // A String specifying the version of the JSON-RPC protocol. MUST be exactly "2.0".
  jsonrpc: '2.0';
  // This member is REQUIRED on error.
  //  This member MUST NOT exist if there was no error triggered during invocation.
  //  The value for this member MUST be an Object as defined in section 5.1.
  error: JSONRPCError;
  // This member is REQUIRED.
  //  It MUST be the same as the value of the id member in the Request Object.
  //  If there was an error in detecting the id in the Request object (e.g. Parse error/Invalid Request),
  //  it MUST be Null.
  id: string | number | null;
};

// The error codes from and including -32768 to -32000 are reserved for pre-defined errors. Any code within this range,
//  but not defined explicitly below is reserved for future use. The error codes are nearly the same as those suggested
//  for XML-RPC at the following url: http://xmlrpc-epi.sourceforge.net/specs/rfc.fault_codes.php
//
// code	message	meaning
//  -32700	Parse error	Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.
//  -32600	Invalid Request	The JSON sent is not a valid Request object.
//  -32601	Method not found	The method does not exist / is not available.
//  -32602	Invalid params	Invalid method parameter(s).
//  -32603	Internal error	Internal JSON-RPC error.
//  -32000 to -32099

type JSONRPCError = {
  // A Number that indicates the error type that occurred.
  //  This MUST be an integer.
  code: number;
  // A String providing a short description of the error.
  //  The message SHOULD be limited to a concise single sentence.
  message: string;
  // A Primitive or Structured value that contains additional information about the error.
  //  This may be omitted.
  //  The value of this member is defined by the Server (e.g. detailed error information, nested errors etc.).
  data?: JSONValue;
};

type JSONRPCRequest<T extends JSONValue = JSONValue> =
  | JSONRPCRequestMessage<T>
  | JSONRPCRequestNotification<T>;

type JSONRPCResponse<T extends JSONValue = JSONValue> =
  | JSONRPCResponseResult<T>
  | JSONRPCResponseError;

type JSONRPCMessage<T extends JSONValue = JSONValue> =
  | JSONRPCRequest<T>
  | JSONRPCResponse<T>;

/**
 * Proxy connection information
 * @property remoteNodeId - NodeId of the remote connecting node
 * @property remoteCertificates - Certificate chain of the remote connecting node
 * @property localHost - Proxy host of the local connecting node
 * @property localPort - Proxy port of the local connecting node
 * @property remoteHost - Proxy host of the remote connecting node
 * @property remotePort - Proxy port of the remote connecting node
 */
type ConnectionInfo = Partial<{
  remoteNodeId: NodeId;
  remoteCertificates: Array<Certificate>;
  localHost: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
}>;

// Handler types
type HandlerImplementation<I, O> = (
  input: I,
  connectionInfo: ConnectionInfo,
  ctx: ContextCancellable,
) => O;

type RawHandlerImplementation = HandlerImplementation<
  [ReadableStream<Uint8Array>, JSONRPCRequest],
  ReadableStream<Uint8Array>
>;

type DuplexHandlerImplementation<
  I extends JSONValue = JSONValue,
  O extends JSONValue = JSONValue,
> = HandlerImplementation<AsyncIterable<I>, AsyncIterable<O>>;

type ServerHandlerImplementation<
  I extends JSONValue = JSONValue,
  O extends JSONValue = JSONValue,
> = HandlerImplementation<I, AsyncIterable<O>>;

type ClientHandlerImplementation<
  I extends JSONValue = JSONValue,
  O extends JSONValue = JSONValue,
> = HandlerImplementation<AsyncIterable<I>, Promise<O>>;

type UnaryHandlerImplementation<
  I extends JSONValue = JSONValue,
  O extends JSONValue = JSONValue,
> = HandlerImplementation<I, Promise<O>>;

type ContainerType = Record<string, any>;

type StreamFactory = () => Promise<
  ReadableWritablePair<Uint8Array, Uint8Array>
>;

type MiddlewareFactory<FR, FW, RR, RW> = (header?: JSONRPCRequest) => {
  forward: ReadableWritablePair<FR, FW>;
  reverse: ReadableWritablePair<RR, RW>;
};

// Convenience callers

type UnaryCallerImplementation<
  I extends JSONValue = JSONValue,
  O extends JSONValue = JSONValue,
> = (parameters: I) => Promise<O>;

type ServerCallerImplementation<
  I extends JSONValue = JSONValue,
  O extends JSONValue = JSONValue,
> = (parameters: I) => Promise<ReadableStream<O>>;

type ClientCallerImplementation<
  I extends JSONValue = JSONValue,
  O extends JSONValue = JSONValue,
> = () => Promise<{ output: Promise<O>; writable: WritableStream<I> }>;

type DuplexCallerImplementation<
  I extends JSONValue = JSONValue,
  O extends JSONValue = JSONValue,
> = () => Promise<ReadableWritablePair<O, I>>;

type RawCallerImplementation = (
  headerParams: JSONValue,
) => Promise<ReadableWritablePair<Uint8Array, Uint8Array>>;

type ConvertDuplexCaller<T> = T extends DuplexCaller<infer I, infer O>
  ? DuplexCallerImplementation<I, O>
  : never;

type ConvertServerCaller<T> = T extends ServerCaller<infer I, infer O>
  ? ServerCallerImplementation<I, O>
  : never;

type ConvertClientCaller<T> = T extends ClientCaller<infer I, infer O>
  ? ClientCallerImplementation<I, O>
  : never;

type ConvertUnaryCaller<T> = T extends UnaryCaller<infer I, infer O>
  ? UnaryCallerImplementation<I, O>
  : never;

type ConvertCaller<T extends Caller> = T extends DuplexCaller
  ? ConvertDuplexCaller<T>
  : T extends ServerCaller
  ? ConvertServerCaller<T>
  : T extends ClientCaller
  ? ConvertClientCaller<T>
  : T extends UnaryCaller
  ? ConvertUnaryCaller<T>
  : T extends RawCaller
  ? RawCallerImplementation
  : never;

type ServerManifest = Record<string, Handler>;
type ClientManifest = Record<string, Caller>;

type HandlerType = 'DUPLEX' | 'SERVER' | 'CLIENT' | 'UNARY' | 'RAW';

type MapCallers<T extends ClientManifest> = {
  [K in keyof T]: ConvertCaller<T[K]>;
};

type ClientMetadata = {
  nodeId: NodeId;
  host: string;
  port: number;
  command: string;
} & POJO;

export type {
  JSONRPCRequestMessage,
  JSONRPCRequestNotification,
  JSONRPCResponseResult,
  JSONRPCResponseError,
  JSONRPCError,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCMessage,
  ConnectionInfo,
  HandlerImplementation,
  RawHandlerImplementation,
  DuplexHandlerImplementation,
  ServerHandlerImplementation,
  ClientHandlerImplementation,
  UnaryHandlerImplementation,
  ContainerType,
  StreamFactory,
  MiddlewareFactory,
  ServerManifest,
  ClientManifest,
  HandlerType,
  MapCallers,
  ClientMetadata,
};
