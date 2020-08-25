import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process';
import { randomString } from '../../src/lib/utils';

const cliPath = require.resolve('../../bin/polykey')

describe('Polykey CLI', () => {
  let pkCliEnv: {}
  let tempPkAgentDir: string

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
    await new Promise((r, _) => setTimeout(() => r(), 100))
  }

  beforeAll(() => {
    tempPkAgentDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)
    pkCliEnv = {
      PK_LOG_PATH: path.join(tempPkAgentDir, 'log'),
      PK_SOCKET_PATH: path.join(tempPkAgentDir, 'S.testing-socket')
    }
  })
  afterAll(() => {
    fs.rmdirSync(tempPkAgentDir, { recursive: true })
  })
  describe('With Agent Stopped', () => {
    beforeEach(async () => {
      // stop agent
      await validateCli({ args: ['agent', 'stop'], ignoreOutput: true })
    })

    test('agent status returns correctly if agent is stopped', async () => {
      await validateCli({ args: ['agent', 'status'], expectedOutput: ["agent status is: 'stopped'"] })
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

  describe('With New Node Created', () => {
    let nodePath: string
    let env: {}
    beforeAll(async () => {
      nodePath = path.join(`${os.tmpdir()}`, `pktest${randomString()}`)

      await validateCli({ args: ['agent', 'stop'], ignoreOutput: true })
      await validateCli({ args: ['agent', 'start'], ignoreOutput: true })
      env = { KEYNODE_PATH: nodePath }
      await validateCli({
        args: [
          'agent',
          'create',
          '-n',
          'John Smith',
          '-e',
          'john@email.com',
          '-p',
          'passphrase',
          '-b',
          '1024',
        ],
        ignoreOutput: true,
        env
      })
    })
    afterAll(() => {
      fs.rmdirSync(nodePath, { recursive: true })
    })

    test('new node shows up in agent list', async () => {
      await validateCli({ args: ['agent', 'list'], expectedOutput: [nodePath] })
    })

    test('cannot operate on a locked node', async () => {
      await validateCli({ args: ['agent', 'restart'], expectedOutput: ["agent has restarted"] })
      await validateCli({ args: ['vaults', 'list'], expectedOutput: ['Error: node path exists in memory but is locked'], env })
    })

    test('can load exisitng node after agent restart', async () => {
      await validateCli({ args: ['agent', 'restart'], expectedOutput: ["agent has restarted"] })
      await validateCli({ args: ['agent', 'load', '-p', 'passphrase'], expectedOutput: [nodePath], env })
    })

    describe('Vault Operations', () => {
      let vaultName: string
      beforeEach(async () => {
        vaultName = `Vault-${randomString()}`
        // create a new vault
        await validateCli({ args: ['vaults', 'new', vaultName], expectedOutput: ["vault created at"], env })
      })

      test('existing vault shows up in vault list', async () => {
        await validateCli({ args: ['vaults', 'list'], expectedOutput: [vaultName], env })
      })

      test('can delete vault', async () => {
        await validateCli({ args: ['vaults', 'list'], expectedOutput: [vaultName], env })
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
            expectedOutput: [`secret '${secretName}' was successfully added to vault '${vaultName}'`],
            env
          })
          // delete temporary file
          fs.unlinkSync(secretPath)
        })

        test('existing secret shows up in secret list', async () => {
          await validateCli({ args: ['secrets', 'list', vaultName], expectedOutput: [secretName], env })
        })

        test('deleted secret does not show up in secret list', async () => {
          await validateCli({
            args: ['secrets', 'delete', `${vaultName}:${secretName}`],
            expectedOutput: [`secret '${secretName}' was successfully removed from vault '${vaultName}'`],
            env
          })
          await validateCli({ args: ['secrets', 'list', vaultName], expectedOutput: [], env })
        })

        test('can get secret from vault', async () => {
          await validateCli({ args: ['secrets', 'get', `${vaultName}:${secretName}`], expectedOutput: [secretContent], env })
        })

        test('can update secret content', async () => {
          const newSecretContent = `very new secret content with another random string: ${randomString()}`
          // write to temporary file
          const secretPath = path.join(os.tmpdir(), secretName)
          fs.writeFileSync(secretPath, Buffer.from(newSecretContent))
          await validateCli({
            args: ['secrets', 'update', `${vaultName}:${secretName}`, '-f', secretPath],
            expectedOutput: [`secret '${secretName}' was successfully updated in vault '${vaultName}'`],
            env
          })
          // delete temporary file
          fs.unlinkSync(secretPath)

          // make sure get secret returns correct new content
          await validateCli({ args: ['secrets', 'get', `${vaultName}:${secretName}`], expectedOutput: [newSecretContent], env })
        })

        test('can enter env with secret from vault', async () => {
          const envVarName = secretName.toUpperCase().replace('-', '_')
          await validateCli({
            args: ['secrets', 'env', `${vaultName}:${secretName}=${envVarName}`, '--command', `echo 'this is the secret: $${envVarName}'`],
            expectedOutput: [`this is the secret: ${secretContent}`],
            env
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
        await validateCli({ args: ['keys', 'new', '-n', keyName, '-p', keyPassphrase], expectedOutput: [`'${keyName}' was added to the Key Manager`], env })

        // read in public and private keys
        primaryPublicKey = fs.readFileSync(path.join(nodePath, '.keys', 'public_key')).toString()
        primaryPrivateKey = fs.readFileSync(path.join(nodePath, '.keys', 'private_key')).toString()
      })

      test('existing key shows up in key list', async () => {
        await validateCli({ args: ['keys', 'list'], expectedOutput: [keyName], env })
      })

      test('can get existing key', async () => {
        await validateCli({ args: ['keys', 'get', '-n', keyName], ignoreOutput: true, env })
      })

      test('can delete existing key', async () => {
        await validateCli({ args: ['keys', 'delete', '-n', keyName], expectedOutput: [`key '${keyName}' was successfully deleted`], env })
      })

      test('can retreive primary keypair', async () => {
        await validateCli({
          args: ['keys', 'primary', '-p', '-j'],
          expectedOutput: [
            JSON.stringify({ publicKey: primaryPublicKey, privateKey: primaryPrivateKey })
          ],
          env
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
        await validateCli({ args: ['crypto', 'encrypt', '-f', filePath], expectedOutput: [`file successfully encrypted: '${filePath}'`], env })
        const encryptedData = fs.readFileSync(filePath)
        expect(encryptedData).not.toEqual(undefined)

        await validateCli({ args: ['crypto', 'decrypt', '-f', filePath], expectedOutput: [`file successfully decrypted: '${filePath}'`], env })
        const decryptedData = fs.readFileSync(filePath)
        expect(decryptedData).toEqual(fileContent)
      })

      test('can sign and verify file', async () => {
        const signedPath = `${filePath}.sig`
        await validateCli({ args: ['crypto', 'sign', filePath], expectedOutput: [`file '${filePath}' successfully signed at '${signedPath}'`], env })
        const signedData = fs.readFileSync(signedPath)
        expect(signedData).not.toEqual(undefined)

        await validateCli({ args: ['crypto', 'verify', '-f', signedPath], expectedOutput: [`file '${signedPath}' was successfully verified`], env })
        const verifiedData = fs.readFileSync(filePath)
        expect(verifiedData).toEqual(fileContent)
      })


    })
  })
})
