import main from '@/bin/polykey';

describe('main', () => {
  test('main does something', () => {
    // jest can also "spy on" the console object
    // and then you can test on stdout
    // you can call main() like a function
    expect(main([])).toEqual(0);
  });
});
