import { webcrypto } from 'crypto';

async function main () {

  // console.log(webcrypto.getRandomValues(new Uint8Array(32)));

  const keyPair = await webcrypto.subtle.generateKey(
    {
      name: 'Ed25519',
    },
    true,
    [
      'sign',
      'verify',
      // 'encrypt',
      // 'decrypt',
      // 'deriveKey',
      // 'deriveBits'
    ]
  ) as CryptoKeyPair;

  console.log(keyPair);

  // Storing the secure private key is known as key wrapping
  // We are using a password and symmetric cipher to wrap the private key
  // Then to store it on disk
  // How to do the above? This cannot be used when using recovery code
  // But it's sort of useless, since any random set of bytes is sufficient

  // Note that extractability just gives a little extra security
  // in the sense that the key is intended to be exported out of the program

  // Object containing `publicKey` and `privateKey`
  // Webcrypto doesn't allow using it for certain things


  // console.log(keyPair.publicKey);
  // console.log(keyPair.privateKey);

  const privateKeyJWK = await webcrypto.subtle.exportKey(
    'jwk',
    keyPair.privateKey
  );

  const publicKeyJWK = await webcrypto.subtle.exportKey(
    'jwk',
    keyPair.publicKey
  );

  console.log(privateKeyJWK);

  console.log(publicKeyJWK);

  // It is not allowed to export the private key's raw contents
  // we get something like: DOMException [InvalidAccessError]: Unable to export a raw Ed25519 private key

  // But the public key can be exported as raw
  // which shows up as 32 bytes

  // The private key can be exported as PKCS8
  // but not raw nor spki

  // The public key can be exported as SPKI or raw
  // but not PKCS8

  // Only JWK works for both - it's the only modern format
  // Ok that's fine, but really we need the raw private key too
  // if we want to use it elsewhere

  // The hell, you cannot use AES GCM to wrap a key?
  // wtf does that mean?

  const aeskey = await webcrypto.subtle.generateKey({
    name: 'AES-KW',
    length: 256,
  }, true, ['wrapKey', 'unwrapKey']);

  const aeskey2 = await webcrypto.subtle.generateKey({
    name: 'AES-GCM',
    length: 256,
  }, true, ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']);

  // This basically exports it as JWK using the first 2 parameters
  // then uses the second 2 parameters to "encrypt it"
  // thus giving us an ArrayBuffer
  // is this known as a JWE?
  const wrappedPrivate = await webcrypto.subtle.wrapKey(
    'jwk',
    keyPair.privateKey,
    aeskey,
    'AES-KW'
  );

  const randomBytes = webcrypto.getRandomValues(new Uint8Array(12));

  const wrappedPrivate2 = await webcrypto.subtle.wrapKey(
    'jwk',
    keyPair.privateKey,
    aeskey2,
    {
      name: 'AES-GCM',
      iv: randomBytes
    }
  );

  console.log(wrappedPrivate);

  // Takes ArrayBuffer, TypedArray or DataView

  const enc = new TextEncoder();
  const wrappedPrivate3 = await webcrypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: randomBytes
    },
    aeskey2,
    enc.encode(JSON.stringify(privateKeyJWK))
  );

  const d2 = await webcrypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: randomBytes,
    },
    aeskey2,
    wrappedPrivate2
  );

  const d3 = await webcrypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: randomBytes,
    },
    aeskey2,
    wrappedPrivate3
  );


  const dec = new TextDecoder();

  console.log(dec.decode(d2));
  console.log(dec.decode(d3));



  // If you want to use AES GCM, you have to fill in some additional information
  // like aesGCMParams.iv
  // Ok this make sense... basically
  // AES KW is a better choic for key wrapping
  // no need to fill out the iv data... which would be random anyway

  // This is sort of interesting
  // in that sense that instead of encrypting the key material directly
  // it is first exported into a particular format
  // before it is then encrypted

  // PBKDF2 is allowed to derive keys
  // but you cannot use them to deirve keys


  // This cannot import a key pair
  // as in... you can only export a key
  // not export keypair
  const rawEd25519 = await webcrypto.subtle.importKey(
    'jwk',
    // webcrypto.getRandomValues(new Uint8Array(32)),
    privateKeyJWK,
    'Ed25519',
    true,
    ['sign']
  );

  // It's not allowed

  console.log(rawEd25519);

  // As for the public key... you'd have to
  // read from an existing one
  const publicKeyOriginal = await webcrypto.subtle.exportKey(
    'raw',
    keyPair.publicKey
  );

  const originalPub = await webcrypto.subtle.importKey(
    'raw',
    publicKeyOriginal,
    'Ed25519',
    true,
    ['verify']
  );

  console.log(originalPub);


}

void main();
