import { DBTransaction } from '@matrixai/db';
import Timer from './src/timer/Timer';

// `cancellable`

// function f (options?: { signal?: AbortSignal }) {

// }

// Functions that should be timed out

// This is better
// additionally
// function f(timer: Timer | number = Infinity) {
//   timer = (timer instanceof Timer) ? timer : new Timer({ delay: timer });
// }

// function g(options?: { signal?: AbortSignal }) {



// }

// it returns a new Promise()
// class CustomPromise
// then () { return new CustomPromise() }
// so all the functions don't return `this`
// but it's always a new promise
// and that's what we have done here
// which is to say
// as oon as you bind into the Task or into the Timer
// it is no longer a Task or a Timer
// it is  infact just a normal Promise
// and it is not the same as the original reference

class X {
  f(tran?: number): number;
  f(tran: number): number {
    return tran;
  }
}

const x = new X();

x.f


async function sub() {
  const t = new Timer();
  console.log(t instanceof Timer);
  return t.then((v) => {
    console.log('inside then', v);
    return 'DONE';
  });
}

// const p = Promise.resolve(1);

// class CustomPromise<T> extends Promise<T> {
//   doSomething() {
//     console.log('DID SOMETHING');
//   }
// }

// async function f(): CustomPromise<number> {
//   return CustomPromise.resolve(1);
//   // const t = new Timer();
//   // return t;
// }

// function g() {
//   return CustomPromise.resolve(1);
//   // const t = new Timer();
//   // return t;
// }


async function main () {

  // console.log(f() instanceof CustomPromise);
  // console.log(g() instanceof CustomPromise);

  // // @ts-ignore
  // // f().doSomething()
  // // @ts-ignore
  // g().doSomething()


  // console.log(p === f());

  // console.log(p === g());

  // const p = f();
  // console.log(p instanceof Timer);

  // const t = g();
  // console.log(t instanceof Timer);


  // const p = sub();

  // console.log(typeof p);

  // console.log(p instanceof Timer);

  // const r = await p;

  // console.log(typeof r);

}

void main();

// cancel
// cancelAsync

// implements Promise<T>
// implements CancellablePromise<T>

// cancellable promise





// function allTogether(timer: Timer | number = Infinity, tran?: DBTransaction) {
//   if (tran == null) { return this.db.withTransactionF(
//       (tran) => t(timer, tran)
//     );
//   }
//   timer = (timer instanceof Timer) ? timer : new Timer({ delay: timer });
// }

