import type { GestaltIdEncoded } from '../ids';

type VertexEventIdentifier = {
  vertex: GestaltIdEncoded;
  parent?: GestaltIdEncoded;
};

type VertexEventError = VertexEventIdentifier & {
  message?: string;
  code?: number;
};

export type { VertexEventIdentifier, VertexEventError };
