import type { EncryptedFS } from 'encryptedfs';
import type { VaultIdRaw, VaultId, VaultKey, VaultList, VaultName } from "./types";
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

async function generateVaultKey(bits: number = 256): Promise<VaultKey> {
  return await keysUtils.generateKey(bits) as VaultKey;
}

function isVaultIdRaw(arg: any): arg is VaultIdRaw {
  if (!( arg instanceof Buffer)) return false;
  return arg.length === 16;
}

/**
 * This will return arg as a valid VaultId or throw an error if it can't be converted.
 * This will take a multibase string of the ID or the raw Buffer of the ID.
 * @param arg - The variable we wish to convert
 * @throws vaultErrors.ErrorInvalidVaultId  if the arg can't be converted into a VaultId
 * @returns VaultIdRaw
 */
function makeVaultIdRaw(arg: any): VaultIdRaw {
  let id = arg;
  // Checking and converting a string
  if (typeof arg === 'string'){
    // Covert the string to the Buffer form.
    id = idUtils.fromMultibase(arg);
    if (id == null) throw new vaultErrors.ErrorInvalidVaultId();
    id = Buffer.from(id);
  }

  // checking if valid buffer.
  if (isVaultIdRaw(id)) return id;
  throw new vaultErrors.ErrorInvalidVaultId();
}

function isVaultId(arg: any): arg is VaultId {
  if (typeof arg !== 'string') return false;
  let id = idUtils.fromMultibase(arg);
  if (id == null) return false;
  return Buffer.from(id).length === 16;
}

function makeVaultId(arg: any): VaultId {
  let id = arg;
  if ((id instanceof Buffer)) {
    id = idUtils.toMultibase(arg, 'base58btc');
  }
  if(isVaultId(id)) return id;
  throw new vaultErrors.ErrorInvalidVaultId();
}

const randomIdGenerator = new IdRandom();
function generateVaultId(): VaultId {
  return makeVaultId(Buffer.from(randomIdGenerator.get()) as VaultIdRaw);
}

// FIXME, deprecated. we don't split the VaultId anymore
function splitVaultId(vaultId: VaultId): VaultId{
  return vaultId;
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
  const dirents = await fs.readdir(dir);
  let secretPath: string;
  for (const dirent of dirents) {
    const res = dirent.toString(); // Makes string | buffer a string.
    secretPath = path.join(dir, res);
    if ((await fs.stat(secretPath)).isDirectory() && dirent !== '.git') {
      if (dirs === true) {
        yield secretPath;
      }
      yield* readdirRecursivelyEFS(fs, secretPath, dirs);
    } else if ((await fs.stat(secretPath)).isFile()) {
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
function searchVaultName(vaultList: VaultList, vaultId: VaultIdRaw): VaultName {
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
  // FIXME make it a VaultIdReadable
  meta.set('vault-id', makeVaultId(vaultId));

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
  const data: string[] = [];
  for await (const vault of vaultList) {
    const vaultMessage = vault.getVault_asU8();
    data.push(Buffer.from(vaultMessage).toString());
  }

  return data;
}

export {
  isVaultIdRaw,
  isVaultId,
  makeVaultIdRaw,
  makeVaultId,
  generateVaultKey,
  generateVaultId,
  // splitVaultId,
  fileExists,
  readdirRecursively,
  readdirRecursivelyEFS,
  readdirRecursivelyEFS2,
  constructGitHandler,
  searchVaultName,
};
