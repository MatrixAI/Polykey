import type { StripTransfer } from 'threads/dist/types/master';
import type { TransferDescriptor } from 'threads';
import process from 'process';
import b from 'benny';
import crypto from 'crypto';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Transfer } from 'threads';
import { WorkerManager, PolykeyWorkerModule, utils as workersUtils } from './src/workers';
import * as keysPasswordUtils from './src/keys/utils/password';
import * as utils from './src/utils';
import { sleep } from './src/utils';
import { PasswordSalt } from './src/keys/types';

function lol(x: BufferSource) {

}

lol(new ArrayBuffer(10))
lol(Buffer.from('abc'))
lol(new Uint8Array())


async function main () {
  const cores = 1;
  const workerManager = await workersUtils.createWorkerManager({ cores });

  // const inputSalt = Buffer.from([
  //   0x251,
  //   0x120,
  //   0x57,
  //   0x161,
  //   0x248,
  //   0x62,
  //   0x203,
  //   0x234,
  //   0x186,
  //   0x16,
  //   0x164,
  //   0x212,
  //   0x16,
  //   0x150,
  //   0x9,
  //   0x199
  // ]) as PasswordSalt;

  // is it worht it to do Buffer.allocUnsafeSlow()
  // then to copy the data into it one at a time?

  // const inputSalt = Buffer.allocUnsafeSlow(16);
  // inputSalt[0] = 0x251;
  // inputSalt[1] = 0x120;
  // inputSalt[2] = 0x57;
  // inputSalt[3] = 0x161;
  // inputSalt[4] = 0x248;
  // inputSalt[5] = 0x62;
  // inputSalt[6] = 0x203;
  // inputSalt[7] = 0x234;
  // inputSalt[8] = 0x186;
  // inputSalt[9] = 0x16;
  // inputSalt[10] = 0x164;
  // inputSalt[11] = 0x212;
  // inputSalt[12] = 0x16;
  // inputSalt[13] = 0x150;
  // inputSalt[14] = 0x9;
  // inputSalt[15] = 0x199;

  // const inputSaltAB = inputSalt.buffer;
  // console.log('INPUT SALT AB', inputSaltAB);
  // console.log('INPUT SALT BEFORE TRANSFER', inputSalt, inputSalt.buffer);

  const result = await workerManager.call(async (w) => {
    // if we want to "transfer" a salt in
    // const inputSaltABT = Transfer(
    //   [
    //     inputSalt.buffer
    //   ],
    //   [
    //     inputSalt.buffer
    //   ]
    // ) as TransferDescriptor<ArrayBuffer>;
    // console.log('INPUT SALT AFTER TRANSFER', inputSalt);
    // console.log('INPUT SALT AFTER TRANSFER', inputSalt.buffer);
    // console.log(inputSaltABT);

    const [hash, salt] = await w.hashPassword(
      'password',
    );
    return [utils.bufferWrap(hash), utils.bufferWrap(salt)];
  });

  // console.log('INPUT SALT AFTER TRANSFER', inputSalt);
  // console.log('INPUT SALT AFTER TRANSFER', inputSalt.buffer);

  // These are Uint8Arrays
  console.log('RESULT', result);

  // console.log(keysPasswordUtils.hashPassword(
  //   'password',
  // ));

  // Sleep at least 0 seconds
  // to allow the child thread to finish
  await sleep(0);
  await workerManager.destroy();
}

main();
