import forge, { pki } from 'node-forge'

/**
 * This class manages X.509 certificates for secure and authenticated communication between peers.
 */
class PublicKeyInfrastructure {
  // Cert defaults
  static N_BITS: number = 2048
  static COMMON_NAME: string = 'localhost'
  static ORGANIZATION_NAME: string = 'MatrixAI'

  /**
   * Creates an X.509 certificate for transport layer security
   * @param nbits The number of bits for keypair generation
   * @param organizationName The name of the organization
   */
  static createX509Certificate(
    nbits: number = PublicKeyInfrastructure.N_BITS,
    commonName: string = PublicKeyInfrastructure.COMMON_NAME,
    organizationName: string = PublicKeyInfrastructure.ORGANIZATION_NAME,
    sign?: (cert: pki.Certificate) => pki.Certificate
  ) {
    const pki = forge.pki;

    // generate a keypair and create an X.509v3 certificate
    const keys = pki.rsa.generateKeyPair(nbits);
    let cert = pki.createCertificate();
    cert.publicKey = keys.publicKey;
    // alternatively set public key from a csr
    //cert.publicKey = csr.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

    const attrs = [
      {
        name: 'commonName',
        value: commonName
      },
      {
        name: 'organizationName',
        value: organizationName
      }
    ];
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

    // Self-sign or sign with provided key
    if (sign) {
      cert = sign(cert)
    } else {
      cert.sign(keys.privateKey);
    }

    // convert a Forge certificate to PEM
    const keyPem = Buffer.from(pki.privateKeyToPem(keys.privateKey))
    const certPem = Buffer.from(pki.certificateToPem(cert))
    return {
      keyPem,
      certPem
    }
  }
}

export default PublicKeyInfrastructure
