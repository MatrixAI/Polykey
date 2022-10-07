import * as nobleEd from '@noble/ed25519';
import * as base64 from 'multiformats/bases/base64';
import * as generate from './src/keys/utils/generate';
import * as asymmetric from './src/keys/utils/asymmetric';
import * as jwk from './src/keys/utils/jwk';
import * as jose from 'jose';

  // receiverPublicKey = await exportPublicKey(receiverPublicKey);
  // let senderKeyPair_: KeyPair;
  // // Generate ephemeral key pair if the sender key pair is not set
  // if (senderKeyPair == null) {
  //   senderKeyPair_ = await generateKeyPair();
  // } else {
  //   senderKeyPair_ = {
  //     publicKey: await exportPublicKey(senderKeyPair.publicKey),
  //     privateKey: await exportPrivateKey(senderKeyPair.privateKey)
  //   };
  // }
  // const receiverPublicKeyX25519 = publicKeyEd25519ToX25519(receiverPublicKey);
  // const senderPrivateKeyX25519 = await privateKeyEd25519ToX25519(senderKeyPair_.privateKey);
  // const senderPublicKeyX25519 = publicKeyFromPrivateKeyX25519(senderPrivateKeyX25519);
  // const sharedSecret = deriveSharedSecret(
  //   receiverPublicKeyX25519,
  //   senderPrivateKeyX25519
  // );
  // const pseudoRandomKey = derivePseudoRandomKey(
  //   sharedSecret,
  //   senderPublicKeyX25519,
  //   receiverPublicKeyX25519
  // );
  // const encryptionKey = deriveEncryptionKey(pseudoRandomKey);
  // const keyJWEFactory = new jose.FlattenedEncrypt(
  //   Buffer.from(JSON.stringify(keyJWK), 'utf-8')
  // );
  // // Because this is a custom ECDH-ES
  // // we inject the spk manually into the protected header
  // keyJWEFactory.setProtectedHeader({
  //   alg: 'dir',
  //   enc: 'A256GCM',
  //   cty: 'jwk+json',
  //   spk: await publicKeyToJWK(senderKeyPair_.publicKey),
  // });
  // const keyJWE = await keyJWEFactory.encrypt(encryptionKey);
  // return keyJWE;

async function main() {


  const keyPair = generate.generateKeyPair();
  const privateKeyJWK = jwk.privateKeyToJWK(keyPair.privateKey);
  // console.log(privateKeyJWK);

  const keyJWEFactory = new jose.FlattenedEncrypt(
    Buffer.from(JSON.stringify(privateKeyJWK), 'utf-8')
  );

  // So we are doing a direct one
  // but we are going to use ECDH
  // then use the key as A256GCM for the encryption of the key

  keyJWEFactory.setProtectedHeader({
    alg: 'ECDH-ES',
    enc: 'A256GCM',
    cty: 'jwk+json',
  });

  const publicX25519 = nobleEd.curve25519.scalarMultBase(keyPair.privateKey);
  const y = {
    alg: 'X25519',
    kty: 'OKP',
    crv: 'X25519',
    x: base64.base64url.baseEncode(publicX25519),
    ext: true,
    key_ops: ['encrypt']
  };
  const x25519keylike = await jose.importJWK(y) as jose.KeyLike;

  const result = await keyJWEFactory.encrypt(x25519keylike);

  console.log('RESULT', result);


  const header = jose.decodeProtectedHeader(result);

  console.log('HEADER', header);


  console.log('----');

  const jwe = asymmetric.encapsulateWithPublicKey(
    keyPair.publicKey,
    y,
    keyPair
  );

  console.log(jwe);

  const jwe2 = asymmetric.encapsulateWithPublicKey(
    keyPair.publicKey,
    y,
  );

  console.log(jwe2);


  // const testHeader = {
  //   alg: 'ECDH-ES',
  //   enc: 'A256GCM',
  //   cty: 'jwk+json',
  //   epk: {
  //     x: 'o0HfansHqLhitgYPa15LFv-TAWvCOgcGD7e2r0zOO04',
  //     crv: 'X25519',
  //     kty: 'OKP'
  //   }
  // };

  // const testData = Buffer.from(JSON.stringify(testHeader), 'utf-8');
  // const testDataUrl = testData.toString('base64url');
  // const dataAgain = Buffer.from(testDataUrl, 'utf-8');
  // console.log(dataAgain);
  // console.log(dataAgain.byteLength);


  // const what = 'eyJhbGciOiJFQ0RILUVTIiwiZW5jIjoiQTI1NkdDTSIsImN0eSI6Imp3aytqc29uIiwiZXBrIjp7IngiOiJiazlKR2xoZGVVemxZclNnOS1vQXpBNk9RNDRfV3NWaVZ0a0RwVGVrNkc4IiwiY3J2IjoiWDI1NTE5Iiwia3R5IjoiT0tQIn19';
  // const d = Buffer.from(what, 'base64url');
  // console.log(d.toString('utf-8'));

  // console.log(
  //   Buffer.from('eyJlbmMiOiJBMTI4Q0JDLUhTMjU2In0', 'base64url').toString('utf-8')
  // );



  /*
  {
    cipohertext: ...,
    iv: ...,
    tag: ...,
    protected: ...
  }

  protected: {
    alg: 'ECDH-ES',
    enc: 'A256GCM',
    cty: 'jwk+json',
    epk: {
      x: '...',
      crv: 'X25519',
      kty: 'OKP'
    }
  }

  Ok so in our case...
  If it uses A256GCM, that's fine

  One issue is that the cipher text is not encoded with A256KW
  It's XSalsa20 Poly1305
  That's the symmetric cipher going on

  So we want to use: This is our custom algorithm

  We can still use `epk`.. since it's the public key

  alg: 'ECDH-ES-NaCl',
  enc: 'XSalsa20-Poly1305',
  cty: 'jwk+json'

  The `iv` is the nonce.
  The `tag` is the mac code.
  The ciphertext is base64urled.




  */


}

main();
