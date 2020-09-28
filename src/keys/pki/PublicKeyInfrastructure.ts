import fs from 'fs';
import path from 'path';
import { pki } from 'node-forge';
import { peerInterface } from '../../../proto/js/Peer';

type TLSCredentials = { privateKey: string; certificate: string; rootCertificate: string };
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
  private certificate?: pki.Certificate;

  public get CACertificates(): string {
    return this.CAStore.listAllCertificates()
      .map((c) => pki.certificateToPem(c))
      .join('\n');
  }

  public get TLSClientCredentials(): TLSCredentials | undefined {
    if (this.certificate) {
      return {
        privateKey: pki.privateKeyToPem(this.keypair.privateKey),
        certificate: pki.certificateToPem(this.certificate),
        rootCertificate: this.CACertificates,
      };
    } else {
      return undefined;
    }
  }

  public get TLSServerCredentials(): TLSCredentials | undefined {
    if (this.certificate) {
      return {
        privateKey: pki.privateKeyToPem(this.keypair.privateKey),
        certificate: pki.certificateToPem(this.certificate),
        rootCertificate: this.CACertificates,
      };
    } else {
      return undefined;
    }
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
    return this.certificateChain.map(c => pki.certificateToPem(c))
  }

  constructor(polykeyPath: string, fileSystem: typeof fs) {
    this.commonName = process.env.PK_HOST ?? 'localhost';
    this.pkiPath = path.join(polykeyPath, '.pki');

    this.CAStore = pki.createCaStore()
    this.pkiFs = fileSystem;
    this.loadMetadata();
  }

  async handleGRPCRequest(request: Uint8Array): Promise<Uint8Array> {
    const { type, subMessage } = peerInterface.CAMessage.decodeDelimited(request);
    let response: Uint8Array;
    switch (type) {
      case peerInterface.CAMessageType.ROOT_CERT:
        response = Buffer.from(this.RootCert)
        break;
      case peerInterface.CAMessageType.REQUEST_CERT:
        response = Buffer.from(this.handleCSR(subMessage.toString()))
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

  // private createCACertificate(
  createCACertificate(organizationName: string = 'MatrixAI') {
    const certificate = pki.createCertificate();
    certificate.publicKey = this.rootKeypair.publicKey;
    certificate.serialNumber = '01';
    certificate.validity.notBefore = new Date();
    certificate.validity.notAfter = new Date();
    certificate.validity.notAfter.setMonth(certificate.validity.notBefore.getMonth() + 3);

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
        name: 'subjectKeyIdentifier',
      },
    ]);

    certificate.sign(this.rootKeypair.privateKey);

    return certificate;
  }

  createKeypair() {
    return pki.rsa.generateKeyPair()
  }

  privateKeyToPem(privateKey: pki.rsa.PrivateKey): string {
    return pki.privateKeyToPem(privateKey)
  }

  publicKeyToPem(publicKey: pki.rsa.PublicKey): string {
    return pki.publicKeyToPem(publicKey)
  }

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
      }
    ]);
    // set (optional) attributes
    (<any>csr).setAttributes([
      {
        name: 'challengePassword',
        value: 'password',
      },
    ]);

    if (keypair) {
      csr.sign(keypair.privateKey);
    } else {
      csr.sign(this.keypair.privateKey);
    }

    return pki.certificationRequestToPem(csr);
  }

  createAgentServerCredentials() {
    const keypair = pki.rsa.generateKeyPair();
    // create a certification request (CSR)
    const csr = pki.createCertificationRequest();

    csr.serialNumber = '01';

    csr.publicKey = keypair.publicKey;
    csr.setSubject([
      {
        name: 'commonName',
        value: 'localhost',
      },
    ]);
    // set (optional) attributes
    (<any>csr).setAttributes([
      {
        name: 'challengePassword',
        value: 'password',
      },
    ]);

    csr.sign(keypair.privateKey);

    const csrPem = pki.certificationRequestToPem(csr);
    const cert = this.handleCSR(csrPem);

    return {
      serverCert: cert,
      serverKeyPair: {
        private: pki.privateKeyToPem(keypair.privateKey),
        public: pki.publicKeyToPem(keypair.publicKey),
      },
    };
  }

  createAgentClientCredentials() {
    const keypair = pki.rsa.generateKeyPair();
    // create a certification request (CSR)
    const csr = pki.createCertificationRequest();

    csr.serialNumber = '01';

    csr.publicKey = keypair.publicKey;
    csr.setSubject([
      {
        name: 'commonName',
        value: 'localhost',
      }
    ]);
    // set (optional) attributes
    (<any>csr).setAttributes([
      {
        name: 'challengePassword',
        value: 'password',
      },
    ]);

    csr.sign(keypair.privateKey);

    const csrPem = pki.certificationRequestToPem(csr);
    const cert = this.handleCSR(csrPem);

    return {
      clientCert: cert,
      clientKeyPair: {
        private: pki.privateKeyToPem(keypair.privateKey),
        public: pki.publicKeyToPem(keypair.publicKey),
      },
    };
  }

  importCertificate(certString: string) {
    this.certificate = pki.certificateFromPem(certString);
  }

  addCA(certString: string) {
    this.CAStore.addCertificate(certString);
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
      ...(csr.extensions ?? []),
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
        name: 'subjectKeyIdentifier',
      },
    ]);

    // sign certificate
    certificate.sign(this.rootKeypair.privateKey);

    // return certificate in pem form
    return pki.certificateToPem(certificate);
  }

  // ===== Helper methods ===== //
  loadMetadata(): void {
    if (this.pkiFs) {
      // make the pkiPath directory
      this.pkiFs.mkdirSync(this.pkiPath, { recursive: true });

      // load keypair
      const keypairPath = path.join(this.pkiPath, 'keypair');
      if (this.pkiFs.existsSync(keypairPath)) {
        this.keypair = this.jsonToKeyPair(this.pkiFs.readFileSync(keypairPath).toString());
      } else {
        // create the keypair if it doesn't exist
        this.keypair = pki.rsa.generateKeyPair();
      }

      // load root keypair
      const rootKeypairPath = path.join(this.pkiPath, 'root_keypair');
      if (this.pkiFs.existsSync(rootKeypairPath)) {
        this.rootKeypair = this.jsonToKeyPair(this.pkiFs.readFileSync(rootKeypairPath).toString());
      } else {
        // create the keypair if it doesn't exist
        this.rootKeypair = pki.rsa.generateKeyPair();
      }

      // load certificate
      const certificatePath = path.join(this.pkiPath, 'certificate');
      if (this.pkiFs.existsSync(certificatePath)) {
        this.certificate = pki.certificateFromPem(this.pkiFs.readFileSync(certificatePath).toString());
      }

      // load root certificate
      const rootCertificatePath = path.join(this.pkiPath, 'root_certificate');
      if (this.pkiFs.existsSync(rootCertificatePath)) {
        this.rootCertificate = pki.certificateFromPem(this.pkiFs.readFileSync(rootCertificatePath).toString());
      } else {
        // create the certificate if it doesn't exist
        this.rootCertificate = this.createCACertificate();
      }
      // load certificate chain
      const certificateChainPath = path.join(this.pkiPath, 'certificate_chain');
      if (this.pkiFs.existsSync(certificateChainPath)) {
        this.certificateChain = JSON.parse(this.pkiFs.readFileSync(certificateChainPath).toString())
          .map((s: string) => pki.certificateFromPem(s))
      } else {
        // create the certificate chain if it doesn't exist
        this.certificateChain = [this.rootCertificate]
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
      this.pkiFs.writeFileSync(
        path.join(this.pkiPath, 'root_certificate'),
        Buffer.from(this.RootCert),
      );
      this.pkiFs.writeFileSync(
        path.join(this.pkiPath, 'certificate_chain'),
        Buffer.from(JSON.stringify(this.CertChain)),
      );

      // write ca store
      const certsJson = JSON.stringify(this.CAStore.listAllCertificates().map((c) => pki.certificateToPem(c)));
      this.pkiFs.writeFileSync(path.join(this.pkiPath, 'ca_store_certificates'), certsJson);
    }
  }

  // === Helper Methods === //
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
