import fs from 'fs';
import path from 'path';
import commander from 'commander';
import * as pb from '../../../proto/compiled/Agent_pb';
import { actionRunner, PKMessageType, determineNodePath, promisifyGrpc, getAgentClient, getPKLogger } from '../utils';

function makeGetRootCertificateCommand() {
  return new commander.Command('root')
    .description('retrieve the root certificate')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)

        const client = await getAgentClient(nodePath,undefined,undefined,undefined,pkLogger);
        const res = (await promisifyGrpc(client.getRootCertificate.bind(client))(
          new pb.EmptyMessage(),
        )) as pb.StringMessage;
        pkLogger.logV1('Current Node Root Certificate:', PKMessageType.INFO);
        pkLogger.logV0(res.getS(), PKMessageType.SUCCESS);
      }),
    );
}

function makeNewCertCommand() {
  return new commander.Command('cert')
    .description('create a new certificate signed by the polykey ca')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .requiredOption('-ch, --client-host <clientHost>', '(required) host of the client')
    .requiredOption('-cp, --cert-path <certPath>', '(required) where to write the cert file')
    .requiredOption('-kp, --key-path <keyPath>', '(required) where to write the private key file')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)

        const client = await getAgentClient(nodePath,undefined,undefined,undefined,pkLogger);
        const request = new pb.NewClientCertificateMessage()
        request.setDomain(options.clientHost)

        const certPath = path.resolve(options.certPath)
        const keyPath = path.resolve(options.keyPath)
        request.setCertFile(certPath)
        request.setKeyFile(keyPath)
        const res = (await promisifyGrpc(client.newClientCertificate.bind(client))(
          request,
        )) as pb.NewClientCertificateMessage;
        pkLogger.logV1('Certificate:', PKMessageType.INFO);
        pkLogger.logV0(res.getCertFile(), PKMessageType.SUCCESS);
        pkLogger.logV1('Private Key:', PKMessageType.INFO);
        pkLogger.logV0(res.getKeyFile(), PKMessageType.SUCCESS);
      }),
    );
}

function makeCACommand() {
  return new commander.Command('ca')
    .description('certificate authority operations')
    .addCommand(makeGetRootCertificateCommand())
    .addCommand(makeNewCertCommand());
}

export default makeCACommand;
