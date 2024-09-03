import type {
  VaultActions,
  HeaderContent,
  HeaderGeneric,
} from '@/vaults/types';
import { TransformStream } from 'stream/web';
import fc from 'fast-check';
import { vaultActions } from '@/vaults/types';
import { HeaderType } from '@/vaults/fileTree';

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

export {
  vaultActionArb,
  vaultActionsArb,
  headerTypeArb,
  headerGenericArb,
  headerContentArb,
  binaryStreamToSnippedStream,
};
