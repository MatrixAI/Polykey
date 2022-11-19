import { Subject } from 'rxjs';

// This example demonstrates a simple handler with
// input async generator and output async generator

async function sleep(ms: number): Promise<void> {
  return await new Promise<void>((r) => setTimeout(r, ms));
}


// Echo handler
async function* handler1(
  input: AsyncIterableIterator<Buffer>
): AsyncGenerator<Buffer, Buffer, any> {
  // This will not preserve the `return`
  // for await(const chunk of input) {
  //   yield chunk;
  // }

  // This will also not preserve the `return`
  // yield* input;

  // If we want to preserve the `return`
  // We must use `return` here too
  // Note that technically the `any` is required
  // At the end, although technically that is not allowed
  return yield* input;
}

async function client1() {
  console.log('CLIENT 1 START');
  async function* input() {
    yield Buffer.from('hello');
    yield Buffer.from('world');
    return Buffer.from('end');
  }
  // Assume the client gets `AsyncIterableIterator`
  const output = handler1(input()) as AsyncIterableIterator<Buffer>;
  // for await (const chunk of output) {
  //   console.log(chunk.toString());
  // }
  while (true) {
    const { done, value } = await output.next();
    if (Buffer.isBuffer(value)) {
      console.log(value.toString());
    } else {
      console.log('end with nothing');
    }
    if (done) {
      break;
    }
  }
  console.log('CLIENT 1 STOP');
}

// Client Streaming
async function* handler2(
  input: AsyncIterableIterator<Buffer>
): AsyncGenerator<Buffer, Buffer> {
  let chunks = Buffer.from('');
  for await(const chunk of input) {
    chunks = Buffer.concat([chunks, chunk]);
  }
  return chunks;
}

async function client2() {
  console.log('CLIENT 2 START');
  async function* input() {
    yield Buffer.from('hello');
    yield Buffer.from('world');
  }
  const output = handler2(input()) as AsyncIterableIterator<Buffer>;
  // Cannot use for..of for returned values
  // Because the `return` is not maintained
  let done: boolean | undefined = false;
  while (!done) {
    let value: Buffer;
    ({ done, value } = await output.next());
    console.log(value.toString());
  }
  console.log('CLIENT 2 STOP');
}

// Server streaming
async function* handler3(
  _: AsyncIterableIterator<Buffer>
): AsyncGenerator<Buffer, Buffer | undefined> {
  // This handler doesn't care about the input
  // It doesn't even bother processing it
  yield Buffer.from('hello');
  yield Buffer.from('world');
  // Can we use the `return` to indicate an "early close"?
  return Buffer.from('end');
  // It is possible to return `undefined`
  // return;
}

async function client3() {
  console.log('CLIENT 3 START');
  // The RPC system can default `undefined` to be an empty async generator
  const output = handler3((async function* () {})()) as AsyncIterableIterator<Buffer>;
  while (true) {
    const { done, value } = await output.next();
    if (Buffer.isBuffer(value)) {
      console.log(value.toString());
    } else {
      console.log('end with nothing');
    }
    if (done) {
      break;
    }
  }
  console.log('CLIENT 3 STOP');
}

// Duplex streaming
// Pull-on both ends
async function *handler4(
  input: AsyncIterableIterator<Buffer>
): AsyncGenerator<Buffer, Buffer | undefined> {
  // Note that
  // the reason why we return `AsyncGenerator`
  // Is because technically the user of this
  // Can be used with `return()` and `throw()`
  // But it is important to realise the types
  // Can be more flexible
  // We may wish to create our own types to be compatible

  // This concurrently consumes and concurrently produces
  // The order is not sequenced
  // How do we do this?
  // Well something has to indicate consumption
  // Something has to indicate production
  // But they should be done in parallel

  // This is something that can be done
  // by converting them to web streams (but that focuses on buffers)
  // Alternatively by converting it to an event emitter?
  // Or through rxjs... let's try that soon

  void (async () => {
    // It can be expected that the input will end
    // when the connection is stopped
    // Or if abruptly we must consider the catching an exception
    while (true) {
      const { done, value } = await input.next();
      if (Buffer.isBuffer(value)) {
        console.log('received', value.toString());
      }
      if (done) {
        console.log('received done');
        break;
      }
    }
  })();

  let counter = 0;
  while (true) {
    yield Buffer.from(counter.toString());
    counter++;
  }

  // how do we know when to stop consuming?
  // remember that once the connection stops
  // we need to indicate that when we are finished
  // remember that the thing should eventually be done
  // otherwise we have a dangling promise
  // that's kind of important
  // wait we have an issue here
  // how do we know when we are "finished"?
  // or do we just `void` it?
}

async function client4() {
  console.log('CLIENT 4 START');
  async function *input() {
    yield Buffer.from('hello');
    yield Buffer.from('world');
    return;
  }
  const output = handler4(input()) as AsyncIterableIterator<Buffer>;
  console.log(await output.next());
  console.log(await output.next());
  console.log(await output.next());
  console.log(await output.next());
  console.log(await output.next());
  console.log(await output.next());

  // if we want to "finish" the stream
  // we can just stop consuming the `next()`
  // But there's an issue here
  console.log('CLIENT 4 STOP');
}

// How to "break" connection
async function* handler5(
  input: AsyncIterableIterator<Buffer>
): AsyncGenerator<Buffer, Buffer | undefined> {
  while (true) {
    let value, done;
    try {
      ({ value, done } = await input.next());
    } catch (e) {
      console.log('SERVER GOT ERROR:', e.message);
      break;
    }
    console.log('server received', value, done);
    yield Buffer.from('GOT IT');
    if (done) {
      console.log('server done');
      break;
    }
  }
  return;
}

async function client5() {
  console.log('CLIENT 5 START');
  // In this scenario
  async function* input() {
    while (true) {
      await sleep(100);
      try {
        yield Buffer.from('hello');
      } catch (e) {
        yield;
        throw e;
      }
    }
  }
  const inputG = input();
  const output = handler5(inputG as AsyncIterableIterator<Buffer>);
  setTimeout(() => {
    void inputG.throw(new Error('Connection Failed'));
  }, 250);
  while(true) {
    const { done, value } = await output.next();
    console.log('client received', value);
    if (done) {
      break;
    }
  }
  console.log('CLIENT 5 STOP');
}

// Convert to `push`

// This is a push based system
// if you don't answer it
// let's see
const subject = new Subject<Buffer>();

subject.subscribe({
  next: (v) => console.log('PUSH:', v)
});

async function *handler6 (
  input: AsyncIterableIterator<Buffer>
): AsyncGenerator<Buffer, Buffer | undefined> {

  // This is "done" asynchronously, while we pull from the stream
  // How to do this in an asynchronus way?
  const p = (async () => {
    while (true) {
      const { value, done } = await input.next();
      subject.next(value);
      if (done) {
        break;
      }
    }
  })();

  await sleep(100);

  yield Buffer.from('Hello');
  yield Buffer.from('World');
  // The stream is FINISHED
  // but is the function call still completing?
  // Consider what happens if that is the case
  // We may want the function's lifecycle to be more complete

  // Await to finish this
  // This is what allows you to capture any errors
  // And the RPC system to throw it back up!!!
  await p;

  // This sort of means that the OUTPUT stream isn't finished
  // UNTIL you are finishign the INPUT stream
  // This is a bit of a problem
  // You can also send it earlier
  // But if there's an exception in the processing...

  // WELL YEA... you'd need to keep the output stream open
  // while you are consuming data
  // otherwise you cannot signal that something failed
  return;
}

async function client6() {
  console.log('CLIENT 6 START');
  // In this scenario
  async function* input() {
    yield Buffer.from('first');
    yield Buffer.from('second');
    return;
  }
  const output = handler6(input());
  while(true) {
    const { done, value } = await output.next();
    console.log('client received', value);
    if (done) {
      break;
    }
  }
  console.log('CLIENT 6 STOP');
}


async function main() {
  // await client1();
  // await client2();
  // await client3();
  // await client4();
  // await client5();
  await client6();
}

void main();

// We assume that the RPC wrapper would plumb the async generator data
// into the underlying web stream provided by the transport layer

// The async generator `return` can be used to indicate and early
// finish to the the stream
// If `return;` is used, no last chunk is written
// If `return buf;` is used, then the buf is the last chunk to be written
// It also means the `value` could be `undefined`

// It is possible to "force" a `return` to be applied on the outside
// this mean the `input` stream can be used
// Abort signal can also be used to indicate asynchronous cancellation
// But that is supposed to be used to cancel async operations
// Does the async generator for input stream also get a `ctx`?
// What about `throw`? Does it cancel the stream?

// What about `ixjs`? Should this embed `ixjs`, so it can be more easily
// used? Technically ixjs works on the iterable, not on the generator
// It doesn't maintain the generator itself right?
// It would be nice if it was still a generator.

// How to deal with metadata? For authentication...
// Is it part of the RPC system, leading and trailing metadata?
// Each message could have a metadata
// Does it depend on the RPC system itself?
// What about the transport layer?

// Also if we enable generators
// we technically can communicate back
// that should be disallowed (since it doesn't make sense)
// perhaps we can use a different type
// Like `AsyncIterableIterator` instead of the same thing?
// It limits it to `next`
// Which is interesting

// I think this is more correct
// You want to "take" an AsyncIterableIterator
// But the client side would get an AsyncIterableIterator
// But pass in an AsyncGenerator
// I think this makes more sense...
// async function *lol(
//   x: AsyncIterableIterator<Buffer>
// ): AsyncGenerator<Buffer, Buffer | void> {
//   yield Buffer.from('hello');
//   return;
// }

