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

export type { Config, Refs, RefsAdResponse, Ack, Packfile };
