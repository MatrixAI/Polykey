import * as polykey from '#index.js';

describe('index', () => {
  test('exports PolykeyAgent, PolykeyClient and errors', async () => {
    expect('PolykeyAgent' in polykey).toBe(true);
    expect('PolykeyClient' in polykey).toBe(true);
    expect('errors' in polykey).toBe(true);
  });
});
