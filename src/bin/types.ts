import type { LogLevel } from '@matrixai/logger';
import type { POJO } from '../types';
import type { RecoveryCode } from '../keys/types';
import type { Host, Port } from '../network/types';

/**
 * PolykeyAgent Starting Input when Backgrounded
 * When using advanced serialization, rich structures like
 * Map, Set and more can be passed over IPC
 * However traditional classes cannot be
 */
type AgentChildProcessInput = {
  logLevel: LogLevel;
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
      proxyHost?: Host;
      proxyPort?: Port;
      egressHost?: Host;
      egressPort?: Port;
      // ReverseProxy
      ingressHost?: Host;
      ingressPort?: Port;
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
 * PolykeyAgent Starting Output when Backgrounded
 * The error property contains arbitrary error properties
 */
type AgentChildProcessOutput =
  | {
      status: 'SUCCESS';
      recoveryCode?: RecoveryCode;
    }
  | {
      status: 'FAILURE';
      error: POJO;
    };

export type { AgentChildProcessInput, AgentChildProcessOutput };
