// Write a function to take public key buffer and return SPKI PEM encoded string
import * as asn1 from '@peculiar/asn1-schema';
import * as asn1X509 from '@peculiar/asn1-x509';
import * as generate from './src/keys/utils/generate';
import * as x509 from '@peculiar/x509';

import webcrypto from './src/keys/utils/webcrypto';
import * as utils from './src/utils';


// This function takes a public key buffer and returns a SPKI PEM encoded string
function publicKeyToSPKI(publicKey: Buffer): string {
  // Convert the public key buffer to a base64 encoded string
  const base64EncodedPublicKey = publicKey.toString('base64');
  // Create a PEM encoded string from the base64 encoded public key
  const pemEncodedPublicKey =
    `-----BEGIN PUBLIC KEY-----\n${base64EncodedPublicKey}\n-----END PUBLIC KEY-----`;
  // Return the PEM encoded string
  return pemEncodedPublicKey;
}


const keyPair = generate.generateKeyPair();

const pem = publicKeyToSPKI(keyPair.publicKey)

console.log(pem);

async function main() {

  const publicKey = await webcrypto.subtle.importKey(
    'raw',
    keyPair.publicKey,
    {
      name: 'EdDSA',
      namedCurve: 'Ed25519'
    },
    true,
    ['verify']
  );
  const spki2 = utils.bufferWrap(await webcrypto.subtle.exportKey('spki', publicKey));
  const pem2 = `-----BEGIN PUBLIC KEY-----\n${spki2.toString('base64')}\n-----END PUBLIC KEY-----\n` as PublicKeyPem;
  console.log(pem2);

  // const x: Algorithm = {
  //   name: 'EdDSA',
  //   namedCurve: 'Ed25519'
  // };


  const spki = new asn1X509.SubjectPublicKeyInfo({
    algorithm: new asn1X509.AlgorithmIdentifier({
      algorithm: x509.idEd25519
    }),
    subjectPublicKey: keyPair.publicKey,
  });
  const data = utils.bufferWrap(asn1.AsnSerializer.serialize(spki));
  console.log(data.toString('base64'));


  // MCowBQYDK2VwAyEAdgm70MqIqJabXXJ2ogJQ1MuI5YPsWwK1WPib/sNrpts=
  // MCcwAgYA    AyEAdgm70MqIqJabXXJ2ogJQ1MuI5YPsWwK1WPib/sNrpts=


}

main();
