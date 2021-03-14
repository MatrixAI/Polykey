# Polykey (library)
## Overview

js-polykey is the library used in the distributed secret sharing `PolyKey` app. You can find the actual application [here](https://github.com/matrixai/polykey).  A polykey node is comprised of one or many Vaults to store Secrets. These vaults are encrypted with keys derived from the master private key. Secrets always remain encrypted on disk and are only decrypted in memory. All you need to connect with and share secrets with another keynode on the same local area network is it's public key, poykey takes care of discovery. Once connected, you can securely share vaults with each other and polykey will ensure those vaults are synced.

PolyKey requires a public/private keypair for all crypto operations, this can be provided to a pre-initialized KeyManager instance before polykey is initialized or it can be generated (this is the default).

## Class Dependencies
In order to better understand how the pieces of PolyKey fit together, use this dependency DAG as reference:
<img src="./media/dependencies.png">

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
  nodes           node operations
  gestalts        gestalt operations
  social          social commands
  crypto          crypto operations
  agent           control the polykey agent
  ca              certificate authority operations
  oauth           http oauth2 operations
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
  status [options]     retrieve the status of the agent
  start [options]      start the agent
  restart [options]    restart the agent
  stop [options]       stop the agent
  bootstrap [options]  initialize a new polykey node
  lock [options]       lock polykey
  unlock [options]     unlock polykey
  help [command]       display help for command
</pre>
Example  usage:
<pre style="white-space:pre !important; overflow-x:scroll !important">
# managing the polykey agent
pk agent stop
pk agent start
# restart the agent as a background process
pk agent restart -b
pk agent status # agent status is 'online'

# create a new polykey node
pk agent bootstrap -np '~/NewPolykeyNode' -n 'John Smith' -pp 'passphrase'

# load an existing node
pk agent start -np '~/NewPolykeyNode' -pp 'passphrase'

</pre>

Note: Polykey also provides the ability to set an environment variable, `PK_PATH`, instead of specifying the node path with `-np '~/NewPolykeyNode'`

## Keys
This command is used to interact with PolyKey's KeyManager. With this command you can generate new keys, list keys and more.
<pre style="white-space:pre !important; overflow-x:scroll !important">
Usage: polykey keys [options] [command]

manipulate keys

Options:
  -h, --help         display help for command

Commands:
  new [options]      derive a new symmetric key
  keypair [options]  derive a new keypair for use in another keynode
  get [options]      get the contents of a specific symmetric key
  delete [options]   delete a symmetric key from the key manager
  list|ls [options]  list all symmetric keys in the keynode
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
pk keys primary -pk
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
  scan [options]        scan a known node for accessible vaults
  new [options]         create a new vault
  rename [options]      rename an existing vault
  stats [options]       get the stats for a vault
  pull [options]        pull a vault from a node
  share [options]       pull a vault from a node
  unshare [options]     pull a vault from a node
  delete|del [options]  delete an existing vault
  help [command]        display help for command
</pre>

Example usage:
<pre style="white-space:pre !important; overflow-x:scroll !important">
# create a new vault
pk vaults new -vn 'NewVault'

# list all existing vaults
pk vaults ls # 'NewVault'

# delete a vault
pk vaults delete -vn 'NewVault'
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
  new [options]         create a secret within a given vault, specify a secret
                        path with '<vaultName>:<secretPath>'
  dir [options]         create a secret within a given vault, specify a secret
                        path with '<vaultName>:<secretPath>'
  update [options]      update a secret within a given vault, specify a secret
                        path with '<vaultName>:<secretPath>'
  edit|ed [options]     edit a secret with the default system editor, specify a
                        secret path with '<vaultName>:<secretPath>'
  delete|del [options]  delete a secret or sub directory from a given vault,
                        specify a secret path with
                        '<vaultName>:<secretPath|subDirectoryPath>'
  get [options]         retrieve a secret from a given vault, specify a secret
                        path with '<vaultName>:<secretPath>'
  env [options]         run a modified environment with injected secrets,
                        specify a secret path with
                        '<vaultName>:<secretPath>[=<variableName>]'
  help [command]        display help for command

</pre>

Example usage:
<pre style="white-space:pre !important; overflow-x:scroll !important">
# add a new secret
pk secrets new -f '~/SeretFile' -sp NewVault:NewSecret

# list names of all secrets within specific vaults
pk secrets list -vn NewVault AnotherVault
# 1. NewVault:NewSecret
# 2. AnotherVault:AnotherSecret

# delete secrets
pk secrets delete -sp NewVault:NewSecret AnotherVault:AnotherSecret

# retrieve a secret
pk secrets get -sp NewVault:NewSecret
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
  sign [options]     signing operations [files]
  verify [options]   verification operations
  encrypt [options]  encryption operations
  decrypt [options]  decryption operations
  help [command]     display help for command
</pre>

Example usage:
<pre style="white-space:pre !important; overflow-x:scroll !important">
# sign a file and store as a detached signature
pk crypto sign ./file # creates ./file.sig

# verify a file
pk crypto verify -fp ./file.sig

# encrypt a file
pk crypto encrypt -fp ./file

# decrypt a file
pk crypto decrypt -fp ./file
</pre>

## Verbosity
Polykey uses four different levels of verbosity (Debug, Info, Warn, Error). The verbosity level can be set by using -v in the Polykey CLI. By default, the verbosity level will be set to log Warn messages. The verbosity level can be decreased by accumulating '-v' flags.

<pre style="white-space:pre !important; overflow-x:scroll !important">
# verbosity is set to Info
pk agent start -v

# verbosity is set to Debug
pk agent start -vv
</pre>

To decrease the verbosity further,
TODO: explain verbosity levels when it is implemented

# Development
If `js-polykey` is not installed, for example when developing, it can be run from source from a few methods:
---
```
npm run polykey -- -h
```
This will run polykey from source. the `--` in the command separates the subsequent arguments from the `npm run` command, and passes it to the program being run, in this case polykey:


```bash
$ npm run polykey -- -h

> @matrixai/polykey@0.0.37 polykey /home/user/.../js-polykey
> ts-node -r tsconfig-paths/register src/bin/polykey.ts "-h"

Usage: polykey [options] [command]

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  keys            manipulate keys
  secrets         manipulate secrets for a given vault
  vaults          manipulate vaults
  nodes           node operations
  gestalts        gestalt operations
  social          social commands
  crypto          crypto operations
  agent           control the polykey agent
  ca              certificate authority operations
  oauth           http oauth2 operations
  help [command]  display help for command

```
---
```bash
npm run build
node dist/bin/polykey.js -h
```
This is equivalent to the above, but instead, we run the built file directly using `node`:
```bash
$ node dist/bin/polykey.js
Usage: polykey [options] [command]

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  keys            manipulate keys
  secrets         manipulate secrets for a given vault
  vaults          manipulate vaults
  nodes           node operations
  gestalts        gestalt operations
  social          social commands
  crypto          crypto operations
  agent           control the polykey agent
  ca              certificate authority operations
  oauth           http oauth2 operations
  help [command]  display help for command
```

# Build
```bash
npm run build
```
This will create a dist folder.
## Proto Files
All `.proto` files are stored in the the `proto` directory. JavaScript and type definition files are build using the following command:

```
npm run build:proto
```

---

```
protoc \
  --proto_path=src/proto/schemas \
  --plugin=protoc-gen-grpc="$(which grpc_node_plugin)" \
  --js_out=import_style=commonjs,binary:src/proto/js \
  --ts_out="src/proto/js" \
  --grpc_out=grpc_js:src/proto/js \
  ./src/proto/schemas/*.proto
```

or

```
protoc \
  --proto_path=src/proto/schemas \
  --plugin=protoc-gen-grpc="$(which grpc_node_plugin)" \
  --js_out=import_style=commonjs,binary:src/proto/js \
  --grpc_out=grpc_js:src/proto/js \
  ./src/proto/schemas/*.proto
```

Once we have grpc-tools packaged properly.

```
# builds the dependency graph
arkit ./src -o ./media/dependencies.png

typedoc --media ./media
```

Other build instructions above ^.

---

## Deployment

### Deploying to AWS ECS:

First login to AWS ECR:

```sh
aws --profile=matrix ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 015248367786.dkr.ecr.ap-southeast-2.amazonaws.com
```

Proceed to build the container image and upload it:

```sh
repo="015248367786.dkr.ecr.ap-southeast-2.amazonaws.com" && \
build="$(nix-build ./release.nix --attr docker)" && \
loaded="$(docker load --input "$build")" && \
name="$(cut -d':' -f2 <<< "$loaded" | tr -d ' ')" && \
tag="$(cut -d':' -f3 <<< "$loaded")" && \
docker tag "${name}:${tag}" "${repo}/polykey:${tag}" && \
docker tag "${name}:${tag}" "${repo}/polykey:latest" && \
docker push "${repo}/polykey:${tag}" && \
docker push "${repo}/polykey:latest"
```
