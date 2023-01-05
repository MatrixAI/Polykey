import type { POJO } from '../types';

/**
 * This is the JSON RPC request object. this is the generic message type used for the RPC.
 */
type JsonRpcRequest<T extends POJO | unknown = unknown> = {
  type: 'JsonRpcRequest';
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

type JsonRpcNotification<T extends POJO | unknown = unknown> = {
  type: 'JsonRpcNotification';
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

type JsonRpcResponseResult<T extends POJO | unknown = unknown> = {
  type: 'JsonRpcResponseResult';
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

type JsonRpcResponseError<T extends POJO | unknown = unknown> = {
  type: 'JsonRpcResponseError';
  // A String specifying the version of the JSON-RPC protocol. MUST be exactly "2.0".
  jsonrpc: '2.0';
  // This member is REQUIRED on error.
  //  This member MUST NOT exist if there was no error triggered during invocation.
  //  The value for this member MUST be an Object as defined in section 5.1.
  error: JsonRpcError<T>;
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

type JsonRpcError<T extends POJO | unknown = unknown> = {
  // A Number that indicates the error type that occurred.
  //  This MUST be an integer.
  code: number;
  // A String providing a short description of the error.
  //  The message SHOULD be limited to a concise single sentence.
  message: string;
  // A Primitive or Structured value that contains additional information about the error.
  //  This may be omitted.
  //  The value of this member is defined by the Server (e.g. detailed error information, nested errors etc.).
  data?: T;
};

type JsonRpcResponse<
  T extends POJO | unknown = unknown,
  K extends POJO | unknown = unknown,
> = JsonRpcResponseResult<T> | JsonRpcResponseError<K>;

type JsonRpcMessage<T extends POJO | unknown = unknown> =
  | JsonRpcRequest<T>
  | JsonRpcNotification<T>
  | JsonRpcResponseResult<T>
  | JsonRpcResponseError<T>;

export type {
  JsonRpcRequest,
  JsonRpcNotification,
  JsonRpcResponseResult,
  JsonRpcResponseError,
  JsonRpcError,
  JsonRpcResponse,
  JsonRpcMessage,
};
