import type { StdioOptions } from 'child_process';
import type {
  AgentStatusLiveData,
  AgentChildProcessInput,
  AgentChildProcessOutput,
} from '../types';
import type PolykeyAgent from '../../PolykeyAgent';
import type { RecoveryCode } from '../../keys/types';
import type { PolykeyWorkerManagerInterface } from '../../workers/types';
import path from 'path';
import childProcess from 'child_process';
import process from 'process';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';
import * as binErrors from '../errors';
import { promise, dirEmpty } from '../../utils';
import config from '../../config';

class CommandStart extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('start');
    this.description('Start the Polykey Agent');
    this.addOption(binOptions.recoveryCodeFile);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.addOption(binOptions.proxyHost);
    this.addOption(binOptions.proxyPort);
    this.addOption(binOptions.connConnectTime);
    this.addOption(binOptions.seedNodes);
    this.addOption(binOptions.network);
    this.addOption(binOptions.workers);
    this.addOption(binOptions.background);
    this.addOption(binOptions.backgroundOutFile);
    this.addOption(binOptions.backgroundErrFile);
    this.addOption(binOptions.fresh);
    this.addOption(binOptions.privateKeyFile);
    this.addOption(binOptions.passwordOpsLimit);
    this.addOption(binOptions.passwordMemLimit);
    this.action(async (options) => {
      options.clientHost =
        options.clientHost ?? config.defaults.networkConfig.clientHost;
      options.clientPort =
        options.clientPort ?? config.defaults.networkConfig.clientPort;
      const { default: PolykeyAgent } = await import('../../PolykeyAgent');
      const { WorkerManager, utils: workersUtils } = await import(
        '../../workers'
      );
      const nodesUtils = await import('../../nodes/utils');
      const keysUtils = await import('../../keys/utils/index');
      let password: string | undefined;
      if (options.fresh) {
        // If fresh, then get a new password
        password = await binProcessors.processNewPassword(
          options.passwordFile,
          this.fs,
        );
      } else if (options.recoveryCodeFile != null) {
        // If recovery code is supplied, then this is the new password
        password = await binProcessors.processNewPassword(
          options.passwordFile,
          this.fs,
        );
      } else if (await dirEmpty(this.fs, options.nodePath)) {
        // If the node path is empty, get a new password
        password = await binProcessors.processNewPassword(
          options.passwordFile,
          this.fs,
        );
      } else {
        // Otherwise this is the existing password
        // however, the code is capable of doing partial bootstrapping
        // so it's possible that this is also a new password
        // if the root key isn't setup
        password = await binProcessors.processPassword(
          options.passwordFile,
          this.fs,
        );
      }
      const recoveryCodeIn = await binProcessors.processRecoveryCode(
        options.recoveryCodeFile,
        this.fs,
      );
      // Will be `[{}, true]` if `--seed-nodes` is not set
      // Will be '[{}, true]' if `--seed-nodes='<defaults>'`
      // Will be '[{...}, true]' if `--seed-nodes='...;<defaults>'`
      // Will be '[{}, false]' if `--seed-nodes=''`
      // Will be '[{...}, false]' if `--seed-nodes='...'`
      const [seedNodes, defaults] = options.seedNodes;
      let seedNodes_ = seedNodes;
      if (defaults) seedNodes_ = { ...options.network, ...seedNodes };
      const agentConfig = {
        password,
        nodePath: options.nodePath,
        keyRingConfig: {
          recoveryCode: recoveryCodeIn,
          privateKeyPath: options.privateKeyFile,
          passwordOpsLimit:
            keysUtils.passwordOpsLimits[options.passwordOpsLimit],
          passwordMemLimit:
            keysUtils.passwordMemLimits[options.passwordMemLimit],
        },
        proxyConfig: {
          connConnectTime: options.connectionTimeout,
        },
        networkConfig: {
          clientHost: options.clientHost,
          clientPort: options.clientPort,
          proxyHost: options.proxyHost,
          proxyPort: options.proxyPort,
        },
        seedNodes: seedNodes_,
        fresh: options.fresh,
      };
      let statusLiveData: AgentStatusLiveData;
      let recoveryCodeOut: RecoveryCode | undefined;
      if (options.background) {
        const stdio: StdioOptions = ['ignore', 'ignore', 'ignore', 'ipc'];
        if (options.backgroundOutFile != null) {
          const agentOutFile = await this.fs.promises.open(
            options.backgroundOutFile,
            'w',
          );
          stdio[1] = agentOutFile.fd;
        }
        if (options.backgroundErrFile != null) {
          const agentErrFile = await this.fs.promises.open(
            options.backgroundErrFile,
            'w',
          );
          stdio[2] = agentErrFile.fd;
        }
        const agentProcess = childProcess.fork(
          path.join(__dirname, '../polykey-agent'),
          [],
          {
            cwd: process.cwd(),
            env: process.env,
            detached: true,
            serialization: 'advanced',
            stdio,
          },
        );
        const {
          p: agentProcessP,
          resolveP: resolveAgentProcessP,
          rejectP: rejectAgentProcessP,
        } = promise<void>();
        // Once the agent responds with message, it considered ok to go-ahead
        agentProcess.once('message', (messageOut: AgentChildProcessOutput) => {
          if (messageOut.status === 'SUCCESS') {
            agentProcess.unref();
            agentProcess.disconnect();
            recoveryCodeOut = messageOut.recoveryCode;
            statusLiveData = { ...messageOut };
            delete statusLiveData['recoveryCode'];
            delete statusLiveData['status'];
            resolveAgentProcessP();
            return;
          } else {
            rejectAgentProcessP(
              new binErrors.ErrorCLIPolykeyAgentProcess(
                'Agent process responded with error',
                messageOut.error,
              ),
            );
            return;
          }
        });
        // Handle error event during abnormal spawning, this is rare
        agentProcess.once('error', (e) => {
          rejectAgentProcessP(
            new binErrors.ErrorCLIPolykeyAgentProcess(e.message),
          );
        });
        // If the process exits during initial execution of polykey-agent script
        // Then it is an exception, because the agent process is meant to be a long-running daemon
        agentProcess.once('close', (code, signal) => {
          rejectAgentProcessP(
            new binErrors.ErrorCLIPolykeyAgentProcess(
              'Agent process closed during fork',
              {
                data: {
                  code,
                  signal,
                },
              },
            ),
          );
        });
        const messageIn: AgentChildProcessInput = {
          logLevel: this.logger.getEffectiveLevel(),
          format: options.format,
          workers: options.workers,
          agentConfig,
        };
        agentProcess.send(messageIn, (e) => {
          if (e != null) {
            rejectAgentProcessP(
              new binErrors.ErrorCLIPolykeyAgentProcess(
                'Failed sending agent process message',
              ),
            );
          }
        });
        await agentProcessP;
      } else {
        // Change process name to polykey-agent
        process.title = 'polykey-agent';
        // eslint-disable-next-line prefer-const
        let pkAgent: PolykeyAgent;
        // eslint-disable-next-line prefer-const
        let workerManager: PolykeyWorkerManagerInterface;
        this.exitHandlers.handlers.push(async () => {
          pkAgent?.unsetWorkerManager();
          await workerManager?.destroy();
          await pkAgent?.stop();
        });
        pkAgent = await PolykeyAgent.createPolykeyAgent({
          fs: this.fs,
          logger: this.logger.getChild(PolykeyAgent.name),
          ...agentConfig,
        });
        if (options.workers !== 0) {
          workerManager = await workersUtils.createWorkerManager({
            cores: options.workers,
            logger: this.logger.getChild(WorkerManager.name),
          });
          pkAgent.setWorkerManager(workerManager);
        }
        recoveryCodeOut = pkAgent.keyRing.recoveryCode;
        statusLiveData = {
          pid: process.pid,
          nodeId: nodesUtils.encodeNodeId(pkAgent.keyRing.getNodeId()),
          clientHost: pkAgent.grpcServerClient.getHost(),
          clientPort: pkAgent.grpcServerClient.getPort(),
          agentHost: pkAgent.grpcServerAgent.getHost(),
          agentPort: pkAgent.grpcServerAgent.getPort(),
          proxyHost: pkAgent.proxy.getProxyHost(),
          proxyPort: pkAgent.proxy.getProxyPort(),
          forwardHost: pkAgent.proxy.getForwardHost(),
          forwardPort: pkAgent.proxy.getForwardPort(),
        };
      }
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'dict',
          data: {
            ...statusLiveData!,
            ...(recoveryCodeOut != null
              ? { recoveryCode: recoveryCodeOut }
              : {}),
          },
        }),
      );
    });
  }
}

export default CommandStart;
