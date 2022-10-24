import type { Codec } from 'multiformats/bases/base';
import { bases } from 'multiformats/basics';
import { bufferWrap } from './utils';

type MultibaseFormats = keyof typeof bases;

const basesByPrefix: Record<string, Codec<string, string>> = {};
for (const k in bases) {
  const codec = bases[k];
  basesByPrefix[codec.prefix] = codec;
}

function toMultibase(data: BufferSource, format: MultibaseFormats): string {
  const codec = bases[format];
  return codec.encode(bufferWrap(data));
}

function fromMultibase(s: string): Buffer | undefined {
  const prefix = s[0];
  const codec = basesByPrefix[prefix];
  if (codec == null) {
    return;
  }
  let data: Uint8Array;
  try {
    data = codec.decode(s);
  } catch (e) {
    return;
  }
  return bufferWrap(data);
}

export {
  toMultibase,
  fromMultibase,
};

export type {
  MultibaseFormats
};
