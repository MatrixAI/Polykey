import * as recoveryCode from './src/keys/utils/recoveryCode';
import sodium from 'sodium-native';
// Note that by using bip39, you're still use webcrypto/nodecrypto
// it has to use @noble/hashes and @scure/base
// but it ends up using PBKDF2 and other things
// Webcrypto still needs to be "fulfilled" somehow
import * as bip39 from '@scure/bip39';
import * as utils from './src/utils';

function getRandomBytes(size: number, seedNumber?: number) {
  const randomBytes = Buffer.allocUnsafe(size);
  if (seedNumber == null) {
    sodium.randombytes_buf(randomBytes);
  } else {
    // Convert JS number to 8 byte buffer
    const seedBytes = Buffer.alloc(8);
    seedBytes.writeDoubleBE(seedNumber);
    // Stretch seed number bytes to seed buffer required for deterministic random bytes
    const seedBuffer = Buffer.allocUnsafe(sodium.randombytes_SEEDBYTES);
    sodium.crypto_generichash(seedBuffer, seedBytes);
    sodium.randombytes_buf_deterministic(randomBytes, seedBuffer);
  }
  return randomBytes;
}

function generateKeyPair() {
  const publicKey = Buffer.allocUnsafe(
    sodium.crypto_sign_PUBLICKEYBYTES
  );
  const secretKey = Buffer.allocUnsafe(
    sodium.crypto_sign_SECRETKEYBYTES
  );
  sodium.crypto_sign_keypair(publicKey, secretKey);
  // Libsodium's secret key concatenates the
  // 32-byte secret seed (private key) and 32-byte public key.
  // We already have the public key, so we slice out just the private key.
  // This makes it easier to use with other libraries.
  const privateKey = Buffer.allocUnsafe(
    sodium.crypto_sign_SEEDBYTES
  );
  sodium.crypto_sign_ed25519_sk_to_seed(privateKey, secretKey);
  return {
    publicKey,
    privateKey,
    secretKey
  };
}

async function generateDeterministicKeyPair(code) {
  // This uses BIP39 standard, the result is 64 byte seed
  // This is deterministic, and does not use any random source
  const recoverySeed = utils.bufferWrap(await bip39.mnemonicToSeed(code));
  // Slice it to 32 bytes, as ed25519 private key is only 32 bytes
  const privateKey = recoverySeed.slice(0, sodium.crypto_sign_SEEDBYTES);
  const publicKey = Buffer.allocUnsafe(sodium.crypto_sign_PUBLICKEYBYTES);
  const secretKey = Buffer.allocUnsafe(
    sodium.crypto_sign_SECRETKEYBYTES
  );
  // The private key is used as the seed.
  // The secret key concatenates the seed and the public key.
  // Since we already have the public and private key, the secret key can be discarded.
  sodium.crypto_sign_seed_keypair(
    publicKey,
    secretKey,
    privateKey
  );
  return {
    publicKey,
    privateKey,
    secretKey,
  };
}

function validatePublicKey(publicKey): boolean {
  return sodium.crypto_core_ed25519_is_valid_point(publicKey);
}

function publicKeyFromPrivateKeyEd25519(privateKey) {
  const publicKey = Buffer.allocUnsafe(sodium.crypto_sign_PUBLICKEYBYTES);
  sodium.crypto_sign_seed_keypair(
    publicKey,
    Buffer.allocUnsafe(sodium.crypto_sign_SECRETKEYBYTES),
    privateKey,
  );
  return publicKey;
}

function publicKeyFromPrivateKeyX25519(privateKey) {
  const publicKey = Buffer.allocUnsafe(sodium.crypto_box_PUBLICKEYBYTES);
  sodium.crypto_box_seed_keypair(
    publicKey,
    Buffer.allocUnsafe(sodium.crypto_box_SECRETKEYBYTES),
    privateKey,
  );
  return publicKey;
}

function publicKeyEd25519ToX25519(publicKey: Buffer): Buffer {
  const publicKeyX25519 = Buffer.allocUnsafe(sodium.crypto_box_PUBLICKEYBYTES);
  sodium.crypto_sign_ed25519_pk_to_curve25519(
    publicKeyX25519,
    publicKey
  );
  return publicKeyX25519;
}

function privateKeyEd25519ToX25519(privateKey: Buffer): Buffer {
  const secretKeyX25519 = Buffer.allocUnsafe(sodium.crypto_box_SECRETKEYBYTES);
  const publicKey = publicKeyFromPrivateKeyEd25519(privateKey);
  const secretKeyEd25519 = Buffer.concat([privateKey, publicKey]);
  sodium.crypto_sign_ed25519_sk_to_curve25519(
    secretKeyX25519,
    secretKeyEd25519
  );
  const privateKeyX25519 = secretKeyX25519.slice(0, sodium.crypto_box_SEEDBYTES);
  return privateKeyX25519;
}

function keyPairEd25519ToX25519(keyPair) {
  const publicKeyX25519 = publicKeyEd25519ToX25519(keyPair.publicKey);
  const secretKeyX25519 = Buffer.allocUnsafe(sodium.crypto_box_SECRETKEYBYTES);
  sodium.crypto_sign_ed25519_sk_to_curve25519(
    secretKeyX25519,
    keyPair.secretKey
  );
  const privateKeyX25519 = secretKeyX25519.slice(0, sodium.crypto_box_SEEDBYTES);
  return {
    publicKey: publicKeyX25519,
    privateKey: privateKeyX25519,
    secretKey: secretKeyX25519
  };
}

// Ok we can sign and verify
function signWithPrivateKey(
  privateKeyOrKeyPair,
  data: Buffer
) {
  const signature = Buffer.allocUnsafe(sodium.crypto_sign_BYTES);
  let secretKey;
  if (Buffer.isBuffer(privateKeyOrKeyPair)) {
    const publicKey = publicKeyFromPrivateKeyEd25519(privateKeyOrKeyPair);
    secretKey = Buffer.concat([privateKeyOrKeyPair, publicKey]);
  } else {
    secretKey = privateKeyOrKeyPair.secretKey;
  }
  sodium.crypto_sign_detached(
    signature,
    data,
    secretKey
  );
  return signature;
}

function verifyWithPublicKey(
  publicKey,
  data,
  signature
) {
  return sodium.crypto_sign_verify_detached(
    signature,
    data,
    publicKey
  );
}

// Now we need to see how to do this with encryption and decryption
// Ok so we have static static AND ephemeral static
// both are valid algorithms now

function encryptWithPublicKey(
  receiverPublicKey: Buffer,
  plainText: Buffer,
  senderKeyPair?: {
    publicKey: Buffer,
    privateKey: Buffer,
  }
) {
  const recieverPublicKeyX25519 = publicKeyEd25519ToX25519(receiverPublicKey);
  // 24 bytes of nonce
  const nonce = getRandomBytes(sodium.crypto_box_NONCEBYTES);
  if (senderKeyPair != null) {
    // ECDH-SS and ECDH-SE
    const senderKeyPairX25519 = keyPairEd25519ToX25519(senderKeyPair);
    const cipherTextAndMac = Buffer.allocUnsafe(
      plainText.byteLength + sodium.crypto_box_MACBYTES
    );
    sodium.crypto_box_easy(
      cipherTextAndMac,
      plainText,
      nonce,
      recieverPublicKeyX25519,
      senderKeyPairX25519.secretKey
    );
    // Note that no public key is concatenated here
    // If it needs to be done, you must do it yourself
    return Buffer.concat([
      nonce,
      cipherTextAndMac
    ]);
  } else {
    // ECDH-ES and ECDH-EE
    // This does not require a nonce
    // The nonce is automatically calculated based on the ephemeral public key
    // The SEALBYTES is 48 bytes
    // The first 32 bytes are the ephemeral public key
    // At the end, 16 bytes is still used by the MAC
    // So therefore `senderPublicKey (32) || cipherText || mac (16)`
    const publicKeyAndCipherTextAndMac = Buffer.allocUnsafe(
      plainText.byteLength + sodium.crypto_box_SEALBYTES
    );
    sodium.crypto_box_seal(
      publicKeyAndCipherTextAndMac,
      plainText,
      recieverPublicKeyX25519
    );
    return publicKeyAndCipherTextAndMac;
  }
}

function decryptWithPrivateKey(
  receiverKeyPair,
  cipherText: Buffer,
  senderPublicKey?: Buffer
): Buffer {
  const receiverKeyPairX25519 = keyPairEd25519ToX25519(receiverKeyPair);
  if (senderPublicKey != null) {
    // You know where this message is from
    // So you use SS style
    // In SS style, there is no FORWARD SECRECY
    // The nonce here is public and will be re-used
    const senderPublicKeyX25519 = publicKeyEd25519ToX25519(senderPublicKey);
    const nonce = cipherText.slice(0, sodium.crypto_box_NONCEBYTES);
    const cipherTextAndMac = cipherText.slice(sodium.crypto_box_NONCEBYTES);
    const plainText = Buffer.allocUnsafe(
      cipherTextAndMac.byteLength - sodium.crypto_box_MACBYTES
    );
    sodium.crypto_box_open_easy(
      plainText,
      cipherTextAndMac,
      nonce,
      senderPublicKeyX25519,
      receiverKeyPairX25519.secretKey
    );
    return plainText;
  } else {
    // ES style, you don't know who it was from
    // you can still do sign-then-encrypt though
    const plainText = Buffer.allocUnsafe(
      cipherText.byteLength - sodium.crypto_box_SEALBYTES
    );
    sodium.crypto_box_seal_open(
      plainText,
      cipherText,
      receiverKeyPairX25519.publicKey,
      receiverKeyPairX25519.secretKey
    );
    return plainText;
  }
}


// Asymmetric
// x25519 and xsalsa20-poly1305

// Symmetric
// xchacha20-poly1305

// poly1305 is MAC instead of HMAC

// We can apply the same idea to JWTs and stuff
// but it requires us to discard jose in favour of this


// This is all synchronous remember
// So even if we are "awaiting" this
// this is blocking code
// if we are encrypting alot of things
// It's a good idea to send it to another thread
// but only if it's worth the latency cost
async function encryptWithKey() {

  // Needs to use xchacha20

}


async function main () {
  // console.log(sodium.crypto_secretbox_KEYBYTES);
  // const randomBytes  = sodium.sodium_malloc(32);
  // const key = sodium.sodium_malloc(sodium.crypto_secretbox_KEYBYTES) // secure buffer
  // All these functions are straight lifted from C

  // this is a native module like our `@matrixai/db`
  // there's `@types/sodium-native`
  // but it hasn't been updated since 2020
  // and we are using the latest version  at v3.4.1
  // https://sodium-friends.github.io/docs/docs/otherprojects
  // This is done with PK
  // What's left is x509 which still needs its own crypto implementation
  // maybe we fulfill it with libsodium

  // We have to get ECIES done
  // and also the symmetric encryption might as well be using this too
  // We won't bother with secure memory atm

  console.log(sodium);

  // This does a desterministic generation
  // we can do this as well...
  // just using the bip39 seed
  // of course it then has to use the bip39 stuff
  console.log(sodium.crypto_sign_seed_keypair);

  // const buf = getRandomBytes(32);
  // const keyPair = generateKeyPair();


  const code = recoveryCode.generateRecoveryCode();
  const keyPair_ = await generateDeterministicKeyPair(code);


  console.log(keyPair_);

  console.log(validatePublicKey(keyPair_.publicKey));
  console.log(publicKeyFromPrivateKeyEd25519(keyPair_.privateKey));

  const data = Buffer.from('hello world');
  const signature = signWithPrivateKey(keyPair_.privateKey, data);

  console.log(signature);
  console.log(signature.byteLength);

  console.log(verifyWithPublicKey(keyPair_.publicKey, data, signature));

  console.log(keyPairEd25519ToX25519(keyPair_));

  console.log(sodium.crypto_box_NONCEBYTES);

  const encryptedData = encryptWithPublicKey(
    keyPair_.publicKey,
    Buffer.from('hello world'),
    keyPair_
  );

  console.log(encryptedData);
  console.log(encryptedData.byteLength);

  // Note that if we don't know the sender
  //t his is using ephemeral

  const plainText = decryptWithPrivateKey(
    keyPair_,
    encryptedData,
    keyPair_.publicKey
  );

  // if you do this, it's wrong!!!
  console.log(plainText.toString());

}

/*
  crypto_scalarmult_base: [Function: crypto_scalarmult_base],
  crypto_scalarmult: [Function: crypto_scalarmult],
  crypto_scalarmult_ed25519_base: [Function: crypto_scalarmult_ed25519_base],
  crypto_scalarmult_ed25519: [Function: crypto_scalarmult_ed25519],
  crypto_scalarmult_ed25519_base_noclamp: [Function: crypto_scalarmult_ed25519_base_noclamp],
  crypto_scalarmult_ed25519_noclamp: [Function: crypto_scalarmult_ed25519_noclamp],
  crypto_core_ed25519_is_valid_point: [Function: crypto_core_ed25519_is_valid_point],
  crypto_core_ed25519_from_uniform: [Function: crypto_core_ed25519_from_uniform],
  crypto_core_ed25519_add: [Function: crypto_core_ed25519_add],
  crypto_core_ed25519_sub: [Function: crypto_core_ed25519_sub],
  crypto_core_ed25519_scalar_random: [Function: crypto_core_ed25519_scalar_random],
  crypto_core_ed25519_scalar_reduce: [Function: crypto_core_ed25519_scalar_reduce],
  crypto_core_ed25519_scalar_invert: [Function: crypto_core_ed25519_scalar_invert],
  crypto_core_ed25519_scalar_negate: [Function: crypto_core_ed25519_scalar_negate],
  crypto_core_ed25519_scalar_complement: [Function: crypto_core_ed25519_scalar_complement],
  crypto_core_ed25519_scalar_add: [Function: crypto_core_ed25519_scalar_add],
  crypto_core_ed25519_scalar_sub: [Function: crypto_core_ed25519_scalar_sub],

  crypto_sign_ed25519_sk_to_pk: [Function: crypto_sign_ed25519_sk_to_pk],
  crypto_sign_ed25519_pk_to_curve25519: [Function: crypto_sign_ed25519_pk_to_curve25519],
  crypto_sign_ed25519_sk_to_curve25519: [Function: crypto_sign_ed25519_sk_to_curve25519],

*/

main();

  // if (Buffer.isBuffer(receiverPrivateKey)) {
  //   const receiverPrivateKeyX25519 = privateKeyEd25519ToX25519(receiverPrivateKey);
  //   const receiverPublicKeyX25519 = publicKeyFromPrivateKeyX25519(receiverPrivateKeyX25519);
  //   receiverKeyPairX25519 = {
  //     publicKey: receiverPublicKeyX25519,
  //     privateKey: receiverPrivateKeyX25519,
  //     secretKey: Buffer.concat([receiverPrivateKeyX25519, receiverPublicKeyX25519])
  //   };
  // } else {
  // }
