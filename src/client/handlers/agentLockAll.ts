import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { DB } from '@matrixai/db';
import type SessionManager from '../../sessions/SessionManager';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const agentLockAll = new UnaryCaller<RPCRequestParams, RPCResponseResult>();

class AgentLockAllHandler extends UnaryHandler<
  {
    sessionManager: SessionManager;
    db: DB;
  },
  RPCRequestParams,
  RPCResponseResult
> {
  public async handle(): Promise<RPCResponseResult> {
    const { db, sessionManager } = this.container;
    await db.withTransactionF((tran) => sessionManager.resetKey(tran));
    return {};
  }
}

export { agentLockAll, AgentLockAllHandler };