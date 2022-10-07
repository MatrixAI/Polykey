import * as asn1js from 'asn1js';
// We are going to test x509
// and let's see how we can make use of this
// No more node-forge - we are going to make use of this

// pkijs - 5 packages
// @pecualiar/x509 - 15 packages

import * as asn1 from '@peculiar/asn1-schema';
// import { AsnConvert, AsnType, AsnPropTypes, AsnArray } from "@peculiar/asn1-schema";
import * as utils from './src/utils';
import config from './src/config';

import fs from 'fs';
// import { webcrypto } from 'crypto';
import * as x509 from '@peculiar/x509';
import * as jose from 'jose';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import * as nobleEd25519 from '@noble/ed25519';
import * as nobleHashesUtils from '@noble/hashes/utils';
import * as base64 from 'multiformats/bases/base64';
import * as noblePbkdf2 from '@noble/hashes/pbkdf2';
import * as nobleHkdf from '@noble/hashes/hkdf';
import { sha512 as nobleSha512 } from '@noble/hashes/sha512';
import { sha256 as nobleSha256 } from '@noble/hashes/sha256';
import { Crypto } from '@peculiar/webcrypto';

// Both PKIJS and X509 library
// ends up being capable of setting
// the crypto global
// or crypto.webcrypto in the case of nodejs
// In PKIJS it's CryptoEngineInit.ts
// In X509, i'ts the provider.ts
// However it does not automatically do the below
// So we have to do it ourselves
// It is the `Crypto` interface that's the webcrypto object
// Note that nodejs now has native webcrypto so we are using this

const webcrypto = new Crypto();

/**
 * Zero-copy wraps ArrayBuffer-like objects into Buffer
 * This supports ArrayBuffer, TypedArrays and NodeJS Buffer
 */
function bufferWrap(
  array: ArrayBuffer,
  offset?: number,
  length?: number,
): Buffer {
  if (Buffer.isBuffer(array)) {
    return array;
  } else if (ArrayBuffer.isView(array)) {
    return Buffer.from(
      array.buffer,
      offset ?? array.byteOffset,
      length ?? array.byteLength
    );
  } else {
    return Buffer.from(
      array,
      offset,
      length
    );
  }
}

// @ts-ignore - this overrides the random source used by @noble and @scure libraries
nobleHashesUtils.randomBytes = (size: number = 32) => getRandomBytesSync(size);
nobleEd25519.utils.randomBytes = (size: number = 32) => getRandomBytesSync(size);
x509.cryptoProvider.set(webcrypto as Crypto);

/**
 * This is limited to 65,536 bytes of random data
 * Stream this call, if you want more
 */
function getRandomBytesSync(size: number): Buffer {
  return webcrypto.getRandomValues(
    Buffer.allocUnsafe(size)
  );
}

type Opaque<K, T> = T & { readonly [brand]: K };
declare const brand: unique symbol;

type RecoveryCode = Opaque<'RecoveryCode', string>;

function generateRecoveryCode(size: 12 | 24 = 24): RecoveryCode {
  if (size === 12) {
    return bip39.generateMnemonic(wordlist, 128) as RecoveryCode;
  } else if (size === 24) {
    return bip39.generateMnemonic(wordlist, 256) as RecoveryCode;
  }
  throw RangeError(size);
}

async function generateDeterministicKeyPair(
  recoveryCode: string
): Promise<{
  publicKey: Buffer;
  privateKey: Buffer;
}> {
  // This uses BIP39 standard, the result is 64 byte seed
  // This is deterministic, and does not use any random source
  const recoverySeed = await bip39.mnemonicToSeed(recoveryCode);
  // Slice it to 32 bytes, as ed25519 private key is only 32 bytes
  const privateKey = recoverySeed.slice(0, 32);
  const publicKey = await nobleEd25519.getPublicKey(privateKey);
  return {
    publicKey: bufferWrap(publicKey),
    privateKey: bufferWrap(privateKey)
  };
}

async function main () {
  const recoveryCode = generateRecoveryCode(24);
  const rootKeyPair = await generateDeterministicKeyPair(recoveryCode);

  // We don't actually use jose's importJWK
  // Well if we do, the problem is that we get a key object in NodeJS
  // not a webcrypto CryptoKey
  // We can import JWKs directly in webcrypto

  const d = base64.base64url.baseEncode(rootKeyPair.privateKey);
  const x = base64.base64url.baseEncode(rootKeyPair.publicKey);

  const privateKeyJWK = {
    alg: 'EdDSA',
    kty: 'OKP', // Octet key pair
    crv: 'Ed25519', // Curve
    d: d, // Private key
    x: x, // Public key
    ext: true, // Extractable (always true in nodejs)
    key_ops: ['sign', 'verify'], // Key operations
  };

  const publicKeyJWK = {
    alg: 'EdDSA',
    kty: 'OKP', // Octet key pair
    crv: 'Ed25519', // Curve
    x: x, // Public key
    ext: true, // Extractable (always true in nodejs)
    key_ops: ['verify'], // Key operations
  };

  // The below is technically non-standard
  // Because Ed25519 and X25519 has not been standardised under webcrypto
  // But the problem is that the x509 library seems to demand this requirement

  const privateCryptoKey = await webcrypto.subtle.importKey(
    'jwk',
    privateKeyJWK,
    // { name: 'Ed25519' }, // NODEJS
    { name: 'EdDSA', namedCurve: 'Ed25519' }, // PECULIAR
    true,
    ['sign']
  );

  const publicCryptoKey = await webcrypto.subtle.importKey(
    'jwk',
    publicKeyJWK,
    // { name: 'Ed25519' }, // NODEJS
    { name: 'EdDSA', namedCurve: 'Ed25519' }, // PECULIAR
    true,
    ['verify']
  );

  console.log('Got it', privateCryptoKey);
  console.log('Got it', publicCryptoKey);

  // Ed25519 isn't officially supported by webcrypto
  // However NodeJS has Ed25519 implemented
  // The X509 library relies on the crypto provider
  // It seems to assume the same API as the peculiarventures/webcrypto
  // I'm not sure if we are supposed to be using that
  // The problem is that it doesn't just take Uint8Arrays as the keys
  // const keys = await webcrypto.subtle.generateKey({
  //   name: 'Ed25519',
  // }, true, ['sign', 'verify']);
  // console.log(keys);


  // const cert = await x509.X509CertificateGenerator.createSelfSigned({
  //   serialNumber: '01',
  //   // This can be JSON, only used for self-signed
  //   // on The other ones, we can do subject, issuer, publicKey, signingKey, signature, publicKey
  //   name: 'CN=Test, E=some@email.net',
  //   notBefore: new Date('2020/01/01'),
  //   notAfter: new Date('2025/01/01'),
  //   signingAlgorithm: {
  //     // This is only used if the `signingKey` is set
  //     name: 'EdDSA', // <- peculiar venture style, but it's not really used
  //   },
  //   // This is a CryptoKeyPair interface
  //   keys: {
  //     // This has to be a CryptoKey
  //     // Which is object with algorithm, extractable, type, usages
  //     publicKey: publicCryptoKey,
  //     privateKey: privateCryptoKey,
  //   },
  //   extensions: [
  //     new x509.BasicConstraintsExtension(false, undefined, true),
  //     new x509.ExtendedKeyUsageExtension(
  //       ["1.2.3.4.5.6.7", "2.3.4.5.6.7.8"],
  //       true
  //     ),
  //     new x509.KeyUsagesExtension(
  //       x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign,
  //       true
  //     ),
  //     await x509.SubjectKeyIdentifierExtension.create(publicCryptoKey),
  //   ]
  // });

  // // You can do this
  // // but it doesn't have any effect on the underlying data
  // // Cause the `toString` runs against the `rawData`
  // // So you cannot just modify the certificate afterwards...
  // cert.notAfter = new Date('2030/01/01');
  // cert.notBefore = new Date('2020/01/01');
  // cert.signature = new ArrayBuffer(10);


  // console.log(cert);

  // console.log(cert.toString('pem'));

  // fs.writeFileSync('./tmp/x.crt', cert.toString('pem'));

  // We need to test what we do to our certificates now
  // 1. CN is just the NodeId (which is multibase base32hex)
  // 2. Issue is the same
  // 3. Subject is the same
  // Extensions:
  // basic
  // key usage
  // extended key usage
  // nsCertType can be used <- this is actually useless now, it's deprecated
  // Subject alternative name is available
  // Subject key identifier is available
  // Custom extension which is the Polykey Version

  // there is a bit of weird thing
  // the node signature custom extension
  // It requires us to sign the certificate first with the private key

  // Extract that signature...
  // Then create a extension with that signature
  // Then add that to it again, and then sign it again

  // These 2 signing operations are using different keys...
  // The first time, is the subject private key
  // The second time is the issuer's private key

  // The second time is what makes it a self signed cert
  // But the first time, allows us to have another part (the subject) end up signing the same information

  // Why do we do this
  // It's to create a root certificate chain that allows rotations of the root key
  // This means it's possible for the issuer to be the OLD node
  // but the subject to be the NEW node

  // Therefore the node signature always has a signature indicating
  // the subject has "signed" this certificate, which can be the new AND current node

  // While the cert signature is actually the issue signing it, which could be the old node

  // So yea, it's a cert with 2 signatures
  // while officially x509 can only have 1 signature

  // Note that X509 is just a data format containing identity information
  // At the end of the day, it could just be replaced with JWT & JWS
  // But we seem to continue using X509 due to all the systems that consume X509 stuff(
  // So there isn't an alternative certificate format that is purely JSON
  // But one could definitely create one
  // In a way, the sigchain/blockchain is this


  // Basically, JWS (compact format) replace X509 pems
  // JWS flattened format we can just use to represent certificates too
  // Note that all those extensions... validity.. etc, are all info in the JWT itself

  // https://security.stackexchange.com/questions/128185/jwt-vs-client-certificates

  // I wonder if we should even bother presenting a X509 cert
  // Remember this cert is then also presented for TLS purposes
  // So we sort of still do need it, but an equivalent JWT can be presented
  // And used as a certificate

  // However for now I think this is possible

  // You cannot mutate the existing certificate to set the new extension
  // But you can create a new one, using information the old one
  // With the new extension... I think that makes sense for what we want to do here..

  // I don't think we need to have pkijs at all then
  // this is all we are doing

  // Attempt to do this with custom extensions soon

  const now = new Date();
  const duration = 1000;
  const notBeforeDate = new Date(now.getTime());
  const notAfterDate = new Date(now.getTime());
  notAfterDate.setSeconds(notAfterDate.getSeconds() + duration);

  // The issuer is signing
  // The public key is the subject

  const subjectPublicKey = publicCryptoKey;
  const subjectPrivateKey = privateCryptoKey;

  // The issuer may be the old node
  const issuerPrivateKey = privateCryptoKey;

  // These should have been part of the extended key usage
  const serverAuth = '1.3.6.1.5.5.7.3.1';
  const clientAuth = '1.3.6.1.5.5.7.3.2';
  const codeSigning = '1.3.6.1.5.5.7.3.3';
  const emailProtection = '1.3.6.1.5.5.7.3.4';
  const timeStamping = '1.3.6.1.5.5.7.3.8';
  const ocspSigning = '1.3.6.1.5.5.7.3.9';

  const rootCert = await x509.X509CertificateGenerator.create({
    serialNumber: utils.getUnixtime(now).toString(),
    notBefore: notBeforeDate,
    notAfter: notAfterDate,
    subject: [
      { 'CN': ['NODE ID of subject'] },
    ],
    issuer: [
      { 'CN': ['NodeID of issuer'] },
    ],
    signingAlgorithm: {
      name: 'EdDSA',
    },
    publicKey: subjectPublicKey,
    // Initially going to use the subjectPrivateKey
    // But after wards we use the issuerPrivateKey to do this
    signingKey: subjectPrivateKey,
    extensions: [
      new x509.BasicConstraintsExtension(true),
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.keyCertSign |
        x509.KeyUsageFlags.cRLSign |
        x509.KeyUsageFlags.digitalSignature |
        x509.KeyUsageFlags.nonRepudiation |
        x509.KeyUsageFlags.keyAgreement |
        x509.KeyUsageFlags.keyEncipherment |
        x509.KeyUsageFlags.dataEncipherment
      ),
      new x509.ExtendedKeyUsageExtension(
        [
          serverAuth,
          clientAuth,
          codeSigning,
          emailProtection,
          timeStamping,
          ocspSigning
        ]
      ),
      new x509.SubjectAlternativeNameExtension(
        {
          dns: ['POLYKEY NODE ID'],
          url: ['pk://POLYKEY NODE ID'],
          ip: ['127.0.0.1', '::1']
        }
      ),
      await x509.SubjectKeyIdentifierExtension.create(subjectPublicKey),
      new PolykeyVersionExtension('1.0.0'),
      new PolykeyNodeSignatureExtension(
        Buffer.from('hello world').toString('hex')
      )
    ]
  });

  console.log('ROOT CERT', rootCert);

  // const rootCertPem = rootCert.toString('pem');
  // console.log(rootCertPem);

  fs.writeFileSync('./tmp/x.crt', rootCert.toString('pem'));

  const attempt = new PolykeyNodeSignatureExtension(Buffer.from('abc').toString('hex'));

  console.log('------', attempt);
  console.log(attempt.rawData);

  const attempt2 = new PolykeyNodeSignatureExtension(attempt.rawData);
  console.log('HEY', attempt2.signature);

  // it's a hex string
  // lol

}

@asn1.AsnType({ type: asn1.AsnTypeTypes.Choice })
class VersionString {
  @asn1.AsnProp({ type: asn1.AsnPropTypes.IA5String })
  public value: string;
}

@asn1.AsnType({ type: asn1.AsnTypeTypes.Choice })
class SignatureString {
  @asn1.AsnProp({ type: asn1.AsnPropTypes.OctetString })
  public value: ArrayBuffer;
}


class PolykeyVersionExtension extends x509.Extension {
  public readonly version: string;
  public constructor(raw: ArrayBuffer);
  public constructor(version: string, critical?: boolean)
  public constructor(...args: any[]) {
    if (args[0] instanceof ArrayBuffer || ArrayBuffer.isView(args[0])) {
      super(args[0]);
      const value = asn1.AsnConvert.parse(this.value, VersionString);
      console.log('THE VALUE', value);
      this.version = value.value;
    } else {
      const versionString = new VersionString();
      versionString.value = args[0];
      super(
        config.oids.extensions.polykeyVersion,
        args[1],
        asn1.AsnSerializer.serialize(versionString),
      );
      this.version = args[0];
    }
  }
}

class PolykeyNodeSignatureExtension extends x509.Extension {
  // Signature in hex
  public readonly signature: string;
  public constructor(raw: ArrayBuffer);
  public constructor(signature: string, critical?: boolean)
  public constructor(...args: any[]) {
    if (args[0] instanceof ArrayBuffer || ArrayBuffer.isView(args[0])) {
      super(args[0]);
      const value = asn1.AsnConvert.parse(this.value, SignatureString);
      this.signature = utils.bufferWrap(value.value).toString('hex');
    } else {
      const signature_ = Buffer.from(args[0], 'hex');
      const signatureString = new SignatureString();
      signatureString.value = signature_;
      super(
        config.oids.extensions.nodeSignature,
        args[1],
        asn1.AsnSerializer.serialize(signatureString)
      );
      this.signature = args[0];
    }
  }
}

void main();


