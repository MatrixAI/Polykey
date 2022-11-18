import process from 'process';

process.on('uncaughtException', () => {
  console.log('Exception was uncaught');
});

process.on('unhandledRejection', () => {
  console.log('Rejection was unhandled');
});

async function sleep(ms: number): Promise<void> {
  return await new Promise<void>((r) => setTimeout(r, ms));
}

async function *gf1() {
  let c = 0;
  while (true) {
    await sleep(100);
    yield 'G1 string';
    if (c === 5) {
      throw new Error('There is an Error!');
    }
    c++;
  }
}

async function *gf2() {
  while (true) {
    await sleep(100);
    try {
      yield 'G2 string';
    } catch (e) {
      // This yield is for the `throw` call
      // It ends up being AWAITED FOR
      yield;
      // Then on the NEXT `next` call they will get an error
      // That's how it has to work... LOL
      throw(new Error('Wrapped Error'));
    }
  }
}

async function main () {
  const g1 = gf1();
  for (let i = 0; i < 10; i++) {
    try {
      console.log(await g1.next());
    } catch (e) {
      console.log('Consumed an exception!');
      break;
    }
  }

  const g2 = gf2();
  setTimeout(async () => {
    // await g.return();
    // Async generator
    // If the thrown error is NOT caught
    // this will return a Promise that REJECTS
    // with the exception passed in
    // void g2.throw(new Error('There is an Error!')).catch((e) => {
    //   console.log('IGNORING ERROR: ', e.message);
    // });

    console.log(await g2.throw(new Error('There is an Error!')));
  }, 250);

  for (let i = 0; i < 10; i++) {
    try {
      console.log(await g2.next());
    } catch (e) {
      console.log('Consumed an exception!');
      break;
    }
  }
  console.log(await g2.next());

}

void main();

// Ok so when the stream has an exception
// If we use async generator throw
// The async generator is being consumed by the end user
// That exception cannot be passed into the `yield`
// Not even if I wait until the next loop
// Because under the while loop it will try to do that

// The problem is here... the types will be a bit weird though
// So that's what you have to be careful about
