import * as hashing from './src/keys/utils/hashing';

function main () {
  const hasher = hashing.sha512G();
  // hasher.next();
  // hasher.next(Buffer.from('hello world'));
  // hasher.next(Buffer.from('hello world'));
  const result = hasher.return();
  console.log(result);
  console.log(result.value?.byteLength);



  // // Interesting this seems alot more easier to use
  // // since you can take a collection
  // // or generally any kind of iterable
  // // and just yield data as is

  // // if you are taking data from an async iterable else where
  // // one problem is that you have to "feed an iterator"

  // const result2 = hashing.hashIterator(
  //   [Buffer.from('hello world'), Buffer.from('hello world')]
  // );
  // console.log(result2);

  // const r = hashing.hashIterator((function * g() {
  //   yield Buffer.from('hello world');
  //   yield Buffer.from('hello world');
  // })());

  // console.log(r);

}

// function * buffers() {
//   yield Buffer.from('abc');
// }

// function forkIterators() {

//   for (const x of buffers()) {
//   }

//   return [
//     {
//       [Symbol.iterator]() {

//         return {
//           next(){
//             // returns you values
//           }
//         };

//       }
//     },
//     {
//       [Symbol.iterator]() {

//       }
//     }
//   ]

//   function *it() {

//   }

//   // i dont think you can do it this way
//   function *it2() {

//   }

// }

// async function blah () {


//   // imagine you are consuming an async generator
//   // and you want to keep the data, but also pass it to be hashed
//   for (const x of buffers()) {

//     // and you wanted to pass the data to be hashed
//     // how would you "stream" pass it in
//     // you sort of can't
//     // without being able to pass in the generator
//     // unless you had a wait to pas data into it

//   }



// }

main();
