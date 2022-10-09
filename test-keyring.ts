import KeyRing from './src/keys/KeyRing';

async function main () {


  const keyRing = await KeyRing.createKeyRing({
    keysPath: './tmp/keyring',
    password: 'password',
  });

  console.log(keyRing);

  await keyRing.stop();
  // await keyRing.destroy();

}

main();
