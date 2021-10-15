

/**
 * Adds a secret to the vault
 */
import { FileChanges, FileOptions, SecretContent, SecretList, SecretName, Vault } from "./types";
import * as vaultsErrors from "@/vaults/errors";
import path from "path";
import * as vaultsUtils from "@/vaults/utils";
import Logger from "@matrixai/logger";
import * as fs from "fs";

//TODO: tests
// - add succeded
// - secret exists
// - secret with directory
// Might just drop the return type.
// I don't see a case where it would be false without an error.
// - Add locking?
async function addSecret(
  vault: Vault,
  secretName: SecretName,
  content: SecretContent,
  logger?: Logger,
): Promise<void> {

  await vault.commit( async efs => {
    if(await efs.exists(secretName)) {
      throw new vaultsErrors.ErrorSecretDefined(
        `${secretName} already exists, try updating instead`,
      );
    }

    // Create the directory to the secret if it doesn't exist
    try {
      await efs.mkdir(path.dirname(secretName), {recursive: true});
    } catch (err) {
      if (err.code !== 'EEXIST')  throw err;
    }

    // Write the secret into the vault
    await efs.writeFile(secretName, content);
  })

  logger?.info(
    `Added secret ${secretName} to vault ${vault.vaultId}`,
  );
}

/**
 * Changes the contents of a secret
 */
//TODO: tests
// - updates
// - invalid name
async function updateSecret(
  vault: Vault,
  secretName: SecretName,
  content: SecretContent,
  logger?: Logger,
): Promise<void> {

  await vault.commit( async efs => {
    // Throw error if secret does not exist
    if(!await efs.exists(secretName)) {
      throw new vaultsErrors.ErrorSecretUndefined(
        'Secret does not exist, try adding it instead.',
      );
    }

    // Write secret into vault
    await efs.writeFile(secretName, content);
  })

  logger?.info(
    `Updated secret ${secretName} in vault ${vault.vaultId}`,
  );
}

/**
 * Changes the name of a secret in a vault
 */
//Todo: tests
// - Valid name
// - invalid name
async function renameSecret(
  vault: Vault,
  currSecretName: SecretName,
  newSecretName: SecretName,
  logger?: Logger,
): Promise<void> {
  await vault.commit( async efs => {
    await efs.rename(currSecretName, newSecretName);
  })
  logger?.info(
    `Renamed secret at ${currSecretName} to ${newSecretName} in vault ${vault.vaultId}`,
  );
}

/**
 * Returns the contents of a secret
 */
//TODO: tests
// - read existing file
// - try to read non-existent file
// - read directory?
async function getSecret(
  vault: Vault,
  secretName: SecretName
): Promise<Buffer> {
  try{
    return await vault.access( async efs => {
      return (await efs.readFile(secretName)) as Buffer
    })
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new vaultsErrors.ErrorSecretUndefined(
        `Secret with name: ${secretName} does not exist`,
      );
    }
    throw err;
  }
}

/**
 * Removes a secret from a vault
 */
//TODO: tests
// - delete a secret
// - Secret doesn't exist
// - delete a full and empty directory with and without recursive.
async function deleteSecret(
  vault: Vault,
  secretName: SecretName,
  fileOptions?: FileOptions,
  logger?: Logger,
): Promise<void> {
  await vault.commit( async efs => {
    if ((await efs.stat(secretName)).isDirectory()) {
      await efs.rmdir(secretName, fileOptions);
      logger?.info(`Deleted directory at '${secretName}'`);
    } else if (!!(await efs.exists(secretName))) {
      // Remove the specified file
      await efs.unlink(secretName);
      logger?.info(`Deleted secret at '${secretName}'`);
    } else {
      throw new vaultsErrors.ErrorSecretUndefined(
        `path '${secretName}' does not exist in vault`,
      );
    }
  });
}

/**
 * Adds an empty directory to the root of the vault.
 * i.e. mkdir("folder", { recursive = false }) creates the "<vaultDir>/folder" directory
 */
async function mkdir(
  vault: Vault,
  dirPath: SecretName,
  fileOptions?: FileOptions,
  logger?: Logger,
): Promise<void> {
  const recursive = !!fileOptions?.recursive

  await vault.commit(async efs => {
    try {
      await efs.mkdir(dirPath, fileOptions);
    } catch (err) {
      if (err.code === 'ENOENT' && !recursive) {
        throw new vaultsErrors.ErrorRecursive(
          `Could not create directory '${dirPath}' without recursive option`,
        );
      }
    }
    logger?.info(`Created secret directory at '${dirPath}'`);
  })
}

/**
 * Adds a secret directory to the vault
 */
//TODO: tests
// - adding existing directory
// - adding non-existent directory
// - adding a file.
async function addSecretDirectory(
  vault: Vault,
  secretDirectory: SecretName,
  logger?: Logger,
): Promise<void> {
  const absoluteDirPath = path.resolve(secretDirectory);

  await vault.commit(async efs => {
    for await (const secretPath of vaultsUtils.readdirRecursively(
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
        } catch (err) {
          // Warn of a failed addition but continue operation
          logger?.warn(`Adding secret ${relPath} failed`);
          throw err;
        }
      } else {
        try {
          // Create directory if it doesn't exist
          try {
            await efs.mkdir(path.dirname(relPath), {recursive: true});
          } catch (err) {
            if (err.code !== 'EEXIST') throw err;
          }
          // Write secret into vault
          await efs.writeFile(relPath, content, {});
          logger?.info(`Added secret to directory at '${relPath}'`);
        } catch (err) {
          // Warn of a failed addition but continue operation
          logger?.warn(`Adding secret ${relPath} failed`);
          throw err;
        }
      }
    }
  });
}

/**
 * Retrieves a list of the secrets in a vault
 */
//TODO: tests
// - read secrets.
// - no secrets
async function listSecrets(vault: Vault): Promise<SecretList> {
  return await vault.access(async efs => {
    const secrets: SecretList = [];
    for await (const secret of vaultsUtils.readdirRecursivelyEFS(
      efs,
      '.',
    )) {
      secrets.push(secret);
    }
    return secrets;
  })
}

export {
  addSecret,
  updateSecret,
  renameSecret,
  getSecret,
  deleteSecret,
  mkdir,
  addSecretDirectory,
  listSecrets,
}
