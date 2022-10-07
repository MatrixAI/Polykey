import * as ed from '@noble/ed25519';

/*
 So yea, it's just randomBytes

  ed25519 private keys are uniform 32-bit strings. We do not need to check for
  modulo bias like we do in noble-secp256k1 randomPrivateKey()
  randomPrivateKey: (): Uint8Array => {
    return utils.randomBytes(32);
  },

The crypto.randomBytes() method will not complete until there is sufficient entropy available.
This should normally never take longer than a few milliseconds. The only time when generating the random bytes may
conceivably block for a longer period of time is right after boot, when the whole system is still low on entropy.

https://nodejs.org/api/cli.html#uv_threadpool_sizesize <- this may be useful later

The asynchronous version of crypto.randomBytes() is carried out in a single threadpool request.
To minimize threadpool task length variation, partition large randomBytes requests when doing so as
part of fulfilling a client request.

1. Ok so asynchronous should be used!
2. Large amount of random bytes should be partitioned... streamed like an async generator
3. We can incrase the threadpool size to the number of cores on the system <- requires benchmarking

The randomBytes is not able to be "injected", except by overwriting the library's methods.

Currently it does this:

  randomBytes: (bytesLength: number = 32): Uint8Array => {
    if (crypto.web) {
      return crypto.web.getRandomValues(new Uint8Array(bytesLength));
    } else if (crypto.node) {
      const { randomBytes } = crypto.node;
      return new Uint8Array(randomBytes(bytesLength).buffer);
    } else {
      throw new Error("The environment doesn't have randomBytes function");
    }
  },

Ok the issue is that the web based version which is webcrypto DOES not support async.

Plus the async of generating small random bytes for generating keys is actually really fast.

Right it's due to the size of the generated values.

At any case, if we use webcrypto, we are limited to dealing with synchronous values. And if we want to do large ones,
we would need to stream it in asn async generator ANYWAY..

Web crypto also has `generateKey` which can work too and is actually asynchronous.

*/

async function main () {

  // this is deadbeef, hex strings are allowed

  // 32 bytes - it's just a random 32 bytes, any random 32 bytes is usable as as private key
  // that's really cool!
  // const privateKey = ed.utils.randomPrivateKey();

  const privateKey = Uint8Array.from([
   98,  28,  76, 110,  11,  41, 172, 216,
   61, 113, 113,  59, 216, 240, 106,  91,
  184, 142,  49, 117,  10,  20, 109,  68,
   67, 191, 232, 221,  92,  45,  71, 105
  ]);
  console.log('PRIVATE KEY', privateKey);

  // WAY faster than RSA
  // const message = Uint8Array.from([0xde, 0xad, 0xbe, 0xef, 0xde, 0xad, 0xbe, 0xef, 0xde]);

  // This is synchronous?
  const message = ed.utils.randomBytes(1000);

  // You can pass Uint8Array, hexstring or bigint, bit ing must be big endian
  const publicKey = await ed.getPublicKey(privateKey);

  // also 32 bytes
  console.log('PUBLIC KEY', publicKey);

  // It uses SHA internally, browser built-in window.crypto
  // which returns a Promise
  // synchronous non promise
  // therare synchronous versions but we don't need to use them
  // unless we want to use their @noble/hashes/sha512 dependency

  // SIGN with private key
  const signature = await ed.sign(message, privateKey);

  // This is always 64 bytes
  console.log('ALWAYS 64 bytes?', signature);




  // // console.log(await ed.verify(signature, message, publicKey));

  // // to generate a ed25519 public key
  // // private key is hashed with sha512, the 32 bytes are taken
  // // the 3 least significant bits of the first byte are cleared

  // // const r = await ed.utils.getExtendedPublicKey(privateKey);
  // // console.log(r);



  // // ed.Signature object (uint8array or hexstring)
  // // const s = ed.Signature.fromHex(signature);
  // // console.log('HUH', s.assertValidity());

  // // you can take a signature  object
  // // in the verify function


  // // This is also 32 bytes, and it is deterministic
  // // these 2 are meant to be ed25519 keys
  // // The returend value is a X25519 SHARED KEY
  // //  * Curve25519 used in X25519 consumes private keys as-is, while ed25519 hashes them with sha512.
  // //  * Which means we will need to normalize ed25519 seeds to "hashed repr".
  // const sharedSecret = await ed.getSharedSecret(privateKey, publicKey);

  // // Still 32 bytes
  // console.log('SHARED SECRET', sharedSecret);

  // const pubCurve25519 = ed.curve25519.scalarMultBase(privateKey);

  // // Is this a public curve 25519?
  // console.log('PUB?', pubCurve25519);

  // // What is the shared secret for?

  // // It's a shared secret for a curve25519 key exchange?
  // // DH key exchange?
  // // It's a secure way of exchanging crypto keys on a public channel
  // // It's a way of exchaning a shared secret key, WHICH is then used to  encrypt communications subseqeuently using a symmetric key cipher
  // // so this shared secret is what is being transferred to the other party
  // // Wait a minute, so we create a shared secret by using MY private key, and the other's public key.
  // // After acquiring an authentic copy of each other's public key
  // // BOTH parties casn use their own key and the other side's public key
  // // TO generate a shared secret.
  // // This doesn't need to be exchanged over the network.
  // // It's like zero knolwedge proof
  // // WOW that's useful

  // // Ok so how does bob send a message to alice
  // // it can bascially get alic'es public key
  // // get a shared key,
  // // use that shared key to encrypt the data
  // // drop that data off... somewhere
  // // alice picks it up
  // // it can then "decrypt it"
  // // IF it has bob's public key...
  // // What if alice doesn't know about bob at all?
  // // It seems you'd bunlde the public key with the message

  // // It says it should also apply a key derivation function to the shared secret
  // // I'm not really sure why... should it leak data if the shared secret got leaked?
  // // The next step is also TLS, how do we ensure that we can have TLS with these keys too
  // // The parties must also "validate" the public key...
  // // Part of a "selected" group
  // // It says that while the shared secret may be used as a key, it can be desirable to hash the secret
  // // to remove the weak bits due to DH exchange

  // // THIS IS DIFFERENT FROM the one above, this is scalarMult
  // const shared = ed.curve25519.scalarMult(privateKey, publicKey);

  // console.log('SHARED AGAIN', shared);



  // // perhaps that's why there's a diff
  // // curve25519 consumes private keys as is
  // // there's some processing first
  // // so the above is only to be used if you are directly using curve25519


  // // what do we do with the shared secret above?
  // // do we use it for encryption now?



}

void main();
