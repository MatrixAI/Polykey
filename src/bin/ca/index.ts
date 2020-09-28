import fs from 'fs';
import path from 'path';
import commander from 'commander';
import * as pb from '../../../proto/compiled/Agent_pb';
import { actionRunner, pkLogger, PKMessageType, determineNodePath, promisifyGrpc, getAgentClient } from '../utils';

function makeGetRootCertificateCommand() {
  return new commander.Command('root')
    .description('retrieve the root certificate')
    .option('--node-path <nodePath>', 'node path')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);

        const client = await getAgentClient(nodePath);
        const res = (await promisifyGrpc(client.getRootCertificate.bind(client))(
          new pb.EmptyMessage(),
        )) as pb.StringMessage;
        pkLogger(res.getS(), PKMessageType.SUCCESS);
      }),
    );
}

function makeNewCertCommand() {
  return new commander.Command('cert')
    .description('create a new certificate signed by the polykey ca')
    .option('--node-path <nodePath>', 'node path')
    .requiredOption('-ch, --client-host <clientHost>', 'host of the client')
    .requiredOption('-cp, --cert-path <certPath>', 'where to write the cert file')
    .requiredOption('-kp, --key-path <keyPath>', 'where to write the private key file')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);

        const client = await getAgentClient(nodePath);
        const request = new pb.NewClientCertificateMessage()
        request.setDomain(options.clientHost)

        const certPath = path.resolve(options.certPath)
        const keyPath = path.resolve(options.keyPath)
        request.setCertFile(certPath)
        request.setKeyFile(keyPath)
        const res = (await promisifyGrpc(client.newClientCertificate.bind(client))(
          request,
        )) as pb.NewClientCertificateMessage;
        pkLogger('Certificate:', PKMessageType.INFO);
        pkLogger(res.getCertFile(), PKMessageType.SUCCESS);
        pkLogger('Private Key:', PKMessageType.INFO);
        pkLogger(res.getKeyFile(), PKMessageType.SUCCESS);
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
