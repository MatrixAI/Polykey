# Polykey

staging:[![pipeline status](https://gitlab.com/MatrixAI/open-source/Polykey/badges/staging/pipeline.svg)](https://gitlab.com/MatrixAI/open-source/Polykey/commits/staging)
master:[![pipeline status](https://gitlab.com/MatrixAI/open-source/Polykey/badges/master/pipeline.svg)](https://gitlab.com/MatrixAI/open-source/Polykey/commits/master)

Polykey is an open-source, peer-to-peer system that addresses the critical challenge in cybersecurity: the secure sharing and delegation of authority, in the form of secrets like keys, tokens, certificates, and passwords.

It allows users including developers, organizations, and machines—to store these secrets in encrypted vaults on their own devices, and share them directly with trusted parties.

All data is end-to-end encrypted, both in transit and at rest, eliminating the risk associated with third-party storage.

Polykey provides a command line interface, desktop and mobile GUI, and a web-based control plane for organizational management.

By treating secrets as tokenized authority, it offers a fresh approach to managing and delegating authority in zero-trust architectures without adding burdensome policy complexity - a pervasive issue in existing zero-trust systems.

Unlike complex self-hosted secrets management systems that require specialized skills and infrastructure, Polykey is installed and running directly from the end-user device.

It is built to automatically navigate network complexities like NAT traversal, connecting securely to other nodes without manual configuration.

Key features:

* Decentralized Encrypted Storage - No storage of secrets on third parties, secrets are stored on your device and synchronised point-to-point between Polykey nodes.
* Secure Peer-to-Peer Communication - Polykey bootstraps TLS keys by federating trusted social identities (e.g. GitHub).
* Secure Computational Workflows - Share static secrets (passwords, keys, tokens and certificates) with people, between teams, and across machine infrastructure. Create dynamic (short-lived) smart-tokens with embedded policy for more sophisticated zero-trust authority verification.
* With Polykey Enterprise, you can create private networks of Polykey nodes and apply mandatory policy governing node behaviour.

https://github.com/MatrixAI/Polykey/assets/640797/e35a6bf4-4c07-4f2a-a6bf-bb176b961996

This repository is the core library for Polykey.

The Polykey project is split up into these main repositories:

* [Polykey](https://github.com/MatrixAI/Polykey) - Polykey Core Library
* [Polykey-CLI](https://github.com/MatrixAI/Polykey-CLI) - CLI of Polykey
* [Polykey-Desktop](https://github.com/MatrixAI/Polykey-Desktop) - Polykey Desktop (Windows, Mac, Linux) application
* [Polykey-Mobile](https://github.com/MatrixAI/Polykey-Mobile) - Polykey Mobile (iOS & Android) Application
* [Polykey Enterprise](https://polykey.com) - Web Control Plane SaaS

Have a bug or a feature-request? Please submit it the issues of the relevant subproject above.

For tutorials, how-to guides, reference and theory, see the [docs](https://polykey.com/docs).

Have a question? Join our [discussion board](https://github.com/MatrixAI/Polykey/discussions).

Have a security issue you want to let us know? You can contact us on our website.

Our main website is https://polykey.com

## Installation

### NPM

```sh
npm install --save polykey
```

## Development

Run `nix develop`, and once you're inside, you can use:

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
