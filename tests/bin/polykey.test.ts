import { pkWithStdio } from './utils';

describe('polykey', () => {
  test('default help display', async () => {
    const result = await pkWithStdio([]);
    expect(result.code).toBe(0);
    console.log(result.stdout)
    console.log(result.stderr)
  });
});

// Describe('CLI echoes', () => {
//   beforeEach(async () => {
//     dataDir = await fs.promises.mkdtemp(
//       path.join(os.tmpdir(), 'polykey-test-'),
//     );
//     polykeyAgent = await PolykeyAgent.createPolykey({
//       nodePath: dataDir,
//       logger: logger,
//     });
//     await polykeyAgent.start({
//       password: 'password',
//     });
//   });

//   afterEach(async () => {
//     await polykeyAgent.stop();
//   });

//   test('should echo', async () => {
//     const result = await pk(['echoes', 'echo', '-np', dataDir, 'HelloWorld']);
//     expect(result).toBe(0);
//   });

//   test('should cause error', async () => {
//     const result = await pk(['echoes', 'echo', '-np', dataDir, 'ThrowAnError']);
//     expect(result).toBe(1);
//   });
// });
