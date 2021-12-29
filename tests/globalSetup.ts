/* eslint-disable no-console */
import process from 'process';

/**
 * Global setup for all jest tests
 * Side-effects are performed here
 * Jest does not support `@/` imports here
 */
async function setup() {
  console.log('\nGLOBAL SETUP');
  // The globalDataDir is already created
  const globalDataDir = process.env['GLOBAL_DATA_DIR']!;
  console.log(`Global Data Dir: ${globalDataDir}`);
}

export default setup;
