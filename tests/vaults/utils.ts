import type { Vault } from '@/vaults';
import type {
  VaultActions,
  HeaderContent,
  HeaderGeneric,
} from '@/vaults/types';
import { TransformStream } from 'stream/web';
import path from 'path';
import fc from 'fast-check';
import { vaultActions } from '@/vaults/types';
import { HeaderType } from '@/vaults/fileTree';
import * as vaultsUtils from '@/vaults/utils';

const vaultActionArb = fc.constantFrom(...vaultActions);

const vaultActionsArb = fc.dictionary(vaultActionArb, fc.constant(null), {
  minKeys: 0,
  maxKeys: vaultActions.length,
}) as fc.Arbitrary<VaultActions>;

const headerTypeArb: fc.Arbitrary<HeaderType> = fc.oneof(
  fc.constant(HeaderType.CONTENT),
  fc.constant(HeaderType.TREE),
);
const headerGenericArb = fc.record<HeaderGeneric>({
  type: headerTypeArb,
});
const headerContentArb = fc.record<HeaderContent>({
  dataSize: fc.bigUint({ max: 2n ** 63n }),
  iNode: fc.nat(),
});

/**
 * This is used to convert regular chunks into randomly sized chunks based on
 * a provided pattern. This is to replicate randomness introduced by packets
 * splitting up the data.
 */
function binaryStreamToSnippedStream(
  snippingPattern: Array<number>,
): TransformStream<Uint8Array, Uint8Array> {
  let buffer = Buffer.alloc(0);
  let iteration = 0;
  return new TransformStream<Uint8Array, Uint8Array>({
    transform: (chunk, controller) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (true) {
        const snipAmount = snippingPattern[iteration % snippingPattern.length];
        if (snipAmount > buffer.length) break;
        iteration += 1;
        const returnBuffer = buffer.subarray(0, snipAmount);
        controller.enqueue(returnBuffer);
        buffer = buffer.subarray(snipAmount);
      }
    },
    flush: (controller) => {
      controller.enqueue(buffer);
    },
  });
}

async function writeSecret(vault: Vault, secretPath: string, contents: string) {
  return await vault.writeF(async (efs) => {
    await vaultsUtils.mkdirExists(efs, path.dirname(secretPath));
    await efs.writeFile(secretPath, contents);
  });
}

async function readSecret(vault: Vault, path: string) {
  return await vault.readF(async (efs) => {
    return await efs.readFile(path);
  });
}

async function expectSecret(
  vault: Vault,
  path: string,
  contentsExpected: string,
) {
  const contentsSecretP = readSecret(vault, path);
  await expect(contentsSecretP).resolves.toBeDefined();
  const contentsSecretValue = (await contentsSecretP).toString();
  expect(contentsSecretValue).toBe(contentsExpected);
}

async function expectSecretNot(vault: Vault, path: string) {
  const contentsSecretP = readSecret(vault, path);
  await expect(contentsSecretP).rejects.toThrow(
    'ENOENT: no such file or directory',
  );
}

async function mkdir(vault: Vault, path: string) {
  return await vault.writeF(async (efs) => {
    await vaultsUtils.mkdirExists(efs, path);
  });
}

async function expectDirExists(vault: Vault, path: string) {
  return await vault.readF(async (efs) => {
    const dirP = efs.readdir(path);
    await expect(dirP).resolves.toBeDefined();
  });
}

async function expectDirExistsNot(vault: Vault, path: string) {
  return await vault.readF(async (efs) => {
    const dirP = efs.readdir(path);
    await expect(dirP).rejects.toThrow('ENOENT');
  });
}

export {
  vaultActionArb,
  vaultActionsArb,
  headerTypeArb,
  headerGenericArb,
  headerContentArb,
  binaryStreamToSnippedStream,
  writeSecret,
  readSecret,
  expectSecret,
  expectSecretNot,
  mkdir,
  expectDirExists,
  expectDirExistsNot,
};
