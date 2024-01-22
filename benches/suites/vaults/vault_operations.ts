import b from 'benny';
import { summaryName, suiteCommon } from '../../utils';
import fs from "fs";
import path from "path";
import os from "os";
import * as keysUtils from "@/keys/utils";
import {EncryptedFS} from "encryptedfs";
import Logger, {LogLevel, StreamHandler} from "@matrixai/logger";
import {DB} from "@matrixai/db";
import VaultInternal from "../../../src/vaults/VaultInternal";
import {Vault} from "@/vaults";
import KeyRing from "@/keys/KeyRing";
import * as vaultsUtils from "@/vaults/utils"
import * as nodesUtils from "@/nodes/utils"
import * as vaultOps from "@/vaults/VaultOps";


async function main() {
  const logger = new Logger('VaultOps', LogLevel.WARN, [new StreamHandler()]);
  const dataDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'polykey-test-'),
  );
  const dbPath = path.join(dataDir, 'efsDb');
  const dbKey = keysUtils.generateKey();
  const dummyKeyRing = {
    getNodeId: () => {
      return nodesUtils.decodeNodeId('v13o9h7aahij42b3b4lt0lu1ovlqp46t2sb1l1amk1onumdor4v1g');
    },
  } as KeyRing;
  const baseEfs = await EncryptedFS.createEncryptedFS({
    dbKey,
    dbPath,
    logger,
  });
  await baseEfs.start();
  const db = await DB.createDB({
    dbPath: path.join(dataDir, 'db'),
    logger,
  });
  const vaultsDbPath = ['vaults'];
  const vaultIdGenerator = vaultsUtils.createVaultIdGenerator();
  const vaultInternal = await VaultInternal.createVaultInternal({
    keyRing: dummyKeyRing,
    vaultId: vaultIdGenerator(),
    efs: baseEfs,
    logger: logger.getChild(VaultInternal.name),
    fresh: true,
    db,
    vaultsDbPath: vaultsDbPath,
    vaultName: 'VaultName',
  });
  const vault = vaultInternal as Vault;
  let count = 1
  await vaultOps.addSecret(vault, `secret-0`, 'secret-content');
  const summary = await b.suite(
    summaryName(__filename),
    // b.add('creating a vault', async () => {
    //   await VaultInternal.createVaultInternal({
    //     keyRing: dummyKeyRing,
    //     vaultId: vaultIdGenerator(),
    //     efs: baseEfs,
    //     logger: logger.getChild(VaultInternal.name),
    //     fresh: true,
    //     db,
    //     vaultsDbPath: vaultsDbPath,
    //     vaultName: 'VaultName',
    //   });
    // }),
    b.add('efs writing a file', async () => {
      count++;
      await baseEfs.writeFile(`becret-${count}`, 'secret-content');
    }),
    b.add('adding a secret', async () => {
      count++;
      await vaultOps.addSecret(vault, `secret-${count}`, 'secret-content');
    }),
    // b.add('updating a secret', async () => {
    //   addCount++;
    //   await vaultOps.updateSecret(vault, `secret-0`, `secret-content-${addCount}`);
    // }),
    ...suiteCommon,
  );
  return summary;
}

if (require.main === module) {
  void main();
}

export default main;
