import * as polykey from '@';

describe('index', () => {
  test('exports PolykeyAgent, PolykeyClient and errors', async () => {
    expect('PolykeyAgent' in polykey).toBe(true);
    expect('PolykeyClient' in polykey).toBe(true);
    expect('errors' in polykey).toBe(true);
  });
});
