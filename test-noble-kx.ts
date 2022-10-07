import * as ed from '@noble/ed25519';

async function main() {
  const alicePrivateKey = ed.utils.randomPrivateKey();
  const alicePublicKey = await ed.getPublicKey(alicePrivateKey);
  const alice = {
    private: alicePrivateKey,
    public: alicePublicKey,
  };

  const bobPrivateKey = ed.utils.randomPrivateKey();
  const bobPublicKey = await ed.getPublicKey(bobPrivateKey);
  const bob = {
    private: bobPrivateKey,
    public: bobPublicKey,
  };

  // Imagine Alice and Bob exchange public keys

  const aliceSharedSecret = await ed.getSharedSecret(
    alice.private,
    bob.public
  );

  const bobSharedSecret = await ed.getSharedSecret(
    bob.private,
    alice.public
  );

  for (let i = 0; i < aliceSharedSecret.byteLength; i++) {
    if (aliceSharedSecret[i] !== bobSharedSecret[i]) {
      console.log('Shared secrets are not equal');
    }
  }

  // The secrets are the same!

}

void main();
