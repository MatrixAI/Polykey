import Timer from './src/timer/Timer';
import { context, timer } from './src/timer/utils';

// class C {

//   // f(b: string, a: string, opts?: { timer?: Timer}): void;
//   @timer(1000)
//   f(b: string, @context a: string, @context opts: { timer: Timer }): void {
//     console.log('DONE', opts?.timer instanceof Timer);
//   }

//   // g(b: string, a: string, opts?: { timer?: Timer}): Promise<void>;
//   // @timer(1000)
//   // async g(b: string, a: string, @context opts: { timer: Timer }): Promise<void> {
//   //   console.log('DONE', opts?.timer instanceof Timer);
//   // }

// }

// const c = new C();
// c.f('lol', 'abc');
// const AsyncFunction = (async () => {}).constructor;
// const GeneratorFunction = function* () {}.constructor;
// const AsyncGeneratorFunction = async function* () {}.constructor;
// console.log(c.g instanceof AsyncFunction);


// try {

  // class A {

  //   static f(@context context: string, @context b: string) {
  //   }

  //   // public f(@context context: string, b: number) {

  //   // }
  // }

  // instance name doesn't make sense
  // lol


  // a[s]

  // a.f
  // A.f

// } catch (e) {
//   console.log(e.message);

// }

// function lol(@context context: string) {

// }
