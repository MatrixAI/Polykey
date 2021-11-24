import type { PassThrough } from 'readable-stream';

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
  getExternalRefDelta?: (
    oid: string,
  ) => Promise<DeflatedObject | WrappedObject | RawObject>;
  pack?: Buffer;
};

type RawObject = {
  oid: string;
  type: 'blob' | 'tree' | 'commit' | 'tag';
  format: 'content';
  object: Buffer | string | Uint8Array;
  source?: string | undefined;
};

type WrappedObject = {
  oid: string;
  type: 'wrapped';
  format: 'wrapped';
  object: Buffer | string | Uint8Array;
  source?: string | undefined;
};

type DeflatedObject = {
  oid: string;
  type: 'deflated';
  format: 'deflated';
  object: Buffer | string | Uint8Array;
  source?: string | undefined;
};

export type {
  Refs,
  SymRefs,
  Ack,
  Packfile,
  Identity,
  Pack,
  PackIndex,
  RawObject,
  WrappedObject,
  DeflatedObject,
};
