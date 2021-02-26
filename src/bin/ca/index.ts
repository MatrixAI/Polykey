import process from 'process';
import path from 'path';
import * as agentPB from '../../../proto/js/Agent_pb';
import {
  createCommand,
  verboseToLogLevel,
  promisifyGrpc,
  getAgentClient,
} from '../utils';
import { getNodePath } from '../../utils';

const commandGetRootCertificate = createCommand('root', { verbose: true });
commandGetRootCertificate.description('retrieve the root certificate');
commandGetRootCertificate.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandGetRootCertificate.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const res = (await promisifyGrpc(client.getRootCertificate.bind(client))(
    new agentPB.EmptyMessage(),
  )) as agentPB.StringMessage;
  process.stdout.write('Current Node Root Certificate:\n');
  process.stdout.write(res.getS() + '\n');
});

const commandNewCert = createCommand('cert', { verbose: true });
commandNewCert.description('create a new certificate signed by the polykey ca');
commandNewCert.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandNewCert.requiredOption(
  '-ch, --client-host <clientHost>',
  '(required) host of the client',
);
commandNewCert.requiredOption(
  '-cp, --cert-path <certPath>',
  '(required) where to write the cert file',
);
commandNewCert.requiredOption(
  '-kp, --key-path <keyPath>',
  '(required) where to write the private key file',
);
commandNewCert.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.NewClientCertificateMessage();
  request.setDomain(options.clientHost);
  const certPath = path.resolve(options.certPath);
  const keyPath = path.resolve(options.keyPath);
  request.setCertFile(certPath);
  request.setKeyFile(keyPath);
  const res = (await promisifyGrpc(client.newClientCertificate.bind(client))(
    request,
  )) as agentPB.NewClientCertificateMessage;
  process.stdout.write('Certificate:\n');
  process.stdout.write(res.getCertFile() + '\n');
  process.stdout.write('Private Key:\n');
  process.stdout.write(res.getKeyFile() + '\n');
});

const commandCA = createCommand('ca');
commandCA.description('certificate authority operations');
commandCA.addCommand(commandGetRootCertificate);
commandCA.addCommand(commandNewCert);

export default commandCA;
