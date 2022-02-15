import type { ChildProcess } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';
import process from 'process';
import child_process from 'child_process';
import readline from 'readline';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testBinUtils from '../bin/utils';

type NATType = 'eim' | 'edm' | 'dmz' | 'edmSimple';

// Constants for all util functions
// Veth pairs (ends)
const agent1Host = 'agent1';
const agent2Host = 'agent2';
const agent1RouterHostInt = 'router1-int';
const agent1RouterHostExt = 'router1-ext';
const agent2RouterHostInt = 'router2-int';
const agent2RouterHostExt = 'router2-ext';
const router1SeedHost = 'router1-seed';
const router2SeedHost = 'router2-seed';
const seedRouter1Host = 'seed-router1';
const seedRouter2Host = 'seed-router2';
// Subnets
const agent1HostIp = '10.0.0.2';
const agent2HostIp = '10.0.0.2';
const agent1RouterHostIntIp = '10.0.0.1';
const agent2RouterHostIntIp = '10.0.0.1';
const agent1RouterHostExtIp = '192.168.0.1';
const agent2RouterHostExtIp = '192.168.0.2';
const router1SeedHostIp = '192.168.0.1';
const seedHostIp = '192.168.0.3';
const router2SeedHostIp = '192.168.0.2';
// Subnet mask
const subnetMask = '/24';
// Ports
const agent1Port = '55551';
const agent2Port = '55552';
const mappedPort = '55555';

/**
 * Formats the command to enter a namespace to run a process inside it
 */
const nsenter = (usrnsPid: number, netnsPid: number) => {
  return `nsenter --target ${usrnsPid} --user --preserve-credentials `.concat(
    `nsenter --target ${netnsPid} --net `,
  );
};

/**
 * Create a user namespace from which network namespaces can be created without
 * requiring sudo
 */
function createUserNamespace(): ChildProcess {
  return child_process.spawn('unshare', ['--user', '--map-root-user'], {
    shell: true,
  });
}

/**
 * Create a network namespace inside a user namespace
 */
function createNetworkNamespace(usrnsPid: number): ChildProcess {
  return child_process.spawn(
    'nsenter',
    [
      '--target',
      usrnsPid.toString(),
      '--user',
      '--preserve-credentials',
      'unshare',
      '--net',
    ],
    { shell: true },
  );
}

/**
 * Set up four network namespaces to allow communication between two agents
 * each behind a router
 * Brings up loopback interfaces, creates and brings up a veth pair
 * between each pair of adjacent namespaces, and adds default routing to allow
 * cross-communication
 */
function setupNetworkNamespaceInterfaces(
  usrnsPid: number,
  agent1NetnsPid: number,
  router1NetnsPid: number,
  router2NetnsPid: number,
  agent2NetnsPid: number,
) {
  // Bring up loopback
  child_process.exec(nsenter(usrnsPid, agent1NetnsPid) + `ip link set lo up`);
  child_process.exec(nsenter(usrnsPid, router1NetnsPid) + `ip link set lo up`);
  child_process.exec(nsenter(usrnsPid, router2NetnsPid) + `ip link set lo up`);
  child_process.exec(nsenter(usrnsPid, agent2NetnsPid) + `ip link set lo up`);
  // Create veth pair to link the namespaces
  child_process.exec(
    nsenter(usrnsPid, agent1NetnsPid) +
      `ip link add ${agent1Host} type veth peer name ${agent1RouterHostInt}`,
  );
  child_process.exec(
    nsenter(usrnsPid, router1NetnsPid) +
      `ip link add ${agent1RouterHostExt} type veth peer name ${agent2RouterHostExt}`,
  );
  child_process.exec(
    nsenter(usrnsPid, router2NetnsPid) +
      `ip link add ${agent2RouterHostInt} type veth peer name ${agent2Host}`,
  );
  // Link up the ends to the correct namespaces
  child_process.exec(
    nsenter(usrnsPid, agent1NetnsPid) +
      `ip link set dev ${agent1RouterHostInt} netns ${router1NetnsPid}`,
  );
  child_process.exec(
    nsenter(usrnsPid, router1NetnsPid) +
      `ip link set dev ${agent2RouterHostExt} netns ${router2NetnsPid}`,
  );
  child_process.exec(
    nsenter(usrnsPid, router2NetnsPid) +
      `ip link set dev ${agent2Host} netns ${agent2NetnsPid}`,
  );
  // Bring up each end
  child_process.exec(
    nsenter(usrnsPid, agent1NetnsPid) + `ip link set ${agent1Host} up`,
  );
  child_process.exec(
    nsenter(usrnsPid, router1NetnsPid) +
      `ip link set ${agent1RouterHostInt} up`,
  );
  child_process.exec(
    nsenter(usrnsPid, router1NetnsPid) +
      `ip link set ${agent1RouterHostExt} up`,
  );
  child_process.exec(
    nsenter(usrnsPid, router2NetnsPid) +
      `ip link set ${agent2RouterHostExt} up`,
  );
  child_process.exec(
    nsenter(usrnsPid, router2NetnsPid) +
      `ip link set ${agent2RouterHostInt} up`,
  );
  child_process.exec(
    nsenter(usrnsPid, agent2NetnsPid) + `ip link set ${agent2Host} up`,
  );
  // Assign ip addresses to each end
  child_process.exec(
    nsenter(usrnsPid, agent1NetnsPid) +
      `ip addr add ${agent1HostIp}${subnetMask} dev ${agent1Host}`,
  );
  child_process.exec(
    nsenter(usrnsPid, router1NetnsPid) +
      `ip addr add ${agent1RouterHostIntIp}${subnetMask} dev ${agent1RouterHostInt}`,
  );
  child_process.exec(
    nsenter(usrnsPid, router1NetnsPid) +
      `ip addr add ${agent1RouterHostExtIp}${subnetMask} dev ${agent1RouterHostExt}`,
  );
  child_process.exec(
    nsenter(usrnsPid, router2NetnsPid) +
      `ip addr add ${agent2RouterHostExtIp}${subnetMask} dev ${agent2RouterHostExt}`,
  );
  child_process.exec(
    nsenter(usrnsPid, router2NetnsPid) +
      `ip addr add ${agent2RouterHostIntIp}${subnetMask} dev ${agent2RouterHostInt}`,
  );
  child_process.exec(
    nsenter(usrnsPid, agent2NetnsPid) +
      `ip addr add ${agent2HostIp}${subnetMask} dev ${agent2Host}`,
  );
  // Add default routing
  child_process.exec(
    nsenter(usrnsPid, agent1NetnsPid) +
      `ip route add default via ${agent1RouterHostIntIp}`,
  );
  child_process.exec(
    nsenter(usrnsPid, router1NetnsPid) +
      `ip route add default via ${agent2RouterHostExtIp}`,
  );
  child_process.exec(
    nsenter(usrnsPid, router2NetnsPid) +
      `ip route add default via ${agent1RouterHostExtIp}`,
  );
  child_process.exec(
    nsenter(usrnsPid, agent2NetnsPid) +
      `ip route add default via ${agent2RouterHostIntIp}`,
  );
}

/**
 * Set up four network namespaces to allow communication between two agents
 * each behind a router
 * Brings up loopback interfaces, creates and brings up a veth pair
 * between each pair of adjacent namespaces, and adds default routing to allow
 * cross-communication
 */
function setupSeedNamespaceInterfaces(
  usrnsPid: number,
  seedNetnsPid: number,
  router1NetnsPid: number,
  router2NetnsPid: number,
) {
  // Bring up loopback
  child_process.exec(nsenter(usrnsPid, seedNetnsPid) + `ip link set lo up`);
  // Create veth pairs to link the namespaces
  child_process.exec(
    nsenter(usrnsPid, router1NetnsPid) +
      `ip link add ${router1SeedHost} type veth peer name ${seedRouter1Host}`,
  );
  child_process.exec(
    nsenter(usrnsPid, router2NetnsPid) +
      `ip link add ${router2SeedHost} type veth peer name ${seedRouter2Host}`,
  );
  // Move seed ends into seed network namespace
  child_process.exec(
    nsenter(usrnsPid, router1NetnsPid) +
      `ip link set dev ${seedRouter1Host} netns ${seedNetnsPid}`,
  );
  child_process.exec(
    nsenter(usrnsPid, router2NetnsPid) +
      `ip link set dev ${seedRouter2Host} netns ${seedNetnsPid}`,
  );
  // Bring up each end
  child_process.exec(
    nsenter(usrnsPid, router1NetnsPid) + `ip link set ${router1SeedHost} up`,
  );
  child_process.exec(
    nsenter(usrnsPid, seedNetnsPid) + `ip link set ${seedRouter1Host} up`,
  );
  child_process.exec(
    nsenter(usrnsPid, seedNetnsPid) + `ip link set ${seedRouter2Host} up`,
  );
  child_process.exec(
    nsenter(usrnsPid, router2NetnsPid) + `ip link set ${router2SeedHost} up`,
  );
  // Assign ip addresses to each end
  child_process.exec(
    nsenter(usrnsPid, router1NetnsPid) +
      `ip addr add ${router1SeedHostIp}${subnetMask} dev ${router1SeedHost}`,
  );
  child_process.exec(
    nsenter(usrnsPid, seedNetnsPid) +
      `ip addr add ${seedHostIp}${subnetMask} dev ${seedRouter1Host}`,
  );
  child_process.exec(
    nsenter(usrnsPid, seedNetnsPid) +
      `ip addr add ${seedHostIp}${subnetMask} dev ${seedRouter2Host}`,
  );
  child_process.exec(
    nsenter(usrnsPid, router2NetnsPid) +
      `ip addr add ${router2SeedHostIp}${subnetMask} dev ${router2SeedHost}`,
  );
  child_process.exec(
    nsenter(usrnsPid, router1NetnsPid) +
      `ip route add ${seedHostIp} dev ${router1SeedHost}`,
  );
  child_process.exec(
    nsenter(usrnsPid, router2NetnsPid) +
      `ip route add ${seedHostIp} dev ${router2SeedHost}`,
  );
  // Add default routing
  child_process.exec(
    nsenter(usrnsPid, seedNetnsPid) +
      `ip route add ${router1SeedHostIp} dev ${seedRouter1Host}`,
  );
  child_process.exec(
    nsenter(usrnsPid, seedNetnsPid) +
      `ip route add ${router2SeedHostIp} dev ${seedRouter2Host}`,
  );
}

/**
 * Runs pk command through subprocess inside a network namespace
 * This is used when a subprocess functionality needs to be used
 * This is intended for terminating subprocesses
 * Both stdout and stderr are the entire output including newlines
 * @param env Augments env for command execution
 * @param cwd Defaults to temporary directory
 */
async function pkExecNs(
  usrnsPid: number,
  netnsPid: number,
  args: Array<string> = [],
  env: Record<string, string | undefined> = {},
  cwd?: string,
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  cwd =
    cwd ?? (await fs.promises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-')));
  env = {
    ...process.env,
    ...env,
  };
  // Recall that we attempt to connect to all specified seed nodes on agent start.
  // Therefore, for testing purposes only, we default the seed nodes as empty
  // (if not defined in the env) to ensure no attempted connections. A regular
  // PolykeyAgent is expected to initially connect to the mainnet seed nodes
  env['PK_SEED_NODES'] = env['PK_SEED_NODES'] ?? '';
  const tsConfigPath = path.resolve(
    path.join(global.projectDir, 'tsconfig.json'),
  );
  const tsConfigPathsRegisterPath = path.resolve(
    path.join(global.projectDir, 'node_modules/tsconfig-paths/register'),
  );
  const polykeyPath = path.resolve(
    path.join(global.projectDir, 'src/bin/polykey.ts'),
  );
  return new Promise((resolve, reject) => {
    child_process.execFile(
      'nsenter',
      [
        '--target',
        usrnsPid.toString(),
        '--user',
        '--preserve-credentials',
        'nsenter',
        '--target',
        netnsPid.toString(),
        '--net',
        'ts-node',
        '--project',
        tsConfigPath,
        '--require',
        tsConfigPathsRegisterPath,
        '--compiler',
        'typescript-cached-transpile',
        '--transpile-only',
        polykeyPath,
        ...args,
      ],
      {
        env,
        cwd,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error != null && error.code === undefined) {
          // This can only happen when the command is killed
          return reject(error);
        } else {
          // Success and Unsuccessful exits are valid here
          return resolve({
            exitCode: error && error.code != null ? error.code : 0,
            stdout,
            stderr,
          });
        }
      },
    );
  });
}

/**
 * Launch pk command through subprocess inside a network namespace
 * This is used when a subprocess functionality needs to be used
 * This is intended for non-terminating subprocesses
 * @param env Augments env for command execution
 * @param cwd Defaults to temporary directory
 */
async function pkSpawnNs(
  usrnsPid: number,
  netnsPid: number,
  args: Array<string> = [],
  env: Record<string, string | undefined> = {},
  cwd?: string,
  logger: Logger = new Logger(pkSpawnNs.name),
): Promise<ChildProcess> {
  cwd =
    cwd ?? (await fs.promises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-')));
  env = {
    ...process.env,
    ...env,
  };
  // Recall that we attempt to connect to all specified seed nodes on agent start.
  // Therefore, for testing purposes only, we default the seed nodes as empty
  // (if not defined in the env) to ensure no attempted connections. A regular
  // PolykeyAgent is expected to initially connect to the mainnet seed nodes
  env['PK_SEED_NODES'] = env['PK_SEED_NODES'] ?? '';
  const tsConfigPath = path.resolve(
    path.join(global.projectDir, 'tsconfig.json'),
  );
  const tsConfigPathsRegisterPath = path.resolve(
    path.join(global.projectDir, 'node_modules/tsconfig-paths/register'),
  );
  const polykeyPath = path.resolve(
    path.join(global.projectDir, 'src/bin/polykey.ts'),
  );
  const subprocess = child_process.spawn(
    'nsenter',
    [
      '--target',
      usrnsPid.toString(),
      '--user',
      '--preserve-credentials',
      'nsenter',
      '--target',
      netnsPid.toString(),
      '--net',
      'ts-node',
      '--project',
      tsConfigPath,
      '--require',
      tsConfigPathsRegisterPath,
      '--compiler',
      'typescript-cached-transpile',
      '--transpile-only',
      polykeyPath,
      ...args,
    ],
    {
      env,
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      shell: true,
    },
  );
  const rlErr = readline.createInterface(subprocess.stderr!);
  rlErr.on('line', (l) => {
    // The readline library will trim newlines
    logger.info(l);
  });
  return subprocess;
}

/**
 * Setup routing between an agent and router with no NAT rules
 */
function setupDMZ(
  usrnsPid: number,
  routerNsPid: number,
  agentIp: string,
  agentPort: string,
  routerExt: string,
  routerExtIp: string,
) {
  const postroutingCommand = nsenter(usrnsPid, routerNsPid).concat(
    'iptables --table nat ',
    '--append POSTROUTING ',
    '--protocol udp ',
    `--source ${agentIp}${subnetMask} `,
    `--out-interface ${routerExt} `,
    '--jump SNAT ',
    `--to-source ${routerExtIp}:${mappedPort}`,
  );
  const preroutingCommand = nsenter(usrnsPid, routerNsPid).concat(
    'iptables --table nat ',
    '--append PREROUTING ',
    '--protocol udp ',
    `--destination-port ${mappedPort} `,
    `--in-interface ${routerExt} `,
    '--jump DNAT ',
    `--to-destination ${agentIp}:${agentPort}`,
  );
  child_process.exec(postroutingCommand);
  child_process.exec(preroutingCommand);
}

/**
 * Setup Port-Restricted Cone NAT for a namespace (on the router namespace)
 */
function setupNATEndpointIndependentMapping(
  usrnsPid: number,
  routerNsPid: number,
  agentIp: string,
  routerExt: string,
  routerInt: string,
) {
  const natCommand = nsenter(usrnsPid, routerNsPid).concat(
    'iptables --table nat ',
    '--append POSTROUTING ',
    '--protocol udp ',
    `--source ${agentIp}${subnetMask} `,
    `--out-interface ${routerExt} `,
    '--jump MASQUERADE',
  );
  const acceptLocalCommand = nsenter(usrnsPid, routerNsPid).concat(
    'iptables --table filter ',
    '--append INPUT ',
    `--in-interface ${routerInt} `,
    '--jump ACCEPT',
  );
  const acceptEstablishedCommand = nsenter(usrnsPid, routerNsPid).concat(
    'iptables --table filter ',
    '--append INPUT ',
    `--match conntrack `,
    '--cstate RELATED,ESTABLISHED ',
    '--jump ACCEPT',
  );
  const dropCommand = nsenter(usrnsPid, routerNsPid).concat(
    'iptables --table filter ',
    '--append INPUT ',
    '--jump DROP',
  );
  child_process.exec(acceptLocalCommand);
  child_process.exec(acceptEstablishedCommand);
  child_process.exec(dropCommand);
  child_process.exec(natCommand);
}

/**
 * Setup Symmetric NAT for a namespace (on the router namespace)
 */
function setupNATEndpointDependentMapping(
  usrnsPid: number,
  routerNsPid: number,
  routerExt: string,
) {
  const command = nsenter(usrnsPid, routerNsPid).concat(
    'iptables --table nat ',
    '--append POSTROUTING ',
    '--protocol udp ',
    `--out-interface ${routerExt} `,
    '--jump MASQUERADE ',
    `--random`,
  );
  child_process.exec(command);
}

/**
 * Setup Port-Restricted Cone NAT for a namespace (on the router namespace)
 */
function setupNATSimplifiedEDMAgent(
  usrnsPid: number,
  routerNsPid: number,
  agentIp: string,
  routerExt: string,
  routerInt: string,
) {
  const natCommand = nsenter(usrnsPid, routerNsPid).concat(
    'iptables --table nat ',
    '--append POSTROUTING ',
    '--protocol udp ',
    `--source ${agentIp}${subnetMask} `,
    `--out-interface ${routerExt} `,
    '--jump MASQUERADE ',
    '--to-ports 44444',
  );
  const acceptLocalCommand = nsenter(usrnsPid, routerNsPid).concat(
    'iptables --table filter ',
    '--append INPUT ',
    `--in-interface ${routerInt} `,
    '--jump ACCEPT',
  );
  const acceptEstablishedCommand = nsenter(usrnsPid, routerNsPid).concat(
    'iptables --table filter ',
    '--append INPUT ',
    `--match conntrack `,
    '--cstate RELATED,ESTABLISHED ',
    '--jump ACCEPT',
  );
  const dropCommand = nsenter(usrnsPid, routerNsPid).concat(
    'iptables --table filter ',
    '--append INPUT ',
    '--jump DROP',
  );
  child_process.exec(acceptLocalCommand);
  child_process.exec(acceptEstablishedCommand);
  child_process.exec(dropCommand);
  child_process.exec(natCommand);
}

/**
 * Setup Port-Restricted Cone NAT for a namespace (on the router namespace)
 */
function setupNATSimplifiedEDMSeed(
  usrnsPid: number,
  routerNsPid: number,
  agentIp: string,
  routerExt: string,
) {
  const natCommand = nsenter(usrnsPid, routerNsPid).concat(
    'iptables --table nat ',
    '--append POSTROUTING ',
    '--protocol udp ',
    `--source ${agentIp}${subnetMask} `,
    `--out-interface ${routerExt} `,
    '--jump MASQUERADE ',
    '--to-ports 55555',
  );
  child_process.exec(natCommand);
}

async function setupNATWithSeedNode(
  agent1NAT: NATType,
  agent2NAT: NATType,
  logger: Logger = new Logger(setupNAT.name, LogLevel.WARN, [
    new StreamHandler(),
  ]),
) {
  const dataDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'polykey-test-'),
  );
  const password = 'password';
  // Create a user namespace containing five network namespaces
  // Two agents, two routers, one seed node
  const usrns = createUserNamespace();
  const seedNetns = createNetworkNamespace(usrns.pid!);
  const agent1Netns = createNetworkNamespace(usrns.pid!);
  const agent2Netns = createNetworkNamespace(usrns.pid!);
  const router1Netns = createNetworkNamespace(usrns.pid!);
  const router2Netns = createNetworkNamespace(usrns.pid!);
  // Apply appropriate NAT rules
  switch (agent1NAT) {
    case 'dmz': {
      setupDMZ(
        usrns.pid!,
        router1Netns.pid!,
        agent1HostIp,
        agent1Port,
        agent1RouterHostExt,
        agent1RouterHostExtIp,
      );
      setupDMZ(
        usrns.pid!,
        router1Netns.pid!,
        agent1HostIp,
        agent1Port,
        router1SeedHost,
        router1SeedHostIp,
      );
      break;
    }
    case 'eim': {
      setupNATEndpointIndependentMapping(
        usrns.pid!,
        router1Netns.pid!,
        agent1HostIp,
        agent1RouterHostExt,
        agent1RouterHostInt,
      );
      setupNATEndpointIndependentMapping(
        usrns.pid!,
        router1Netns.pid!,
        agent1HostIp,
        router1SeedHost,
        agent1RouterHostInt,
      );
      break;
    }
    case 'edm': {
      setupNATEndpointDependentMapping(
        usrns.pid!,
        router1Netns.pid!,
        agent1RouterHostExt,
      );
      setupNATEndpointDependentMapping(
        usrns.pid!,
        router1Netns.pid!,
        router1SeedHost,
      );
      break;
    }
    case 'edmSimple': {
      setupNATSimplifiedEDMAgent(
        usrns.pid!,
        router1Netns.pid!,
        agent1HostIp,
        agent1RouterHostExt,
        agent1RouterHostInt,
      );
      setupNATSimplifiedEDMSeed(
        usrns.pid!,
        router1Netns.pid!,
        agent1HostIp,
        router1SeedHost,
      );
      break;
    }
  }
  switch (agent2NAT) {
    case 'dmz': {
      setupDMZ(
        usrns.pid!,
        router2Netns.pid!,
        agent2HostIp,
        agent2Port,
        agent2RouterHostExt,
        agent2RouterHostExtIp,
      );
      setupDMZ(
        usrns.pid!,
        router2Netns.pid!,
        agent2HostIp,
        agent2Port,
        router2SeedHost,
        router2SeedHostIp,
      );
      break;
    }
    case 'eim': {
      setupNATEndpointIndependentMapping(
        usrns.pid!,
        router2Netns.pid!,
        agent2HostIp,
        agent2RouterHostExt,
        agent2RouterHostInt,
      );
      setupNATEndpointIndependentMapping(
        usrns.pid!,
        router2Netns.pid!,
        agent2HostIp,
        router2SeedHost,
        agent2RouterHostInt,
      );
      break;
    }
    case 'edm': {
      setupNATEndpointDependentMapping(
        usrns.pid!,
        router2Netns.pid!,
        agent2RouterHostExt,
      );
      setupNATEndpointDependentMapping(
        usrns.pid!,
        router2Netns.pid!,
        router2SeedHost,
      );
      break;
    }
    case 'edmSimple': {
      setupNATSimplifiedEDMAgent(
        usrns.pid!,
        router2Netns.pid!,
        agent2HostIp,
        agent2RouterHostExt,
        agent2RouterHostInt,
      );
      setupNATSimplifiedEDMSeed(
        usrns.pid!,
        router2Netns.pid!,
        agent2HostIp,
        router2SeedHost,
      );
      break;
    }
  }
  setupNetworkNamespaceInterfaces(
    usrns.pid!,
    agent1Netns.pid!,
    router1Netns.pid!,
    router2Netns.pid!,
    agent2Netns.pid!,
  );
  setupSeedNamespaceInterfaces(
    usrns.pid!,
    seedNetns.pid!,
    router1Netns.pid!,
    router2Netns.pid!,
  );
  const seedNode = await pkSpawnNs(
    usrns.pid!,
    seedNetns.pid!,
    [
      'agent',
      'start',
      '--node-path',
      path.join(dataDir, 'seed'),
      '--root-key-pair-bits',
      '1024',
      '--client-host',
      '127.0.0.1',
      '--proxy-host',
      '0.0.0.0',
      '--connection-timeout',
      '1000',
      '--workers',
      '0',
      '--verbose',
      '--format',
      'json',
    ],
    {
      PK_PASSWORD: password,
    },
    dataDir,
    logger.getChild('seed'),
  );
  const rlOutSeed = readline.createInterface(seedNode.stdout!);
  const stdoutSeed = await new Promise<string>((resolve, reject) => {
    rlOutSeed.once('line', resolve);
    rlOutSeed.once('close', reject);
  });
  const nodeIdSeed = JSON.parse(stdoutSeed).nodeId;
  const proxyPortSeed = JSON.parse(stdoutSeed).proxyPort;
  const agent1 = await pkSpawnNs(
    usrns.pid!,
    agent1Netns.pid!,
    [
      'agent',
      'start',
      '--node-path',
      path.join(dataDir, 'agent1'),
      '--root-key-pair-bits',
      '1024',
      '--client-host',
      '127.0.0.1',
      '--proxy-host',
      `${agent1HostIp}`,
      '--proxy-port',
      `${agent1Port}`,
      '--workers',
      '0',
      '--connection-timeout',
      '1000',
      '--seed-nodes',
      `${nodeIdSeed}@${seedHostIp}:${proxyPortSeed}`,
      '--verbose',
      '--format',
      'json',
    ],
    {
      PK_PASSWORD: password,
    },
    dataDir,
    logger.getChild('agent1'),
  );
  const rlOutNode1 = readline.createInterface(agent1.stdout!);
  const stdoutNode1 = await new Promise<string>((resolve, reject) => {
    rlOutNode1.once('line', resolve);
    rlOutNode1.once('close', reject);
  });
  const nodeId1 = JSON.parse(stdoutNode1).nodeId;
  const agent2 = await pkSpawnNs(
    usrns.pid!,
    agent2Netns.pid!,
    [
      'agent',
      'start',
      '--node-path',
      path.join(dataDir, 'agent2'),
      '--root-key-pair-bits',
      '1024',
      '--client-host',
      '127.0.0.1',
      '--proxy-host',
      `${agent2HostIp}`,
      '--proxy-port',
      `${agent2Port}`,
      '--workers',
      '0',
      '--connection-timeout',
      '1000',
      '--seed-nodes',
      `${nodeIdSeed}@${seedHostIp}:${proxyPortSeed}`,
      '--verbose',
      '--format',
      'json',
    ],
    {
      PK_PASSWORD: password,
    },
    dataDir,
    logger.getChild('agent2'),
  );
  const rlOutNode2 = readline.createInterface(agent2.stdout!);
  const stdoutNode2 = await new Promise<string>((resolve, reject) => {
    rlOutNode2.once('line', resolve);
    rlOutNode2.once('close', reject);
  });
  const nodeId2 = JSON.parse(stdoutNode2).nodeId;
  // Until nodes add the information of nodes that connect to them must
  // do it manually
  const agent1ProxyPort =
    agent1NAT === 'dmz' || agent1NAT === 'edmSimple' ? mappedPort : agent1Port;
  const agent2ProxyPort =
    agent2NAT === 'dmz' || agent2NAT === 'edmSimple' ? mappedPort : agent2Port;
  await pkExecNs(
    usrns.pid!,
    seedNode.pid!,
    ['nodes', 'add', nodeId1, agent1RouterHostExtIp, agent1ProxyPort],
    {
      PK_NODE_PATH: path.join(dataDir, 'seed'),
      PK_PASSWORD: password,
    },
    dataDir,
  );
  await pkExecNs(
    usrns.pid!,
    seedNode.pid!,
    ['nodes', 'add', nodeId2, agent2RouterHostExtIp, agent2ProxyPort],
    {
      PK_NODE_PATH: path.join(dataDir, 'seed'),
      PK_PASSWORD: password,
    },
    dataDir,
  );
  return {
    userPid: usrns.pid,
    agent1Pid: agent1Netns.pid,
    agent2Pid: agent2Netns.pid,
    password,
    dataDir,
    agent1NodePath: path.join(dataDir, 'agent1'),
    agent2NodePath: path.join(dataDir, 'agent2'),
    agent1NodeId: nodeId1,
    agent2NodeId: nodeId2,
    tearDownNAT: async () => {
      agent2.kill('SIGTERM');
      await testBinUtils.processExit(agent2);
      agent1.kill('SIGTERM');
      await testBinUtils.processExit(agent1);
      seedNode.kill('SIGTERM');
      await testBinUtils.processExit(seedNode);
      router2Netns.kill('SIGTERM');
      await testBinUtils.processExit(router2Netns);
      router1Netns.kill('SIGTERM');
      await testBinUtils.processExit(router1Netns);
      agent2Netns.kill('SIGTERM');
      await testBinUtils.processExit(agent2Netns);
      agent1Netns.kill('SIGTERM');
      await testBinUtils.processExit(agent1Netns);
      seedNetns.kill('SIGTERM');
      await testBinUtils.processExit(seedNetns);
      usrns.kill('SIGTERM');
      await testBinUtils.processExit(usrns);
      await fs.promises.rm(dataDir, {
        force: true,
        recursive: true,
      });
    },
  };
}

async function setupNAT(
  agent1NAT: NATType,
  agent2NAT: NATType,
  logger: Logger = new Logger(setupNAT.name, LogLevel.WARN, [
    new StreamHandler(),
  ]),
) {
  const dataDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'polykey-test-'),
  );
  const password = 'password';
  // Create a user namespace containing four network namespaces
  // Two agents and two routers
  const usrns = createUserNamespace();
  const agent1Netns = createNetworkNamespace(usrns.pid!);
  const agent2Netns = createNetworkNamespace(usrns.pid!);
  const router1Netns = createNetworkNamespace(usrns.pid!);
  const router2Netns = createNetworkNamespace(usrns.pid!);
  // Apply appropriate NAT rules
  switch (agent1NAT) {
    case 'dmz': {
      setupDMZ(
        usrns.pid!,
        router1Netns.pid!,
        agent1HostIp,
        agent1Port,
        agent1RouterHostExt,
        agent1RouterHostExtIp,
      );
      break;
    }
    case 'eim': {
      setupNATEndpointIndependentMapping(
        usrns.pid!,
        router1Netns.pid!,
        agent1HostIp,
        agent1RouterHostExt,
        agent1RouterHostInt,
      );
      break;
    }
    case 'edm': {
      setupNATEndpointDependentMapping(
        usrns.pid!,
        router1Netns.pid!,
        agent1RouterHostExt,
      );
      break;
    }
    case 'edmSimple': {
      setupNATSimplifiedEDMAgent(
        usrns.pid!,
        router1Netns.pid!,
        agent1HostIp,
        agent1RouterHostExt,
        agent1RouterHostInt,
      );
      break;
    }
  }
  switch (agent2NAT) {
    case 'dmz': {
      setupDMZ(
        usrns.pid!,
        router2Netns.pid!,
        agent2HostIp,
        agent2Port,
        agent2RouterHostExt,
        agent2RouterHostExtIp,
      );
      break;
    }
    case 'eim': {
      setupNATEndpointIndependentMapping(
        usrns.pid!,
        router2Netns.pid!,
        agent2HostIp,
        agent2RouterHostExt,
        agent2RouterHostInt,
      );
      break;
    }
    case 'edm': {
      setupNATEndpointDependentMapping(
        usrns.pid!,
        router2Netns.pid!,
        agent2RouterHostExt,
      );
      break;
    }
    case 'edmSimple': {
      setupNATSimplifiedEDMAgent(
        usrns.pid!,
        router2Netns.pid!,
        agent2HostIp,
        agent2RouterHostExt,
        agent2RouterHostInt,
      );
      break;
    }
  }
  setupNetworkNamespaceInterfaces(
    usrns.pid!,
    agent1Netns.pid!,
    router1Netns.pid!,
    router2Netns.pid!,
    agent2Netns.pid!,
  );
  const agent1 = await pkSpawnNs(
    usrns.pid!,
    agent1Netns.pid!,
    [
      'agent',
      'start',
      '--node-path',
      path.join(dataDir, 'agent1'),
      '--root-key-pair-bits',
      '1024',
      '--client-host',
      '127.0.0.1',
      '--proxy-host',
      `${agent1HostIp}`,
      '--proxy-port',
      `${agent1Port}`,
      '--connection-timeout',
      '1000',
      '--workers',
      '0',
      '--verbose',
      '--format',
      'json',
    ],
    {
      PK_PASSWORD: password,
    },
    dataDir,
    logger.getChild('agent1'),
  );
  const rlOutNode1 = readline.createInterface(agent1.stdout!);
  const stdoutNode1 = await new Promise<string>((resolve, reject) => {
    rlOutNode1.once('line', resolve);
    rlOutNode1.once('close', reject);
  });
  const nodeId1 = JSON.parse(stdoutNode1).nodeId;
  const agent2 = await pkSpawnNs(
    usrns.pid!,
    agent2Netns.pid!,
    [
      'agent',
      'start',
      '--node-path',
      path.join(dataDir, 'agent2'),
      '--root-key-pair-bits',
      '1024',
      '--client-host',
      '127.0.0.1',
      '--proxy-host',
      `${agent2HostIp}`,
      '--proxy-port',
      `${agent2Port}`,
      '--connection-timeout',
      '1000',
      '--workers',
      '0',
      '--verbose',
      '--format',
      'json',
    ],
    {
      PK_PASSWORD: password,
    },
    dataDir,
    logger.getChild('agent2'),
  );
  const rlOutNode2 = readline.createInterface(agent2.stdout!);
  const stdoutNode2 = await new Promise<string>((resolve, reject) => {
    rlOutNode2.once('line', resolve);
    rlOutNode2.once('close', reject);
  });
  const nodeId2 = JSON.parse(stdoutNode2).nodeId;
  return {
    userPid: usrns.pid,
    agent1Pid: agent1Netns.pid,
    agent2Pid: agent2Netns.pid,
    password,
    dataDir,
    agent1NodePath: path.join(dataDir, 'agent1'),
    agent2NodePath: path.join(dataDir, 'agent2'),
    agent1NodeId: nodeId1,
    agent1Host: agent1RouterHostExtIp,
    agent1ProxyPort:
      agent1NAT === 'dmz'
        ? mappedPort
        : agent1NAT === 'edmSimple'
        ? '44444'
        : agent1Port,
    agent2NodeId: nodeId2,
    agent2Host: agent2RouterHostExtIp,
    agent2ProxyPort:
      agent2NAT === 'dmz'
        ? mappedPort
        : agent2NAT === 'edmSimple'
        ? '44444'
        : agent2Port,
    tearDownNAT: async () => {
      agent2.kill('SIGTERM');
      await testBinUtils.processExit(agent2);
      agent1.kill('SIGTERM');
      await testBinUtils.processExit(agent1);
      router2Netns.kill('SIGTERM');
      await testBinUtils.processExit(router2Netns);
      router1Netns.kill('SIGTERM');
      await testBinUtils.processExit(router1Netns);
      agent2Netns.kill('SIGTERM');
      await testBinUtils.processExit(agent2Netns);
      agent1Netns.kill('SIGTERM');
      await testBinUtils.processExit(agent1Netns);
      usrns.kill('SIGTERM');
      await testBinUtils.processExit(usrns);
      await fs.promises.rm(dataDir, {
        force: true,
        recursive: true,
      });
    },
  };
}

export {
  createUserNamespace,
  createNetworkNamespace,
  setupNetworkNamespaceInterfaces,
  pkExecNs,
  pkSpawnNs,
  setupNAT,
  setupNATWithSeedNode,
};
