import type { GestaltIdEncoded } from '../ids/index.js';
import type { TaskIdEncoded } from '../ids/index.js';
import type { TaskParameters, TaskStatus } from '../tasks/types.js';

type VertexEventIdentifier = {
  vertex: GestaltIdEncoded;
  parent?: GestaltIdEncoded;
};

type VertexEventError = VertexEventIdentifier & {
  message?: string;
  code?: number;
};

type DiscoveryQueueInfo = {
  id: TaskIdEncoded;
  status: TaskStatus;
  parameters: TaskParameters;
  delay: number;
  deadline: number;
  priority: number;
  created: number;
  scheduled: number;
};

export type { VertexEventIdentifier, VertexEventError, DiscoveryQueueInfo };
