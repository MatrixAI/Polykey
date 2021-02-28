import Polykey from '@';

describe('index', () => {
  test('construction of Polykey', () => {
    const pk = new Polykey();
    expect(pk).toBeInstanceOf(Polykey);
  });
});
