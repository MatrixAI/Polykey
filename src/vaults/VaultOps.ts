import type Logger from '@matrixai/logger';
import type { ContextTimed } from '@matrixai/contexts';
import type { Stat } from 'encryptedfs';
import type { Vault } from './Vault.js';
import type { FileSystem } from '../types.js';
import path from 'node:path';
import * as vaultsErrors from './errors.js';
import * as vaultsUtils from './utils.js';
import * as utils from '../utils/index.js';

type FileOptions = {
  recursive?: boolean;
};

/**
 * Adds a secret to the vault
 */
async function addSecret(
  vault: Vault,
  secretName: string,
  content: Buffer | string,
  logger?: Logger,
  ctx?: ContextTimed,
): Promise<void> {
  await vault.writeF(
    async (efs) => {
      if (await efs.exists(secretName)) {
        throw new vaultsErrors.ErrorSecretsSecretDefined(
          `A secret with name '${secretName}' already exists`,
        );
      }
      await vaultsUtils.mkdirExists(efs, path.dirname(secretName));
      await efs.writeFile(secretName, content);
    },
    undefined,
    ctx,
  );
  logger?.info(`Added secret ${secretName} to vault ${vault.vaultId}`);
}

/**
 * Changes the name of a secret in a vault
 */
async function renameSecret(
  vault: Vault,
  secretName: string,
  secretNameNew: string,
  logger?: Logger,
  ctx?: ContextTimed,
): Promise<void> {
  await vault.writeF(
    async (efs) => {
      if (!(await efs.exists(secretName))) {
        throw new vaultsErrors.ErrorSecretsSecretUndefined(
          'Secret does not exist, can not rename',
        );
      }
      await efs.rename(secretName, secretNameNew);
    },
    undefined,
    ctx,
  );
  logger?.info(
    `Renamed secret ${secretName} to ${secretNameNew} in vault ${vault.vaultId}`,
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
  secretName: string,
  fileOptions?: FileOptions,
  logger?: Logger,
  ctx?: ContextTimed,
): Promise<void> {
  try {
    await vault.writeF(
      async (efs) => {
        const stat = await efs.stat(secretName);
        if (stat.isDirectory()) {
          await efs.rmdir(secretName, fileOptions);
          logger?.info(`Deleted directory at '${secretName}'`);
        } else {
          await efs.unlink(secretName);
          logger?.info(`Deleted secret at '${secretName}'`);
        }
      },
      undefined,
      ctx,
    );
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

/**
 * Adds an empty directory to the root of the vault. Note that efs does not
 * track empty directories.
 */
async function mkdir(
  vault: Vault,
  dirPath: string,
  fileOptions?: FileOptions,
  logger?: Logger,
  ctx?: ContextTimed,
): Promise<void> {
  const recursive = fileOptions?.recursive ?? false;
  // Technically, writing an empty directory won't make a commit, and doesn't
  // need a write resource as git doesn't track empty directories. It is
  // still being used to allow concurrency.
  try {
    await vault.writeF(
      async (efs) => {
        await efs.mkdir(dirPath, fileOptions);
        logger?.info(`Created secret directory at '${dirPath}'`);
      },
      undefined,
      ctx,
    );
  } catch (e) {
    logger?.error(`Failed to create directory '${dirPath}'. Reason: ${e.code}`);
    if (e.code === 'ENOENT' && !recursive) {
      throw new vaultsErrors.ErrorVaultsRecursive(
        `Could not create directory '${dirPath}' without recursive option`,
        { cause: e },
      );
    }
    if (e.code === 'EEXIST') {
      throw new vaultsErrors.ErrorSecretsSecretDefined(
        `${dirPath} already exists`,
        { cause: e },
      );
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
  fs?: FileSystem,
  logger?: Logger,
  ctx?: ContextTimed,
): Promise<void> {
  const absoluteDirPath = path.resolve(secretDirectory);
  await vault.writeF(
    async (efs) => {
      fs = await utils.importFS(fs);
      for await (const secretPath of vaultsUtils.readDirRecursively(
        fs,
        absoluteDirPath,
      )) {
        // Determine the path to the secret
        const relPath = path.relative(
          path.dirname(absoluteDirPath),
          secretPath,
        );
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
    },
    undefined,
    ctx,
  );
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
  ctx?: ContextTimed,
): Promise<void> {
  try {
    await vault.writeF(
      async (efs) => {
        await efs.writeFile(secretName, content);
        logger?.info(`Wrote secret ${secretName} in vault ${vault.vaultId}`);
      },
      undefined,
      ctx,
    );
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new vaultsErrors.ErrorSecretsSecretUndefined(
        `One or more parent directories for '${secretName}' do not exist`,
        { cause: e },
      );
    }
    if (e.code === 'EISDIR') {
      throw new vaultsErrors.ErrorSecretsIsDirectory(
        `Secret path '${secretName}' is a directory`,
        { cause: e },
      );
    }
    throw e;
  }
}

/**
 * Performs a touch operation on a secret by updating all it's timestamps to the
 * current time.
 */
async function touchSecret(
  vault: Vault,
  secretName: string,
  ctx?: ContextTimed,
): Promise<void> {
  const now = new Date();
  try {
    await vault.writeF(
      async (efs) => {
        // If the file exists, update its timestamps. Otherwise, create the
        // file. Note that this can throw errors, which are handled later.
        if (await efs.exists(secretName)) {
          await efs.utimes(secretName, now, now);
        } else {
          await efs.writeFile(secretName);
        }
      },
      undefined,
      ctx,
    );
  } catch (e) {
    switch (e.code) {
      case 'ENOENT':
        throw new vaultsErrors.ErrorSecretsSecretUndefined(
          `One or more parent directories for '${secretName}' do not exist`,
          { cause: e },
        );
      default:
        throw e;
    }
  }
}

export {
  addSecret,
  renameSecret,
  getSecret,
  statSecret,
  deleteSecret,
  mkdir,
  addSecretDirectory,
  listSecrets,
  writeSecret,
  touchSecret,
};
