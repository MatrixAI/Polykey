import type { EncryptedFS } from 'encryptedfs';
import type {
  VaultId,
  VaultKey,
  VaultList,
  VaultName,
  FileSystemReadable,
  VaultIdPretty
} from './types';
import type { FileSystem } from '../types';
import type { NodeId } from '../nodes/types';

import fs from 'fs';
import path from 'path';
import { IdRandom,  utils as idUtils} from "@matrixai/id";

import { GitRequest } from '../git';
import * as grpc from '@grpc/grpc-js';

import { promisify } from '../utils';

import * as agentPB from '../proto/js/Agent_pb';
import { GRPCClientAgent } from '../agent';

import * as keysUtils from '../keys/utils';
import { errors as vaultErrors } from './';
import { isIdString, isId, makeIdString, makeId, stringToId, idToString } from '../GenericIdTypes';

async function generateVaultKey(bits: number = 256): Promise<VaultKey> {
  return await keysUtils.generateKey(bits) as VaultKey;
}

function isVaultId(arg: any) {
  return isId<VaultId>(arg);
}

/**
 * This will return arg as a valid VaultId or throw an error if it can't be converted.
 * This will take a multibase string of the ID or the raw Buffer of the ID.
 * @param arg - The variable we wish to convert
 * @throws vaultErrors.ErrorInvalidVaultId  if the arg can't be converted into a VaultId
 * @returns VaultId
 */
function makeVaultId(arg: any): VaultId {
  return makeId<VaultId>(arg);
}

function isVaultItPretty(arg: any): arg is VaultIdPretty {
  return isIdString<VaultIdPretty>(arg);
}

function makeVaultIdPretty(arg: any): VaultIdPretty {
  return makeIdString<VaultIdPretty>(arg);
}

const randomIdGenerator = new IdRandom();
function generateVaultId(): VaultId {
  return makeVaultId(randomIdGenerator.get());
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
  efs: FileSystemReadable,
  dir: string,
  dirs?: boolean,
) {
  const dirents = await efs.readdir(dir);
  let secretPath: string;
  for (const dirent of dirents) {
    const res = dirent.toString(); // Makes string | buffer a string.
    secretPath = path.join(dir, res);
    if ((await efs.stat(secretPath)).isDirectory() && dirent !== '.git') {
      if (dirs === true) {
        yield secretPath;
      }
      yield* readdirRecursivelyEFS(efs, secretPath, dirs);
    } else if ((await efs.stat(secretPath)).isFile()) {
      yield secretPath;
    }
  }
}

async function* readdirRecursivelyEFS2(
  fs: EncryptedFS,
  dir: string,
  dirs?: boolean,
): AsyncGenerator<string> {
  const dirents = await fs.readdir(dir);
  let secretPath: string;
  for (const dirent of dirents) {
    const res = dirent.toString();
    secretPath = path.join(dir, res);
    if (dirent !== '.git') {
      try {
        await fs.readdir(secretPath);
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
 * @param nodeId
 */
async function constructGitHandler(
  client: GRPCClientAgent,
  nodeId: NodeId,
): Promise<GitRequest> {
  const gitRequest = new GitRequest(
    ((vaultNameOrId: VaultId | VaultName) => requestInfo(vaultNameOrId, client)).bind(this),
    ((vaultNameOrId: VaultId | VaultName, body: Buffer) =>
      requestPack(vaultNameOrId, body, client)).bind(this),
    (() => requestVaultNames(client, nodeId)).bind(this),
  );
  return gitRequest;
}

/**
 * Requests remote info from the connected node for the named vault.
 * @param vaultId ID of the desired vault
 * @param client A connection object to the node
 * @returns Async Generator of Uint8Arrays representing the Info Response
 */
async function* requestInfo(
  vaultNameOrId: VaultId | VaultName,
  client: GRPCClientAgent,
): AsyncGenerator<Uint8Array> {
  const request = new agentPB.InfoRequest();
  request.setVaultId(vaultNameOrId);
  const response = client.vaultsGitInfoGet(request);

  for await (const resp of response) {
    yield resp.getChunk_asU8();
  }
}

/**
 * Requests a pack from the connected node for the named vault
 * @param vaultId ID of vault
 * @param body contains the pack request
 * @param client A connection object to the node
 * @returns AsyncGenerator of Uint8Arrays representing the Pack Response
 */
async function* requestPack(
  vaultNameOrId: VaultId | VaultName,
  body: Buffer,
  client: GRPCClientAgent,
): AsyncGenerator<Uint8Array> {
  const responseBuffers: Array<Buffer> = [];

  const meta = new grpc.Metadata();
  // FIXME make it a VaultIdReadable
  meta.set('vaultNameOrId', vaultNameOrId.toString());

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
 * @param nodeId
 */
async function requestVaultNames(
  client: GRPCClientAgent,
  nodeId: NodeId,
): Promise<string[]> {
  const request = new agentPB.NodeIdMessage();
  request.setNodeId(nodeId);
  const vaultList = client.vaultsScan(request);
  const data: string[] = [];
  for await (const vault of vaultList) {
    const vaultMessage = vault.getVault_asU8();
    data.push(Buffer.from(vaultMessage).toString());
  }

  return data;
}

export {
  isVaultId,
  isVaultItPretty,
  makeVaultId,
  makeVaultIdPretty,
  generateVaultKey,
  generateVaultId,
  fileExists,
  readdirRecursively,
  readdirRecursivelyEFS,
  readdirRecursivelyEFS2,
  constructGitHandler,
  searchVaultName,
};
