import type { JSONValue } from '../types';

type ClientDataAndMetadata<T extends JSONValue> = {
  metadata: JSONValue & {
    Authorization?: string;
  };
  data: T;
};

export type { ClientDataAndMetadata };
