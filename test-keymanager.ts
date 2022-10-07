import KeyManager from './src/keys/KeyManager';
import { pkcs5, md } from 'node-forge';

async function main () {
  const keyManager = await KeyManager.createKeyManager(
    {
      keysPath: './tmp/keys',
      password: 'abc123'
    }
  );

  // THIS IS ALSO 32 bytes
  console.log(keyManager.getNodeId());

  const b = pkcs5.pbkdf2(
    'fan rocket alarm yellow jeans please reunion eye dumb prepare party wreck timber nasty during nature timber pond goddess border slam flower tuition success',
    'mnemonic',
    2048,
    64,
    md.sha512.create(),
  );

  const bB = Buffer.from(b, 'binary');

  console.log(bB);
  console.log(bB.length);

  console.log(bB.toString('hex'));

  await keyManager.stop();
}

void main();
