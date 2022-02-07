import type {
  VaultId,
  VaultIdEncoded,
  VaultRef,
  VaultAction,
  CommitId,
} from './types';
import type { FileSystem, POJO } from '../types';
import type { GRPCClientAgent } from '../agent';
import type { NodeId } from '../nodes/types';

import path from 'path';
import { IdInternal, IdRandom, utils as idUtils } from '@matrixai/id';
import * as grpc from '@grpc/grpc-js';
import { tagLast, refs, vaultActions } from './types';
import * as nodesUtils from '../nodes/utils';
import * as vaultsPB from '../proto/js/polykey/v1/vaults/vaults_pb';
import * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';

/**
 * Vault history is designed for linear-history
 * The canonical branch represents the one and only true timeline
 * In the future, we can introduce non-linear history
 * Where branches are automatically made when new timelines are created
 */
const canonicalBranch = 'master';

const vaultIdGenerator = new IdRandom<VaultId>();

function generateVaultId(): VaultId {
  return vaultIdGenerator.get();
}

function encodeVaultId(vaultId: VaultId): VaultIdEncoded {
  return vaultId.toMultibase('base58btc') as VaultIdEncoded;
}

function decodeVaultId(vaultIdEncoded: any): VaultId | undefined {
  if (typeof vaultIdEncoded !== 'string') {
    return;
  }
  const vaultId = IdInternal.fromMultibase<VaultId>(vaultIdEncoded);
  if (vaultId == null) {
    return;
  }
  return vaultId;
}

/**
 * Vault reference can be HEAD, any of the special tags or a commit ID
 */
function validateRef(ref: any): ref is VaultRef {
  return refs.includes(ref) || validateCommitId(ref);
}

/**
 * Commit ids are SHA1 hashes encoded as 40-character long lowercase hexadecimal strings
 */
function validateCommitId(commitId: any): commitId is CommitId {
  return /^[a-f0-9]{40}$/.test(commitId);
}

function commitAuthor(nodeId: NodeId): { name: string; email: string } {
  return {
    name: nodesUtils.encodeNodeId(nodeId),
    email: '',
  };
}

// Function isVaultId(arg: any) {
//   return isId<VaultId>(arg);
// }
// /**
//  * This will return arg as a valid VaultId or throw an error if it can't be converted.
//  * This will take a multibase string of the ID or the raw Buffer of the ID.
//  * @param arg - The variable we wish to convert
//  * @throws vaultsErrors.ErrorInvalidVaultId  if the arg can't be converted into a VaultId
//  * @returns VaultId
//  */
// function makeVaultId(arg: any): VaultId {
//   return makeId<VaultId>(arg);
// }
// function isVaultIdPretty(arg: any): arg is VaultIdPretty {
//   return isIdString<VaultIdPretty>(arg);
// }
// function makeVaultIdPretty(arg: any): VaultIdPretty {
//   return makeIdString<VaultIdPretty>(arg);
// }

// async function fileExists(fs: FileSystem, path: string): Promise<boolean> {
//   try {
//     const fh = await fs.promises.open(path, 'r');
//     await fh.close();
//   } catch (err) {
//     if (err.code === 'ENOENT') {
//       return false;
//     }
//   }
//   return true;
// }

// async function* readdirRecursively(fs, dir = '.') {
//   const dirents = await fs.promises.readdir(dir);
//   for (const dirent of dirents) {
//     const res = path.join(dir, dirent.toString());
//     const stat = await fs.promises.stat(res);
//     if (stat.isDirectory()) {
//       yield* readdirRecursively(fs, res);
//     } else if (stat.isFile()) {
//       yield res;
//     }
//   }
// }

// async function request(
//   client: GRPCClientAgent,
//   nodeId: NodeId,
//   vaultNameOrId: VaultId | VaultName,
// ) {
//   const requestMessage = new vaultsPB.InfoRequest();
//   const vaultMessage = new vaultsPB.Vault();
//   const nodeMessage = new nodesPB.Node();
//   nodeMessage.setNodeId(nodeId);
//   requestMessage.setAction('clone');
//   if (typeof vaultNameOrId === 'string') {
//     vaultMessage.setNameOrId(vaultNameOrId);
//   } else {
//     // To have consistency between GET and POST, send the user
//     // readable form of the vault Id
//     vaultMessage.setNameOrId(makeVaultIdPretty(vaultNameOrId));
//   }
//   requestMessage.setVault(vaultMessage);
//   requestMessage.setNode(nodeMessage);
//   const response = client.vaultsGitInfoGet(requestMessage);
//   let vaultName, remoteVaultId;
//   response.stream.on('metadata', async (meta) => {
//     // Receive the Id of the remote vault
//     vaultName = meta.get('vaultName').pop();
//     if (vaultName) vaultName = vaultName.toString();
//     const vId = meta.get('vaultId').pop();
//     if (vId) remoteVaultId = makeVaultId(vId.toString());
//   });
//   // Collet the response buffers from the GET request
//   const infoResponse: Uint8Array[] = [];
//   for await (const resp of response) {
//     infoResponse.push(resp.getChunk_asU8());
//   }
//   const metadata = new grpc.Metadata();
//   if (typeof vaultNameOrId === 'string') {
//     metadata.set('vaultNameOrId', vaultNameOrId);
//   } else {
//     // Metadata only accepts the user readable form of the vault Id
//     // as the string form has illegal characters
//     metadata.set('vaultNameOrId', makeVaultIdPretty(vaultNameOrId));
//   }
//   return [
//     async function ({
//       url,
//       method = 'GET',
//       headers = {},
//       body = [Buffer.from('')],
//     }: {
//       url: string;
//       method: string;
//       headers: POJO;
//       body: Buffer[];
//     }) {
//       if (method === 'GET') {
//         // Send back the GET request info response
//         return {
//           url: url,
//           method: method,
//           body: infoResponse,
//           headers: headers,
//           statusCode: 200,
//           statusMessage: 'OK',
//         };
//       } else if (method === 'POST') {
//         const responseBuffers: Array<Uint8Array> = [];
//         const stream = client.vaultsGitPackGet(metadata);
//         const chunk = new vaultsPB.PackChunk();
//         // Body is usually an async generator but in the cases we are using,
//         // only the first value is used
//         chunk.setChunk(body[0]);
//         // Tell the server what commit we need
//         await stream.write(chunk);
//         let packResponse = (await stream.read()).value;
//         while (packResponse != null) {
//           responseBuffers.push(packResponse.getChunk_asU8());
//           packResponse = (await stream.read()).value;
//         }
//         return {
//           url: url,
//           method: method,
//           body: responseBuffers,
//           headers: headers,
//           statusCode: 200,
//           statusMessage: 'OK',
//         };
//       } else {
//         throw new Error('Method not supported');
//       }
//     },
//     vaultName,
//     remoteVaultId,
//   ];
// }

function isVaultAction(action: any): action is VaultAction {
  if (typeof action !== 'string') return false;
  return (vaultActions as Readonly<Array<string>>).includes(action);
}

export {
  tagLast,
  refs,
  canonicalBranch,
  generateVaultId,
  encodeVaultId,
  decodeVaultId,
  validateRef,
  validateCommitId,
  commitAuthor,
  isVaultAction,
};
