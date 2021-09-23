import main from '@/bin/polykey';

describe('polykey', () => {
  test('default help display', async () => {
    expect(await main(['', ''])).toBe(0);
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
