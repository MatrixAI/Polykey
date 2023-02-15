# Polykey

staging:[![pipeline status](https://gitlab.com/MatrixAI/open-source/Polykey/badges/staging/pipeline.svg)](https://gitlab.com/MatrixAI/open-source/Polykey/commits/staging)
master:[![pipeline status](https://gitlab.com/MatrixAI/open-source/Polykey/badges/master/pipeline.svg)](https://gitlab.com/MatrixAI/open-source/Polykey/commits/master)

Polykey is an open-source decentralized secrets management and sharing system. It is made for today's decentralized world of people, services and devices.

* Decentralized Encrypted Storage - No storage of secrets on third parties, secrets are stored on your device and synchronised point-to-point between Polykey nodes.
* Secure Peer-to-Peer Communications - Polykey bootstraps TLS keys by federating trusted social identities (e.g. GitHub).
* Secure Computational Workflows - Use Polykey to share secrets (passwords, keys, tokens and certificates) with people, between teams, and across machine infrastructure.

Polykey was spun out of work on a cloud orchestration platform. However it now synthesizes a unified workflow between interactive password management and infrastructure key management.

You have complete end-to-end control and privacy over your secrets, with no third-party data collection.

Polykey runs on distributed keynodes referred to as "nodes". Any computing system can run multiple keynodes. Each node manages one or more vaults which are encrypted filesystems with automatic version history. Vaults can be shared between the nodes.

This repository is the core library for Polykey.

The Polykey project is split up into these main repositories:

* [Polykey](https://github.com/MatrixAI/Polykey) - Polykey Core Library
* [Polykey-CLI](https://github.com/MatrixAI/Polykey-CLI) - CLI of Polykey
* [Polykey-Desktop](https://github.com/MatrixAI/Polykey-Desktop) - Polykey Desktop (Windows, Mac, Linux) application
* [Polykey-Mobile](https://github.com/MatrixAI/Polykey-Mobile) - Polykey Mobile (iOS & Android) Application

At the moment, the CLI is embedded in this Polykey Core Library repository. This means it provides the CLI `polykey` or `pk` for interacting with the Polykey system. In the future these will be moved to [Polykey-CLI](https://github.com/MatrixAI/Polykey-CLI).

Have a bug or a feature-request? Please submit it the issues of the relevant subproject above.

For tutorials, how-to guides, reference and theory, see the [docs](https://polykey.io/docs).

Have a question? Join our [discussion board](https://github.com/MatrixAI/Polykey/discussions).

Our main website is https://polykey.io

## Installation

### NPM

```sh
npm install --save polykey
```

### Nix/NixOS

Building the releases:

```sh
nix-build ./release.nix --attr application
nix-build ./release.nix --attr docker
nix-build ./release.nix --attr package.linux.x64.elf
nix-build ./release.nix --attr package.windows.x64.exe
nix-build ./release.nix --attr package.macos.x64.macho
```

Install into Nix user profile:

```sh
nix-env -f ./release.nix --install --attr application
```

### Docker

Install into Docker:

```sh
docker load --input "$(nix-build ./release.nix --attr docker)"
```

## Development

Run `nix-shell`, and once you're inside, you can use:

```sh
# install (or reinstall packages from package.json)
npm install
# build the dist
npm run build
# run the repl (this allows you to import from ./src)
npm run ts-node
# run the tests
npm run test
# lint the source code
npm run lint
# automatically fix the source
npm run lintfix
```

### Generating GRPC Stubs

Once you update the `src/proto/schemas` files, run this to update the `src/proto/js` files.

```sh
npm run proto-generate
```

### Calling Commands

When calling commands in development, use this style:

```sh
npm run polykey -- p1 p2 p3
```

The `--` is necessary to make `npm` understand that the parameters are for your own executable, and not parameters to `npm`.

### Docs Generation

```sh
npm run docs
```

See the docs at: https://matrixai.github.io/Polykey/

### Publishing to NPM

```sh
# npm login
npm version patch # major/minor/patch
npm run build
npm publish --access public
git push
git push --tags
```

### Packaging Cross-Platform Executables

We use `pkg` to package the source code into executables.

This requires a specific version of `pkg` and also `node-gyp-build`.

Configuration for `pkg` is done in:

* `package.json` - Pins `pkg` and `node-gyp-build`, and configures assets and scripts.
* `utils.nix` - Pins `pkg` for Nix usage
* `release.nix` - Build expressions for executables

## Deployment

Image deployments are done automatically through the CI/CD. However manual scripts are available below for deployment.

### Deploying to AWS ECR:

#### Using skopeo

```sh
tag='manual'
registry_image='015248367786.dkr.ecr.ap-southeast-2.amazonaws.com/polykey'

# Authenticates skopeo
aws ecr get-login-password \
  | skopeo login \
  --username AWS \
  --password-stdin \
  "$registry_image"

build="$(nix-build ./release.nix --attr docker)"
# This will push both the default image tag and the latest tag
./scripts/deploy-image.sh "$build" "$tag" "$registry_image"
```

#### Using docker

```sh
tag='manual'
registry_image='015248367786.dkr.ecr.ap-southeast-2.amazonaws.com/polykey'

aws ecr get-login-password \
  | docker login \
  --username AWS \
  --password-stdin \
  "$registry_image"

build="$(nix-build ./release.nix --attr docker)"
loaded="$(docker load --input "$build")"
image_name="$(cut -d':' -f2 <<< "$loaded" | tr -d ' ')"
default_tag="$(cut -d':' -f3 <<< "$loaded")"

docker tag "${image_name}:${default_tag}" "${registry_image}:${default_tag}"
docker tag "${image_name}:${default_tag}" "${registry_image}:${tag}"
docker tag "${image_name}:${default_tag}" "${registry_image}:latest"

docker push "${registry_image}:${default_tag}"
docker push "${registry_image}:${tag}"
docker push "${registry_image}:latest"
```
