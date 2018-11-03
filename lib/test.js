import kbpgp from 'kbpgp';

// a keymanager
// everything can have a keymanager
// since we have to consider our own root key
// which we can change
// or we use also use to manage other keys

// console.log('hello');
// console.log(pgpConstants);


// time to test generate
// kbpgp.const are the constants
// ok I see

const pgpConstants = kbpgp.const.openpgp;

// primary option
// find out what each flag is doing
// we create a subkey for signing and encryption

const options = {
  userid: 'Roger Qiu <roger@matrix.ai>',
  primary: {
    nbits: 4096,
    flags: (pgpConstants.certify_keys |
            pgpConstants.sign_data |
            pgpConstants.auth |
            pgpConstants.encrypt_comm |
            pgpConstants.encrypt_storage),
    expire_in: 0
  },
  subkeys: [
    {
      nbits: 2048,
      flags: pgpConstants.sign_data,
      expire_in: 86400 * 365 * 8 // 8 years
    },
    {
      nbits: 2048,
      flags: pgpConstants.encrypt_comm | pgpConstants.encrypt_storage,
      expires_in: 86400 * 365 * 2 // 2 years
    }
  ]
};

// so our key manager will need to the expiry issue
// and if we are going to expire it, the keys must be rotated
// that's all it is
// if we rotate keys though, how do we preserve sharing?

// it's an async API as well
// which makes sense
// it makes sense this this thing will be async
// due to the performance
// and also due to how it works against the UI later
// we need to be capable of doing multiple operations

// can we apply async/await to this?
// oh no promises
// you have to wrap it into a promise like API

// kbpgp.KeyManager.generate(options, (err, alice) => {

//   // so generate generates a what exactly?
//   // something associated with a user

//   // this takes 30 seconds
//   if (!err) {

//     // if there's no error
//     // then then we "sign" the subkeys
//     // why do we need to do this?

//     // sign alice's subkeys
//     alice.sign({}, (err) => {

//       console.log(alice);

//       alice.export_pgp_private(
//         { passphrase: 'booyeah!' },
//         (err, pgp_private) => {
//           // this produces a the ascii armoured version
//           // it has a Version and Comment headers
//           console.log('private key', pgp_private);
//         }
//       );

//       alice.export_pgp_public(
//         {},
//         (err, pgp_public) => {
//           console.log('public key', pgp_public);
//         }
//       );

//     })
//   }

//   console.log(alice);

// });


// alternatively we use a default options
kbpgp.KeyManager.generate_rsa({ userid: "Roger Qiu <roger.qiu@matrix.ai>"}, (err, charlie) => {

  charlie.sign({}, (err) => {
    console.log('done');

    console.log(charlie);


  });

  console.log(charlie.sign.toString());

});

// RSA key generation take awhile, the function can take a ASP
// that has a process hook function that gets called about the progress
// so we can use this to show work and also possibily have a cancel operation

// the subsequent result will be null

// note that the `alice` and `charlie` are "instances" of KeyManager class
// so every "user" is a key manager, because, every user can be multiple keys
// ok I see this now, so our key manager has to deal with MANY keys...
// so each key would be its own key manager, although we should abstract the concept of a user...
// although we don't have users, except for pub/priv key pairs
// so we can say instead, it's an identity that we are sharing with

// to sign something you need keymanager to contain the private key
// ok so every keymanager can be just containing the public key, or the public and private keypair
// private -> allows signing and decryption
// public -> allows encryption

// signing a message means that you're stamping the message to be authentic from your identity
// what does signing the keys mean?

// importing a key means that you could multiple subkeys more than just 2

// decryption of verifying can be more complicated because you don't know which keymanager to use

// we don't actually use this for encrypting and decrypting messages once we are at the vault sharing level
// at that point symmetric key is used...
// although there's a difference between the initiation of the sharing and the sharing once both parties have a copy of the same vault, and they have not diverged
// we can check if they have diverged if the version history is different, in that case, it has to be considered a completely different vault

// subkeys are used for signing or encryption
// so we always get subkeys
// one for signing and one for encryption
// there's also the master key that gets generated as well
// still why do we sign the instance afterwards

// each subkey has its own keypair as well

// when you sign your own key
// you are saying "I have verified the identity of this person to the extent which I put in the signing. I believe this key belongs to the name in it and the email listed also belongs to that person".
// KeyNodes don't have emails though
// or we can create custom emails from a custom domain based on the P2P system
// you don't have to put email in there, just any identifiable construct can be put there
// ok so a unique identity attribute means it's a snowflake identity generation
// we want to generate a unique ID without coordination
// requires that
// you have to use use timestamp and a unique identifier for yourself
// so an initial coordination on what those seed ids are
// we don't want to use flake ids if our ids are intended to be unpreditable
// but who cares, this is the unique identifier for a keynode, it's not some secret
// flake uses the mac address?
// mac address are issued by IEEE and apparently it's unique, what if multiple polykeys are running on the same system, then we add in the PID as well right? I am not sure about this
// surely the public key cannot be the same
// even if we make the ID unique, there's always a chance of key generation collision as well
// remember we want to use the public key as the ID, no point in having a separate system acting as the ID
// in which case randomly generated polykey keynodes need no special name
// we could generate a random name as sequence of funny words (but it's really just a temporary tag)
// use bip39 mnemonic code
// could use bip39 for this as well
// bip39 is kind of long, and they don't really function as names
// something like random petnames would be better, and we would want to not have to load a huge thing into memory, but instead stream it from disk whenver we want to use it
