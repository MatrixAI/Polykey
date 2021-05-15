type Config = {
  line: string;
  ref?: string;
  peeled?: string;
  oid?: string;
  comment?: boolean;
};

type Refs = {
  [key: string]: any;
};

type SymRefs = {
  [key: string]: any;
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

export type { Config, Refs, RefsAdResponse, Ack, Packfile, BufferEncoding };
