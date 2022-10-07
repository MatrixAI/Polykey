import * as jwk from './src/keys/utils/jwk';
import * as generate from './src/keys/utils/generate';
import * as jose from 'jose';

async function main () {

  const key = generate.generateKey();

  console.log(key, key.byteLength);

  const keyJWK = jwk.keyToJWK(key);
  console.log(keyJWK);

  const result = await wrapWithPassword('password', keyJWK);

  console.log(result);

  // There you go
  // it ends up generating a key for no reason
  // i think the reason is that you can "change" the password
  // without actually changing encryption
  // but to do that you have to basically
  // decrypt the key and change that
  // that's sort of useless for us
  // we can proceed without bothering with that

  console.log(jose.decodeProtectedHeader(result));

}

async function wrapWithPassword(
  password: string,
  keyJWK: JsonWebKey
) {
  const JWEFactory = new jose.FlattenedEncrypt(
    Buffer.from(JSON.stringify(keyJWK), 'utf-8')
  );
  JWEFactory.setProtectedHeader({
    alg: 'PBES2-HS512+A256KW',
    enc: 'A256GCM',
    cty: 'jwk+json'
  });
  const keyJWE = await JWEFactory.encrypt(
    Buffer.from(password, 'utf-8')
  );
  return keyJWE;
}

main();
