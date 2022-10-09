import type { BufferLocked, Key } from './src/keys/types';
import { bufferLock, bufferUnlock } from './src/keys/utils/memory';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';

@CreateDestroyStartStop()
class X {

  l: BufferLocked<Key>;

  lol() {
    const data = Buffer.from('abc') as Key;
    bufferLock(data);
    bufferLock(data);
    console.log(data);
    bufferUnlock(data);
    console.log(data);

    this.l = data;
  }

  public constructor() {

  }

  public async start() {

  }

  public async stop() {

  }
}

async function main () {
  const x = new X();
  x.lol();
}

main();
