"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_forge_1 = __importDefault(require("node-forge"));
class PublicKeyInfrastructure {
    /**
     * Creates an X.509 certificate for transport layer security
     * @param nbits The number of bits for keypair generation
     * @param organizationName The name of the organization
     */
    static createX509Certificate(nbits = this.N_BITS, commonName = this.COMMON_NAME, organizationName = this.ORGANIZATION_NAME) {
        const pki = node_forge_1.default.pki;
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
                value: commonName
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
                    type: 7,
                    ip: '127.0.0.1'
                }
            }, {
                name: 'subjectKeyIdentifier'
            }]);
        // self-sign certificate
        cert.sign(keys.privateKey);
        // convert a Forge certificate to PEM
        const keyPem = pki.privateKeyToPem(keys.privateKey);
        const certPem = pki.certificateToPem(cert);
        return {
            keyPem,
            certPem
        };
    }
}
PublicKeyInfrastructure.N_BITS = 2048;
PublicKeyInfrastructure.COMMON_NAME = 'polykey';
PublicKeyInfrastructure.ORGANIZATION_NAME = 'MatrixAI';
exports.default = PublicKeyInfrastructure;
//# sourceMappingURL=PublicKeyInfrastructure.js.map