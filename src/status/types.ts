import type { NodeId } from '../ids/types';

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
    clientHost: string;
    clientPort: number;
    agentHost: string;
    agentPort: number;
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
