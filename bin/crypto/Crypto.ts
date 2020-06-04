import commander from 'commander'
import initPolyKey from '../initPolykey'
import { actionRunner,  pkLogger, PKMessageType } from '../polykey'

function makeSignCommand() {
  return new commander.Command('sign')
  .description('signing operations')
  .option('-k, --signing-key <signingKey>', 'path to private key that will be used to sign files')
  .option('-p, --key-passphrase <keyPassphrase>', 'passphrase to unlock the provided signing key')
  .arguments('file(s) to be signed')
  .action(async (options) => {
    const pk = await initPolyKey()
    const signingKeyPath = options.signingKey
    const keyPassphrase = options.keyPassphrase
    const filePathList = options.args.values()
    for (const filePath of filePathList) {
      try {
        const signedPath = await pk.signFile(filePath, signingKeyPath, keyPassphrase)
        pkLogger(`file '${filePath}' successfully signed at '${signedPath}'`, PKMessageType.SUCCESS)
      } catch (err) {
        throw new Error(`failed to sign '${filePath}': ${err}`)
      }
    }
  })
}

function makeVerifyCommand() {
  return new commander.Command('verify')
  .description('verification operations')
  .option('-k, --verifying-key <verifyingKey>', 'path to public key that will be used to verify files')
  .option('-s, --detach-sig <detachedSignature>', 'path to detached signature for file')
  .arguments('file to be verified')
  .action(actionRunner(async (options) => {
    const pk = await initPolyKey()
    const verifyingKeyPath = options.verifyingKey
    const detachedSignaturePath = options.detachedSignature
    const filePathList: string[] = Array.from(options.args.values())
    if (filePathList.length < 1) {
      throw new Error('no file provided')
    }
    const filePath = filePathList[0]
    if (detachedSignaturePath === undefined) {
      throw new Error('no signature provided')
    }
    try {
      const pgpFingerprint = await pk.verifyFile(filePath, detachedSignaturePath, verifyingKeyPath)
      pkLogger(`file '${filePath}' successfully verified. PGP fingerprint: ${pgpFingerprint}`,  PKMessageType.SUCCESS)
    } catch (err) {
      throw new Error(`failed to sign '${filePath}': ${err.message}`)
    }
  }))
}

function makeCryptoCommand() {
  return new commander.Command('crypto')
  .description('crypto operations')
  .addCommand(makeVerifyCommand())
  .addCommand(makeSignCommand())
}

export default makeCryptoCommand
