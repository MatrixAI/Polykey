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
The tests also rely on certificates being available in the tmp folder and environment variables set to a valid certificate authority run on the network somewhere. Please see `.env.example` for an example of these environment variables. Certificates can be generated with `./scripts/generate_ssl_certs.sh` as long as a step-ca is running on the specified url in `.env`.

Note: sometimes grpc-js can complain about the ssl certificates in `tmp/` with a non-descriptive error of "No connection established". Best way to solve this is to remove the certs, start the CA server and re-issue the certs with `./scripts/generate_ssl_certs.sh`.

# Command Line Interface (CLI)
Here is a demo of the CLI on [asciinema](https://asciinema.org/a/347434).

The PolyKey CLI exposes various git-style sub commands that can be used to manipulate the PolyKey node:
<pre style="white-space:pre !important; overflow-x:scroll !important">
Usage: polykey [options] [command]

Options:
  --version       output the current version
  -h, --help      display help for command

Commands:
  keys            manipulate keys
  secrets         manipulate secrets for a given vault
  vaults          manipulate vaults
  crypto          crypto operations
  agent           control the polykey agent
  help [command]  display help for command
</pre>

Usage looks like the following:
<pre style="white-space:pre !important; overflow-x:scroll !important">
polykey agent ...
polykey vaults ...

# Sub commands are heirarchical like so:
polykey vaults new ...
polykey secrets delete ...
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
pk secrets new -h
</pre>

## Agent
With this command you can manipulate the polykey agent including starting/restarting/stopping the agent, creating/importing a new polykey node, and getting the agent status.
<pre style="white-space:pre !important; overflow-x:scroll !important">
Usage: polykey agent [options] [command]

control the polykey agent

Options:
  -h, --help         display help for command

Commands:
  start [options]    start the agent
  restart [options]  restart the agent
  status             retrieve the status of the agent
  stop [options]     stop the agent
  list|ls [options]  list all the nodes controlled by the node
  create [options]   create a new polykey node
  load [options]     load an existing polykey node
  help [command]     display help for command
</pre>
Example  usage:
<pre style="white-space:pre !important; overflow-x:scroll !important">
# managing the polykey agent
pk agent stop
pk agent start
# restart the agent as a daemon
pk agent restart -d
pk agent status # agent status is 'online'

# create a new polykey node
pk agent create -k '~/NewPolykeyNode' -n 'John Smith' -e 'john@email.com' -p 'passphrase'

# load an existing node
pk agent load -k '~/NewPolykeyNode' -p 'passphrase'

# list the nodes managed by agent
pk agent list # ~/NewPolykeyNode
</pre>

Note: Polykey also provides the ability to set an environment variable, `KEYNODE_PATH`, instead of specifying the node path with `-k '~/NewPolykeyNode'`

## Keys
This command is used to interact with PolyKey's KeyManager. With this command you can generate new keys, list keys and more.
<pre style="white-space:pre !important; overflow-x:scroll !important">
Usage: polykey keys [options] [command]

manipulate keys

Options:
  -h, --help         display help for command

Commands:
  new [options]      derive a new symmetric key
  delete [options]   delete a symmetric key from the key manager
  list|ls [options]  list all symmetric keys in the keynode
  get [options]      get the contents of a specific symmetric key
  primary [options]  get the contents of the primary keypair
  help [command]     display help for command
</pre>
Example  usage:
<pre style="white-space:pre !important; overflow-x:scroll !important">
# create a new key
pk keys new -n 'NewKey' -p 'Key Passphrase'

# deleting an existing key
pk keys delete -n 'NewKey'

# list all existing keys
pk keys list # 'NewKey'

# list primary key with private key included
pk keys primary -p
# Public Key:
# -----BEGIN PGP PUBLIC KEY BLOCK-----
# ...
# -----END PGP PUBLIC KEY BLOCK-----
#
# Private Key:
# -----BEGIN PGP PRIVATE KEY BLOCK-----
# ...
# -----END PGP PRIVATE KEY BLOCK-----
</pre>

## Vaults
The vaults sub command lets you manipulate vaults, e.g. to list the existing vaults, add a new vault or destroy an old vault.
<pre style="white-space:pre !important; overflow-x:scroll !important">
Usage: polykey vaults [options] [command]

manipulate vaults

Options:
  -h, --help            display help for command

Commands:
  list|ls [options]     list all available vaults
  new [options]         create new vault(s)
  delete|del [options]  delete an existing vault
  help [command]        display help for command
</pre>

Example usage:
<pre style="white-space:pre !important; overflow-x:scroll !important">
# create a new vault
pk vaults add 'NewVault'

# list all existing vaults
pk vaults ls # 'NewVault'

# delete a vault
pk vaults delete 'NewVault'
</pre>

## Secrets
The secrets sub command lets you manipulate secrets in a specific vault such as adding new secrets, removing old secrets or modifying existing secrets. In addition, polykey can inject variables into a modified environment with the `pk secrets env` command.
<pre style="white-space:pre !important; overflow-x:scroll !important">
Usage: polykey secrets [options] [command]

manipulate secrets for a given vault

Options:
  -h, --help            display help for command

Commands:
  list|ls [options]     list all available secrets for a given vault
  new [options]         create a secret within a given vault, specify an secret
                        path with '&lt;vaultName>:&lt;secretName>'
  update [options]      update a secret within a given vault, specify an secret
                        path with '&lt;vaultName>:&lt;secretName>'
  delete|del [options]  delete a secret from a given vault, specify an secret
                        path with '&lt;vaultName>:&lt;secretName>'
  get [options]         retrieve a secret from a given vault, specify an secret
                        path with '&lt;vaultName>:&lt;secretName>'
  env [options]         run a modified environment with injected secrets,
                        specify an secret path with '&lt;vaultName>:&lt;secretName>'
  help [command]        display help for command
</pre>

Example usage:
<pre style="white-space:pre !important; overflow-x:scroll !important">
# add a new secret
pk secrets add -f '~/SeretFile' NewVault:NewSecret

# list names of all secrets within specific vaults
pk secrets list NewVault AnotherVault
# 1. NewVault:NewSecret
# 2. AnotherVault:AnotherSecret

# delete secrets
pk secrets delete NewVault:NewSecret AnotherVault:AnotherSecret

# retreive a secret
pk secrets get NewVault:NewSecret
# &lt;NewSecretContent>

# enter a modified environment with injected secrets
pk secrets env NewVault:NewSecret=SECRET_1 AnotherVault:AnotherSecret=SECRET_2

# enter a modified environment with injected secrets and execute a command
pk secrets env NewVault:NewSecret=SECRET_1 --command="echo $SECRET_1"
</pre>

## Crypto
The crypto sub command allows you to perform asymmetric cryptography operations (sign/encrypt/verify/decrypt) on files using the loaded public/prvate keypair.

<pre style="white-space:pre !important; overflow-x:scroll !important">
Usage: polykey crypto [options] [command]

crypto operations

Options:
  -h, --help         display help for command

Commands:
  verify [options]   verification operations
  sign [options]     signing operations [files]
  encrypt [options]  encryption operations
  decrypt [options]  decryption operations
  help [command]     display help for command
</pre>

Example usage:
<pre style="white-space:pre !important; overflow-x:scroll !important">
# sign a file and store as a detached signature
pk crypto sign ./file # creates ./file.sig

# verify a file
pk crypto verify -f ./file.sig

# encrypt a file
pk crypto encrypt ./file

# decrypt a file
pk crypto decrypt ./file
</pre>

## Verbosity
TODO: explain verbosity levels when it is implemented

# Build
## Proto Files
All `.proto` files are stored in the the `proto` directory. JavaScript and type definition files are build using the following command:

```
npm run build:proto
```
