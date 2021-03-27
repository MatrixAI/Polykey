import { KeyManager } from './src/keys';

// import level from 'level';

// import { WorkerManager } from './workers';

// async function leveltest () {
//   const db = level('tmp/level');
//   await db.put('k', 'v');
//   const v = await db.get('k');
//   console.log(v);
// }
// leveltest();

async function keystest () {
  const km = new KeyManager({
    keysPath: './tmp/keys'
  });
  await km.start('newpassword');

  await km.changeRootKeyPassword('password');
  await km.stop();

  // this results in an error
  // even though we changed the password
  // how strange is that?
  await km.start('password');
  await km.stop();
}

keystest();
