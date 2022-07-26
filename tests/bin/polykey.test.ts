import * as testBinUtils from './utils';
import { runTestIfPlatforms } from '../utils';

describe('polykey', () => {
  runTestIfPlatforms('lunix', 'docker')('default help display', async () => {
    const result = await testBinUtils.pkStdio([]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr.length > 0).toBe(true);
  });
});
