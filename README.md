<div align="center">
  <img width="512" src="https://github.com/user-attachments/assets/48fa6b8c-6deb-4017-9260-551857d54462">
  <br />
  <br />
  <img src="https://img.shields.io/github/v/tag/MatrixAI/Polykey?style=for-the-badge">
  <img src="https://img.shields.io/github/actions/workflow/status/MatrixAI/Polykey/release.yml?style=for-the-badge">
  <img src="https://img.shields.io/npm/d18m/polykey?style=for-the-badge&label=npm%20downloads&color=d02b1d">
  <br />
  <img src="https://img.shields.io/github/downloads/MatrixAI/Polykey/total?style=for-the-badge">
  <img src="https://img.shields.io/github/license/MatrixAI/Polykey?style=for-the-badge">
</div>

## What is Polykey?

**Polykey is an open-source, peer-to-peer system** that addresses the critical challenge in cybersecurity: **the secure sharing and delegation of authority**, in the form of secrets like keys, tokens, certificates, and passwords.

It allows users including developers, organizations, and machines—to **store these secrets in encrypted vaults on their own devices, and share them directly with trusted parties.**

* **All data is end-to-end encrypted**, both in transit and at rest, eliminating the risk associated with third-party storage.
* **Polykey provides a command line interface**, desktop and mobile GUI, and a web-based control plane for organizational management.
* By treating secrets as tokenized authority, it offers a fresh approach to **managing and delegating authority in zero-trust architectures** without adding burdensome policy complexity - a pervasive issue in existing zero-trust systems.
* Unlike complex self-hosted secrets management systems that require specialized skills and infrastructure, Polykey is **installed and running directly from the end-user device**.
* It is built to **automatically navigate network complexities** like NAT traversal, connecting securely to other nodes without manual configuration.

**Key features:**

* **Decentralized Encrypted Storage** - No storage of secrets on third parties, secrets are stored on your device and synchronised point-to-point between Polykey nodes.
* **Secure Peer-to-Peer Communication** - Polykey bootstraps TLS keys by federating trusted social identities (e.g. GitHub).
* **Secure Computational Workflows** - Share static secrets (passwords, keys, tokens and certificates) with people, between teams, and across machine infrastructure. Create dynamic (short-lived) smart-tokens with embedded policy for more sophisticated zero-trust authority verification.
* With Polykey Enterprise, you can create private networks of Polykey nodes and apply mandatory policy governing node behaviour.

## Table of Contents
* [Installation](#installation)
* [Development](#development)
  * [Docs Generation](#docs-generation)
  * [Publishing](#publishing)
* [License](#license)

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

### Publishing

```sh
# npm login
npm version patch # major/minor/patch
npm run build
npm publish --access public
git push
git push --tags
```

## License

Polykey is licensed under the GPLv3, you may read the terms of the license [here](LICENSE).
