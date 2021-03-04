/* eslint-disable */
import { promisify } from 'util'
import NodeInfo from '../../../src/nodes/NodeInfo'

const kbpgp = require('kbpgp')

describe('NodeInfo class', () => {
  let nodeInfoA: NodeInfo

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
    nodeInfoA = new NodeInfo(
      mockPublicKey,
      'rootCertificate',
      '0.0.0.0:3298',
      '0.0.0.0:2356',
    )
  })

  test('can stringify and parse node info', async () => {
    const str = nodeInfoA.toStringB64()
    const nodeInfoParsed = NodeInfo.parseB64(str)
    expect(nodeInfoParsed).toEqual(nodeInfoA)
  })
})
