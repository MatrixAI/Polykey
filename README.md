# Polykey (library)
## Overview

js-polykey is the library used in the distributed secret sharing `PolyKey` app. You can find the actual application [here](https://github.com/matrixai/polykey).  A polykey node is comprised of one or many Vaults to store Secrets. These vaults are encrypted with keys derived from the master private key. Secrets always remain encrypted on disk and are only decrypted in memory. All you need to connect with and share secrets with another keynode on the same local area network is it's public key, poykey takes care of discovery. Once connected, you can securely share vaults with each other and polykey will ensure those vaults are synced.

PolyKey requires a public/private keypair for all crypto operations, this can be provided to a pre-initialized KeyManager instance before polykey is initialized or it can be generated (this is the default).

## Dependencies
The major dependencies of js-polykey are:
- [kbpgp](https://github.com/keybase/kbpgp) for all asymmetric cryptography.
- [EncryptedFS](https://github.com/MatrixAI/js-encryptedfs) for symmetric encryption within Vaults.
- [isomorphi-git](https://github.com/isomorphic-git/isomorphic-git) for version control within Vaults.

## KeyManager
This class is responsible for managing the public and private keys as well as any crypto operations using those keys. The symmetric vault keys are also managed by this instance.

The KeyManager is able to be loaded separately to the PolyKey main class and then passed into PolyKey. This is useful for loading the keypair prior to initializing PolyKey.
<pre style="white-space:pre !important; overflow-x:scroll !important">
// Initialize key manager first
const keyManager = new KeyManager()
await keyManager.loadKeyPair('./keys/private.key', './keys/public.key')

// Initialize polykey instance
const pk = new PolyKey(keyManager)
</pre>

### Key Generation
The key manager class can generate new symmetric keys using key derivation and the loaded private key
<pre style="white-space:pre !important; overflow-x:scroll !important">
const newKey = await keyManager.generateKey('secret passphrase')
</pre>

## Testing:
PolyKey  uses jest to test:
<pre style="white-space:pre !important; overflow-x:scroll !important">
jest
</pre>
# Command Line Interface (CLI)
The PolyKey CLI exposes various git-style sub commands that can be used to manipulate the PolyKey node:
<pre style="white-space:pre !important; overflow-x:scroll !important">
Commands:
  config [options]  configure polykey
  keymanager        manipulate the keymanager
  node              network operations on the current polykey node
  secrets           manipulate secrets for a given vault
  vaults            manipulate vaults
  crypto            crypto operations
  help [command]    display help for command
</pre>

Usage looks like the following:
<pre style="white-space:pre !important; overflow-x:scroll !important">
polykey node ...
polykey vaults ...

# Sub commands are heirarchical like so:
polykey vaults add ...
polykey secrets remove ...
</pre>

PolyKey also exposes a helpful alias, `pk`, to make typing out commands a little quicker:
<pre style="white-space:pre !important; overflow-x:scroll !important">
pk secrets ...
pk crypto ...
</pre>

If you ever get stuck, every sub command has a help flag:
<pre style="white-space:pre !important; overflow-x:scroll !important">
# Either one of -h or --help will do
pk -h
pk vaults --help
pk secrets add -h
</pre>

## Config
With this command you can manipulate the configuration of PolyKey including changing the password, importing new private and public keys and changing the path to polykey.
<pre style="white-space:pre !important; overflow-x:scroll !important">
Options:
  -pub, --public-key <publicKey>                   provide the path to an existing public key
  -priv, --private-key <privateKey>                provide the path to an existing private key
  -pass, --private-passphrase <privatePassphrase>  provide the passphrase to the private key
  -path, --polykey-path <polykeyPath>              provide the polykey path. defaults to ~/.polykey
  -v, --verbose                                    increase verbosity by one level
</pre>
Example  usage:
<pre style="white-space:pre !important; overflow-x:scroll !important">
# Change the location of PolyKey, perhaps to another node on the same computer
pk config --polykey-path='~/PolyKeyNode2'

# Import a new public key
pk config -pub ./keys/publicKey.txt
</pre>

You can also easily clear the config to start fresh:
<pre style="white-space:pre !important; overflow-x:scroll !important">
pk config clear
</pre>
If one of the required configuration parameters is missing from the config store, PolyKey will prompt you for it on the next command.

## KeyManager
This command is used to interact with PolyKey's KeyManager. With this command you can generate new keys, import keys and more.
TODO: add commands to interact with the keymanager
<pre style="white-space:pre !important; overflow-x:scroll !important">
Commands:
  derive [options]  manipulate the keymanager
</pre>

## Node
The node sub command lets you control the daemon responsible for network operations.
<pre style="white-space:pre !important; overflow-x:scroll !important">
Commands:
  start           start the polykey node
  stop            stop the polykey node
</pre>

TODO: add commands to interact with the node
<pre style="white-space:pre !important; overflow-x:scroll !important">
</pre>

## Vaults
The vaults sub command lets you manipulate vaults, e.g. to list the existing vaults, add a new vault or destroy an old vault.
<pre style="white-space:pre !important; overflow-x:scroll !important">
Commands:
  list|ls [options]  list all available vaults
  add                create new vault(s)
  remove [options]   destroy an existing vault
</pre>

Command examples:
<pre style="white-space:pre !important; overflow-x:scroll !important">
# List names of all existing vaults
pk vaults ls

# Create a new vault called 'SecureVault'
pk vaults add 'SecureVault'

# Remove 'SecureVault'
pk vaults remove --vault-name='SecureVault'

# Remove all vaults at once
pk vaults remove -a
</pre>

## Secrets
The secrets sub command lets you manipulate secrets in a specific vault including to add new secrets, remove old secrets and modify existing secrets.
<pre style="white-space:pre !important; overflow-x:scroll !important">
Commands:
  list|ls [options]  list all available secrets for a given vault
  add [options]      add a secret to a given vault
  remove [options]   remove a secret from a given vault
</pre>

Command examples:
<pre style="white-space:pre !important; overflow-x:scroll !important">
# List names of all secrets within 'SecureVault'
pk secrets list --vault-name='SecureVault'

# Add a new secret named 'Secret' to 'SecureVault
pk secrets add --vault-name='SecureVault' --secret-name='Secret'

# Remove 'Secret' from 'SecureVault'
pk secrets remove --vault-name='SecureVault' --secret-name='Secret'
</pre>

## Crypto
The crypto sub command allows you to perform asymmetric cryptography operations (sign/encrypt/verify/decrypt) on files using the loaded public/prvate keypair.
PolyKey signs and verifies files using a [detached signature](https://en.wikipedia.org/wiki/Detached_signature)
TODO: add encryption and decryption
```
Commands:
  sign [options]    verification operations
  verify [options]  signing operations
```

Command examples:
```
pk crypto sign ./file --signing-key='./my_priv_key' --key-passphrase='password'

# If no signing key is provided, polykey will use the loaded private key
pk crypto sign ./file


pk crypto verify ./signed_file --verifying-key='./my_pub_key' --detach-sig='./signed_file.sig'

# If no  verifying key is provided, polykey will use the loaded public key
pk crypto verify ./signed_file --detach-sig='./signed_file.sig'
```

## Verbosity
TODO: explain verbosity levels when it is implemented
