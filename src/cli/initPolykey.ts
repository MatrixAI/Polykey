import fs from 'fs'
import os from 'os'
import zxcvbn from 'zxcvbn'
import inquirer from 'inquirer'
import Configstore from 'configstore'
import PolyKey from '../lib/Polykey'
import cliProgress from 'cli-progress'
import KeyManager from '../lib/keys/KeyManager'
import { actionRunner, pkLogger, PKMessageType } from './polykey'

const configStore = new Configstore('PolyKeyConfig')

function resolveTilde(filePath: string) {
  if (filePath[0] === '~' && (filePath[1] === '/' || filePath.length === 1)) {
    filePath = filePath.replace('~', os.homedir());
  }
  return filePath
}

async function askQuestions(prompts: any[]) {
  await new Promise((resolve, reject) => {
    inquirer
      .prompt(prompts)
      .then((answers: any[]) => {
        for (const prompt of prompts) {
          if (answers[prompt.name]) {
            configStore.set(prompt.name, answers[prompt.name])
          }
        }
        resolve()
      })
      .catch(error => {
        if (error.isTtyError) {

        } else {

        }
        reject(error);
      })
  })
}


async function askForMissingParameters() {
  // Init the config store
  const initialPrompts: any[] = []
  inquirer.registerPrompt('fuzzypath', require('inquirer-fuzzy-path'))

  if (!configStore.get('polykeyPath')) {
    initialPrompts.push(
      {
        type: 'fuzzypath',
        name: 'polykeyPath',
        message: 'Where would you like to store PolyKey?',
        default: `${os.homedir()}/.polykey`,
        rootPath: os.homedir(),
        itemType: 'directory',
        depthLimit: 1
      }
    )
  }

  if (!configStore.has('generateKeyPair')) {
    initialPrompts.push(
      {
        type: 'confirm',
        name: 'generateKeyPair',
        message: 'Would you like to generate a public/private keypair?',
        default: true
      }
    )
  }

  if (initialPrompts.length > 0) {
    await askQuestions(initialPrompts)
  }

  const finalPrompts: any[] = []

  if (configStore.get('generateKeyPair')) {
    if (!configStore.get('keyGenerationName')) {
      finalPrompts.push(
        {
          type: 'input',
          name: 'keyGenerationName',
          message: 'Please provide your full name for key generation?'
        }
      )
    }
    if (!configStore.get('keyGenerationEmail')) {
      finalPrompts.push(
        {
          type: 'input',
          name: 'keyGenerationEmail',
          message: 'Please provide an email for key generation?'
        }
      )
    }
    if (!configStore.get('keyGenerationPassphrase')) {
      finalPrompts.push(
        {
          type: 'input',
          name: 'keyGenerationPassphrase',
          message: 'Please provide a secure passphrase for key generation?'
        }
      )
    }
  } else {
    if (!configStore.get('publicKeyPath')) {
      finalPrompts.push(
        {
          type: 'fuzzypath',
          name: 'publicKeyPath',
          message: 'Please provide the path to your public key?',
          rootPath: os.homedir(),
          suggestOnly: true,
          depthLimit: 1
        }
      )
    }
    if (!configStore.get('privateKeyPath')) {
      finalPrompts.push(
        {
          type: 'fuzzypath',
          name: 'privateKeyPath',
          message: 'Please providee the path to your private key?',
          rootPath: os.homedir(),
          suggestOnly: true,
          depthLimit: 1
        }
      )
    }
    if (!configStore.get('privatePassphrase')) {
      finalPrompts.push(
        {
          type: 'input',
          name: 'privatePassphrase',
          message: 'Please provide your private key passphrase?'
        }
      )
    }
  }

  if (finalPrompts.length > 0) {
    await askQuestions(finalPrompts)
  }
}

/*******************************************/
// initialization
async function initPolyKey(): Promise<PolyKey> {
  return new Promise<PolyKey>(actionRunner(async (resolve, reject) => {
    await askForMissingParameters()

    const polykeyPath = configStore.get('polykeyPath')
    const generateKeyPair = configStore.get('generateKeyPair')
    console.log(configStore.get('generateKeyPair'));


    const keyManager = new KeyManager(polykeyPath, fs)
    if (generateKeyPair) {
      console.log('im here');

      const keyGenerationName = configStore.get('keyGenerationName')
      const keyGenerationEmail = configStore.get('keyGenerationEmail')
      const keyGenerationPassphrase = configStore.get('keyGenerationPassphrase')

      // Validate passphrase
      const passValidation = zxcvbn(keyGenerationPassphrase)
      // The following is an arbitrary delineation of desirable scores
      if (passValidation.score < 2) {
        pkLogger('passphrase score for new keypair is below 2!', PKMessageType.WARNING)
      }

      const multibar = new cliProgress.MultiBar({
        clearOnComplete: false,
        hideCursor: true,
        format: "Finding '{type}' Prime | [{bar} | {value}/{total} iterations"
      }, cliProgress.Presets.shades_classic)
      const pPrimeBar = multibar.create(10, 0, {type: 'p'})
      const qPrimeBar = multibar.create(10, 0, {type: 'q'})


      await keyManager.generateKeyPair(keyGenerationName, keyGenerationEmail, keyGenerationPassphrase, undefined, true, (info) => {
        if (info.what == 'mr' && info.section == 'p') {
          pPrimeBar.update(info.i, {type: 'p'})
        } else if (info.what == 'mr' && info.section == 'q') {
          qPrimeBar.update(info.i, {type: 'q'})
        }
      })

      pPrimeBar.stop()
      qPrimeBar.stop()
      pkLogger('')
      pkLogger('')
      pkLogger('')

      // Store the keys in the key manager's storePath
      const storePath = `${resolveTilde(keyManager.polykeyPath)}/.keypair`
      fs.mkdirSync(storePath, {recursive: true})
      const pubKeyPath = `${storePath}/public_key`
      const privKeyPath = `${storePath}/private_key`
      await keyManager.exportPublicKey(pubKeyPath)
      await keyManager.exportPrivateKey(privKeyPath)

      // Add params to config store
      configStore.set('publicKeyPath', pubKeyPath)
      configStore.set('privateKeyPath', privKeyPath)
      configStore.set('privatePassphrase', keyGenerationPassphrase)

      // Remove temporary parameters from configStore

      console.log(configStore.get('generateKeyPair'));
      configStore.set('generateKeyPair', false)
      configStore.delete('keyGenerationName')
      configStore.delete('keyGenerationEmail')
      configStore.delete('keyGenerationPassphrase')
    } else {
      const publicKeyPath = configStore.get('publicKeyPath')
      const privateKeyPath = configStore.get('privateKeyPath')
      const privatePassphrase = configStore.get('privatePassphrase')
      await keyManager.loadKeyPair(publicKeyPath, privateKeyPath, privatePassphrase)
    }

    const pk = new PolyKey(polykeyPath, fs, keyManager)
    resolve(pk)
  }))
}

export default initPolyKey
