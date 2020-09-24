import os from 'os';
import fs from 'fs';
import http from 'https';
import kbpgp from 'kbpgp'
import { promisify } from 'util';
import { pki, md, tls } from 'node-forge';
import HttpApi from '../../../src/api/HttpApi';
import { randomString } from '../../../src/utils';
import { PeerInfo, Address } from '../../../src/Polykey';
import { TLSCredentials } from '../../../src/keys/pki/PublicKeyInfrastructure';

// this requires a client for convenience
// generate client with 'openapi-generator-cli generate -i ./openapi.yaml -g typescript-node -o ./tests/lib/api/client'
describe('HTTP API', () => {
  let tempDir: string
  let tlsCredentials: TLSCredentials
  let peerInfo: PeerInfo
  let api: HttpApi
  let accessToken: string

  let vaultSet: Set<string>
  let secretMap: Map<string, string>

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)
    tlsCredentials = createTLSCredentials()
    peerInfo = new PeerInfo(
      await generatePublicKey()
    )

    // initialize data sets
    vaultSet = new Set()
    secretMap = new Map()
    secretMap.set('secret1', 'secret 1 content')

    api = new HttpApi(
      (apiAddress: Address) => { peerInfo.apiAddress = apiAddress; },
      (csr: string) => csr,
      () => tlsCredentials.rootCertificate,
      () => [tlsCredentials.rootCertificate],
      () => tlsCredentials,
      () => Array.from(vaultSet.keys()),
      async (vaultName: string) => { vaultSet.add(vaultName) },
      async (vaultName: string) => { vaultSet.delete(vaultName); },
      (vaultName: string) => Array.from(secretMap.entries()).map((e) => e[0]),
      (vaultName: string, secretName: string) => secretMap.get(secretName)!,
      async (vaultName: string, secretName: string, secretContent: string) => { secretMap.set(secretName, secretContent); return true },
      async (vaultName: string, secretName: string) => { return secretMap.delete(secretName) }
    )
    await api.start()
    accessToken = api.newOAuthToken(['admin'])
  })

  afterEach(() => {
    fs.rmdirSync(tempDir, { recursive: true })
  })

  afterEach(() => {
    fs.rmdirSync(tempDir, { recursive: true })
  })

  test('can get root certificate', async () => {
    const response = await makeRequest('GET', '/ca/root_certificate')
    expect(response).toEqual(tlsCredentials.rootCertificate)
  })

  test('can get certificate chain', async () => {
    const response = await makeRequest('GET', '/ca/certificate_chain')
    expect(response).toEqual([tlsCredentials.rootCertificate])
  })

  test('can request certificate', async () => {
    const csr = 'another certificate signing request'
    const response = await makeRequest('POST', '/ca/certificate_signing_request', csr)
    expect(response).toEqual(csr)
  })

  test('can get vault list', async () => {
    const response = await makeRequest('GET', '/vaults')
    expect(response).toEqual(Array.from(vaultSet.keys()))
  })

  test('can delete vault', async () => {
    await makeRequest('DELETE', '/vaults/vault1')
    const response = await makeRequest('GET', '/vaults')
    expect(response).toEqual([])
  })

  test('can create new vault', async () => {
    await makeRequest('POST', '/vaults/vault2')
    const response = await makeRequest('GET', '/vaults')
    expect(response).toContainEqual('vault2')
  })

  test('can get secret list', async () => {
    const response = await makeRequest('GET', '/vaults/vault1')
    const expectedSecretList = Array.from(secretMap.entries()).map((e) => e[0])
    expect(response).toEqual(expectedSecretList)
  })

  test('can get secret content', async () => {
    const response = await makeRequest('GET', '/secrets/vault1/secret1')
    const expectedSecretContent = secretMap.get('secret1')
    expect(response).toEqual(expectedSecretContent)
  })

  test('can add new secret', async () => {
    const vaultName = 'vault1'
    const secretName = 'secret2'
    const secretContent = 'new secret content'

    await makeRequest('POST', `/secrets/${vaultName}/${secretName}`, secretContent)
    const response = await makeRequest('GET', `/secrets/${vaultName}/${secretName}`)
    expect(response).toEqual(secretContent)
  })

  test('can delete secret', async () => {
    const vaultName = 'vault1'
    const secretName = 'secret1'

    await makeRequest('DELETE', `/secrets/${vaultName}/${secretName}`)
    const response = await makeRequest('GET', '/vaults/vault1')
    expect(response).not.toContainEqual(secretName)
  })

  // === Help Methods === //
  const generatePublicKey = async () => {
    // Define options
    const flags = kbpgp['const'].openpgp;
    const params = {
      userid: `John Smith <john.smith@email.com>`,
      primary: {
        nbits: 1024,
        flags: flags.certify_keys | flags.sign_data | flags.auth | flags.encrypt_comm | flags.encrypt_storage,
        expire_in: 0, // never expire
      },
      subkeys: [],
    };

    const identity = await promisify(kbpgp.KeyManager.generate)(params);
    await promisify(identity.sign.bind(identity))({});

    // Export pub key first
    const publicKey = await promisify(identity.export_pgp_public.bind(identity))({});

    // Resolve to parent promise
    return <string>publicKey
  }

  const makeRequest = async (method: string, path: string, body?: Object | string): Promise<any> => {
    return await new Promise((resolve, reject) => {
      const headers = {}
      headers['Authorization'] = `Bearer ${accessToken}`
      if (body) {
        headers['Content-Type'] = (typeof body === 'string') ? 'text/plain' : 'application/json'
      }
      const options: http.RequestOptions = {
        hostname: peerInfo?.apiAddress?.host,
        port: peerInfo?.apiAddress?.port,
        path,
        method,
        ca: [tlsCredentials.rootCertificate],
        headers
      }

      const req = http.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (data) => {
          try {
            resolve(JSON.parse(data))
          } catch (error) {
            reject(data)
          }
        });
        res.on('error', (err) => {
          reject(err)
        })
        res.on('end', () => {
          resolve()
        })
      });
      req.on('error', (e) => {
        reject(e)
      });
      if (body) {
        if (typeof body === 'string') {
          req.write(body)
        } else {
          req.write(JSON.stringify(body))
        }
      }
      req.end();
    })
  }

  const createTLSCredentials = () => {
    const keypair = pki.rsa.generateKeyPair();
    const certificate = pki.createCertificate();
    certificate.publicKey = keypair.publicKey;
    certificate.serialNumber = '01';
    certificate.validity.notBefore = new Date();
    certificate.validity.notAfter = new Date();
    certificate.validity.notAfter.setMonth(certificate.validity.notBefore.getMonth() + 3);

    const attrs = [
      {
        name: 'commonName',
        value: 'localhost',
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


    // sign certificate
    certificate.sign(keypair.privateKey, md.sha512.create());

    const certPem = pki.certificateToPem(certificate)
    return {
      rootCertificate: certPem,
      certificate: certPem,
      keypair: {
        private: pki.privateKeyToPem(keypair.privateKey),
        public: pki.publicKeyToPem(keypair.publicKey),
      },
    };
  }
})
