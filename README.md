# Polykey

[![pipeline status](https://gitlab.com/MatrixAI/open-source/js-polykey/badges/master/pipeline.svg)](https://gitlab.com/MatrixAI/open-source/js-polykey/commits/master)

This is the core library for running PolyKey. It provides a CLI `polykey` or `pk` for interacting with the PolyKey system.

For tutorials, how-to guides, reference and theory, see the [wiki](https://github.com/MatrixAI/Polykey/wiki).

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
