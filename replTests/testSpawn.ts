//ts-node -r tsconfig-paths/register src/bin/polykey.ts
import { spawn } from "child_process";
import { sleep } from "../src/utils";
import fs from "fs";
import path from "path";
import os, { tmpdir } from "os";
import { SpawnOptions } from "child_process";
import { checkAgentRunning } from "../src/agent/utils";
import { Lockfile } from "../src/lockfile";

function pkTestSubProcess(argv){
  const agent = spawn('npm', ['run', 'polykey', '--', ...argv ]);

  //We're not getting anything out of STDOUT or STDERR. need to look into this.
  // agent.stdout.on('data', (data) => console.log(`stdout: ${data}`));
  // agent.stderr.on('data', (data) => console.log(`stderr: ${data}`));
  agent.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });
  agent.on('error', (err) => {
    console.error('Failed to start subprocess.', err);
  });

  return agent;
}


async function main() {

  let dataDir = 'tmp/';
  let nodePath: string;
  let passwordFile: string;
  const password = 'passsword';

  // dataDir = await fs.promises.mkdtemp(
  //   path.join(os.tmpdir(), 'polykey-test-'),
  // );
  nodePath = path.join(dataDir, 'keyNode');
  passwordFile = path.join(dataDir, 'passwordFile');
  await fs.promises.writeFile(passwordFile, password);

  // testing
  const commands = [
    'agent',
    'start',
    '-np',
    nodePath,
    '--password-file',
    passwordFile,];

  const agent = pkTestSubProcess(commands);

  console.log('pid', agent.pid);
  await sleep(30000);
  console.log(nodePath);
  console.log(await checkAgentRunning(nodePath));

  const lock = await Lockfile.parseLock(
    fs,
    path.join(nodePath, 'agent-lock.json')
  )
  console.log(lock.pid);
  process.kill(lock.pid);

  // await agent.kill();
  console.log('killed', agent.killed);
  await sleep(5000);
  console.log('killed', agent.killed);
  console.log(await checkAgentRunning(nodePath));

  //ending
  // await fs.promises.rmdir(path.join(dataDir, '*'), { recursive: true });
}

main();
