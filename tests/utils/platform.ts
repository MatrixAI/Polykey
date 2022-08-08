import shell from 'shelljs';

/**
 * The `isTestPlatformX` constants are temporary until #435 is resolved
 */

const isTestPlatformLinux = global.testPlatform === 'linux';
const isTestPlatformMacOs = global.testPlatform === 'macos';
const isTestPlatformWindows = global.testPlatform === 'windows';
const isTestPlatformDocker = global.testPlatform === 'docker';
const isTestPlatformEmpty = global.testPlatform == null;

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
