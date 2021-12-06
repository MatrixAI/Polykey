import type { NodeId } from '../nodes/types';
import type { Host, Port } from '../network/types';

type StatusStarting = {
  status: 'STARTING';
  data: {
    pid: number;
    [key: string]: any;
  };
};

type StatusLive = {
  status: 'LIVE';
  data: {
    pid: number;
    nodeId: NodeId;
    clientHost: Host;
    clientPort: Port;
    [key: string]: any;
  };
};

type StatusStopping = {
  status: 'STOPPING';
  data: {
    pid: number;
    [key: string]: any;
  };
};

type StatusDead = {
  status: 'DEAD';
  data: {
    [key: string]: any;
  };
};

type StatusInfo = StatusStarting | StatusLive | StatusStopping | StatusDead;

export type {
  StatusInfo,
  StatusStarting,
  StatusLive,
  StatusStopping,
  StatusDead,
};
