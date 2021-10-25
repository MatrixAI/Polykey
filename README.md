# js-polykey

[![pipeline status](https://gitlab.com/MatrixAI/open-source/js-polykey/badges/master/pipeline.svg)](https://gitlab.com/MatrixAI/open-source/js-polykey/commits/master)

This is the core library for running PolyKey. It provides a CLI `polykey` or `pk` for interacting with the PolyKey system.

For reference and development guide, see the: [wiki](https://github.com/MatrixAI/js-polykey/wiki).

The master-project for Polykey is https://github.com/MatrixAI/Polykey.

## Installation

Building the package:

```sh
nix-build -E '(import ./pkgs.nix).callPackage ./default.nix {}'
```

Building the releases:

```sh
nix-build ./release.nix --attr application
nix-build ./release.nix --attr docker
```

Install into Nix user profile:

```sh
nix-env -f ./release.nix --install --attr application
```

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

### Calling Executables

When calling executables in development, use this style:

```sh
npm run polykey -- p1 p2 p3
```

The `--` is necessary to make `npm` understand that the parameters are for your own executable, and not parameters to `npm`.

### Path Aliases

Due to https://github.com/microsoft/TypeScript/issues/10866, you cannot use path aliases without a bundler like Webpack to further transform the generated JavaScript code in order to resolve the path aliases. Because this is a simple library demonstration, there's no need to use a bundler. In fact, for such libraries, it is far more efficient to not bundle the code.

However we have left the path alias configuration in `tsconfig.json`, `jest.config.js` and in the tests we are making use of the `@` alias.

### Using the REPL

```
$ npm run ts-node
> import fs from 'fs';
> fs
> import { Library } from '@';
> Library
> import Library as Library2 from './src/lib/Library';
```

You can also create test files in `./src`, and run them with `npm run ts-node ./src/test.ts`.

This allows you to test individual pieces of typescript code and it makes it easier when doing large scale rearchitecting of TypeScript code.

#### VSCode Path Aliases

VSCode cannot follow path aliases in our tests due to
https://github.com/microsoft/vscode/issues/94474.

To resolve this, add `./tests/**/*` into the `tsconfig` `include` section:

```json
  "include": [
    "./src/**/*",
    "./tests/**/*'
  ]
```

This will however make `tsc` build the `tests` into the `dist` output.

**Therefore this fix should only be done in your own workspace, do not commit or push this change up.**


### Docs Generation

```sh
npm run docs
```

See the docs at: https://matrixai.github.io/TypeScript-Demo-Lib/

### Publishing

```sh
# npm login
npm version patch # major/minor/patch
npm run build
npm publish --access public
git push
git push --tags
```

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
