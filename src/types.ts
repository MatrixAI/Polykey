import type fs from 'node:fs';
import type {
  JSONRPCRequest,
  JSONRPCResponse,
  MiddlewareFactory,
} from '@matrixai/rpc';
import type { PasswordOpsLimit, PasswordMemLimit } from './keys/types.js';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
} from './client/types.js';
import type { SeedNodes } from './nodes/types.js';
export type * from 'acl/types.js';
export type * from 'audit/types.js';
export type * from 'claims/types.js';
export type * as clientTypes from 'client/types.js';
export type * from 'discovery/types.js';
export type * from 'gestalts/types.js';
export type * from 'git/types.js';
export type * from 'identities/types.js';
export type * from 'ids/types.js';
export type * from 'keys/types.js';
export type * from 'network/types.js';
export type * from 'nodes/types.js';
export type * from 'notifications/types.js';
export type * from 'schema/types.js';
export type * from 'sessions/types.js';
export type * from 'sigchain/types.js';
export type * from 'status/types.js';
export type * from 'tokens/types.js';
export type * from 'vaults/types.js';
export type * from 'workers/types.js';

/**
 * Plain data dictionary
 */
type POJO = { [key: string]: any };

/**
 * Strict JSON values.
 * These are the only types that JSON can represent.
 * All input values are encoded into JSON.
 * Take note that `undefined` values are not allowed.
 * `JSON.stringify` automatically converts `undefined` to `null.
 */
type JSONValue =
  | { [key: string]: JSONValue }
  | Array<JSONValue>
  | string
  | number
  | boolean
  | null;

/**
 * Opaque types are wrappers of existing types
 * that require smart constructors
 */
type Opaque<K, T> = T & { readonly [brand]: K };
declare const brand: unique symbol;

/**
 * Generic callback
 */
type Callback<P extends Array<any> = [], R = any, E extends Error = Error> = {
  (e: E, ...params: Partial<P>): R;
  (e?: null | undefined, ...params: P): R;
};

/**
 * Non-empty array
 */
type NonEmptyArray<T> = [T, ...T[]];

/**
 * Allows extension of constructors that use POJOs
 */
type AbstractConstructorParameters<T> = ConstructorParameters<
  (new (...args: any) => any) & T
>;

type Initial<T extends any[]> = T extends [...infer Head, any] ? Head : any[];
type InitialParameters<T extends (...args: any) => any> = Initial<
  Parameters<T>
>;

/**
 * Any type that can be turned into a string
 */
interface ToString {
  toString(): string;
}

/**
 * Recursive readonly
 */
type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };

/**
 * Recursive partial
 */
type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Wrap a type to be reference counted
 * Useful for when we need to garbage collect data
 */
type Ref<T> = {
  count: number;
  object: T;
};

/**
 * Use Timer to control timers
 */
type Timer = {
  timer: ReturnType<typeof setTimeout>;
  timedOut: boolean;
  timerP: Promise<void>;
};

/**
 * Deconstructed promise
 */
type PromiseDeconstructed<T> = {
  p: Promise<T>;
  resolveP: (value: T | PromiseLike<T>) => void;
  rejectP: (reason?: any) => void;
};

/**
 * Minimal filesystem type
 * Based on the required operations from fs/promises
 * Implement this with platform-specific filesystem
 */
interface FileSystem {
  promises: {
    access: typeof fs.promises.access;
    rm: typeof fs.promises.rm;
    rmdir: typeof fs.promises.rmdir;
    stat: typeof fs.promises.stat;
    readFile: typeof fs.promises.readFile;
    writeFile: typeof fs.promises.writeFile;
    copyFile: typeof fs.promises.copyFile;
    mkdir: typeof fs.promises.mkdir;
    readdir: typeof fs.promises.readdir;
    rename: typeof fs.promises.rename;
    open: typeof fs.promises.open;
    mkdtemp: typeof fs.promises.mkdtemp;
  };
  constants: typeof fs.constants;
}

type FileHandle = fs.promises.FileHandle;

type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 * Functional properties of an object
 */
type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>;

type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? never : K;
}[keyof T];

/**
 * Non-functional properties of an object
 */
type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;

/**
 * Finds the key type corresponding to a value type for a record type
 */
type RecordKeyFromValue<T, V> = {
  [K in keyof T]: V extends T[K] ? K : never;
}[keyof T];

/**
 * Inverses a record type, "flipping a record"
 */
type InverseRecord<
  M extends Record<string | number | symbol, string | number | symbol>,
> = {
  [K in M[keyof M]]: RecordKeyFromValue<M, K>;
};

/**
 * Used when an empty object is needed.
 * Defined here with a linter override to avoid a false positive.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
type ObjectEmpty = {};

/**
 * Optional configuration for `PolykeyAgent`.
 */
type PolykeyAgentOptions = {
  nodePath: string;
  clientServiceHost: string;
  clientServicePort: number;
  agentServiceHost: string;
  agentServicePort: number;
  network: string;
  seedNodes: SeedNodes;
  workers: number;
  ipv6Only: boolean;
  keys: {
    passwordOpsLimit: PasswordOpsLimit;
    passwordMemLimit: PasswordMemLimit;
    strictMemoryLock: boolean;
    certDuration: number;
    certRenewLeadTime: number;
    recoveryCode: string;
  } & (
    | ObjectEmpty
    | { recoveryCode: string }
    | { privateKey: Buffer }
    | { privateKeyPath: string }
  );
  client: {
    keepAliveTimeoutTime: number;
    keepAliveIntervalTime: number;
    rpcCallTimeoutTime: number;
    rpcParserBufferSize: number;
    rpcMiddlewareFactory?: MiddlewareFactory<
      JSONRPCRequest<ClientRPCRequestParams>,
      JSONRPCRequest<ClientRPCRequestParams>,
      JSONRPCResponse<ClientRPCResponseResult>,
      JSONRPCResponse<ClientRPCResponseResult>
    >;
  };
  nodes: {
    connectionIdleTimeoutTimeMin: number;
    connectionIdleTimeoutTimeScale: number;
    connectionFindConcurrencyLimit: number;
    connectionConnectTimeoutTime: number;
    connectionKeepAliveTimeoutTime: number;
    connectionKeepAliveIntervalTime: number;
    connectionHolePunchIntervalTime: number;
    connectionInitialMaxStreamsBidi: number;
    connectionInitialMaxStreamsUni: number;
    rpcCallTimeoutTime: number;
    rpcParserBufferSize: number;
    dnsServers: Array<string> | undefined;
  };
  mdns: {
    groups: Array<string>;
    port: number;
  };
  versionMetadata: POJO;
};

export type {
  POJO,
  JSONValue,
  Opaque,
  brand,
  Callback,
  NonEmptyArray,
  AbstractConstructorParameters,
  Initial,
  InitialParameters,
  ToString,
  DeepReadonly,
  DeepPartial,
  Ref,
  Timer,
  PromiseDeconstructed,
  FileSystem,
  FileHandle,
  FunctionProperties,
  NonFunctionProperties,
  RecordKeyFromValue,
  InverseRecord,
  ObjectEmpty,
  PolykeyAgentOptions,
};
