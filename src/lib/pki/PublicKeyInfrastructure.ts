import forge from 'node-forge'

function createX509Certificate() {
  const pki = forge.pki;

  // generate a keypair and create an X.509v3 certificate
  const keys = pki.rsa.generateKeyPair(2048);
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  // alternatively set public key from a csr
  //cert.publicKey = csr.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [{
    name: 'commonName',
    value: 'polykey.com'
  }, {
    name: 'countryName',
    value: 'AUS'
  }, {
    shortName: 'ST',
    value: 'NSW'
  }, {
    name: 'localityName',
    value: 'Sydney'
  }, {
    name: 'organizationName',
    value: 'MatrixAI'
  },];
  cert.setSubject(attrs);
  // alternatively set subject from a csr
  //cert.setSubject(csr.subject.attributes);
  cert.setIssuer(attrs);
  cert.setExtensions([{
    name: 'basicConstraints',
    cA: true
  }, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
  }, {
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true,
    codeSigning: true,
    emailProtection: true,
    timeStamping: true
  }, {
    name: 'nsCertType',
    client: true,
    server: true,
    email: true,
    objsign: true,
    sslCA: true,
    emailCA: true,
    objCA: true
  }, {
    name: 'subjectAltName',
    altNames: {
      type: 7, // IP
      ip: '127.0.0.1'
    }
  }, {
    name: 'subjectKeyIdentifier'
  }]);
  // self-sign certificate
  cert.sign(keys.privateKey);

  // convert a Forge certificate to PEM
  const keyPem = pki.privateKeyToPem(keys.privateKey)
  const certPem = pki.certificateToPem(cert);
  return {
    keyPem,
    certPem
  }
}

export default createX509Certificate
