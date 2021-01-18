/* eslint-disable */
import os from 'os';
import fs from 'fs';
import path from 'path';
import { randomString } from '../../../src/utils';
import { PolykeyAgent } from '../../../src/Polykey';
import { promisifyGrpc } from '../../../src/bin/utils';
import * as pb from '../../../proto/compiled/Agent_pb';
import { AgentClient } from '../../../proto/compiled/Agent_grpc_pb';

describe('Agent and Client class', () => {
  let tempDir: string

  let agentPid: number
  let client: AgentClient

  beforeAll(async done => {
    tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

    // Start the agent running
    agentPid = <number>(await PolykeyAgent.startAgent(tempDir, undefined, false))

    client = PolykeyAgent.connectToAgent(tempDir)

    const request = new pb.NewKeyPairMessage
    request.setUserid('john.smith@email.com')
    request.setPassphrase('passphrase')
    const res = await promisifyGrpc(client.initializeNode.bind(client))(request) as pb.BooleanMessage
    expect(res.getB()).toEqual(true)

    done()
  }, 10000)

  afterAll(async () => {
    await promisifyGrpc(client.stopAgent.bind(client))(new pb.EmptyMessage)
    fs.rmdirSync(tempDir, { recursive: true })
    process.kill(agentPid)
  })

  test('can get agent status', async () => {
    const res = await promisifyGrpc(client.getStatus.bind(client))(new pb.EmptyMessage) as pb.AgentStatusMessage
    expect(res.getStatus()).toEqual(pb.AgentStatusType.ONLINE)
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
      const encryptionRequest = new pb.EncryptFileMessage
      encryptionRequest.setFilePath(filePath)
      const encryptionResponse = await promisifyGrpc(client.encryptFile.bind(client))(encryptionRequest) as pb.StringMessage
      const encryptedFilePath = encryptionResponse.getS()
      const encryptedData = fs.readFileSync(encryptedFilePath)
      expect(encryptedData).not.toEqual(undefined)

      const decryptionRequest = new pb.DecryptFileMessage
      decryptionRequest.setFilePath(filePath)
      const decryptionResponse = await promisifyGrpc(client.decryptFile.bind(client))(decryptionRequest) as pb.StringMessage
      const decryptedFilePath = decryptionResponse.getS()
      const decryptedData = fs.readFileSync(decryptedFilePath)
      expect(decryptedData).toEqual(fileContent)
    })

    test('can sign and verify file', async () => {
      const signRequest = new pb.SignFileMessage
      signRequest.setFilePath(filePath)
      const signResponse = await promisifyGrpc(client.signFile.bind(client))(signRequest) as pb.StringMessage
      const signedFilePath = signResponse.getS()
      const signedData = fs.readFileSync(signedFilePath)
      expect(signedData).not.toEqual(undefined)

      const verifyRequest = new pb.VerifyFileMessage
      verifyRequest.setFilePath(signedFilePath)
      const verifyResponse = await promisifyGrpc(client.verifyFile.bind(client))(verifyRequest) as pb.BooleanMessage
      const verified = verifyResponse.getB()
      expect(verified).toEqual(true)
    })
  })

  describe('Key Specific Operations', () => {
    let keyName: string

    beforeEach(async () => {
      keyName = `random-key-${randomString()}`
      const req = new pb.DeriveKeyMessage
      req.setKeyName(keyName)
      req.setPassphrase('passphrase')
      const res = await promisifyGrpc(client.deriveKey.bind(client))(req) as pb.BooleanMessage
      const successful = res.getB()
      expect(successful).toEqual(true)
    })

    test('can retrieve keypair', async () => {
      const req = new pb.BooleanMessage
      req.setB(true)
      const res = await promisifyGrpc(client.getPrimaryKeyPair.bind(client))(req) as pb.KeyPairMessage
      expect(res.getPrivateKey()).not.toEqual(undefined)
      expect(res.getPublicKey()).not.toEqual(undefined)
    })

    test('derived key shows up in key list', async () => {
      const res = await promisifyGrpc(client.listKeys.bind(client))(new pb.EmptyMessage) as pb.StringListMessage
      expect(res.getSList()).toContainEqual(keyName)
    })

    test('can retrieved derived key', async () => {
      const req = new pb.StringMessage
      req.setS(keyName)
      const res = await promisifyGrpc(client.getKey.bind(client))(req) as pb.StringMessage
      expect(res.getS()).not.toEqual(undefined)
    })

    test('can delete derived key', async () => {
      const req1 = new pb.StringMessage
      req1.setS(keyName)
      const res1 = await promisifyGrpc(client.deleteKey.bind(client))(req1) as pb.BooleanMessage
      const successful = res1.getB()
      expect(successful).toEqual(true)

      const res2 = await promisifyGrpc(client.listKeys.bind(client))(new pb.EmptyMessage) as pb.StringListMessage
      const keyList = res2.getSList()
      expect(keyList).not.toContainEqual(keyName)

      const req3 = new pb.StringMessage
      req3.setS(keyName)
      expect(promisifyGrpc(client.getKey.bind(client))(req3)).rejects.toThrow()
    })
  })

  describe('Vault Specific Operations', () => {
    let vaultName: string
    beforeEach(async () => {
      vaultName = `Vault-${randomString()}`

      const req = new pb.StringMessage
      req.setS(vaultName)
      const res1 = await promisifyGrpc(client.newVault.bind(client))(req) as pb.BooleanMessage
      const successful = res1.getB()
      expect(successful).toEqual(true)
    })

    test('created vault turns up in vault list', async () => {
      const res = await promisifyGrpc(client.listVaults.bind(client))(new pb.EmptyMessage) as pb.StringListMessage
      const vaultList = res.getSList()
      expect(vaultList).toContainEqual(vaultName)
    })

    test('can delete vault', async () => {
      const req = new pb.StringMessage
      req.setS(vaultName)
      const res1 = await promisifyGrpc(client.deleteVault.bind(client))(req) as pb.BooleanMessage
      const successful = res1.getB()
      expect(successful).toEqual(true)

      const res2 = await promisifyGrpc(client.listVaults.bind(client))(new pb.EmptyMessage) as pb.StringListMessage
      const vaultList = res2.getSList()
      expect(vaultList).not.toContainEqual(vaultName)
    })

    describe('Secret Specific Operations', () => {
      let secretName: string
      let secretContent: Buffer

      beforeEach(async () => {
        secretName = `Secret-${randomString()}`
        secretContent = Buffer.from(`some random secret: ${randomString()}`)

        const pathMessage = new pb.SecretPathMessage
        pathMessage.setVaultName(vaultName)
        pathMessage.setSecretName(secretName)
        const req = new pb.SecretContentMessage
        req.setSecretPath(pathMessage)
        req.setSecretContent(secretContent.toString())
        const res1 = await promisifyGrpc(client.newSecret.bind(client))(req) as pb.BooleanMessage
        const successful = res1.getB()
        expect(successful).toEqual(true)
      })

      test('can list secrets', async () => {
        const req = new pb.StringMessage
        req.setS(vaultName)
        const res = await promisifyGrpc(client.listSecrets.bind(client))(req) as pb.StringListMessage
        const secretList = res.getSList()
        expect(secretList).toContainEqual(secretName)
      })

      test('can get secret', async () => {
        const req = new pb.SecretPathMessage
        req.setVaultName(vaultName)
        req.setSecretName(secretName)
        const res = await promisifyGrpc(client.getSecret.bind(client))(req) as pb.StringMessage
        const retrievedSecretContent = Buffer.from(res.getS())
        expect(retrievedSecretContent.toString()).toEqual(secretContent.toString())
      })

      test('can remove secret', async () => {
        const req = new pb.SecretPathMessage
        req.setVaultName(vaultName)
        req.setSecretName(secretName)
        const res = await promisifyGrpc(client.deleteSecret.bind(client))(req) as pb.BooleanMessage
        const successful = res.getB()
        expect(successful).toEqual(true)
      })

      test('getting a removed secret throws an error', async () => {
        const req1 = new pb.SecretPathMessage
        req1.setVaultName(vaultName)
        req1.setSecretName(secretName)
        const res = await promisifyGrpc(client.deleteSecret.bind(client))(req1) as pb.BooleanMessage
        const successful = res.getB()
        expect(successful).toEqual(true)

        const req2 = new pb.SecretPathMessage
        req2.setVaultName(vaultName)
        req2.setSecretName(secretName)
        expect(promisifyGrpc(client.getSecret.bind(client))(req2)).rejects.toThrow()
      })

      test('deleted secret is not listed in secret list', async () => {
        const req1 = new pb.SecretPathMessage
        req1.setVaultName(vaultName)
        req1.setSecretName(secretName)
        const res1 = await promisifyGrpc(client.deleteSecret.bind(client))(req1) as pb.BooleanMessage
        const successful = res1.getB()
        expect(successful).toEqual(true)

        const req2 = new pb.StringMessage
        req2.setS(vaultName)
        const res2 = await promisifyGrpc(client.listSecrets.bind(client))(req2) as pb.StringListMessage
        const secretList = res2.getSList()
        expect(secretList).not.toContainEqual(secretName)
      })

      test('can update secret content', async () => {
        const newContent = `new secret content: ${randomString()}`
        const pathMessage = new pb.SecretPathMessage
        pathMessage.setVaultName(vaultName)
        pathMessage.setSecretName(secretName)
        const req1 = new pb.SecretContentMessage
        req1.setSecretPath(pathMessage)
        req1.setSecretContent(newContent)
        const res1 = await promisifyGrpc(client.updateSecret.bind(client))(req1) as pb.BooleanMessage
        const successful = res1.getB()
        expect(successful).toEqual(true)

        const res2 = await promisifyGrpc(client.getSecret.bind(client))(pathMessage) as pb.StringMessage
        const retrievedSecretContent = res2.getS()
        expect(retrievedSecretContent).toEqual(newContent)
      })
    })
  })
})
