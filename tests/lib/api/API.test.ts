import os from 'os';
import fs from 'fs';
import http from 'http';
import kbpgp from 'kbpgp';
import { promisify } from 'util';
import HttpApi from '../../../src/api/HttpApi';
import { randomString } from '../../../src/utils';
import { PeerInfo, Address } from '../../../src/Polykey';

// this requires a client for convenience
// generate client with 'swagger-codegen generate -l typescript-fetch -i ./openapi.yaml -o ./tests/lib/api/client'
describe('HTTP API', () => {
  let tempDir: string
  let rootCertificate: string
  let peerInfo: PeerInfo
  let api: HttpApi

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)
    rootCertificate = 'some root certificate'
    peerInfo = new PeerInfo(
      await generatePublicKey()
    )

    api = new HttpApi(
      () => peerInfo,
      (apiAddress: Address) => { peerInfo.apiAddress = apiAddress },
      (csr: string) => csr,
      () => rootCertificate,
      () => [rootCertificate]
    )
    await api.start()
  })

  afterAll(() => {
    fs.rmdirSync(tempDir, { recursive: true })
  })

  const makeRequest = async (method: string, path: string, body?: any): Promise<any> => {
    return await new Promise((resolve, reject) => {
      const options: http.RequestOptions = {
        hostname: peerInfo?.apiAddress?.host,
        port: peerInfo?.apiAddress?.port,
        path,
        method,
        headers: { 'Content-Type': 'application/json' },
      };

      const req = http.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (data) => {
          try {
            resolve(JSON.parse(data))
          } catch (error) {
            reject(data)
          }
        });
      });
      req.on('error', (e) => {
        reject(e)
      });
      if (body) {
        req.write(JSON.stringify(body))
      }
      req.end();
    })
  }


  test('can get root certificate', async () => {
    const fetchedRootCertificate = await makeRequest('GET', '/ca/root_certificate')
    expect(fetchedRootCertificate.rootCert).toEqual(rootCertificate)
  })

  test('can get certificate chain', async () => {
    const fetchedCertificateChain = await makeRequest('GET', '/ca/certificate_chain')
    expect(fetchedCertificateChain).toEqual([rootCertificate])
  })

  test('can request certificate', async () => {
    const publicKey = await generatePublicKey()
    const csr = 'another certificate signing request'

    const csrBody = await makeRequest('POST', '/ca/certificate_signing_request', { publicKey, csr })

    expect(csrBody.publicKey).toEqual(peerInfo.publicKey)
    expect(csrBody.csr).toEqual(csr)
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
})
