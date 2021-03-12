import os from 'os';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { spawn, execSync } from 'child_process';
import * as agentPB from '../../proto/js/Agent_pb';
import {
  createCommand,
  verboseToLogLevel,
  getAgentClient,
  promisifyGrpc,
} from '../utils';
import { randomString } from '../../utils';
import { getNodePath } from '../../utils';

const pathRegex = /^([\w-]+)(?::)([\w\-\\\/\.\$]+)(?:=)?([a-zA-Z_][\w]+)?$/;

const commandListSecrets = createCommand('list', { verbose: true });
commandListSecrets.description('list all available secrets for a given vault');
commandListSecrets.alias('ls');
commandListSecrets.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandListSecrets.requiredOption(
  '-vn, --vault-names, <vaultNames>',
  'the vault names to list secrets for, e.g. vault1 or "vault1 vault2"',
);
commandListSecrets.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
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
      process.stdout.write(`no secrets found for vault '${vaultName}'\n`);
    } else {
      process.stdout.write(
        `secrets contained within the ${vaultName} vault:\n`,
      );
      secretNames.forEach((secretName) =>
        process.stdout.write(`${vaultName}:${secretName}\n`),
      );
    }
  }
});

const commandNewSecret = createCommand('new', { verbose: true });
commandNewSecret.description(
  "create a secret within a given vault, specify a secret path with '<vaultName>:<secretPath>'",
);
commandNewSecret.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
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
commandNewSecret.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
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
    process.stdout.write(
      `secret '${secretName}' was successfully added to vault '${vaultName}'\n`,
    );
  } catch (err) {
    throw Error(`Error when adding secret: ${err.message}`);
  }
});

const commandNewDirSecret = createCommand('dir', { verbose: true });
commandNewDirSecret.description(
  "create a secret within a given vault, specify a secret path with '<vaultName>:<secretPath>'",
);
commandNewDirSecret.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandNewDirSecret.requiredOption(
  '-vn, --vault-name <vaultName>',
  'name of the vault to which the secret(s) will be added',
);
commandNewDirSecret.requiredOption(
  '-d, --directory <directory>',
  'path to the directory of secret(s) to be added',
);
commandNewDirSecret.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
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
    process.stdout.write(
      `secret directory '${dirPath}' was recursively added to vault '${vaultName}'\n`,
    );
  } catch (err) {
    throw Error(`Error when adding secrets: ${err.message}`);
  }
});

const commandUpdateSecret = createCommand('update', { verbose: true });
commandUpdateSecret.description(
  "update a secret within a given vault, specify a secret path with '<vaultName>:<secretPath>'",
);
commandUpdateSecret.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandUpdateSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  "secret path of the format '<vaultName>:<secretPath>'",
);
commandUpdateSecret.requiredOption(
  '-f, --file-path <filePath>',
  '(required) path to the new secret',
);
commandUpdateSecret.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
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
    process.stdout.write(
      `secret '${secretName}' was successfully updated in vault '${vaultName}'\n`,
    );
  } catch (err) {
    throw Error(`Error when updating secret: ${err.message}`);
  }
});

const commandEditSecret = createCommand('edit', { verbose: true });
commandEditSecret.alias('ed');
commandEditSecret.description(
  "edit a secret with the default system editor, specify a secret path with '<vaultName>:<secretPath>'",
);
commandEditSecret.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandEditSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  "secret path of the format '<vaultName>:<secretPath>'",
);
commandEditSecret.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
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

    process.stdout.write(
      `secret '${secretName}' was successfully updated in vault '${vaultName}'\n`,
    );
  } catch (err) {
    throw Error(`error when editing secret: ${err.message}`);
  }
});

const commandDeleteSecret = createCommand('delete', { verbose: true });
commandDeleteSecret.alias('del');
commandDeleteSecret.description(
  "delete a secret or sub directory from a given vault, specify a secret path with '<vaultName>:<secretPath|subDirectoryPath>'",
);
commandDeleteSecret.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandDeleteSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  "secret path of the format '<vaultName>:<secretPath>'",
);
commandDeleteSecret.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
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
    process.stdout.write(
      `secret '${secretName}' was successfully removed from vault '${vaultName}'\n`,
    );
  } catch (err) {
    throw Error(`Error when removing secret: ${err.message}`);
  }
});

const commandGetSecret = createCommand('get', { verbose: true });
commandGetSecret.description(
  "retrieve a secret from a given vault, specify a secret path with '<vaultName>:<secretPath>'",
);
commandGetSecret.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandGetSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  "secret path of the format '<vaultName>:<secretPath>'",
);
commandGetSecret.option(
  '-e, --env',
  'wrap the secret in an environment variable declaration',
);
commandGetSecret.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
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
      process.stdout.write(
        `export ${secretName.toUpperCase().replace('-', '_')}='${secret}'\n`,
      );
    } else {
      process.stdout.write(secret.toString() + '\n');
    }
  } catch (err) {
    throw Error(`Error when retrieving secret: ${err.message}`);
  }
});

const commandSecretEnv = createCommand('env', { verbose: true });
commandSecretEnv.description(
  "run a modified environment with injected secrets, specify a secret path with '<vaultName>:<secretPath>[=<variableName>]'",
);
commandSecretEnv.option(
  '-np, --node-path <nodePath>',
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
commandSecretEnv.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);

  const secretPathList: string[] = Array.from<string>(command.args.values());

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
      variableName: variableName ?? secretName.toUpperCase().replace('-', '_'),
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
    if (options.command && options.run) {
      throw Error('only one of --command or --run can be specified');
    } else if (options.command) {
      args.push('-i');
      args.push('-c');
      args.push(`"${options.command}"`);
    } else if (options.run) {
      args.push('-c');
      args.push(`"${options.run}"`);
    }
    const shell = spawn(shellPath, args, {
      stdio: 'inherit',
      env: secretEnv,
      shell: true,
    });
    shell.on('close', (code) => {
      if (code != 0) {
        process.stdout.write(
          `polykey: environment terminated with code: ${code}\n`,
        );
      }
    });
  } catch (err) {
    throw Error(`Error when running environment: ${err.message}`);
  }
});

const commandSecrets = createCommand('secrets');
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
