import type { GestaltIdEncoded } from '../ids';
import type { TaskIdEncoded } from '../ids';
import type { TaskParameters, TaskStatus } from '../tasks/types';

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
