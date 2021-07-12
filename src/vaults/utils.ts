import type { EncryptedFS } from 'encryptedfs';
import type { VaultId, VaultKey, VaultList, VaultName } from './types';
import type { FileSystem } from '../types';
import type { NodeId } from '../nodes/types';

import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';

import { GitRequest } from '../git';
import * as grpc from '@grpc/grpc-js';

import { promisify } from '../utils';

import * as agentPB from '../proto/js/Agent_pb';
import { GRPCClientAgent } from '../agent';

import * as keysUtils from '../keys/utils';
import * as utils from '../utils';
import { errors as vaultErrors } from './';

async function generateVaultKey(bits: number = 256): Promise<VaultKey> {
  return await keysUtils.generateKey(bits);
}

function generateVaultId(nodeId: NodeId): VaultId {
  const vaultId = uuid();
  const id = nodeId.replace(new RegExp(/[\/]/g), '');
  return (vaultId + ':' + id) as VaultId;
}

function splitVaultId(vaultId: VaultId): VaultId {
  const vid = vaultId.split(':');
  return vid[0] as VaultId;
}

async function fileExists(fs: FileSystem, path: string): Promise<boolean> {
  try {
    const fh = await fs.promises.open(path, 'r');
    fh.close();
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
  }
  return true;
}

async function* readdirRecursively(dir: string) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* readdirRecursively(res);
    } else if (dirent.isFile()) {
      yield res;
    }
  }
}

async function* readdirRecursivelyEFS(
  fs: EncryptedFS,
  dir: string,
  dirs?: boolean,
) {
  const readdir = utils.promisify(fs.readdir).bind(fs);
  const stat = utils.promisify(fs.stat).bind(fs);
  const dirents = await readdir(dir);
  let secretPath: string;
  for (const dirent of dirents) {
    const res = dirent;
    secretPath = path.join(dir, res);
    if ((await stat(secretPath)).isDirectory() && dirent !== '.git') {
      if (dirs === true) {
        yield secretPath;
      }
      yield* readdirRecursivelyEFS(fs, secretPath, dirs);
    } else if ((await stat(secretPath)).isFile()) {
      yield secretPath;
    }
  }
}

async function* readdirRecursivelyEFS2(
  fs: EncryptedFS,
  dir: string,
  dirs?: boolean,
): AsyncGenerator<string> {
  const readdir = utils.promisify(fs.readdir).bind(fs);
  const dirents = await readdir(dir);
  let secretPath: string;
  for (const dirent of dirents) {
    const res = dirent;
    secretPath = path.join(dir, res);
    if (dirent !== '.git') {
      try {
        await readdir(secretPath);
        if (dirs === true) {
          yield secretPath;
        }
        yield* readdirRecursivelyEFS2(fs, secretPath, dirs);
      } catch (err) {
        if (err.code === 'ENOTDIR') {
          yield secretPath;
        }
      }
    }
  }
}

/**
 * Searches a list of vaults for the given vault Id and associated name
 * @throws If the vault Id does not exist
 */
function searchVaultName(vaultList: VaultList, vaultId: VaultId): VaultName {
  let vaultName: VaultName | undefined;

  // Search each element in the list of vaults
  for (const elem in vaultList) {
    // List is of form <vaultName>\t<vaultId>
    const value = vaultList[elem].split('\t');
    if (value[1] === vaultId) {
      vaultName = value[0];
      break;
    }
  }
  if (vaultName == null) {
    throw new vaultErrors.ErrorRemoteVaultUndefined(
      `${vaultId} does not exist on connected node`,
    );
  }
  return vaultName;
}

/**
 * Creates a GitRequest object from the desired node connection.
 * @param client GRPC connection to desired node
 */
async function constructGitHandler(
  client: GRPCClientAgent,
  nodeId: NodeId,
): Promise<GitRequest> {
  const gitRequest = new GitRequest(
    ((vaultId: VaultId) => requestInfo(vaultId, client)).bind(this),
    ((vaultId: VaultId, body: Buffer) =>
      requestPack(vaultId, body, client)).bind(this),
    (() => requestVaultNames(client, nodeId)).bind(this),
  );
  return gitRequest;
}

/**
 * Requests remote info from the connected node for the named vault.
 * @param vaultName Name of the desired vault
 * @param client A connection object to the node
 * @returns Async Generator of Uint8Arrays representing the Info Response
 */
async function* requestInfo(
  vaultId: VaultId,
  client: GRPCClientAgent,
): AsyncGenerator<Uint8Array> {
  const request = new agentPB.InfoRequest();
  request.setId(vaultId);
  const response = client.vaultsGitInfoGet(request);

  for await (const resp of response) {
    yield resp.getChunk_asU8();
  }
}

/**
 * Requests a pack from the connected node for the named vault
 * @param vaultName name of vault
 * @param body contains the pack request
 * @param client A connection object to the node
 * @returns AsyncGenerator of Uint8Arrays representing the Pack Response
 */
async function* requestPack(
  vaultId: VaultId,
  body: Buffer,
  client: GRPCClientAgent,
): AsyncGenerator<Uint8Array> {
  const responseBuffers: Array<Buffer> = [];

  const meta = new grpc.Metadata();
  meta.set('vault-id', vaultId);

  const stream = client.vaultsGitPackGet(meta);
  const write = promisify(stream.write).bind(stream);

  stream.on('data', (d) => {
    responseBuffers.push(d.getChunk_asU8());
  });

  const chunk = new agentPB.PackChunk();
  chunk.setChunk(body);
  write(chunk);
  stream.end();

  yield await new Promise<Uint8Array>((resolve) => {
    stream.once('end', () => {
      resolve(Buffer.concat(responseBuffers));
    });
  });
}

/**
 * Requests the vault names from the connected node.
 * @param client A connection object to the node
 */
async function requestVaultNames(
  client: GRPCClientAgent,
  nodeId: NodeId,
): Promise<string[]> {
  const request = new agentPB.NodeIdMessage();
  request.setNodeId(nodeId);
  const vaultList = client.vaultsScan(request);
  const data: VaultList = [];
  for await (const vault of vaultList) {
    const vaultMessage = vault.getVault_asU8();
    data.push(Buffer.from(vaultMessage).toString());
  }

  return data;
}

export {
  generateVaultKey,
  generateVaultId,
  splitVaultId,
  fileExists,
  readdirRecursively,
  readdirRecursivelyEFS,
  readdirRecursivelyEFS2,
  constructGitHandler,
  searchVaultName,
};
