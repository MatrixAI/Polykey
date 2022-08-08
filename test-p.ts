async function main () {

  const p = Promise.resolve(1);
  const p2 = p.then((v) => {
    console.log('DO SOME COMPUTATION');
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve('abc'), 1000);
      reject(new Error('yea'));
    });
  });

  try {
    await p2;
  } catch (e) {
    console.log('ERROR', e);
  }

  console.log('DONE');

}

void main();
