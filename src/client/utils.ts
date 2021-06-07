import fs from 'fs';
import * as grpc from '@grpc/grpc-js';

import * as clientErrors from './errors';
import { SessionManager } from '../session';
import { VaultManager } from '../vaults';

async function checkPassword(
  meta: grpc.Metadata,
  sessionManager: SessionManager,
): Promise<void> {
  const passwordFile = meta.get('passwordFile').pop();
  let password: string;
  if (passwordFile) {
    password = await fs.promises.readFile(passwordFile, { encoding: 'utf-8' });
    await sessionManager.startSession(password.trim());
  } else if (!sessionManager.sessionStarted) {
    throw new clientErrors.ErrorClientPasswordNotProvided();
  }
}

function parseVaultInput(input: string, vaultManager: VaultManager): string {
  const id = vaultManager.getVaultId(input);
  if (id) {
    return id;
  } else {
    return input;
  }
}

export { checkPassword, parseVaultInput };
