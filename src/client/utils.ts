import fs from 'fs';
import * as grpc from '@grpc/grpc-js';

import * as clientErrors from '@/errors';
import * as CLIErrors from '@/bin/errors';
import { SessionManager } from '@/session';
import { VaultManager } from '@/vaults';

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

function parseVaultInput(input: string, vaultManager: VaultManager): string {
  const ids = vaultManager.getVaultIds(input);
  if (ids.length == 0) {
    return input;
  } else if (ids.length == 1) {
    return ids[0];
  } else {
    throw new CLIErrors.ErrorVaultNameAmbiguous(
      'There is more than 1 vault with this name. Please use the Vault ID',
    );
  }
}

export { checkPassword, parseVaultInput };
