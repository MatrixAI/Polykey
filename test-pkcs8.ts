import webcrypto, { importPrivateKey, exportPrivateKey } from './src/keys/utils/webcrypto';
import * as asn1 from '@peculiar/asn1-schema';
import * as asn1Pkcs8 from '@peculiar/asn1-pkcs8';
import * as asn1X509 from '@peculiar/asn1-x509';
import * as asn1Ecc from '@peculiar/asn1-ecc';
import * as x509 from '@peculiar/x509';
import * as utils from './src/utils';
import * as generate from './src/keys/utils/generate';
import * as forge from 'node-forge';
import * as ourX509 from './src/keys/utils/x509';


// DER-encoded ECPrivateKey object
// it can be between
// so why DER-encoded ECPrivateKey looks different?
// we might need to be using `ecc` for this
// maybe the private key is a combination of both
// and it seems that there's a verssion and such

function privateKeyToForge(privateKey: Buffer) {
  const byteBuffer = Buffer.concat([
    Buffer.from([0x04, 0x20]),
    privateKey
  ]);

  const version = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.INTEGER,
    false,
    // @ts-ignore
    forge.asn1.integerToDer(0).getBytes()
  );

  console.log('VERSION', Buffer.from(forge.asn1.toDer(version).getBytes(), 'binary'));

  const algorithm = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    // @ts-ignore
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, forge.asn1.oidToDer(
      // @ts-ignore
      forge.oids.EdDSA25519
    ).getBytes()),
  ]);

  console.log('ALGORITHM', Buffer.from(forge.asn1.toDer(algorithm).getBytes(), 'binary'));

  const key = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.OCTETSTRING,
    false,
    byteBuffer.toString('binary')
  );

  // That's really weird, that means, this has already added in the length
  // The key here has more than just 04 22, it has 04 22
  // It's misisng 2 bytes, it's the 0x04 0x22 that it's missing
  console.log('KEY', Buffer.from(forge.asn1.toDer(key).getBytes(), 'binary'));
  console.log('KEY', Buffer.from(forge.asn1.toDer(key).getBytes(), 'binary').byteLength);

  const forgey = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      version,
      algorithm,
      key
    ]
  );

  const x = Buffer.from(forge.asn1.toDer(forgey).getBytes(), 'binary');

  console.log('FINAL', x);
  console.log('FINAL', x.byteLength);
  console.log(x.toString('base64'));
}

function privateKeyToPem(privateKey: Buffer) {

  // const ecPrivateKey = new asn1Ecc.ECPrivateKey({
  //   version: 1,
  //   privateKey: new asn1.OctetString(privateKey),
  //   // parameters: new asn1Ecc.ECParameters({
  //   //   namedCurve: x509.idEd25519
  //   // }),
  // });
  // const data1 = asn1.AsnSerializer.serialize(ecPrivateKey);

  const what = new asn1Pkcs8.PrivateKeyInfo();
  what.privateKey.buffer


  const algorithm = new asn1X509.AlgorithmIdentifier({
    algorithm: x509.idEd25519
  });

  // console.log(
  //   'ALGORITHM',
  //   utils.bufferWrap(asn1.AsnSerializer.serialize(algorithm))
  // );

  // You needed the type and length added into this `PrivateKey` creation
  // otherwise it's only just this key... with no length information
  const key = new asn1Pkcs8.PrivateKey(
    Buffer.concat([
      Buffer.from([0x04, 0x20]),
      privateKey
    ])
  );


  // const key_ = asn1.AsnSerializer.serialize(key);

  // const key_ = new asn1.OctetString(key);

  // console.log(
  //   'KEY',
  //   utils.bufferWrap(asn1.AsnSerializer.serialize(key))
  // );

  // // const data_ = asn1.AsnSerializer.serialize(k);
  // // console.log(utils.bufferWrap(data_));
  // // console.log(utils.bufferWrap(data_).byteLength);
  // // const dataA = asn1.AsnSerializer.serialize(pkA);
  // // console.log(utils.bufferWrap(dataA));

  const pkcs8 = new asn1Pkcs8.PrivateKeyInfo({
    privateKeyAlgorithm: algorithm,
    privateKey: key,
  });

  console.log('SEE THIS', pkcs8);


  const data = utils.bufferWrap(asn1.AsnSerializer.serialize(pkcs8));

  console.log('CUSTOM', data);
  console.log('CUSTOM', data.byteLength);
  console.log(data.toString('base64'));

  // return `-----BEGIN PRIVATE KEY-----\n${data.toString('base64')}\n-----END PRIVATE KEY-----\n`;
}

const keyPair = generate.generateKeyPair();

// privateKeyToForge(keyPair.privateKey);

// console.log('---------');

// privateKeyToPem(keyPair.privateKey);

// console.log(pem);


async function main () {

  // const k = await importPrivateKey(keyPair.privateKey);
  // const pkcs8 = utils.bufferWrap(await webcrypto.subtle.exportKey(
  //   'pkcs8',
  //   k
  // ));

  // // @ts-ignore
  // // console.log('WEBCRYPTO', pkcs8);
  // // console.log('WEBCRYPTO', pkcs8.byteLength);
  // // console.log(pkcs8.toString('base64'));

  // const pem1 = `-----BEGIN PRIVATE KEY-----\n${pkcs8.toString('base64')}\n-----END PRIVATE KEY-----\n`;
  // console.log(pem1);
  // // Ok so here we go..

  const pem2 = ourX509.privateKeyToPem(keyPair.privateKey);
  console.log(pem2);

  const pK = ourX509.privateKeyFromPem(pem2);
  console.log(pK);
  console.log(pK?.byteLength);

  // const x = new asn1Pkcs8.PrivateKey(keyPair.privateKey);
  // const y = x.toASN();
  // console.log(y.toBER());


}

main();

