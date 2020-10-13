import { promisify } from 'util'
import PeerInfo from '../../../src/peers/PeerInfo'

const kbpgp = require('kbpgp')

describe('PeerInfo class', () => {
  let peerInfoA: PeerInfo

  const generatePublicKey = async () => {
    // Define options
    const flags = kbpgp['const'].openpgp;
    const params = {
      userid: `John Smith <john.smith@email.com>`,
      ecc: true,
      primary: {
        nbits: 384,
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

  beforeAll(async () => {
    // generate a kbpgp keypair

    const mockPublicKey = await generatePublicKey()
    peerInfoA = new PeerInfo(
      mockPublicKey,
      'rootCertificate',
      '0.0.0.0:3298',
      '0.0.0.0:2356',
    )
  })

  test('can stringify and parse peer info', async () => {
    const str = peerInfoA.toStringB64()
    const peerInfoParsed = PeerInfo.parseB64(str)
    expect(peerInfoParsed).toEqual(peerInfoA)
  })
})
