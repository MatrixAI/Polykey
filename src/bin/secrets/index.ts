import os from 'os';
import fs from 'fs';
import path from 'path';
import process from 'process';
import commander from 'commander';
import { spawn, execSync } from 'child_process';
import * as agentPB from '../../../proto/js/Agent_pb';
import {
  actionRunner,
  getPKLogger,
  PKMessageType,
  resolveKeynodeStatePath,
  getAgentClient,
  promisifyGrpc,
} from '../utils';
import { randomString } from '../../utils';

const pathRegex = /^([\w-]+)(?::)([\w\-\\\/\.\$]+)(?:=)?([a-zA-Z_][\w]+)?$/;

const commandListSecrets = new commander.Command('list');
commandListSecrets.description('list all available secrets for a given vault');
commandListSecrets.alias('ls');
commandListSecrets.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandListSecrets.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandListSecrets.requiredOption(
  '-vn, --vault-names, <vaultNames>',
  'the vault names to list secrets for, e.g. vault1 or "vault1 vault2"',
);
commandListSecrets.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const vaultNames: string[] = options.vaultNames.split(' ');

    if (!vaultNames.length) {
      throw Error('no vault names provided');
    }

    for (const vaultName of vaultNames) {
      // Get list of secrets from pk
      const request = new agentPB.StringMessage();
      request.setS(vaultName);
      const res = (await promisifyGrpc(client.listSecrets.bind(client))(
        request,
      )) as agentPB.StringListMessage;
      const secretNames = res.getSList();

      // List secrets
      if (secretNames.length == 0) {
        pkLogger.logV2(
          `no secrets found for vault '${vaultName}'`,
          PKMessageType.INFO,
        );
      } else {
        pkLogger.logV2(
          `secrets contained within the ${vaultName} vault:`,
          PKMessageType.INFO,
        );
        secretNames.forEach((secretName) =>
          pkLogger.logV1(`${vaultName}:${secretName}`, PKMessageType.SUCCESS),
        );
      }
    }
  }),
);

const commandNewSecret = new commander.Command('new');
commandNewSecret.description(
  "create a secret within a given vault, specify a secret path with '<vaultName>:<secretPath>'",
);
commandNewSecret.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandNewSecret.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandNewSecret.option(
  '-f, --file-path <filePath>',
  'path to the secret to be added',
);
commandNewSecret.option(
  '-sp, --secret-path <secretPath>',
  "secret path of the format '<vaultName>:<secretPath>'",
);
commandNewSecret.option(
  '-d, --directory <directory>',
  'path to the directory of secret(s) to be added',
);
commandNewSecret.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const secretPath: string = options.secretPath;
    if (!pathRegex.test(secretPath)) {
      throw Error(
        "please specify a new secret name using the format: '<existingVaultName>:<secretName>'",
      );
    }
    const [, vaultName, secretName] = secretPath.match(pathRegex)!;
    try {
      // Add the secret
      const request = new agentPB.SecretContentMessage();
      const secretPath = new agentPB.SecretPathMessage();
      secretPath.setVaultName(vaultName);
      secretPath.setSecretName(secretName);
      request.setSecretPath(secretPath);
      request.setSecretFilePath(options.filePath);
      await promisifyGrpc(client.newSecret.bind(client))(request);

      pkLogger.logV2(
        `secret '${secretName}' was successfully added to vault '${vaultName}'`,
        PKMessageType.SUCCESS,
      );
    } catch (err) {
      throw Error(`Error when adding secret: ${err.message}`);
    }
  }),
);

const commandNewDirSecret = new commander.Command('dir');
commandNewDirSecret.description(
  "create a secret within a given vault, specify a secret path with '<vaultName>:<secretPath>'",
);
commandNewDirSecret.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandNewDirSecret.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandNewDirSecret.requiredOption(
  '-vn, --vault-name <vaultName>',
  'name of the vault to which the secret(s) will be added',
);
commandNewDirSecret.requiredOption(
  '-d, --directory <directory>',
  'path to the directory of secret(s) to be added',
);
commandNewDirSecret.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    try {
      // Add the secret
      const vaultName = options.vaultName;
      const dirPath = options.directory;
      const request = new agentPB.SecretContentMessage();
      const secretPath = new agentPB.SecretPathMessage();
      secretPath.setVaultName(vaultName);
      request.setSecretFilePath(dirPath);
      request.setSecretPath(secretPath);
      await promisifyGrpc(client.newSecret.bind(client))(request);

      pkLogger.logV2(
        `secret directory '${dirPath}' was recursively added to vault '${vaultName}'`,
        PKMessageType.SUCCESS,
      );
    } catch (err) {
      throw Error(`Error when adding secrets: ${err.message}`);
    }
  }),
);

const commandUpdateSecret = new commander.Command('update');
commandUpdateSecret.description(
  "update a secret within a given vault, specify a secret path with '<vaultName>:<secretPath>'",
);
commandUpdateSecret.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandUpdateSecret.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandUpdateSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  "secret path of the format '<vaultName>:<secretPath>'",
);
commandUpdateSecret.requiredOption(
  '-f, --file-path <filePath>',
  '(required) path to the new secret',
);
commandUpdateSecret.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const secretPath: string = options.secretPath;
    if (!pathRegex.test(secretPath)) {
      throw Error(
        "please specify a new secret name using the format: '<existingVaultName>:<secretName>'",
      );
    }
    const [, vaultName, secretName] = secretPath.match(pathRegex)!;
    try {
      // Update the secret
      const request = new agentPB.SecretContentMessage();
      const secretPath = new agentPB.SecretPathMessage();
      secretPath.setVaultName(vaultName);
      secretPath.setSecretName(secretName);
      request.setSecretPath(secretPath);
      request.setSecretFilePath(options.filePath);
      await promisifyGrpc(client.updateSecret.bind(client))(request);

      pkLogger.logV2(
        `secret '${secretName}' was successfully updated in vault '${vaultName}'`,
        PKMessageType.SUCCESS,
      );
    } catch (err) {
      throw Error(`Error when updating secret: ${err.message}`);
    }
  }),
);

const commandEditSecret = new commander.Command('edit');
commandEditSecret.alias('ed');
commandEditSecret.description(
  "edit a secret with the default system editor, specify a secret path with '<vaultName>:<secretPath>'",
);
commandEditSecret.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandEditSecret.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandEditSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  "secret path of the format '<vaultName>:<secretPath>'",
);
commandEditSecret.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const secretPath: string = options.secretPath;
    if (!pathRegex.test(secretPath)) {
      throw Error(
        "please specify a new secret name using the format: '<existingVaultName>:<secretName>'",
      );
    }
    const [, vaultName, secretName] = secretPath.match(pathRegex)!;
    try {
      // Retrieve the secret
      const request = new agentPB.SecretPathMessage();
      request.setVaultName(vaultName);
      request.setSecretName(secretName);
      const res = (await promisifyGrpc(client.getSecret.bind(client))(
        request,
      )) as agentPB.StringMessage;
      const secret = res.getS();

      // Linux
      // make a temp file for editing
      const tmpDir = fs.mkdtempSync(
        `${os.tmpdir}/pksecret${randomString()}${randomString()}`,
      );
      const tmpFile = path.join(
        tmpDir,
        `pksecret${randomString()}${randomString()}`,
      );
      // write secret to file
      fs.writeFileSync(tmpFile, secret);
      // open editor
      execSync(`$EDITOR \"${tmpFile}\"`, { stdio: 'inherit' });
      // send updated secret to polykey
      const updateRequest = new agentPB.SecretContentMessage();
      const secretPath = new agentPB.SecretPathMessage();
      secretPath.setVaultName(vaultName);
      secretPath.setSecretName(secretName);
      updateRequest.setSecretPath(secretPath);
      updateRequest.setSecretFilePath(tmpFile);
      await promisifyGrpc(client.updateSecret.bind(client))(updateRequest);
      // remove temp directory
      fs.rmdirSync(tmpDir, { recursive: true });

      // Windows
      // TODO: complete windows impl

      pkLogger.logV2(
        `secret '${secretName}' was successfully updated in vault '${vaultName}'`,
        PKMessageType.SUCCESS,
      );
    } catch (err) {
      throw Error(`error when editing secret: ${err.message}`);
    }
  }),
);

const commandDeleteSecret = new commander.Command('delete');
commandDeleteSecret.alias('del');
commandDeleteSecret.description(
  "delete a secret or sub directory from a given vault, specify a secret path with '<vaultName>:<secretPath|subDirectoryPath>'",
);
commandDeleteSecret.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandDeleteSecret.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandDeleteSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  "secret path of the format '<vaultName>:<secretPath>'",
);
commandDeleteSecret.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const secretPath: string = options.secretPath;
    if (!pathRegex.test(secretPath)) {
      throw Error(
        "please specify a new secret name using the format: '<existingVaultName>:<secretName>'",
      );
    }
    const [, vaultName, secretName] = secretPath.match(pathRegex)!;
    try {
      // Remove secret
      const request = new agentPB.SecretPathMessage();
      request.setVaultName(vaultName);
      request.setSecretName(secretName);
      await promisifyGrpc(client.deleteSecret.bind(client))(request);

      pkLogger.logV2(
        `secret '${secretName}' was successfully removed from vault '${vaultName}'`,
        PKMessageType.SUCCESS,
      );
    } catch (err) {
      throw Error(`Error when removing secret: ${err.message}`);
    }
  }),
);

const commandGetSecret = new commander.Command('get');
commandGetSecret.description(
  "retrieve a secret from a given vault, specify a secret path with '<vaultName>:<secretPath>'",
);
commandGetSecret.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandGetSecret.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandGetSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  "secret path of the format '<vaultName>:<secretPath>'",
);
commandGetSecret.option(
  '-e, --env',
  'wrap the secret in an environment variable declaration',
);
commandGetSecret.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const isEnv: boolean = options.env ?? false;

    const secretPath: string = options.secretPath;
    if (!pathRegex.test(secretPath)) {
      throw Error(
        "please specify a new secret name using the format: '<existingVaultName>:<secretName>'",
      );
    }
    const [, vaultName, secretName] = secretPath.match(pathRegex)!;
    try {
      // Retrieve secret
      const request = new agentPB.SecretPathMessage();
      request.setVaultName(vaultName);
      request.setSecretName(secretName);
      const res = (await promisifyGrpc(client.getSecret.bind(client))(
        request,
      )) as agentPB.StringMessage;
      const secret = res.getS();

      if (isEnv) {
        pkLogger.logV1(
          `export ${secretName.toUpperCase().replace('-', '_')}='${secret}'`,
          PKMessageType.none,
        );
      } else {
        pkLogger.logV1(secret.toString(), PKMessageType.none);
      }
    } catch (err) {
      throw Error(`Error when retrieving secret: ${err.message}`);
    }
  }),
);

const commandSecretEnv = new commander.Command('env');
commandSecretEnv.storeOptionsAsProperties(false);
commandSecretEnv.description(
  "run a modified environment with injected secrets, specify a secret path with '<vaultName>:<secretPath>[=<variableName>]'",
);
commandSecretEnv.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandSecretEnv.option(
  '--command <command>',
  'In the environment of the derivation, run the shell command cmd. This command is executed in an interactive shell. (Use --run to use a non-interactive shell instead.)',
);
commandSecretEnv.option(
  '--run <run>',
  'Like --command, but executes the command in a non-interactive shell. This means (among other things) that if you hit Ctrl-C while the command is running, the shell exits.',
);
commandSecretEnv.arguments(
  "secrets to inject into env, of the format '<vaultName>:<secretPath>[=<variableName>]'. you can also control what the environment variable will be called using '<vaultName>:<secretPath>[=<variableName>]', defaults to upper, snake case of the original secret name.",
);
commandSecretEnv.action(
  actionRunner(async (cmd) => {
    const options = cmd.opts();

    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const command: string | undefined = options.command;
    const run: string | undefined = options.run;

    const secretPathList: string[] = Array.from<string>(cmd.args.values());

    if (secretPathList.length < 1) {
      throw Error('please specify at least one secret');
    }

    // Parse secret paths in list
    const parsedPathList: {
      vaultName: string;
      secretName: string;
      variableName: string;
    }[] = [];
    for (const path of secretPathList) {
      if (!pathRegex.test(path)) {
        throw Error(
          `secret path was not of the format '<vaultName>:<secretPath>[=<variableName>]': ${path}`,
        );
      }
      const [, vaultName, secretName, variableName] = path.match(pathRegex)!;
      parsedPathList.push({
        vaultName,
        secretName,
        variableName:
          variableName ?? secretName.toUpperCase().replace('-', '_'),
      });
    }

    const secretEnv = { ...process.env };
    try {
      // Get all the secrets
      for (const obj of parsedPathList) {
        const request = new agentPB.SecretPathMessage();
        request.setVaultName(obj.vaultName);
        request.setSecretName(obj.secretName);
        const res = (await promisifyGrpc(client.getSecret.bind(client))(
          request,
        )) as agentPB.StringMessage;
        const secret = res.getS();

        secretEnv[obj.variableName] = secret;
      }
    } catch (err) {
      throw Error(`Error when retrieving secret: ${err.message}`);
    }
    try {
      const shellPath = process.env.SHELL ?? 'sh';
      const args: string[] = [];
      if (command && run) {
        throw Error('only one of --command or --run can be specified');
      } else if (command) {
        args.push('-i');
        args.push('-c');
        args.push(`"${command}"`);
      } else if (run) {
        args.push('-c');
        args.push(`"${run}"`);
      }
      const shell = spawn(shellPath, args, {
        stdio: 'inherit',
        env: secretEnv,
        shell: true,
      });
      shell.on('close', (code) => {
        if (code != 0) {
          pkLogger.logV1(
            `polykey: environment terminated with code: ${code}`,
            PKMessageType.WARNING,
          );
        }
      });
    } catch (err) {
      throw Error(`Error when running environment: ${err.message}`);
    }
  }, false),
);

const commandSecrets = new commander.Command('secrets');
commandSecrets.description('manipulate secrets for a given vault');
commandSecrets.addCommand(commandListSecrets);
commandSecrets.addCommand(commandNewSecret);
commandSecrets.addCommand(commandNewDirSecret);
commandSecrets.addCommand(commandUpdateSecret);
commandSecrets.addCommand(commandEditSecret);
commandSecrets.addCommand(commandDeleteSecret);
commandSecrets.addCommand(commandGetSecret);
commandSecrets.addCommand(commandSecretEnv);

export default commandSecrets;
