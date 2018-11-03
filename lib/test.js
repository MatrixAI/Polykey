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

kbpgp.KeyManager.generate(options, (err, alice) => {

  // this takes 30 seconds

  console.log(alice);

});
