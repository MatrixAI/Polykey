// import * as hashing from './src/keys/utils/hashing';
import * as hashing from './src/tokens/utils';

async function main () {

  console.log(hashing.sha256);
  const encodeR = await hashing.sha256.encode(Buffer.from('abc'));
  const digestR = await hashing.sha256.digest(Buffer.from('abc'));

  console.log(encodeR.byteLength);
  console.log(encodeR);

  console.log(digestR);

  // so remember
  // that upon hashing, you have a multihash digest

  // this is the actual byte reprentation
  // the remaining stuff still needs to be "multibase" encoded
  console.log(digestR.bytes);


  // so therefore
  // BASEENCODING + MULTIHASH is exactly what you want




}

main();
