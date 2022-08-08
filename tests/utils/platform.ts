import shell from 'shelljs';

/**
 * The `isTestPlatformX` constants are temporary until #435 is resolved
 */

const isTestPlatformLinux = globalThis.testPlatform === 'linux';
const isTestPlatformMacOs = globalThis.testPlatform === 'macos';
const isTestPlatformWindows = globalThis.testPlatform === 'windows';
const isTestPlatformDocker = globalThis.testPlatform === 'docker';
const isTestPlatformEmpty = globalThis.testPlatform == null;

const isPlatformLinux = process.platform === 'linux';
const isPlatformWin32 = process.platform === 'win32';
const isPlatformDarwin = process.platform === 'darwin';

const hasIp = shell.which('ip');
const hasIptables = shell.which('iptables');
const hasNsenter = shell.which('nsenter');
const hasUnshare = shell.which('unshare');

export {
  isTestPlatformLinux,
  isTestPlatformMacOs,
  isTestPlatformWindows,
  isTestPlatformDocker,
  isTestPlatformEmpty,
  isPlatformLinux,
  isPlatformWin32,
  isPlatformDarwin,
  hasIp,
  hasIptables,
  hasNsenter,
  hasUnshare,
};
