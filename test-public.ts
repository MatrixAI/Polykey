import * as nobleEd25519 from '@noble/ed25519';
import * as random from './src/keys/utils/random';

const publicKey = random.getRandomBytesSync(32);

let point;
try {
  point = nobleEd25519.Point.fromHex(publicKey);
} catch (e) {

  console.log('NAME', e.name);
  console.log('MESSAGE', e.message);

}

console.log(point);
