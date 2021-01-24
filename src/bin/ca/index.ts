import path from 'path';
import commander from 'commander';
import * as agentPB from '../../proto/js/Agent_pb';
import {
  actionRunner,
  PKMessageType,
  resolveKeynodeStatePath,
  promisifyGrpc,
  getAgentClient,
  getPKLogger,
} from '../utils';

const commandGetRootCertificate = new commander.Command('root');
commandGetRootCertificate.description('retrieve the root certificate');
commandGetRootCertificate.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandGetRootCertificate.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandGetRootCertificate.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);

    const client = await getAgentClient(nodePath, pkLogger);
    const res = (await promisifyGrpc(client.getRootCertificate.bind(client))(
      new agentPB.EmptyMessage(),
    )) as agentPB.StringMessage;
    pkLogger.logV2('Current Node Root Certificate:', PKMessageType.INFO);
    pkLogger.logV1(res.getS(), PKMessageType.SUCCESS);
  }),
);

const commandNewCert = new commander.Command('cert');
commandNewCert.description('create a new certificate signed by the polykey ca');
commandNewCert.option('-k, --node-path <nodePath>', 'provide the polykey path');
commandNewCert.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
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
commandNewCert.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);

    const client = await getAgentClient(nodePath, pkLogger);
    const request = new agentPB.NewClientCertificateMessage();
    request.setDomain(options.clientHost);

    const certPath = path.resolve(options.certPath);
    const keyPath = path.resolve(options.keyPath);
    request.setCertFile(certPath);
    request.setKeyFile(keyPath);
    const res = (await promisifyGrpc(client.newClientCertificate.bind(client))(
      request,
    )) as agentPB.NewClientCertificateMessage;
    pkLogger.logV2('Certificate:', PKMessageType.INFO);
    pkLogger.logV1(res.getCertFile(), PKMessageType.SUCCESS);
    pkLogger.logV2('Private Key:', PKMessageType.INFO);
    pkLogger.logV1(res.getKeyFile(), PKMessageType.SUCCESS);
  }),
);

const commandCA = new commander.Command('ca');
commandCA.description('certificate authority operations');
commandCA.addCommand(commandGetRootCertificate);
commandCA.addCommand(commandNewCert);

export default commandCA;
