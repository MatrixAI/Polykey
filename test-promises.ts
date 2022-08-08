async function main () {

  const p = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('oh no'))
    }, 500);
    setTimeout(resolve, 1000);
  });

  const f = async () => {
    await p;
    return 'f';
  };

  const g = async () => {
    await p;
    return 'g';
  };

  const r = await Promise.allSettled([
    f(),
    g()
  ]);

  console.log(r);

  // @ts-ignore
  console.log(r[0].reason === r[1].reason); // This is `true`

  // The same exception object is thrown to all awaiters

}

void main();

