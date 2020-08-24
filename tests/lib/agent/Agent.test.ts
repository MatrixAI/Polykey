import os from 'os';
import fs from 'fs';
import path from 'path';
import { randomString } from '../../../src/lib/utils';
import Polykey, { PolykeyAgent, PolykeyClient } from '../../../src/lib/Polykey';

// TODO add tests as part of testing PR
describe('Agent class', () => {
  let pkCliEnv: {}
  let tempPkAgentDir: string

  let agent: PolykeyAgent
  let client: PolykeyClient
  let tempDir: string

  beforeAll(async () => {
    tempPkAgentDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)
    pkCliEnv = {
      PK_LOG_PATH: path.join(tempPkAgentDir, 'log'),
      PK_SOCKET_PATH: path.join(tempPkAgentDir, 'S.testing-socket')
    }
    process.env = {...process.env, ...pkCliEnv}

    // Start the agent running
    agent = new PolykeyAgent()
    await PolykeyAgent.startAgent()

    // connect to agent
    client = PolykeyAgent.connectToAgent()
    tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)
  })

  afterAll(() => {
    agent.stop()
    fs.rmdirSync(tempPkAgentDir, { recursive: true })
    fs.rmdirSync(tempDir, { recursive: true })
  })

  test('can get agent status', async () => {
    expect(await client.getAgentStatus()).toEqual('online')
  })

  describe('Node Specific Operations', () => {
    let nodePath: string

    beforeAll(async () => {
      nodePath = path.join(tempDir, `PolykeyNode-${randomString()}`)
      const successful = await client.newNode(nodePath, 'John Smith', 'john@email.com', 'very password', 1024)
      expect(successful).toEqual(true)
    })

    test('added nodes turn up in node list', async () => {
      expect(await client.listNodes()).toContainEqual(nodePath)
    })

    test('can register node', async () => {
      const nonAgentNodePath = path.join(tempDir, `SomePolykey-${randomString()}`)
      const pk = new Polykey(nonAgentNodePath, fs)
      await pk.keyManager.generateKeyPair('John Smith', 'john@email.com', 'very password', 1024, true)

      expect(await client.registerNode(nonAgentNodePath, 'very password')).toEqual(true)
      expect(await client.listNodes()).toContainEqual(nonAgentNodePath)
      
      // cleanup
      pk.peerManager.multicastBroadcaster.socket.close()
    })

    describe('Crypto Specific Operations', () => {
      let filePath: string
      let fileContent: Buffer
      beforeEach(async () => {
        filePath = path.join(tempDir, `random-file-${randomString()}`)
        fileContent = Buffer.from(`file content: ${randomString()}`)
        fs.writeFileSync(filePath, fileContent)
      })

      test('can encrypt and decrypt file', async () => {
        const encryptedFilePath = await client.encryptFile(nodePath, filePath)
        const encryptedData = fs.readFileSync(encryptedFilePath)
        expect(encryptedData).not.toEqual(undefined)

        const decryptedFilePath = await client.decryptFile(nodePath, encryptedFilePath)
        const decryptedData = fs.readFileSync(decryptedFilePath)
        expect(decryptedData).toEqual(fileContent)
      })

      test('can sign and verify file', async () => {
        const signedFilePath = await client.signFile(nodePath, filePath)
        const signedData = fs.readFileSync(signedFilePath)
        expect(signedData).not.toEqual(undefined)

        const verified = await client.verifyFile(nodePath, signedFilePath)
        expect(verified).toEqual(true)
      })
    })

    describe('Key Specific Operations', () => {
      let keyName: string

      beforeEach(async () => {
        keyName = `random-key-${randomString()}`
        const successful = await client.deriveKey(nodePath, keyName, 'passphrase')
        expect(successful).toEqual(true)
      })

      test('can retreive keypair', async () => {
        const keypair = await client.getPrimaryKeyPair(nodePath, true)
        expect(keypair).not.toEqual(undefined)
      })

      test('derived key shows up in key list', async () => {
        const keyList = await client.listKeys(nodePath)
        expect(keyList).toContainEqual(keyName)
      })

      test('can retreived derived key', async () => {
        const keyContent = await client.getKey(nodePath, keyName)
        expect(keyContent).not.toEqual(undefined)
      })

      test('can delete derived key', async () => {
        const successful = await client.deleteKey(nodePath, keyName)
        expect(successful).toEqual(true)

        const keyList = await client.listKeys(nodePath)
        expect(keyList).not.toContainEqual(keyName)

        expect(client.getKey(nodePath, keyName)).rejects.toThrow()
      })
    })

    describe('Vault Specific Operations', () => {
      let vaultName: string
      beforeEach(async () => {
        vaultName = `Vault-${randomString()}`
        await client.newVault(nodePath, vaultName)
      })

      test('created vault turns up in vault list', async () => {
        expect(await client.listVaults(nodePath)).toContainEqual(vaultName)
      })

      test('can destroy vault', async () => {
        const successful = await client.destroyVault(nodePath, vaultName)
        expect(successful).toEqual(true)
        expect(await client.listVaults(nodePath)).not.toContainEqual(vaultName)
      })

      describe('Secret Specific Operations', () => {
        let secretName: string
        let secretContent: Buffer

        beforeEach(async () => {
          secretName = `Secret-${randomString()}`
          secretContent = Buffer.from(`some random secret: ${randomString()}`)
          const successful = await client.createSecret(nodePath, vaultName, secretName, secretContent)
          expect(successful).toEqual(true)
        })

        test('can list secrets', async () => {
          const secretList = await client.listSecrets(nodePath, vaultName)
          expect(secretList).toContainEqual(secretName)
        })

        test('can retreive secret', async () => {
          const retreivedSecretContent = await client.getSecret(nodePath, vaultName, secretName)
          expect(retreivedSecretContent).toEqual(secretContent)
        })

        test('can remove secret', async () => {
          const successful = await client.destroySecret(nodePath, vaultName, secretName)
          expect(successful).toEqual(true)
        })

        test('retreiving a removed secret throws an error', async () => {
          const successful = await client.destroySecret(nodePath, vaultName, secretName)
          expect(successful).toEqual(true)

          const retreivedSecretContentPromise = client.getSecret(nodePath, vaultName, secretName)
          expect(retreivedSecretContentPromise).rejects.toThrow()
        })

        test('removed secret is not listed in secret list', async () => {
          const successful = await client.destroySecret(nodePath, vaultName, secretName)
          expect(successful).toEqual(true)

          const secretList = await client.listSecrets(nodePath, vaultName)
          expect(secretList).not.toContainEqual(secretName)
        })

        test('can update secret content', async () => {
          const newContent = Buffer.from(`new secret content: ${randomString()}`)
          const successful = await client.updateSecret(nodePath, vaultName, secretName, newContent)
          expect(successful).toEqual(true)

          const updatedSecretContent = await client.getSecret(nodePath, vaultName, secretName)
          expect(updatedSecretContent).toEqual(newContent)
        })
      })
    })
  })
})
