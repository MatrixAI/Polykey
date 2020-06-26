import {pki} from 'node-forge'

class PublicKeyInfrastructure {
  caPrivateKey: Buffer | undefined
  caCert: Buffer | undefined

  caStore: pki.CAStore

  cert: Buffer
  key: Buffer

  constructor(
    caPrivateKey?: Buffer,
    caCert?: Buffer
  ) {
    this.caPrivateKey = caPrivateKey
    this.caCert = caCert

    this.caStore = pki.createCaStore()
    // if (caPrivateKey) {
    //   this.caStore.addCertificate(pki.certificateFromPem(caPrivateKey.toString()))
    // }

    this.createX509Certificate()
  }

  private createX509Certificate(nbits: number = 2048, organizationName: string = 'MatrixAI') {

    // generate a keypair and create an X.509v3 certificate
    const keys = pki.rsa.generateKeyPair(nbits);
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
      value: 'polykey'
    }, {
      name: 'organizationName',
      value: organizationName
    }];
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
    console.log(this.caPrivateKey!.toString());

    cert.sign(pki.privateKeyFromPem(this.caPrivateKey!.toString()));

    // convert a Forge certificate to PEM
    this.key = Buffer.from(pki.privateKeyToPem(keys.privateKey))
    this.cert = Buffer.from(pki.certificateToPem(cert))
  }

}

export default PublicKeyInfrastructure
