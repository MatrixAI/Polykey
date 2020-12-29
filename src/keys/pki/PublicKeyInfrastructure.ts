import fs from 'fs';
import path from 'path';
import { pki, md } from 'node-forge';
import { peerInterface } from '../../../proto/js/Peer';

type TLSCredentials = {
  rootCertificate: string;
  certificate: string;
  keypair: {
    private: string;
    public: string;
  };
};

/**
 * This class manages X.509 certificates for secure and authenticated communication between peers.
 */
class PublicKeyInfrastructure {
  private commonName: string;

  // pki vault
  private pkiPath: string;
  private pkiFs: typeof fs;

  // certificate signed by another
  private keypair: pki.rsa.KeyPair;
  private certificate: pki.Certificate;

  public get CACertificates(): string {
    return this.CAStore.listAllCertificates()
      .map((c) => pki.certificateToPem(c))
      .join('\n');
  }

  public get TLSClientCredentials(): TLSCredentials {
    return {
      rootCertificate: this.RootCert,
      certificate: pki.certificateToPem(this.certificate),
      keypair: {
        public: pki.publicKeyToPem(this.keypair.publicKey),
        private: pki.privateKeyToPem(this.keypair.privateKey),
      },
    };
  }

  public get TLSServerCredentials(): TLSCredentials {
    return {
      rootCertificate: this.RootCert,
      certificate: pki.certificateToPem(this.certificate),
      keypair: {
        public: pki.publicKeyToPem(this.keypair.publicKey),
        private: pki.privateKeyToPem(this.keypair.privateKey),
      },
    };
  }

  private CAStore: pki.CAStore;

  // root CA
  private certificateChain: pki.Certificate[];
  private rootCertificate: pki.Certificate;
  private rootKeypair: pki.rsa.KeyPair;
  public get RootCert(): string {
    return pki.certificateToPem(this.rootCertificate);
  }

  public get CertChain(): string[] {
    return this.certificateChain.map((c) => pki.certificateToPem(c));
  }

  constructor(polykeyPath: string, fileSystem: typeof fs) {
    this.commonName = process.env.PK_PEER_HOST ?? 'localhost';
    this.pkiPath = path.join(polykeyPath, '.pki');

    this.CAStore = pki.createCaStore();
    this.pkiFs = fileSystem;
    this.loadMetadata();
  }

  async handleGRPCRequest(request: Uint8Array): Promise<Uint8Array> {
    const { type, subMessage } = peerInterface.CAMessage.decodeDelimited(request);
    let response: Uint8Array;
    switch (type) {
      case peerInterface.CAMessageType.ROOT_CERT:
        response = Buffer.from(this.RootCert);
        break;
      case peerInterface.CAMessageType.REQUEST_CERT:
        response = Buffer.from(this.handleCSR(subMessage.toString()));
        break;
      default:
        throw Error(`type not supported: ${type}`);
    }
    const encodedResponse = peerInterface.CAMessage.encodeDelimited({
      type,
      isResponse: true,
      subMessage: response,
    }).finish();
    return encodedResponse;
  }

  q;

  //////////////////////////////////
  // Certificate Signing Requests //
  //////////////////////////////////
  createCSR(commonName: string, challengePassword: string, keypair?: pki.rsa.KeyPair) {
    // create a certification request (CSR)
    const csr = pki.createCertificationRequest();

    csr.serialNumber = '01';

    if (keypair) {
      csr.publicKey = keypair.publicKey;
    } else {
      csr.publicKey = this.keypair.publicKey;
    }

    csr.setSubject([
      {
        name: 'commonName',
        value: commonName,
      },
    ]);
    // set (optional) attributes
    (csr as any).setAttributes([
      {
        name: 'challengePassword',
        value: 'password',
      },
    ]);

    if (keypair) {
      csr.sign(keypair.privateKey, md.sha512.create());
    } else {
      csr.sign(this.keypair.privateKey, md.sha512.create());
    }

    return pki.certificationRequestToPem(csr);
  }

  handleCSR(csrPem: string) {
    const csr = pki.certificationRequestFromPem(csrPem);

    // verify certification request
    try {
      if (!csr.verify(csr)) {
        throw new Error('Signature not verified.');
      }
    } catch (err) {
      throw new Error('Signature not verified.');
    }

    // TODO validate challenge password
    const challengePassword = csr.getAttribute({ name: 'challengePassword' });

    const certificate = pki.createCertificate();
    certificate.serialNumber = '01';
    certificate.validity.notBefore = new Date();
    certificate.validity.notAfter = new Date();
    certificate.validity.notAfter.setMonth(certificate.validity.notBefore.getMonth() + 3);

    certificate.setSubject(csr.subject.attributes);
    certificate.setIssuer(this.rootCertificate.issuer.attributes);
    certificate.publicKey = csr.publicKey;

    certificate.setExtensions([
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
    ]);
    // set (optional) attributes
    (csr as any).setAttributes([
      {
        name: 'challengePassword',
        value: 'password',
      },
    ]);

    // sign certificate
    certificate.sign(this.rootKeypair.privateKey, md.sha512.create());

    // return certificate in pem form
    return pki.certificateToPem(certificate);
  }

  //////////////////////////
  // Agent & Client Comms //
  //////////////////////////
  createServerCredentials(): TLSCredentials {
    const keypair = this.createKeypair();
    // create a certification request (CSR)
    const certificate = pki.createCertificate();
    certificate.serialNumber = '01';
    certificate.validity.notBefore = new Date();
    certificate.validity.notAfter = new Date();
    certificate.validity.notAfter.setMonth(certificate.validity.notBefore.getMonth() + 3);

    certificate.setSubject([
      {
        name: 'commonName',
        value: 'localhost',
      },
    ]);
    certificate.setIssuer(this.rootCertificate.issuer.attributes);
    certificate.publicKey = keypair.publicKey;

    certificate.setExtensions([
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
        clientAuth: false,
        codeSigning: true,
        emailProtection: true,
        timeStamping: true,
      },
      {
        name: 'nsCertType',
        client: false,
        server: true,
        email: false,
        objsign: false,
        sslCA: false,
        emailCA: false,
        objCA: false,
      },
    ]);

    // sign certificate
    certificate.sign(this.rootKeypair.privateKey, md.sha512.create());

    return {
      rootCertificate: this.RootCert,
      certificate: pki.certificateToPem(certificate),
      keypair: {
        private: pki.privateKeyToPem(keypair.privateKey),
        public: pki.publicKeyToPem(keypair.publicKey),
      },
    };
  }

  createClientCredentials(): TLSCredentials {
    const keypair = this.createKeypair();
    // create a certification request (CSR)
    const certificate = pki.createCertificate();
    certificate.serialNumber = '01';
    certificate.validity.notBefore = new Date();
    certificate.validity.notAfter = new Date();
    certificate.validity.notAfter.setMonth(certificate.validity.notBefore.getMonth() + 3);

    certificate.setSubject([
      {
        name: 'commonName',
        value: 'localhost',
      },
    ]);
    certificate.setIssuer(this.rootCertificate.issuer.attributes);
    certificate.publicKey = keypair.publicKey;

    certificate.setExtensions([
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
        serverAuth: false,
        clientAuth: true,
        codeSigning: true,
        emailProtection: true,
        timeStamping: true,
      },
      {
        name: 'nsCertType',
        client: true,
        server: false,
        email: false,
        objsign: false,
        sslCA: false,
        emailCA: false,
        objCA: false,
      },
    ]);

    // sign certificate
    certificate.sign(this.rootKeypair.privateKey, md.sha512.create());

    return {
      rootCertificate: this.RootCert,
      certificate: pki.certificateToPem(certificate),
      keypair: {
        private: pki.privateKeyToPem(keypair.privateKey),
        public: pki.publicKeyToPem(keypair.publicKey),
      },
    };
  }

  ////////////////////
  // Helper methods //
  ////////////////////
  createTLSCredentials(organizationName = 'MatrixAI', isCA = false): TLSCredentials {
    const certificate = pki.createCertificate();
    const keypair = this.createKeypair();
    certificate.publicKey = keypair.publicKey;
    certificate.serialNumber = '01';
    certificate.validity.notBefore = new Date();
    certificate.validity.notAfter = new Date();
    certificate.validity.notAfter.setMonth(certificate.validity.notBefore.getMonth() + 3);

    isCA = true;
    const attrs = [
      {
        name: 'commonName',
        value: this.commonName,
      },
      {
        name: 'organizationName',
        value: organizationName,
      },
    ];
    certificate.setSubject(attrs);
    certificate.setIssuer(attrs);
    certificate.setExtensions([
      {
        name: 'basicConstraints',
        cA: isCA,
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
        sslCA: isCA,
        emailCA: isCA,
        objCA: isCA,
      },
      {
        name: 'subjectKeyIdentifier',
      },
    ]);

    if (isCA) {
      certificate.sign(keypair.privateKey, md.sha512.create());
    } else {
      certificate.sign(this.rootKeypair.privateKey, md.sha512.create());
    }

    const certificatePem = pki.certificateToPem(certificate);

    return {
      rootCertificate: isCA ? certificatePem : this.RootCert,
      certificate: certificatePem,
      keypair: {
        private: pki.privateKeyToPem(keypair.privateKey),
        public: pki.publicKeyToPem(keypair.publicKey),
      },
    };
  }

  privateKeyToPem(privateKey: pki.rsa.PrivateKey): string {
    return pki.privateKeyToPem(privateKey);
  }

  publicKeyToPem(publicKey: pki.rsa.PublicKey): string {
    return pki.publicKeyToPem(publicKey);
  }

  createKeypair() {
    return pki.rsa.generateKeyPair();
  }

  importCertificate(certString: string) {
    this.certificate = pki.certificateFromPem(certString);
  }

  addCA(certString: string) {
    this.CAStore.addCertificate(certString);
  }

  loadMetadata(): void {
    if (this.pkiFs) {
      // make the pkiPath directory
      this.pkiFs.mkdirSync(this.pkiPath, { recursive: true });

      // load root keypair and certificate
      const rootKeypairPath = path.join(this.pkiPath, 'root_keypair');
      const rootCertificatePath = path.join(this.pkiPath, 'root_certificate');
      if (this.pkiFs.existsSync(rootKeypairPath) && this.pkiFs.existsSync(rootCertificatePath)) {
        this.rootKeypair = this.jsonToKeyPair(this.pkiFs.readFileSync(rootKeypairPath).toString());
        this.rootCertificate = pki.certificateFromPem(this.pkiFs.readFileSync(rootCertificatePath).toString());
      } else {
        // create the keypair and cert if it doesn't exist
        const tlsCredentials = this.createTLSCredentials(undefined, true);
        this.rootKeypair = {
          privateKey: pki.privateKeyFromPem(tlsCredentials.keypair.private),
          publicKey: pki.publicKeyFromPem(tlsCredentials.keypair.public),
        };
        this.rootCertificate = pki.certificateFromPem(tlsCredentials.certificate);
      }

      // load keypair and certificate
      const keypairPath = path.join(this.pkiPath, 'keypair');
      const certificatePath = path.join(this.pkiPath, 'certificate');
      if (this.pkiFs.existsSync(keypairPath) && this.pkiFs.existsSync(certificatePath)) {
        this.keypair = this.jsonToKeyPair(this.pkiFs.readFileSync(keypairPath).toString());
        this.certificate = pki.certificateFromPem(this.pkiFs.readFileSync(certificatePath).toString());
      } else {
        // create the keypair and cert if it doesn't exist
        const tlsCredentials = this.createTLSCredentials(undefined, false);
        this.keypair = {
          privateKey: pki.privateKeyFromPem(tlsCredentials.keypair.private),
          publicKey: pki.publicKeyFromPem(tlsCredentials.keypair.public),
        };
        this.certificate = pki.certificateFromPem(tlsCredentials.certificate);
      }

      // load certificate chain
      const certificateChainPath = path.join(this.pkiPath, 'certificate_chain');
      if (this.pkiFs.existsSync(certificateChainPath)) {
        this.certificateChain = JSON.parse(this.pkiFs.readFileSync(certificateChainPath).toString()).map((s: string) =>
          pki.certificateFromPem(s),
        );
      } else {
        // create the certificate chain if it doesn't exist
        this.certificateChain = [this.rootCertificate];
      }

      // CA store
      const parsedCertificates: pki.Certificate[] = [];
      const caStorePath = path.join(this.pkiPath, 'ca_store_certificates');
      if (this.pkiFs.existsSync(caStorePath)) {
        const certificates: string[] = JSON.parse(this.pkiFs.readFileSync(caStorePath).toString());
        parsedCertificates.push(...certificates.map((c) => pki.certificateFromPem(c)));
      }
      this.CAStore = pki.createCaStore(parsedCertificates);

      // this is a little recursive but necessary since we initialize all the variables if they are empty in this method
      this.writeMetadata();
    }
  }

  private writeMetadata(): void {
    if (this.pkiFs) {
      // write keypairs
      this.pkiFs.writeFileSync(path.join(this.pkiPath, 'keypair'), Buffer.from(this.keyPairToJSON(this.keypair)));
      this.pkiFs.writeFileSync(
        path.join(this.pkiPath, 'root_keypair'),
        Buffer.from(this.keyPairToJSON(this.rootKeypair)),
      );

      // write certificates
      if (this.certificate) {
        this.pkiFs.writeFileSync(
          path.join(this.pkiPath, 'certificate'),
          Buffer.from(pki.certificateToPem(this.certificate)),
        );
      }
      this.pkiFs.writeFileSync(path.join(this.pkiPath, 'root_certificate'), Buffer.from(this.RootCert));
      this.pkiFs.writeFileSync(
        path.join(this.pkiPath, 'certificate_chain'),
        Buffer.from(JSON.stringify(this.CertChain)),
      );

      // write ca store
      const certsJson = JSON.stringify(this.CAStore.listAllCertificates().map((c) => pki.certificateToPem(c)));
      this.pkiFs.writeFileSync(path.join(this.pkiPath, 'ca_store_certificates'), certsJson);
    }
  }

  private keyPairToJSON(keypair: pki.rsa.KeyPair): string {
    const obj = {
      privateKey: pki.privateKeyToPem(keypair.privateKey),
      publicKey: pki.publicKeyToPem(keypair.publicKey),
    };
    return JSON.stringify(obj);
  }

  private jsonToKeyPair(json: string): pki.rsa.KeyPair {
    const obj = JSON.parse(json);
    return {
      privateKey: pki.privateKeyFromPem(obj.privateKey),
      publicKey: pki.publicKeyFromPem(obj.publicKey),
    };
  }
}

export default PublicKeyInfrastructure;
export { TLSCredentials };
