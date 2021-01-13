// import http from 'https'
// import { PeerInfoReadOnly } from "../../PeerInfo";
// import { JSONMapReplacer, JSONMapReviver } from '../../../utils';
// import IdentityProviderPlugin, { PolykeyProofType } from "../IdentityProvider";

// const GithubIdentityProvider: IdentityProviderPlugin = {
//   name: 'github',
//   determineKeynodes: async (identifier: string) => {
//     const lookupUrl = `https://api.github.com/users/${identifier}/gists`
//     const response = await new Promise<string>((resolve, reject) => {
//       http.get(lookupUrl, (res) => {
//         const buffer: Buffer[] = []
//         res.on('data', (data: Buffer) => buffer.push(data))
//         res.on('error', (err) => reject(err))
//         res.on('end', () => resolve(Buffer.concat(buffer).toString()))
//       })
//     })

//     const json = JSON.parse(response)
//     return json
//   },
//   proveKeynode: async (identifier: string, peerInfo: PeerInfoReadOnly) => {
//     return {
//       type: PolykeyProofType.MANUAL,
//       proof: JSON.stringify(peerInfoStringList, JSONMapReplacer),
//       instructions: `sign this string and place it on your public folder under https://${identifier}.keybase.pub/polykey.proof`
//     }
//   }
// };

// export default GithubIdentityProvider
