import type { DB } from '@matrixai/db';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type SessionManager from '../../sessions/SessionManager';
import { UnaryHandler } from '@matrixai/rpc';

class AgentLockAll extends UnaryHandler<
  {
    sessionManager: SessionManager;
    db: DB;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult
> {
  public handle = async (): Promise<ClientRPCResponseResult> => {
    const { db, sessionManager } = this.container;
    await db.withTransactionF((tran) => sessionManager.resetKey(tran));
    return {};
  };
}

export default AgentLockAll;
