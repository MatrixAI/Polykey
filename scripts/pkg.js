#!/usr/bin/env node

const os = require('os');
const fs = require('fs');
const path = require('path');
const process = require('process');
const childProcess = require('child_process');
const packageJSON = require('../package.json');

/**
 * Supported platforms
 * Maps os.platform() to pkg platform
 */
const platforms = {
  linux: 'linux',
  win32: 'win',
  darwin: 'macos',
};

/**
 * Supported architectures
 * Maps os.arch() to pkg arch
 */
const archs = {
  x64: 'x64',
  arm64: 'arm64',
};

async function find(dirPath, pattern) {
  const found = [];
  let entries;
  try {
    entries = await fs.promises.readdir(dirPath);
  } catch (e) {
    if (e.code === 'ENOENT') {
      return found;
    }
    throw e;
  }
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry);
    const stat = await fs.promises.lstat(entryPath);
    if (stat.isDirectory()) {
      found.push(...(await find(entryPath, pattern)));
    } else if (pattern.test(entryPath)) {
      found.push(entryPath);
    }
  }
  return found;
}

/* eslint-disable no-console */
async function main(argv = process.argv) {
  argv = argv.slice(2);
  let outPath;
  let binTarget;
  let nodeVersion = process.versions.node.match(/\d+/)[0];
  let platform = os.platform();
  let arch = os.arch();
  const restArgs = [];
  while (argv.length > 0) {
    const option = argv.shift();
    let match;
    if ((match = option.match(/--output(?:=(.+)|$)/))) {
      outPath = match[1] ?? argv.shift();
    } else if ((match = option.match(/--bin(?:=(.+)|$)/))) {
      binTarget = match[1] ?? argv.shift();
    } else if ((match = option.match(/--node-version(?:=(.+)|$)/))) {
      nodeVersion = match[1] ?? argv.shift();
    } else if ((match = option.match(/--platform(?:=(.+)|$)/))) {
      platform = match[1] ?? argv.shift();
    } else if ((match = option.match(/--arch(?:=(.+)|$)/))) {
      arch = match[1] ?? argv.shift();
    } else {
      restArgs.push(option);
    }
  }
  let entryPoint;
  if (binTarget == null) {
    entryPoint = Object.values(packageJSON.bin ?? {})[0];
  } else {
    entryPoint = packageJSON.bin[binTarget];
  }
  if (entryPoint == null) {
    throw new Error('Bin executable is required');
  }
  if (typeof outPath !== 'string') {
    throw new Error('Output path is required');
  }
  if (entryPoint == null) {
    throw new Error(`Unknown bin target: ${binTarget}`);
  }
  if (isNaN(parseInt(nodeVersion))) {
    throw new Error(`Unsupported node version: ${nodeVersion}`);
  }
  if (!(platform in platforms)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  if (!(arch in archs)) {
    throw new Error(`Unsupported architecture: ${arch}`);
  }
  // Monkey patch the os.platform and os.arch for node-gyp-build
  os.platform = () => platform;
  os.arch = () => arch;
  // Ensure that `node-gyp-build` only finds prebuilds
  process.env.PREBUILDS_ONLY = '1';
  const nodeGypBuild = require('node-gyp-build');
  const pkgConfig = packageJSON.pkg ?? {};
  pkgConfig.assets = pkgConfig.assets ?? {};
  const npmLsOut = childProcess.execFileSync(
    'npm',
    ['ls', '--all', '--prod', '--parseable'],
    {
      windowsHide: true,
      encoding: 'utf-8',
    },
  );
  const nodePackages = npmLsOut.trim().split('\n');
  const projectRoot = path.join(__dirname, '..');
  for (const nodePackage of nodePackages) {
    // If `build` or `prebuilds` directory exists with a `.node` file
    // then we expect to find the appropriate native addon
    // The `node-gyp-build` will look in these 2 directories
    const buildPath = path.join(nodePackage, 'build');
    const prebuildsPath = path.join(nodePackage, 'prebuilds');
    const buildFinds = await find(buildPath, /.node$/);
    const prebuildsFinds = await find(prebuildsPath, /.node$/);
    if (buildFinds.length > 0 || prebuildsFinds.length > 0) {
      let nativeAddonPath = nodeGypBuild.path(nodePackage);
      // Must use relative paths
      // so that assets are added relative to the project
      nativeAddonPath = path.relative(projectRoot, nativeAddonPath);
      pkgConfig.assets.push(nativeAddonPath);
    }
  }
  console.error('Configured pkg with:');
  console.error(pkgConfig);
  // The pkg config must be in the same directory as the `package.json`
  // otherwise the relative paths won't work
  const pkgConfigPath = path.join(projectRoot, 'pkg.json');
  await fs.promises.writeFile(pkgConfigPath, JSON.stringify(pkgConfig));
  const pkgPlatform = platforms[platform];
  const pkgArch = archs[arch];
  const pkgArgs = [
    entryPoint,
    `--config=${pkgConfigPath}`,
    `--targets=node${nodeVersion}-${pkgPlatform}-${pkgArch}`,
    '--no-bytecode',
    '--no-native-build',
    '--public',
    "--public-packages='*'",
    `--output=${outPath}`,
    ...restArgs,
  ];
  console.error('Running pkg:');
  console.error(['pkg', ...pkgArgs].join(' '));
  childProcess.execFileSync('pkg', pkgArgs, {
    stdio: ['inherit', 'inherit', 'inherit'],
    windowsHide: true,
    encoding: 'utf-8',
  });
  await fs.promises.rm(pkgConfigPath);
}
/* eslint-enable no-console */

void main();
