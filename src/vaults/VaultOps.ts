/**
 * Adds a secret to the vault
 */
import type Logger from '@matrixai/logger';
import type { Vault } from './Vault';
import type { Stat } from 'encryptedfs';
import type { SuccessOrErrorMessage } from '../client/types';
import path from 'path';
import * as vaultsErrors from './errors';
import * as vaultsUtils from './utils';

type FileOptions = {
  recursive?: boolean;
};

async function addSecret(
  vault: Vault,
  secretName: string,
  content: Buffer | string,
  logger?: Logger,
): Promise<void> {
  await vault.writeF(async (efs) => {
    if (await efs.exists(secretName)) {
      throw new vaultsErrors.ErrorSecretsSecretDefined(
        `${secretName} already exists, try updating instead`,
      );
    }

    // Create the directory to the secret if it doesn't exist
    await vaultsUtils.mkdirExists(efs, path.dirname(secretName));
    // Write the secret into the vault
    await efs.writeFile(secretName, content);
  });

  logger?.info(`Added secret ${secretName} to vault ${vault.vaultId}`);
}

/**
 * Changes the contents of a secret
 */
async function updateSecret(
  vault: Vault,
  secretName: string,
  content: Buffer | string,
  logger?: Logger,
): Promise<void> {
  await vault.writeF(async (efs) => {
    // Throw error if secret does not exist
    if (!(await efs.exists(secretName))) {
      throw new vaultsErrors.ErrorSecretsSecretUndefined(
        'Secret does not exist, try adding it instead.',
      );
    }

    // Write secret into vault
    await efs.writeFile(secretName, content);
  });

  logger?.info(`Updated secret ${secretName} in vault ${vault.vaultId}`);
}

/**
 * Changes the name of a secret in a vault
 */
async function renameSecret(
  vault: Vault,
  secretName: string,
  secretNameNew: string,
  logger?: Logger,
): Promise<void> {
  await vault.writeF(async (efs) => {
    if (!(await efs.exists(secretName))) {
      throw new vaultsErrors.ErrorSecretsSecretUndefined(
        'Secret does not exist, can not rename',
      );
    }
    await efs.rename(secretName, secretNameNew);
  });
  logger?.info(
    `Renamed secret at ${secretName} to ${secretNameNew} in vault ${vault.vaultId}`,
  );
}

/**
 * Returns the contents of a secret
 */
async function getSecret(vault: Vault, secretName: string): Promise<Buffer> {
  try {
    return await vault.readF(async (efs) => {
      return (await efs.readFile(secretName)) as Buffer;
    });
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new vaultsErrors.ErrorSecretsSecretUndefined(
        `Secret with name: ${secretName} does not exist`,
        { cause: e },
      );
    }
    if (e.code === 'EISDIR') {
      throw new vaultsErrors.ErrorSecretsIsDirectory(
        `${secretName} is a directory and not a secret`,
        { cause: e },
      );
    }
    throw e;
  }
}

/**
 * Returns the file stats of a secret
 */
async function statSecret(vault: Vault, secretName: string): Promise<Stat> {
  try {
    return await vault.readF(async (efs) => {
      return await efs.stat(secretName);
    });
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new vaultsErrors.ErrorSecretsSecretUndefined(
        `Secret with name: ${secretName} does not exist`,
        { cause: e },
      );
    }
    throw e;
  }
}

/**
 * Removes a secret from a vault
 */
async function deleteSecret(
  vault: Vault,
  secretNames: Array<string>,
  fileOptions?: FileOptions,
  logger?: Logger,
): Promise<void> {
  await vault.writeF(async (efs) => {
    for (const secretName of secretNames) {
      try {
        const stat = await efs.stat(secretName);
        if (stat.isDirectory()) {
          await efs.rmdir(secretName, fileOptions);
          logger?.info(`Deleted directory at '${secretName}'`);
        } else {
          // Remove the specified file
          await efs.unlink(secretName);
          logger?.info(`Deleted secret at '${secretName}'`);
        }
      } catch (e) {
        if (e.code === 'ENOENT') {
          throw new vaultsErrors.ErrorSecretsSecretUndefined(
            `Secret with name: ${secretName} does not exist`,
            { cause: e },
          );
        }
        if (e.code === 'ENOTEMPTY') {
          throw new vaultsErrors.ErrorVaultsRecursive(
            `Could not delete directory '${secretName}' without recursive option`,
            { cause: e },
          );
        }
        throw e;
      }
    }
  });
}

/**
 * Adds an empty directory to the root of the vault.
 * i.e. mkdir("folder", { recursive = false }) creates the "<vaultDir>/folder" directory
 */
async function mkdir(
  vault: Vault,
  dirPath: string,
  fileOptions?: FileOptions,
  logger?: Logger,
): Promise<SuccessOrErrorMessage> {
  const recursive = fileOptions?.recursive ?? false;
  // Technically, writing an empty directory won't make a commit, and doesn't
  // need a write resource as git doesn't track empty directories. It is
  // still being used to allow concurrency.
  try {
    await vault.writeF(async (efs) => {
      await efs.mkdir(dirPath, fileOptions);
      logger?.info(`Created secret directory at '${dirPath}'`);
    });
    return { type: 'success', success: true };
  } catch (e) {
    logger?.error(`Failed to create directory '${dirPath}'. Reason: ${e.code}`);
    if (e.code === 'ENOENT' && !recursive) {
      return {
        type: 'error',
        code: e.code,
        reason: dirPath,
      };
    }
    if (e.code === 'EEXIST') {
      return {
        type: 'error',
        code: e.code,
        reason: dirPath,
      };
    }
    throw e;
  }
}

/**
 * Adds a secret directory to the vault
 */
// TODO: tests
// - adding existing directory
// - adding non-existent directory
// - adding a file
async function addSecretDirectory(
  vault: Vault,
  secretDirectory: string,
  fs = require('fs'),
  logger?: Logger,
): Promise<void> {
  const absoluteDirPath = path.resolve(secretDirectory);

  await vault.writeF(async (efs) => {
    for await (const secretPath of vaultsUtils.readDirRecursively(
      fs,
      absoluteDirPath,
    )) {
      // Determine the path to the secret
      const relPath = path.relative(path.dirname(absoluteDirPath), secretPath);
      // Obtain the content of the secret
      const content = await fs.promises.readFile(secretPath);

      if (await efs.exists(relPath)) {
        try {
          // Write secret into vault
          await efs.writeFile(relPath, content);
          logger?.info(`Added secret at directory '${relPath}'`);
        } catch (e) {
          // Warn of a failed addition but continue operation
          logger?.warn(`Adding secret ${relPath} failed`);
          throw e;
        }
      } else {
        try {
          // Create directory if it doesn't exist
          await vaultsUtils.mkdirExists(efs, path.dirname(relPath));
          // Write secret into vault
          await efs.writeFile(relPath, content, {});
          logger?.info(`Added secret to directory at '${relPath}'`);
        } catch (e) {
          // Warn of a failed addition but continue operation
          logger?.warn(`Adding secret ${relPath} failed`);
          throw e;
        }
      }
    }
  });
}

/**
 * Retrieves a list of the secrets in a vault
 */
async function listSecrets(vault: Vault): Promise<string[]> {
  return await vault.readF(async (efs) => {
    const secrets: string[] = [];
    for await (const secret of vaultsUtils.readDirRecursively(efs)) {
      secrets.push(secret);
    }
    return secrets;
  });
}

/**
 * Changes the contents of a secret. Creates a new file if it doesn't exist.
 */
async function writeSecret(
  vault: Vault,
  secretName: string,
  content: Buffer | string,
  logger?: Logger,
): Promise<void> {
  await vault.writeF(async (efs) => {
    await efs.writeFile(secretName, content);
  });
  logger?.info(`Wrote secret ${secretName} in vault ${vault.vaultId}`);
}

export {
  addSecret,
  updateSecret,
  renameSecret,
  getSecret,
  statSecret,
  deleteSecret,
  mkdir,
  addSecretDirectory,
  listSecrets,
  writeSecret,
};
