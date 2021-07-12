import type { PassThrough } from 'readable-stream';
import type { DeflatedObject, WrappedObject, RawObject } from 'isomorphic-git';

type Config = {
  line: string;
  ref?: string;
  peeled?: string;
  oid?: string;
  comment?: boolean;
};

type Refs = {
  [key: string]: Config;
};

type SymRefs = {
  [key: string]: string;
};

type RefsAdResponse = {
  capabilities: Array<string>;
  refs: Refs;
  symrefs: SymRefs;
};

type Ack = {
  oid: string;
};

type Packfile = {
  [key: string]: any;
};

type Identity = {
  name: string;
  email: string;
  timestamp: number;
  timezoneOffset: number;
};

type Pack = {
  packstream: PassThrough;
  shallows: Set<string>;
  unshallows: Set<string>;
  acks: Array<Ack>;
};

type PackIndex = {
  hashes: string[];
  offsets: Map<string, number>;
  packfileSha: string;
  getExternalRefDelta: (
    oid: string,
  ) => Promise<DeflatedObject | WrappedObject | RawObject>;
  pack?: Buffer;
};

type BufferEncoding =
  | 'utf8'
  | 'hex'
  | 'ascii'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'latin1'
  | 'binary';

export type {
  Refs,
  RefsAdResponse,
  Ack,
  Packfile,
  BufferEncoding,
  Identity,
  Pack,
  PackIndex,
};
