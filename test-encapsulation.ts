import * as jose from 'jose';
import * as asymmetric from './src/keys/utils/asymmetric';
import * as generate from './src/keys/utils/generate';

async function main () {
  const keyPair = await generate.generateKeyPair();
  const key = await generate.generateKey();

  const jwk = {
    alg: 'A256GCM',
    kty: 'oct',
    k: key.toString('base64url'),
    ext: true,
    key_ops: ['encrypt', 'decrypt'],
  };

  console.log('JWK', jwk);


  const jwe = await asymmetric.encapsulateWithPublicKey(
    keyPair.publicKey,
    jwk
  );

  console.log('JWE', jwe);
  const header = jose.decodeProtectedHeader(jwe);
  console.log('HEADER', header);

  const jwk_ = await asymmetric.decapsulateWithPrivateKey(
    keyPair.privateKey,
    jwe
  );

  console.log(jwk_);

  // ProtectedHeader
  // SharedUnprotected
  // or UnprotectedHeader





}

main();
