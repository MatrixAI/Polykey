import type { DB } from '@matrixai/db';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type SessionManager from '../../sessions/SessionManager';
import { UnaryHandler } from '../../rpc/handlers';

class AgentLockAllHandler extends UnaryHandler<
  {
    sessionManager: SessionManager;
    db: DB;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult
> {
  public async handle(): Promise<ClientRPCResponseResult> {
    const { db, sessionManager } = this.container;
    await db.withTransactionF((tran) => sessionManager.resetKey(tran));
    return {};
  }
}

export { AgentLockAllHandler };
