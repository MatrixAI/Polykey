import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process';
import { randomString, sleep } from '../../src/utils';

const cliPath = require.resolve('../../bin/polykey')

describe('Polykey CLI', () => {
  let pkCliEnv: {}
  let nodePath: string

  beforeAll(async () => {
    nodePath = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}${randomString()}`)
    pkCliEnv = {
      PK_PATH: nodePath,
    }
    // init node
    await validateCli({ args: ['agent', 'stop'], ignoreOutput: true })
    await validateCli({ args: ['agent', 'start'], ignoreOutput: true })
    await validateCli({
      args: [
        'agent',
        'init',
        '-ui',
        'John Smith',
        '-pp',
        'passphrase',
        '-nb',
        '1024',
      ],
      ignoreOutput: true
    })
  })

  afterAll(() => {
    fs.rmdirSync(nodePath, { recursive: true })
  })

  describe('With Agent Stopped', () => {
    beforeEach(async () => {
      // stop agent
      await validateCli({ args: ['agent', 'stop'], ignoreOutput: true })
    })

    test('agent status returns correctly if agent is stopped', async () => {
      await validateCli({ args: ['agent', 'status'], expectedOutput: ["agent status is: 'offline'"] })
    })

    test('can start agent', async () => {
      await validateCli({ args: ['agent', 'start'], expectedOutput: ["agent has started"] })
    })

    test('can start agent as a daemon', async () => {
      await validateCli({ args: ['agent', 'start', '-d'], expectedOutput: ["agent has started"] })
    })
  })

  describe('With Agent Started', () => {
    beforeEach(async () => {
      await validateCli({ args: ['agent', 'stop'], ignoreOutput: true })
      await validateCli({ args: ['agent', 'start'], ignoreOutput: true })
    })

    test('agent status returns correctly if agent is started', async () => {
      await validateCli({ args: ['agent', 'status'], expectedOutput: ["agent status is: 'online'"] })
    })

    test('can forcibly stop the agent without errors', async () => {
      await validateCli({ args: ['agent', 'stop', '-f'], ignoreOutput: true })
    })

    test('can restart agent without errors', async () => {
      await validateCli({ args: ['agent', 'restart'], expectedOutput: ["agent has restarted"] })
    })

    test('can restart agent as daemon without errors', async () => {
      await validateCli({ args: ['agent', 'restart', '-d'], expectedOutput: ["agent has restarted"] })
    })
  })

  describe('Node Specific Operations', () => {
    beforeEach(async () => {
      await validateCli({ args: ['agent', 'unlock', '-pp', 'passphrase'], ignoreOutput: true })
    })

    test('cannot operate on a locked node', async () => {
      await validateCli({ args: ['agent', 'restart'], expectedOutput: ["agent has restarted"] })
      await validateCli({ args: ['vaults', 'list'], expectedOutput: ['polykey is locked'] })
    })

    test('can load exisitng node after agent restart', async () => {
      await validateCli({ args: ['agent', 'restart'], expectedOutput: ["agent has restarted"] })
      await validateCli({ args: ['agent', 'unlock', '-pp', 'passphrase'], expectedOutput: [nodePath] })
    })

    describe('Vault Operations', () => {
      let vaultName: string
      beforeEach(async () => {
        vaultName = `Vault-${randomString()}`
        // create a new vault
        await validateCli({ args: ['vaults', 'new', '-vn', vaultName], expectedOutput: ["vault created at"] })
      })

      test('existing vault shows up in vault list', async () => {
        await validateCli({ args: ['vaults', 'list'], expectedOutput: [vaultName] })
      })

      test('can delete vault', async () => {
        await validateCli({ args: ['vaults', 'list'], expectedOutput: [vaultName] })
      })

      describe('Secret Operations', () => {
        let secretName: string
        let secretContent: string
        beforeEach(async () => {
          secretName = `Secret-${randomString()}`
          secretContent = `some secret content with random string: ${randomString()}`
          // write to temporary file
          const secretPath = path.join(os.tmpdir(), secretName)
          fs.writeFileSync(secretPath, Buffer.from(secretContent))
          // create a new secret
          await validateCli({
            args: ['secrets', 'new', `${vaultName}:${secretName}`, '-f', secretPath],
            expectedOutput: [`secret '${secretName}' was successfully added to vault '${vaultName}'`]
          })
          // delete temporary file
          fs.unlinkSync(secretPath)
        })

        test('existing secret shows up in secret list', async () => {
          await validateCli({ args: ['secrets', 'list', vaultName], expectedOutput: [secretName] })
        })

        test('deleted secret does not show up in secret list', async () => {
          await validateCli({
            args: ['secrets', 'delete', `${vaultName}:${secretName}`],
            expectedOutput: [`secret '${secretName}' was successfully removed from vault '${vaultName}'`]
          })
          await validateCli({ args: ['secrets', 'list', vaultName], expectedOutput: [] })
        })

        test('can get secret from vault', async () => {
          await validateCli({ args: ['secrets', 'get', `${vaultName}:${secretName}`], expectedOutput: [secretContent] })
        })

        test('can update secret content', async () => {
          const newSecretContent = `very new secret content with another random string: ${randomString()}`
          // write to temporary file
          const secretPath = path.join(os.tmpdir(), secretName)
          fs.writeFileSync(secretPath, Buffer.from(newSecretContent))
          await validateCli({
            args: ['secrets', 'update', `${vaultName}:${secretName}`, '-f', secretPath],
            expectedOutput: [`secret '${secretName}' was successfully updated in vault '${vaultName}'`]
          })
          // delete temporary file
          fs.unlinkSync(secretPath)

          // make sure get secret returns correct new content
          await validateCli({ args: ['secrets', 'get', `${vaultName}:${secretName}`], expectedOutput: [newSecretContent] })
        })

        test('can enter env with secret from vault', async () => {
          const envVarName = secretName.toUpperCase().replace('-', '_')
          await validateCli({
            args: ['secrets', 'env', `${vaultName}:${secretName}=${envVarName}`, '--command', `echo 'this is the secret: $${envVarName}'`],
            expectedOutput: [`this is the secret: ${secretContent}`]
          })
        })
      })
    })

    describe('Key Operations', () => {
      let keyName: string
      let keyPassphrase: string

      let primaryPublicKey: string
      let primaryPrivateKey: string
      beforeEach(async () => {
        keyName = `Key-${randomString()}`
        keyPassphrase = `passphrase-${randomString()}`
        // create a new key
        await validateCli({ args: ['keys', 'new', '-n', keyName, '-p', keyPassphrase], expectedOutput: [`'${keyName}' was added to the Key Manager`] })

        // read in public and private keys
        primaryPublicKey = fs.readFileSync(path.join(nodePath, '.keys', 'public_key')).toString()
        primaryPrivateKey = fs.readFileSync(path.join(nodePath, '.keys', 'private_key')).toString()
      })

      test('existing key shows up in key list', async () => {
        await validateCli({ args: ['keys', 'list'], expectedOutput: [keyName] })
      })

      test('can get existing key', async () => {
        await validateCli({ args: ['keys', 'get', '-kn', keyName], ignoreOutput: true })
      })

      test('can delete existing key', async () => {
        await validateCli({ args: ['keys', 'delete', '-n', keyName], expectedOutput: [`key '${keyName}' was successfully deleted`] })
      })

      test('can retrieve primary keypair', async () => {
        await validateCli({
          args: ['keys', 'primary', '-pk', '-oj'],
          expectedOutput: [
            JSON.stringify({ publicKey: primaryPublicKey, privateKey: primaryPrivateKey })
          ]
        })
      })
    })

    describe('Crypto Operations', () => {
      let tempDir: string
      let filePath: string
      let fileContent: Buffer
      beforeEach(async () => {
        tempDir = path.join(os.tmpdir(), `pktest${randomString()}`)
        fs.mkdirSync(tempDir)

        filePath = path.join(tempDir, `random-file-${randomString()}`)
        fileContent = Buffer.from(`file content: ${randomString()}`)
        fs.writeFileSync(filePath, fileContent)
      })

      test('can encrypt and decrypt file', async () => {
        await validateCli({ args: ['crypto', 'encrypt', '-f', filePath], expectedOutput: [`file successfully encrypted: '${filePath}'`] })
        const encryptedData = fs.readFileSync(filePath)
        expect(encryptedData).not.toEqual(undefined)

        await validateCli({ args: ['crypto', 'decrypt', '-f', filePath], expectedOutput: [`file successfully decrypted: '${filePath}'`] })
        const decryptedData = fs.readFileSync(filePath)
        expect(decryptedData).toEqual(fileContent)
      })

      test('can sign and verify file', async () => {
        const signedPath = `${filePath}.sig`
        await validateCli({ args: ['crypto', 'sign', filePath], expectedOutput: [`file '${filePath}' successfully signed at '${signedPath}'`] })
        const signedData = fs.readFileSync(signedPath)
        expect(signedData).not.toEqual(undefined)

        await validateCli({ args: ['crypto', 'verify', '-f', signedPath], expectedOutput: [`file '${signedPath}' was successfully verified`] })
        const verifiedData = fs.readFileSync(filePath)
        expect(verifiedData).toEqual(fileContent)
      })
    })
  })

  // === Helper Methods === //
  const validateCli = async function validateCli(cliOptions: {
    args: string[],
    expectedOutput?: string[],
    expectedError?: Error,
    ignoreOutput?: boolean,
    ignoreError?: boolean,
    env?: {}
  }) {
    const args = cliOptions.args
    const expectedOutput = cliOptions.expectedOutput ?? []
    const expectedError = cliOptions.expectedError ?? undefined
    const ignoreOutput = cliOptions.ignoreOutput ?? false
    const ignoreError = cliOptions.ignoreError ?? false
    const env = cliOptions.env ?? {}
    const { output, error, stdout } = spawnSync(cliPath, args, { env: { ...process.env, ...pkCliEnv, ...env } })

    const receivedOutput = output
      .filter((b) => (b ?? '').toString() != '')
      .map((b) => b.toString())

    if (!ignoreOutput) {
      for (const [index, value] of expectedOutput.entries()) {
        expect(receivedOutput[index]).toEqual(expect.stringContaining(value))
      }
      if (expectedOutput.length == 0) {
        expect(receivedOutput).toEqual([])
      }
    }
    if (!ignoreError) {
      expect(error).toEqual(expectedError)
    }
    // wait a couple of milli-seconds
    // this should not normally be needed but there is an issue with
    // nodes not being immediately loaded after the agent starts/restarts
    await sleep(200)
  }
})
