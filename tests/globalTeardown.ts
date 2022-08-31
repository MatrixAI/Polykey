/* eslint-disable no-console */
import fs from 'fs';

/**
 * Global teardown for all jest tests
 * Side-effects are performed here
 * Jest does not support `@/` imports here
 */
async function teardown() {
  console.log('GLOBAL TEARDOWN');
  const globalDataDir = process.env['GLOBAL_DATA_DIR']!;
  console.log(`Destroying Global Data Dir: ${globalDataDir}`);
  await fs.promises.rm(globalDataDir, { recursive: true, force: true });
}

export default teardown;
