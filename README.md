# Polykey

staging:[![pipeline status](https://gitlab.com/MatrixAI/open-source/Polykey/badges/staging/pipeline.svg)](https://gitlab.com/MatrixAI/open-source/Polykey/commits/staging)
master:[![pipeline status](https://gitlab.com/MatrixAI/open-source/Polykey/badges/master/pipeline.svg)](https://gitlab.com/MatrixAI/open-source/Polykey/commits/master)

Polykey is an open-source decentralized secrets management and sharing system. It is made for today's decentralized world of people, services and devices.

* Decentralized Encrypted Storage - No storage of secrets on third parties, secrets are stored on your device and synchronised point-to-point between Polykey nodes.
* Secure Peer-to-Peer Communications - Polykey bootstraps TLS keys by federating trusted social identities (e.g. GitHub).
* Secure Computational Workflows - Share secrets (passwords, keys, tokens and certificates) with people, between teams, and across machine infrastructure.

<p align="center">
  <img src="./images/cli_demo.gif" alt="Polykey CLI Demo"/>
</p>

Polykey synthesizes a unified workflow between interactive password management and infrastructure key management.

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

For tutorials, how-to guides, reference and theory, see the [docs](https://polykey.com/docs).

Have a question? Join our [discussion board](https://github.com/MatrixAI/Polykey/discussions).

Our main website is https://polykey.com

## Installation

### NPM

```sh
npm install --save polykey
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
