import * as hash from './src/keys/utils/hash';
import * as hashing from './src/tokens/utils';

async function main () {

  // thisis what it takes to do it

  const digest = hash.sha256(Buffer.from('hello world'));
  console.log(hashing.sha256MultiHash(digest));



  // const encodeR = await hashing.sha256M.encode(Buffer.from('abc'));
  // const digestR = await hashing.sha256M.digest(Buffer.from('abc'));

  // console.log(encodeR.byteLength);
  // console.log(encodeR);

  // console.log(digestR);

  // // so remember
  // // that upon hashing, you have a multihash digest

  // // this is the actual byte reprentation
  // // the remaining stuff still needs to be "multibase" encoded
  // console.log(digestR.bytes);


  // // so therefore
  // // BASEENCODING + MULTIHASH is exactly what you want




}

main();
