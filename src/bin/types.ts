import type { LogLevel } from '@matrixai/logger';
import type { POJO } from '../types';
import type { RecoveryCode } from '../keys/types';
import type { Host, Port } from '../network/types';
import type { StatusLive } from '../status/types';
import type { NodeIdEncoded } from '../nodes/types';

type AgentStatusLiveData = Omit<StatusLive['data'], 'nodeId'> & {
  nodeId: NodeIdEncoded;
};

/**
 * PolykeyAgent Starting Input when Backgrounded
 * When using advanced serialization, rich structures like
 * Map, Set and more can be passed over IPC
 * However traditional classes cannot be
 */
type AgentChildProcessInput = {
  logLevel: LogLevel;
  format: 'human' | 'json';
  workers?: number;
  agentConfig: {
    password: string;
    nodePath?: string;
    keysConfig?: {
      rootKeyPairBits?: number;
      rootCertDuration?: number;
      dbKeyBits?: number;
      recoveryCode?: RecoveryCode;
    };
    forwardProxyConfig?: {
      authToken?: string;
      connConnectTime?: number;
      connTimeoutTime?: number;
      connPingIntervalTime?: number;
    };
    reverseProxyConfig?: {
      connConnectTime?: number;
      connTimeoutTime?: number;
    };
    networkConfig?: {
      forwardHost?: Host;
      forwardPort?: Port;
      proxyHost?: Host;
      proxyPort?: Port;
      // GRPCServer for agent service
      agentHost?: Host;
      agentPort?: Port;
      // GRPCServer for client service
      clientHost?: Host;
      clientPort?: Port;
    };
    fresh?: boolean;
  };
};

/**
 * PolykeyAgent starting output when backgrounded
 * The error property contains arbitrary error properties
 */
type AgentChildProcessOutput =
  | ({
      status: 'SUCCESS';
      recoveryCode?: RecoveryCode;
    } & AgentStatusLiveData)
  | {
      status: 'FAILURE';
      error: POJO;
    };

export type {
  AgentStatusLiveData,
  AgentChildProcessInput,
  AgentChildProcessOutput,
};
