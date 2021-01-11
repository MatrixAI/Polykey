import http from 'https'
import PeerInfo from "../../PeerInfo";
import { JSONMapReplacer, JSONMapReviver } from '../../../utils';
import IdentityProviderPlugin, { PolykeyProofType } from "../IdentityProvider";

async function getKeybaseInfo(identifier: string): Promise<{ username: string, publicKey: string }> {
  const regex = /(?:@)([\w-]+)(?:\/)([\w-]+)/
  const matches = identifier.match(regex)
  if (!matches) {
    throw Error(`identifier must be in format '@<service>/<username>'`)
  }
  const [_, service, handle] = matches
  const lookupUrl = `https://keybase.io/_/api/1.0/user/lookup.json?${service}=${handle}`;

  const response = await new Promise<string>((resolve, reject) => {
    http.get(lookupUrl, (res) => {
      const buffer: Buffer[] = []
      res.on('data', (data: Buffer) => buffer.push(data))
      res.on('error', (err) => reject(err))
      res.on('end', () => resolve(Buffer.concat(buffer).toString()))
    })
  })

  const data = JSON.parse(response);

  const username: string = data.them[0].basics.username
  const publicKey: string = data.them[0].public_keys.primary.bundle;

  return { username, publicKey }
}

async function getKeynodeList(username: string, publicKey: string) {
  const polykeyProofUrl = `https://${username}.keybase.pub/polykey.proof`
  // get the polykey.proof from public folder
  const proof = await new Promise<string | null>((resolve, reject) => {
    http.get(polykeyProofUrl, (res) => {
      const buffer: Buffer[] = []
      res.on('data', (data: Buffer) => buffer.push(data))
      res.on('error', (err) => reject(err))
      res.on('end', () => {
        const data = Buffer.concat(buffer).toString()
        if (data == 'Not Found') {
          resolve(null)
        } else {
          resolve(data)
        }
      })
    })
  })

  if (!proof) {
    return []
  } else {
    // decode the list of polykey keys
    // default storage is as a map encoded in json
    const peerInfoStringList: Map<string, string> = JSON.parse(proof, JSONMapReviver)
    const peerInfoList: PeerInfo[] = []
    for (const [_, value] of peerInfoStringList.entries()) {
      peerInfoList.push(PeerInfo.parseB64(value))
    }

    return peerInfoList;
  }
}

const KeybaseDiscovery: IdentityProviderPlugin = {
  name: 'keybase',
  determineKeynodes: async (identifier: string) => {
    const { username, publicKey } = await getKeybaseInfo(identifier)

    return await getKeynodeList(username, publicKey)
  },
  proveKeynode: async (identifier: string, peerInfo: PeerInfo) => {
    const { username, publicKey } = await getKeybaseInfo(identifier)
    const peerInfoList = await getKeynodeList(username, publicKey)

    for (const p of peerInfoList) {
      if (p.id == peerInfo.id) {
        throw Error('peer info is already advertised')
      }
    }
    peerInfoList.push(peerInfo)
    const peerInfoStringList: Map<string, string> = new Map
    for (const p of peerInfoList) {
      peerInfoStringList.set(p.id, p.toStringB64())
    }

    return {
      type: PolykeyProofType.MANUAL,
      proof: JSON.stringify(peerInfoStringList, JSONMapReplacer),
      instructions: `sign this string and place it on your public folder under https://${identifier}.keybase.pub/polykey.proof`
    }
  }
};

export default KeybaseDiscovery
