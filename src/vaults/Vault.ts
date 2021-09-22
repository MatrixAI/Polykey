import type { FileSystem } from '../types';
import type { FileChanges, FileOptions, SecretList, SecretName, VaultId, VaultKey, VaultName } from './types';
import type { NodeId } from '../nodes/types';
import type { WorkerManager } from '../workers';

import fs from 'fs';
import path from 'path';
import git from 'isomorphic-git';
import { Mutex } from 'async-mutex';
import { EncryptedFS } from 'encryptedfs';
import { PassThrough } from 'readable-stream';
import Logger from '@matrixai/logger';

import { GitRequest } from '../git';

import * as vaultsUtils from './utils';
import * as gitUtils from '../git/utils';
import * as vaultsErrors from './errors';
import * as gitErrors from '../git/errors';

class Vault {
  public readonly baseDir: string;
  public readonly vaultId: VaultId;

  public vaultName: VaultName;
  protected fs: FileSystem;
  protected efs: EncryptedFS;
  protected lock: Mutex = new Mutex();
  protected logger: Logger;
  protected workerManager?: WorkerManager;
  protected _started: boolean;

  constructor({
    vaultId,
    vaultName,
    baseDir,
    fs,
    logger,
  }: {
    vaultId: VaultId;
    vaultName: VaultName;
    baseDir: string;
    fs: FileSystem;
    logger?: Logger;
  }) {
    this.vaultId = vaultId;
    this.vaultName = vaultName;
    this.baseDir = baseDir;
    this.fs = fs;
    this.logger = logger ?? new Logger(this.constructor.name);
    this._started = false;
  }

  get started(): boolean {
    return this._started;
  }

  public setWorkerManager(workerManager: WorkerManager): void {
    this.workerManager = workerManager;
    // Type `WorkerManager` implements `WorkerManagerInterface<PolykeyWorker>`.
    // `PolykeyWorker` contains the functions from `EFSWorkerModule`
    // and `efs.setWorkerManager` expects `WorkerManagerInterface<EFSWorkerModule>`
    // BUT `PolykeyWorker` doesn't technically extend `EFSWorkerModule` so typescript is throwing an error.
    // @ts-ignore: Issue with types, should work.
    this.efs.setWorkerManager(workerManager);
  }

  public unsetWorkerManager(): void {
    delete this.workerManager;
    this.efs.unsetWorkerManager();
  }

  // TODO: Once EFS is updated, pass `this.fs` into EFS constructor
  public async start({ key }: { key: VaultKey }): Promise<void> {
    this.efs = await EncryptedFS.createEncryptedFS({ dbKey: key, dbPath: this.baseDir , logger: this.logger.getChild('EncryptedFS')});
    const release = await this.lock.acquire();
    try {
      if (!(await this.efs.exists('.git'))) {
        await git.init({
          fs: this.efs,
          dir: '',
        });

        await git.commit({
          fs: this.efs,
          dir: '',
          author: {
            name: this.vaultId,
          },
          message: 'Initial Commit',
        });

        // pack-refs not auto-generated by isomorphic git but needed
        await this.efs.writeFile(
          path.join('.git', 'packed-refs'),
          '# pack-refs with: peeled fully-peeled sorted',
        );
        this.logger.info(`Initialising vault at '${this.baseDir}'`);
      } else {
        // const files = vaultsUtils.readdirRecursivelyEFS2(this.efs, '', true);
        // for await (const filepath of files) {
        //   await git.add({
        //     fs: this.efs,
        //     dir: '',
        //     filepath: filepath,
        //   });
        // }
        // await git.checkout({
        //   fs: this.efs,
        //   dir: '',
        //   force: true,
        // });
      }
    } finally {
      release();
    }
  }

  public async stop(): Promise<void> {
    const release = await this.lock.acquire();
    try {
      await fs.promises.rmdir(this.baseDir, { recursive: true });
      this.logger.info(`Destroyed vault directory at ${this.baseDir}`);
    } finally {
      release();
    }
  }

  /**
   * Renames the vault, does not effect the underlying fs name
   */
  public async renameVault(newVaultName: VaultName): Promise<void> {
    this.vaultName = newVaultName;
  }

  /**
   * Retreives stats for a vault
   */
  public async stats(): Promise<fs.Stats> {
    return await this.fs.promises.stat(this.baseDir);
  }

  /**
   * Adds a secret to the vault
   */
  public async addSecret(
    secretName: SecretName,
    content: string,
  ): Promise<boolean> {
    const release = await this.lock.acquire();
    try {
      // Throw an error if the vault is not initialised
      if (!(await this.efs.exists('.git'))) {
        throw new vaultsErrors.ErrorVaultUninitialised(
          `${this.vaultName} has not been initialised\nVaultId: ${this.vaultId}`,
        );
        // Throw an error if the secret exists
      } else if (await this.efs.exists(secretName)) {
        throw new vaultsErrors.ErrorSecretDefined(
          `${secretName} already exists, try updating instead`,
        );
        // Throw an error if the secret contains a '.git' dir
      } else if (path.basename(secretName) === '.git') {
        throw new vaultsErrors.ErrorGitFile(
          '.git files cannot be added to a vault',
        );
      }

      // Create the directory to the secret if it doesn't exist
      await this.efs.mkdirp(path.dirname(secretName));

      // Write the secret into the vault
      await this.efs.writeFile(secretName, content, {});
      this.logger.info(`Wrote secret to directory at '${secretName}'`);

      // Commit the changes
      await this.commitChanges( // FIXME: this is failing for some reason.
        [
          {
            fileName: secretName,
            action: 'added',
          },
        ],
        `Add secret: ${secretName}`,
      );
      console.log('a');
      if (await this.efs.exists(secretName)) {
        return true;
      }
      return false;
    } finally {
      release();
    }
  }

  /**
   * Changes the contents of a secret
   */
  public async updateSecret(
    secretName: SecretName,
    content: string,
  ): Promise<void> {
    const release = await this.lock.acquire();
    try {
      // Throw error if secret does not exist
      if (!(await this.efs.exists(secretName))) {
        throw new vaultsErrors.ErrorSecretUndefined(
          'Secret does not exist, try adding it instead.',
        );
      }

      // Write secret into vault
      await this.efs.writeFile(secretName, content);
      this.logger.info(`Updated secret at directory '${secretName}'`);

      // Commit changes
      await this.commitChanges(
        [{ fileName: secretName, action: 'modified' }],
        `Update secret: ${secretName}`,
      );
    } finally {
      release();
    }
  }

  /**
   * Changes the name of a secret in a vault
   */
  public async renameSecret(
    currSecretName: SecretName,
    newSecretName: SecretName,
  ): Promise<boolean> {
    const release = await this.lock.acquire();
    try {
      // Throw error if trying to rename a '.git' file
      if (
        path.basename(currSecretName) === '.git' ||
        path.basename(newSecretName) === '.git'
      ) {
        throw new vaultsErrors.ErrorGitFile(
          'Cannot rename a file to or from .git',
        );
      }

      // Throw an error if the old secret does not exist
      if (!(await this.efs.exists(currSecretName))) {
        throw new vaultsErrors.ErrorSecretUndefined(
          `${currSecretName} does not exist`,
        );
      }

      // Throw an error if the new name already exists
      if (await this.efs.exists(newSecretName)) {
        throw new vaultsErrors.ErrorSecretDefined(
          `${newSecretName} already exists`,
        );
      }

      // Renames the secret in the vault
      await this.efs.rename(currSecretName, newSecretName);
      this.logger.info(
        `Renamed secret at ${currSecretName} to ${newSecretName}`,
      );
      // Commit changes
      await this.commitChanges(
        [
          {
            fileName: currSecretName,
            action: 'removed',
          },
          {
            fileName: newSecretName,
            action: 'added',
          },
        ],
        `Renamed secret: ${currSecretName}`,
      );
      if ((await this.efs.exists(currSecretName)) || !(await this.efs.exists(newSecretName))) {
        return false;
      }
      return true;
    } finally {
      release();
    }
  }

  /**
   * Returns the contents of a secret
   */
  public async getSecret(secretName: SecretName): Promise<string> {
    const release = await this.lock.acquire();
    try {
      return (await this.efs.readFile(secretName)).toString();
    } catch (err) {
      // Throw an error if the secret does not exist
      if (err.code === 'ENOENT') {
        throw new vaultsErrors.ErrorSecretUndefined(
          `Secret with name: ${secretName} does not exist`,
        );
      }
      throw err;
    } finally {
      release();
    }
  }

  /**
   * Removes a secret from a vault
   */
  public async deleteSecret(
    secretName: SecretName,
    fileOptions?: FileOptions,
  ): Promise<boolean> {
    const release = await this.lock.acquire();
    try {
      // Throw error if trying to remove '.git' file
      if (path.basename(secretName) === '.git') {
        throw new vaultsErrors.ErrorGitFile('Cannot remove .git');
      }
      // Handle if secret is a directory
      if ((await this.efs.stat(secretName)).isDirectory()) {
        if (fileOptions?.recursive) {
          // Remove the specified directory
          await this.efs.rmdir(secretName); // TODO: Double check that this works as recursive.
          this.logger.info(`Deleted directory at '${secretName}'`);
          await this.commitChanges(
            [
              {
                fileName: secretName,
                action: 'removed',
              },
            ],
            `Remove directory: ${secretName}`,
          );
          // Throw error if not recursively deleting a directory
        } else {
          throw new vaultsErrors.ErrorRecursive(
            'delete a vault directory must be recursive',
          );
        }
      } else if (await this.efs.exists(secretName)) {
        // Remove the specified file
        await this.efs.unlink(secretName);
        this.logger.info(`Deleted secret at '${secretName}'`);

        // Commit changes
        await this.commitChanges(
          [
            {
              fileName: secretName,
              action: 'removed',
            },
          ],
          `Remove secret: ${secretName}`,
        );
        // Throw error if secret doesn't exist
      } else {
        throw new vaultsErrors.ErrorSecretUndefined(
          `path '${secretName}' does not exist in vault`,
        );
      }
      if (await this.efs.exists(secretName)) {
        return false;
      }
      return true;
    } finally {
      release();
    }
  }

  /**
   * Adds an empty directory to the root of the vault.
   * i.e. mkdir("folder", { recursive = false }) creates the "<vaultDir>/folder" directory
   */
  public async mkdir(
    dirPath: SecretName,
    fileOptions?: FileOptions,
  ): Promise<boolean> {
    const release = await this.lock.acquire();
    try {
      // Create the specified directory
      const recursive = fileOptions?.recursive ?? false;
      try {
        await this.efs.mkdirp(dirPath);
      } catch (err) {
        if (err.code === 'ENOENT' && !recursive) {
          throw new vaultsErrors.ErrorRecursive(
            `Could not create directory '${dirPath}' without recursive option`,
          );
        }
      }
      this.logger.info(`Created secret directory at '${dirPath}'`);
      if (await this.efs.exists(dirPath)) {
        return true;
      }
      return false;
    } finally {
      release();
    }
  }

  /**
   * Adds a secret directory to the vault
   */
  public async addSecretDirectory(secretDirectory: SecretName): Promise<void> {
    const release = await this.lock.acquire();
    const commitList: FileChanges = [];
    const absoluteDirPath = path.resolve(secretDirectory);
    try {
      // Obtain the path to each secret in the provided directory
      for await (const secretPath of vaultsUtils.readdirRecursively(
        absoluteDirPath,
      )) {
        // Determine the path to the secret
        const relPath = path.relative(
          path.dirname(absoluteDirPath),
          secretPath,
        );
        // Obtain the content of the secret
        const secretName = path.basename(secretPath);
        const content = await fs.promises.readFile(secretPath);
        // Throw error if the '.git' file is nonexistent
        if (!(await this.efs.exists('.git'))) {
          throw new vaultsErrors.ErrorVaultUninitialised(
            `${this.vaultName} has not been initialised\nVaultId: ${this.vaultId}`,
          );
          // Throw error if trying to add '.git' file
        } else if (secretName === '.git') {
          throw new vaultsErrors.ErrorGitFile(
            '`.git files cannot be added to a vault',
          );
          // If existing path exists, write secret
        } else if (await this.efs.exists(relPath)) {
          try {
            // Write secret into vault
            await this.efs.writeFile(relPath, content, {});
            this.logger.info(`Added secret at directory '${relPath}'`);
            commitList.push({
              fileName: relPath,
              action: 'modified',
            });
          } catch (err) {
            // Warn of a failed addition but continue operation
            this.logger.warn(`Adding secret ${relPath} failed`);
          }
        } else {
          try {
            // Create directory if it doesn't exist
            await this.efs.mkdirp(path.dirname(relPath));
            // Write secret into vault
            await this.efs.writeFile(relPath, content, {});
            this.logger.info(`Added secret to directory at '${relPath}'`);
            commitList.push({
              fileName: relPath,
              action: 'added',
            });
          } catch (err) {
            // Warn of a failed addition but continue operation
            this.logger.warn(`Adding secret ${relPath} failed`);
          }
        }
      }

      // Commit changes
      await this.commitChanges(
        commitList,
        `Add/Modify secrets: ${commitList[0].fileName} and ${
          commitList.length - 1
        } more`,
      );
    } finally {
      release();
    }
  }

  /**
   * Retrieves a list of the secrets in a vault
   */
  public async listSecrets(): Promise<SecretList> {
    const secrets: SecretList = [];
    for await (const secret of vaultsUtils.readdirRecursivelyEFS(
      this.efs,
      '',
    )) {
      secrets.push(secret);
    }
    return secrets;
  }

  /**
   * Clones secrets from a remote vault into this vault
   * TODO: Once EFS is updated, pass `this.fs` into EFS constructor
   */
  public async cloneVault(
    gitHandler: GitRequest,
    vaultKey: VaultKey,
    nodeId: NodeId,
  ): Promise<void> {
    this.efs = await EncryptedFS.createEncryptedFS({ dbKey: vaultKey, dbPath: this.baseDir });

    // Construct the target vault id
    const vaultId = `${vaultsUtils.splitVaultId(this.vaultId)}:${nodeId}`;

    // Clone desired vault
    await git.clone({
      fs: this.efs,
      http: gitHandler,
      dir: '',
      url: `http://0.0.0.0/${vaultId}`,
      ref: 'master',
      singleBranch: true,
    });
    // Write pack-refs that are not auto-generated by isomorphic git but needed
    await this.efs.writeFile(
      path.join('.git', 'packed-refs'),
      '# pack-refs with: peeled fully-peeled sorted',
    );
    this.logger.info(`Cloned vault at '${this.vaultId}'`);
  }

  /**
   * Pulls secrets from a remote vault into this vault
   */
  public async pullVault(
    gitHandler: GitRequest,
    nodeId: NodeId,
  ): Promise<void> {
    // Construct the target vault id
    const vaultId = `${vaultsUtils.splitVaultId(this.vaultId)}:${nodeId}`;

    try {
      // Pull from the target vault Id
      await git.pull({
        fs: this.efs,
        http: gitHandler,
        dir: '',
        url: `http://0.0.0.0/${vaultId}`,
        ref: 'HEAD',
        singleBranch: true,
        author: {
          name: this.vaultId,
        },
      });
    } catch (err) {
      // Throw an error if merge conflicts occur
      if (err instanceof git.Errors.MergeNotSupportedError) {
        throw new vaultsErrors.ErrorVaultMergeConflict(
          'Merge Conflicts are not supported yet',
        );
      }
    }
  }

  /**
   * Returns an async generator that yields buffers representing the git info response
   */
  public async *handleInfoRequest(): AsyncGenerator<Buffer | null> {
    // Define the service for uploading packets
    const service = 'upload-pack';
    yield Buffer.from(
      gitUtils.createGitPacketLine('# service=git-' + service + '\n'),
    );

    // Separator for message
    yield Buffer.from('0000');

    // Reading the relevant files to contruct the information reply
    for (const buffer of (await gitUtils.uploadPack(this.efs, '.git', true)) ??
      []) {
      yield buffer;
    }
  }

  /**
   * Takes vaultName and a pack request and returns two streams used to handle the pack
   * response
   */
  public async handlePackRequest(body: Buffer): Promise<PassThrough[]> {
    if (body.toString().slice(4, 8) === 'want') {
      // Determine the oid of the requested object
      const wantedObjectId = body.toString().slice(9, 49);

      // Pack the requested object into a message
      const packResult = await gitUtils.packObjects({
        fs: this.efs, gitdir: '.git', refs: [wantedObjectId,]

      });

      // Construct and return readable streams to send the message
      const readable = new PassThrough();
      const progressStream = new PassThrough();
      const sideBand = gitUtils.mux(
        'side-band-64',
        readable,
        packResult.packstream,
        progressStream,
      );
      return [sideBand, progressStream];
    } else {
      // Throw error if the request is not for pack information
      throw new gitErrors.ErrorGitUnimplementedMethod(
        `Request of type '${body
          .toString()
          .slice(4, 8)}' not valid, expected 'want'`,
      );
    }
  }

  /* === Helpers === */

  /**
   * Commits the changes made to a vault repository
   */
  protected async commitChanges(
    fileChanges: FileChanges,
    message: string,
  ): Promise<void> {
    // Obtain each file change
    for (const fileChange of fileChanges) {
      // Use isomorphic git to add or remove the file/dir
      if (fileChange.action === 'removed') {
        await git.remove({
          fs: this.efs,
          dir: '',
          filepath: fileChange.fileName,
        });
      } else {
        await git.add({
          fs: this.efs,
          dir: '',
          filepath: fileChange.fileName,
        });
      }
    }

    // Commit the changes made
    await git.commit({
      fs: this.efs,
      dir: '',
      author: {
        name: this.vaultId,
      },
      message: message,
    });
  }
}

export default Vault;
