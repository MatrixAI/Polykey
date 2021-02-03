import { PeerInfoReadOnly } from "../PeerInfo";

enum PolykeyProofType {
  AUTOMATIC,
  MANUAL,
}

// this interface defines the type of proof a
interface PolykeyProof {
  type: PolykeyProofType
  instructions: string
  proof: string
}

interface IdentityProviderPlugin {
  // name of provider
  name: string;
  // must return the PeerInfo(s) that the user has advertised on their account
  // the identifier can be any arbitrary identifying string (e.g. '@github/john-smith' or a phone number)
  determineKeynodes(identifier: string): Promise<PeerInfoReadOnly[]>;
  // this must either use the provider's API to post polykey proof of
  // this keynode or return instructions for the user to do so manually
  proveKeynode(identifier: string, peerInfo: PeerInfoReadOnly): Promise<PolykeyProof>
}

export default IdentityProviderPlugin
export {
  PolykeyProofType,
  PolykeyProof
}
