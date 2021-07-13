#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import process from 'process';
import forge, { pki, md, asn1 } from 'node-forge';

const scriptDir = __dirname;
const certsDir = path.resolve(`${scriptDir}/../src/certs`);

try {
  fs.accessSync(certsDir, fs.constants.R_OK | fs.constants.W_OK);
} catch  (e) {
  console.error(`The path ${certsDir} is not accessible`);
  process.exit(1);
}

const keyPath = path.resolve(
  `${certsDir}/bootstrap.polykey.io.key.ts`
);
const pubPath = path.resolve(
  `${certsDir}/bootstrap.polykey.io.pub.ts`
);
const crtPath = path.resolve(
  `${certsDir}/bootstrap.polykey.io.crt.ts`
);

const now = new Date();
const unixtime = Math.round(now.getTime() / 1000);
const keys = pki.rsa.generateKeyPair(4096);
const cert = pki.createCertificate();

cert.publicKey = keys.publicKey;
cert.serialNumber = unixtime.toString();

const notBeforeDate = new Date(now.getTime());
const notAfterDate = new Date(now.getTime())
notAfterDate.setMonth(notAfterDate.getMonth() + 3);
cert.validity.notBefore = notBeforeDate;
cert.validity.notAfter = notAfterDate;

const attrs = [
  {
    name: 'commonName',
    value: 'bootstrap.polykey.io'
  },
  {
    name: 'organizationName',
    value: 'Matrix AI'
  }
];

cert.setSubject(attrs);

cert.setIssuer(attrs);

cert.setExtensions([
  {
    name: 'basicConstraints',
    cA: true,
  },
  {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true,
  },
  {
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true,
    codeSigning: true,
    emailProtection: true,
    timeStamping: true,
  },
  {
    name: 'nsCertType',
    client: true,
    server: true,
    email: true,
    objsign: true,
    sslCA: true,
    emailCA: true,
    objCA: true,
  },
  {
    name: 'subjectAltName',
    altNames: [
      {
        type: 7,
        ip: '127.0.0.1'
      }
    ]
  },
  {
    name: 'subjectKeyIdentifier'
  }
]);

try {
  const keyPemParent = fs.readFileSync(
    keyPath,
    { encoding: 'utf8' }
  );
  console.error(`Existing parent key detected at: ${keyPath}`)
  const keyParent = pki.privateKeyFromPem(keyPemParent);
  console.error(`Signing certificate with parent key: ${keyPath}`);
  cert.sign(keyParent, md.sha512.create());
} catch (e) {
  if (e.code === 'ENOENT') {
    console.error('Signing certificate wth its own key');
    cert.sign(keys.privateKey, md.sha512.create());
  }
}

const keyPem = `const priv = '${JSON.stringify(pki.privateKeyToPem(keys.privateKey))}';\n\nexport { priv };`;
const pubPem = `const pub = '${JSON.stringify(pki.publicKeyToPem(keys.publicKey))}';\n\nexport { pub };`;
const crtPem = `const cert = '${JSON.stringify(pki.certificateToPem(cert))}';\n\nexport { cert };`;

console.error(`Writing ${keyPath}`);
fs.writeFileSync(keyPath, keyPem);

console.error(`Writing ${pubPath}`);
fs.writeFileSync(pubPath, pubPem);

console.error(`Writing ${crtPath}`);
fs.writeFileSync(crtPath, crtPem);
