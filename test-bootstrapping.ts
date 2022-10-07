import * as jose from 'jose';
import { hkdf, KeyObject, webcrypto } from 'crypto';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import * as utils from '@noble/hashes/utils';
import * as nobleEd from '@noble/ed25519';
import * as base64 from 'multiformats/bases/base64';
import * as noblePbkdf2 from '@noble/hashes/pbkdf2';
import * as nobleHkdf from '@noble/hashes/hkdf';
import { sha512 as nobleSha512 } from '@noble/hashes/sha512';
import { sha256 as nobleSha256 } from '@noble/hashes/sha256';

// @ts-ignore - this overrides the random source used by @noble and @scure libraries
utils.randomBytes = (size: number = 32) => getRandomBytesSync(size);
nobleEd.utils.randomBytes = (size: number = 32) => getRandomBytesSync(size);

// Note that NodeJS Buffer is also Uint8Array
function getRandomBytesSync(size: number): Uint8Array {
  console.log('CUSTOM CALLED');
  const randomArray = webcrypto.getRandomValues(new Uint8Array(size));
  return randomArray;
  // return Buffer.from(randomArray, randomArray.byteOffset, randomArray.byteLength);
}


/**
 * Opaque types are wrappers of existing types
 * that require smart constructors
 */
type Opaque<K, T> = T & { readonly [brand]: K };
declare const brand: unique symbol;

type RecoveryCode = Opaque<'RecoveryCode', string>;


// webcrypto is used for symmetric encryption

function generateRecoveryCode(size: 12 | 24 = 24): RecoveryCode {
  if (size === 12) {
    return bip39.generateMnemonic(wordlist, 128) as RecoveryCode;
  } else if (size === 24) {
    return bip39.generateMnemonic(wordlist, 256) as RecoveryCode;
  }
  throw RangeError(size);
}

async function generateDeterministicKeyPair(recoveryCode: string) {
  // This uses BIP39 standard, the result is 64 byte seed
  // This is deterministic, and does not use any random source
  const recoverySeed = await bip39.mnemonicToSeed(recoveryCode);
  // Slice it to 32 bytes, as ed25519 private key is only 32 bytes
  const privateKey = recoverySeed.slice(0, 32);
  const publicKey = await nobleEd.getPublicKey(privateKey);
  return {
    publicKey,
    privateKey
  };
}

async function main () {

  const recoveryCode = generateRecoveryCode(24);

  console.log('RECOVERY CODE', recoveryCode);

  const rootKeyPair = await generateDeterministicKeyPair(recoveryCode);

  console.log('ROOT KEY PAIR', rootKeyPair);

  // How do we turn it into a JWK?
  // unless you use webcrypto to do this
  // This is a bit weird

  // webcrypto.subtle.importKey(
  //   'raw',
  //   rootKeyPair.privateKey,
  //   'Ed25519',
  //   true,
  //   ['sign']
  // );

  // JWK uses base64url encoding, not base64 encoding
  const d = base64.base64url.baseEncode(rootKeyPair.privateKey);
  const x = base64.base64url.baseEncode(rootKeyPair.publicKey);

  // This will import into "opaque" keylike objects
  // These can be used by jose operations

  const privateKeyJSON = {
    alg: 'EdDSA',
    kty: 'OKP', // Octet key pair
    crv: 'Ed25519', // Curve
    d: d, // Private key
    x: x, // Public key
    ext: true, // Extractable (always true in nodejs)
    key_ops: ['sign', 'verify'], // Key operations
  };

  // If you pass in `d` you must pass in `x`, this gives you a private key
  // If you pass only `x`, this gives you a public key JWK
  const privateKey = await jose.importJWK(privateKeyJSON) as jose.KeyLike;

  const publicKey = await jose.importJWK({
    alg: 'EdDSA',
    kty: 'OKP', // Octet key pair
    crv: 'Ed25519', // Curve
    x: x, // Public key
    ext: true, // Extractable (always true in nodejs)
    key_ops: ['verify'], // Key operations
  }) as jose.KeyLike;

  // We can alo use x5u parameter
  // But it is a URI pointing to it
  // We can do this.. by providing a URI to a pk resource
  // Like pk:://<NodeId>/certificate
  // A URI resource
  // The key in the first certificate
  // must match the public key represented by other members of JWK
  // Also x5c parameter too

  console.log('PRIVATE', privateKey);
  console.log('PUBLIC', publicKey);

  // JOSE should also have overrides secrets...

  // Private Key PEM
  console.log(await jose.exportPKCS8(privateKey));

  // Public Key PEM
  console.log(await jose.exportSPKI(publicKey));


  // This does not "preserve" all the JWK information
  // I actually have constructed it already above
  console.log(await jose.exportJWK(privateKey));

  // We shouldn't use this
  // we can use the above to maintain information about the JWK
  console.log(await jose.exportJWK(publicKey));


  /*
  THIS IS THE JWE HEADER!!

  {
    alg: "PBES2-HS256+A128KW", // algorithm used for encryption
    p2s: "...", // salt
    p2c: "...", // iteration count
    enc: "A1128CBC-HS256", // authenticated encryption
    cty: "jwk+json", // It is an application/jwk+json type
  }

  The JWE protected header is then base64url(utf8(json stringify)) encoded

  SOMESTRING...

  CONTENT encryption key is generated... (or derived from password)
  It's 256 bits

  The content encryption key is what is used to encrypt the data the JWK string.
  Wait a minute... what is this?
  Oh so this is the key

  A CEK is encrypted with PBKDF2.
  A CEK is the JWK that we are encrypting.
  The CEK in JSON array notation is ...(don't we need to turn it into JSON?)

  After we have encrypted it, we create a BASE64URL encoding of the encrypted data.
  This gives us another base64 url string...

  Also an initialisation vector. Another base64url becomes another string.

  Additional data encryption parameter is ASCII(BASE64URL(UTF8(Protected header)))

  Then more is done...

  The JWE Compact Serialization of
  this result, as defined in Section 7.1 of [JWE], is the string
  BASE64URL(UTF8(JWE Protected Header)) || '.' || BASE64URL(JWE
  Encrypted Key) || '.' || BASE64URL(JWE Initialization Vector) || '.'
  || BASE64URL(JWE Ciphertext) || '.' || BASE64URL(JWE Authentication
  Tag).

  I see, so it's a concatenation of all of this at the very end.
  And this is known as a compact serialisation.

  Compact serialisation is the common serialisation. It's all just a compact string?

  Flattened is a JSON structure, but flattened? But it's still JSON.

  It's not optomised for compactness nor URL safe. Compact representation is something you can send to somewhere.

  I think we want the general serialisation. We are going to store it on disk.
  But it's also dseigned to be sent to multiple recipients.

  We only have 1 recipient, ourselves... so maybe flattened serialisation is better.

  JWE compact only has 1 recipient
  JWE flattened is only for 1 recipient

  Why is the key also encrypted?
  I guess cause a symmetric key is being used to enrypt the thing
  But the key itself is encrypted
  Then the symmetric key is used to decrypt the actual ciphertext

  This is different from before...
  The assumption was that a root password -> PBKDF2 to key, use key to encrypt
  But we don't keep the key around.

  Now with JWE, root password -> PBKDF2, gives us a key, that key itself is then used to encrypt the ciphertext.

  The content encryption key is a symmetric algorithm.

  The alg defines an encryptiong algorithm to encrypt the content encryption key.

  It is a key wrapping algorithm which wraps teh CEK.

  Wait... are we saying that the CEK is the ciphertext or something else??

  jwk+json

  Ok so we could have a JWE that has both A256GCM as the encryption of the content, and RSA-OAEP for key wrapping.
  Symmetric keys are used to encrypt the content.
  Faster than asymmetric.

  Ok I understand now. A JWE has to contain both the encrypted symmetric key and the encrypted content with the symmetric key.

  This does mean we are doing things slightly differently.

  Technically in our case, since the symmetric key is generated from a PBKCDF2, we could just use the password to encrypt the content.

  We don't actually even need tokkeep the encrypted symmetric key. But due to the format, it is expected to be there...

  We have a JWK now, I want to encrypt this as an encrypted JWK, stored as a JWE.

  */


  // const testJWK = {
  //   "kty":"RSA",
  //   "kid":"juliet@capulet.lit",
  //   "use":"enc",
  //   "n":"t6Q8PWSi1dkJj9hTP8hNYFlvadM7DflW9mWepOJhJ66w7nyoK1gPNqFMSQRyO125Gp-TEkodhWr0iujjHVx7BcV0llS4w5ACGgPrcAd6ZcSR0-Iqom-QFcNP8Sjg086MwoqQU_LYywlAGZ21WSdS_PERyGFiNnj3QQlO8Yns5jCtLCRwLHL0Pb1fEv45AuRIuUfVcPySBWYnDyGxvjYGDSM-AqWS9zIQ2ZilgT-GqUmipg0XOC0Cc20rgLe2ymLHjpHciCKVAbY5-L32-lSeZO-Os6U15_aXrk9Gw8cPUaX1_I8sLGuSiVdt3C_Fn2PZ3Z8i744FPFGGcG1qs2Wz-Q",
  //   "e":"AQAB",
  //   "d":"GRtbIQmhOZtyszfgKdg4u_N-R_mZGU_9k7JQ_jn1DnfTuMdSNprTeaSTyWfSNkuaAwnOEbIQVy1IQbWVV25NY3ybc_IhUJtfri7bAXYEReWaCl3hdlPKXy9UvqPYGR0kIXTQRqns-dVJ7jahlI7LyckrpTmrM8dWBo4_PMaenNnPiQgO0xnuToxutRZJfJvG4Ox4ka3GORQd9CsCZ2vsUDmsXOfUENOyMqADC6p1M3h33tsurY15k9qMSpG9OX_IJAXmxzAh_tWiZOwk2K4yxH9tS3Lq1yX8C1EWmeRDkK2ahecG85-oLKQt5VEpWHKmjOi_gJSdSgqcN96X52esAQ",
  //   "p":"2rnSOV4hKSN8sS4CgcQHFbs08XboFDqKum3sc4h3GRxrTmQdl1ZK9uw-PIHfQP0FkxXVrx-WE-ZEbrqivH_2iCLUS7wAl6XvARt1KkIaUxPPSYB9yk31s0Q8UK96E3_OrADAYtAJs-M3JxCLfNgqh56HDnETTQhH3rCT5T3yJws",
  //   "q":"1u_RiFDP7LBYh3N4GXLT9OpSKYP0uQZyiaZwBtOCBNJgQxaj10RWjsZu0c6Iedis4S7B_coSKB0Kj9PaPaBzg-IySRvvcQuPamQu66riMhjVtG6TlV8CLCYKrYl52ziqK0E_ym2QnkwsUX7eYTB7LbAHRK9GqocDE5B0f808I4s",
  //   "dp":"KkMTWqBUefVwZ2_Dbj1pPQqyHSHjj90L5x_MOzqYAJMcLMZtbUtwKqvVDq3tbEo3ZIcohbDtt6SbfmWzggabpQxNxuBpoOOf_a_HgMXK_lhqigI4y_kqS1wY52IwjUn5rgRrJ-yYo1h41KR-vz2pYhEAeYrhttWtxVqLCRViD6c",
  //   "dq":"AvfS0-gRxvn0bwJoMSnFxYcK1WnuEjQFluMGfwGitQBWtfZ1Er7t1xDkbN9GQTB9yqpDoYaN06H7CFtrkxhJIBQaj6nkF5KKS3TQtQ5qCzkOkmxIe3KRbBymXxkb5qwUpX5ELD5xFc6FeiafWYY63TmmEAu_lRFCOJ3xDea-ots",
  //   "qi":"lSQi-w9CpyUReMErP1RsBLk7wNtOvs5EQpPqmuMvqW57NBUczScEoPwmUqqabu9V0-Py4dQ57_bapoKRu1R90bvuFnU63SHWEFglZQvJDMeAvmj4sm-Fp0oYu_neotgQ0hzbI5gry7ajdYy9-2lNx_76aBZoOUu9HCJ-UsfSOI8"
  // };
  // const testJWKS = JSON.stringify(testJWK);

  // console.log([...Buffer.from(testJWKS)]);

  const privateKeyJSONstring = JSON.stringify(privateKeyJSON);

  // Binary representation from text
  const jwe = new jose.FlattenedEncrypt(Buffer.from(privateKeyJSONstring, 'utf-8'));

  // JOSE HEADER
  jwe.setProtectedHeader({
    alg: 'PBES2-HS512+A256KW',
    enc: 'A256GCM', // symmetric encryption algo
    cty: 'jwk+json' // this is a encrypted JWK
  });

  // These parameters only apply here
  // jwe.setKeyManagementParameters(
  //   {
  //     p2s: new Uint8Array(),
  //     // p2s: randomSalt,
  //     p2c: 1000
  //   }
  // );

  // PBES2 Salt Input must be 8 or more octets
  // const key = await noblePbkdf2.pbkdf2Async(
  //   // Using HMAC 512
  //   nobleSha512,
  //   Buffer.from('some password'),
  //   // This is how the salt is "defined"
  //   // note how we join the alg, then a null character
  //   // then finally the actual salt being specified
  //   // It appears to be "saved" in the actual thing
  //   // Buffer.from(''),
  //   Buffer.concat([
  //     Buffer.from('PBES2-HS512+A256KW', 'utf-8'),
  //     Buffer.from([0]),
  //     // randomSalt
  //   ]),
  //   {
  //     c: 1000,
  //     // It is 32 bytes, because we want a A256KW
  //     dkLen: 64
  //   }
  // );

  // console.log('key length', key.length);
  const key = Buffer.from('some password');

  const encryptedJWK = await jwe.encrypt(key);

  console.log('ENCRYPTED JWK', encryptedJWK);

  const decryptedJWK = await jose.flattenedDecrypt(
    encryptedJWK,
    key
  );

  console.log('DECRYPTED JWK', decryptedJWK);

  console.log(decryptedJWK.plaintext.toString());

  // The salt and count are saved in the encryptedJWK
  // but it's not encrypted, it's protected via integrity
  // these are then used to help decrypt because the program
  // knows that it is a PBES2
  console.log(jose.decodeProtectedHeader(encryptedJWK));


  // Ok great we have the ed25519 root key
  // this is now going to be in `root_priv.json` and `root_pub.json`
  // The `root_priv.json` is encrypted with a root password
  // And we can proceed...

  // We now need to use a DEK key for the database
  // This can be randomly generated
  // Or derived using HKDF from the root key
  // Note that ed25519 keys are not meant for derivation
  // It has to be converted to a x25519 key first
  // Before HKDF to be used
  // However why not just randomly generate the DEK?
  // Well the reason is this if it randomly generates the DEK...
  // When DEK is lost, you lose the ability to decrypt the database
  // If you derive the DEK from the root key, you can always regenerate the DEK
  // However there's a another problem...
  // If the DEK is separate, then you can always change the root key without chaning the dek


  // Let's generate a random DEK first
  // It will be 256 bits, as we will be using AES256GCM
  // Which is a 32 byte key

  const dataEncryptionKey = getRandomBytesSync(32);

  // DEK JWK
  const dekJSON = {
    alg: "A256GCM",
    kty: "oct",
    k: base64.base64url.baseEncode(dataEncryptionKey),
    ext: true,
    key_ops: ["encrypt", "decrypt"],
  };

  console.log('IMPORT DEK');

  const dekKey = await jose.importJWK(dekJSON, dekJSON.alg, false) as Uint8Array;

  console.log(dekKey);

  // KeyLike is KeyObject in nodejs or CryptoKey in browsers
  // There are improved security features when using these objects instead of Buffer
  // They can be passed to other threads using `postMessage`
  // the object is cloned...

  // You can do KeyObject.from(CryptoKey)

  // console.log(dekKey.type);
  // console.log(dekKey.symmetricKeySize);
  // console.log(dekKey.export({ format: 'jwk' })); // lol look at this

  // dekKey.equals (compares another key object)
  // dekKey.symmetricKeySize
  // dekKey.type - public, private, secret

  // Note that KeyObject is node specific
  // CryptoKey however is more general...
  // maybe we should use that?
  // dekKey.asymmetricKeyType
  // You just have to use `importKey`
  // but this is not that important
  // Ok we have the dekKey
  // It's time to encrypt this...
  // And use this for encryption...
  // If we wanted to use it for encryption, let's see how we would do this?

  // iv would be random
  // createCipher

  // But because JOSE uses platform native
  // and we want to use webcrypto API to avoid platform native
  // Here we would need to import the key
  // We can use webcrypto's importation of the key
  // OR we can use directly from the buffer
  // But this reads the JSON as well and extracts it

  const dekCryptoKey = await webcrypto.subtle.importKey(
    'jwk',
    dekJSON,
    'AES-GCM',
    true,
    ['encrypt', 'decrypt']
  );

  console.log(dekCryptoKey);

  const iv = getRandomBytesSync(16);

  // This gives us a way to encrypt and decrypt now
  const cipherText = await webcrypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: 128,
    },
    dekCryptoKey,
    Buffer.from('hello world')
  );

  console.log('CIPHERTEXT', cipherText);

  // The IV and the tag length must be shared
  // The ersulting data must be combined
  // [iv, authTag, cipherText]
  // however the authTag is already embedded in the cipherText

  // This bundles it together
  // we can also just use this within the system
  // but I think the nodejs Buffer API is still better
  // we just need the feross API... etc

  const combinedText = new Uint8Array(iv.length + cipherText.byteLength);
  const cipherArray = new Uint8Array(cipherText, 0, cipherText.byteLength);
  combinedText.set(iv);
  combinedText.set(cipherArray, iv.length);

  console.log('COMBINED', combinedText);

  // extracting it out of the combined text
  const iv_ = combinedText.subarray(0, iv.length);
  // The auth tag size will be consistent

  const plainText = await webcrypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv_,
      tagLength: 128
    },
    dekCryptoKey,
    cipherText
  );

  console.log(Buffer.from(plainText).toString());



  // ---

  console.log('NOW WE HAVE THE DEK')
  console.log('WE ARE GOING TO ENCRYPT OUR JWK');
  // dekJSON will be the JWK
  // we will encrypt this like above
  // It's time to use dir or ECDH-ES or somethig else

  // This dekJSON is a symmetric key
  // However we are going to do KEM
  // by encrypting the dekJSON JWK file data
  // with our ed25519 key
  // To do so, we will first
  // acquire the shared secret via DX
  // Then pass it to HKDF-Extract with a static salt (for domain separation)
  // Then pass it to HKDF-Expand - with static info to produce the key which is used
  // for direct encryption of the JWK here

  // This is the DH KX, getting us the shared secret
  // this is the "z" value, it's a "shared secret" between me and me (in the future)
  const x25519sharedsecret = await nobleEd.getSharedSecret(
    rootKeyPair.privateKey,
    rootKeyPair.publicKey
  );

  // Now we use hkdf-extract

  // Produce a pseudo random key
  // this is deterministic
  // Because we are using the same shared secret above
  // we are going to do this ONCE without a salt
  // then produce multiple subkeys
  const PRK = nobleHkdf.extract(
    nobleSha512,
    x25519sharedsecret,
  );

  // This is 64 bytes
  // Whether it produces 64 bytes or 32 bytes dpends on the input hash

  console.log('PRK from HKDF-extract', PRK);
  const PRK2 = nobleHkdf.extract(
    nobleSha512,
    x25519sharedsecret,
    Buffer.from('domain separated')
  );
  console.log('PRK from HKDF-extract', PRK2);

  // The info is useful here...
  // For separating to different keys
  const dbKeyKW = nobleHkdf.expand(
    nobleSha512,
    PRK,
    Buffer.from('DB KEY key wrap/key encapsulation mechanism'),
    32
  );

  // And this is 32 bytes
  console.log('DBKEYKW', dbKeyKW);

  // Ok great now we have the CEK to be used
  // the question does JWA have this mechanism built in?
  // Rather than us defining it?
  // dir means direct encryption

  // alg: dir

  // The reason if we use AES KW
  // it means the CEK itself is encrypted...
  // The CEK encrypts the actual plaintext
  // But the CEK itself is encrypted with AESKW

  const dekJWE = new jose.FlattenedEncrypt(
    Buffer.from(JSON.stringify(dekJSON), 'utf-8')
  );

  // Ok so what this does, is that it auto generates a CEK
  // that CEK uses A256GCM to encrypt the actual DEK above
  // But then takes a symmetric A256KW to encrypt the CEK
  // This is where it doesn't make sense to do this

  // We cannot use the Ed25519 private key
  // We cannot use the shared secret
  // We cannot use the PRK
  // We can use the OKM from HKDF to do this (since it can be used as a symmetric key)
  // But here, it's a bit of a waste
  // Cause it's like
  // We are using a symmetric key to encrypt a symmetric key to encrypt a symmetric key
  // OKM -> CEK -> DEK
  // sym    sym    sym
  // It's just a bit dumb

  dekJWE.setProtectedHeader({
    alg: 'A256KW',
    enc: 'A256GCM',
    cty: 'jwk+JSON'
  });

  const inputE = getRandomBytesSync(32);

  // You have to have a 256 bit key here to do the job
  const encryptedDEKJWK = await dekJWE.encrypt(
    inputE
  );

  // I wonder how this actually works
  console.log(encryptedDEKJWK);

  console.log(
    'WHAT IS THIS',
    await jose.flattenedDecrypt(
      encryptedDEKJWK,
      inputE
    )
  );

  // Let's try something different

  const dekJWEAgain = new jose.FlattenedEncrypt(
    Buffer.from(JSON.stringify(dekJSON), 'utf-8')
  );

  dekJWEAgain.setProtectedHeader({
    alg: 'dir',
    enc: 'A256GCM',
    cty: 'jwk+JSON'
  });

  const encryptedDEKJWKAgain = await dekJWEAgain.encrypt(dbKeyKW);

  // Notice there's no `encrypted_key` property, the CEK is therefore empty
  console.log(encryptedDEKJWKAgain);

  console.log(jose.decodeProtectedHeader(encryptedDEKJWKAgain));

  const decryptedAgain = await jose.flattenedDecrypt(encryptedDEKJWKAgain, dbKeyKW);

  console.log(decryptedAgain.plaintext.toString());

  // This is why there was meant to be a keyring database
  // But this database is just disk based, no db is involved at all
  // If the root key ever changes, you don't change the DEK
  // But you do need to decrypt the JWK and re-encrypt it

  // With AES KW, you can do the same...  but only teh CEK
  // but the CEK is just somewhat smaller... it's not ereally that different

  // alg: ECDH-ES+A256KW - this technically what we are doing...
  // enc: A256GCM - to do the actual encryption
  // how do use this?
  // except it's using CONCAT KDF

  // ECDH-ES is direct key agreement mode
  // but it uses Concat KDF, so I don't think they are using HKDF

  // It seems there's an extra RFC at 8037 to allow the usage of ED25519...
  // but it has to use x25519... you have to convert it first
  // perhpas it sort of works
  // But it continues to use Concat-KDF
  // Actually let's see if this works atm


  const dekJWEWithEC = new jose.FlattenedEncrypt(
    Buffer.from(JSON.stringify(dekJSON), 'utf-8')
  );

  dekJWEWithEC.setProtectedHeader({
    alg: 'ECDH-ES',
    enc: 'A256GCM',
    cty: 'jwk+JSON',
  });

  // console.log(rootKeyPair);

  // You get a public x25519, and nothing else
  const publicX25519 = nobleEd.curve25519.scalarMultBase(rootKeyPair.privateKey);
  console.log('original', rootKeyPair.privateKey);
  console.log('PUBLIC X25519', publicX25519);

  const y = {
    alg: 'X25519',
    kty: 'OKP',
    crv: 'X25519',
    x: base64.base64url.baseEncode(publicX25519),
    ext: true,
    key_ops: ['encrypt']
  };

  console.log('Y', y);

  const x25519keylike = await jose.importJWK(y) as jose.KeyLike;

  console.log(x25519keylike);

  // dekJWEWithEC.setKeyManagementParameters({
  //   epk: x25519keylike
  // });

  console.log('BEFORE WTF');

  // // Do we encrypt with the public key?
  // // Or enrypt with the private key?
  const result = await dekJWEWithEC.encrypt(x25519keylike);

  console.log('WTF?', result);

  console.log(jose.decodeProtectedHeader(result));

  // I'm not sure if this makes sense
  // unless you derive the private key too

  const z = {
    alg: 'X25519',
    kty: 'OKP',
    crv: 'X25519',
    x: base64.base64url.baseEncode(publicX25519),
    d: base64.base64url.baseEncode(rootKeyPair.privateKey),
    ext: true,
    key_ops: ['decrypt']
  };

  console.log('Z', z);

  const privatex25519 = await jose.importJWK(z) as jose.KeyLike;

  console.log('PRIVATE X25519', privatex25519);

  const omg = await jose.flattenedDecrypt(result, privatex25519);


  console.log('TH shared secret', base64.base64url.baseEncode(x25519sharedsecret));

  console.log(omg.plaintext.toString());

  console.log('?', result);







  // const jwe = new jose.FlattenedEncrypt(Buffer.from(privateKeyJSONstring, 'utf-8'));


  // 2 options
  // alg: dir - https://datatracker.ietf.org/doc/html/draft-ietf-jose-json-web-algorithms-18#section-4.5 - directly using a symmetric shared secret using ECDH and HKDF?
  // alg: A256KW - https://datatracker.ietf.org/doc/html/draft-ietf-jose-json-web-algorithms-18#section-4.4
  // I still think you'd use A256KW... which ends up with its own CEK encrypting the DEK
  // Then you provide a password to do the encryption
  // that password could be ECDH plus HKDF-Extract?




  // console.log(nobleEd.utils.randomPrivateKey());

}

void main();
