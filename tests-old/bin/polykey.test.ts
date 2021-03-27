import main from '@/bin/polykey';

describe('main', () => {
  test('default help display', async () => {
    expect(await main(['', ''])).toBe(0);
  });
});
