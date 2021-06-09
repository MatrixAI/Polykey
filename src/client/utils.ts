import fs from 'fs';
import * as grpc from '@grpc/grpc-js';

import * as clientErrors from './errors';
import { SessionManager } from '@/session';

async function checkPassword(
  meta: grpc.Metadata,
  sessionManager: SessionManager,
): Promise<void> {
  const passwordFile = meta.get('passwordFile').pop();
  meta.remove('passwordFile');
  let password;
  if (passwordFile) {
    password = await fs.promises.readFile(passwordFile, { encoding: 'utf-8' });
    await sessionManager.startSession(password.trim());
  } else if (!sessionManager.sessionStarted) {
    throw new clientErrors.ErrorClientPasswordNotProvided();
  }
}

export { checkPassword };
