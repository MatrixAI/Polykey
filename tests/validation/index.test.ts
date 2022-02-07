import {
  validate,
  validateSync,
  errors as validationErrors,
} from '@/validation';

describe('validation/index', () => {
  test('validate primitives', async () => {
    expect(
      await validate((keyPath, value) => {
        expect(keyPath).toEqual([]);
        expect(value).toBe(123);
        return value;
      }, 123),
    ).toBe(123);
    expect(
      await validate(async (keyPath, value) => {
        expect(keyPath).toEqual([]);
        expect(value).toBe('hello world');
        return value;
      }, 'hello world'),
    ).toBe('hello world');
    expect(
      await validate((keyPath, value) => {
        expect(keyPath).toEqual([]);
        expect(value).toBe(null);
        return value;
      }, null),
    ).toBe(null);
    expect(
      await validate((keyPath, value) => {
        expect(keyPath).toEqual([]);
        expect(value).toBe(undefined);
        return value;
      }, undefined),
    ).toBeUndefined();
  });
  test('validate primitives - sync', () => {
    expect(
      validateSync((keyPath, value) => {
        expect(keyPath).toEqual([]);
        expect(value).toBe(123);
        return value;
      }, 123),
    ).toBe(123);
    expect(
      validateSync((keyPath, value) => {
        expect(keyPath).toEqual([]);
        expect(value).toBe('hello world');
        return value;
      }, 'hello world'),
    ).toBe('hello world');
    expect(
      validateSync((keyPath, value) => {
        expect(keyPath).toEqual([]);
        expect(value).toBe(null);
        return value;
      }, null),
    ).toBe(null);
    expect(
      validateSync((keyPath, value) => {
        expect(keyPath).toEqual([]);
        expect(value).toBe(undefined);
        return value;
      }, undefined),
    ).toBeUndefined();
  });
  test('validate objects', async () => {
    // POJO
    expect(
      await validate(
        (keyPath, value) => {
          switch (keyPath.join('.')) {
            case 'a':
              value = value + 1;
              break;
            case 'b':
              value = value + '!';
              break;
          }
          return value;
        },
        {
          a: 123,
          b: 'hello world',
        },
      ),
    ).toStrictEqual({
      a: 124,
      b: 'hello world!',
    });
    // Array
    expect(
      await validate(
        async (keyPath, value) => {
          switch (keyPath.join('.')) {
            case '0':
              value = value + 1;
              break;
            case '1':
              value = value + '!';
              break;
          }
          return value;
        },
        [123, 'hello world'],
      ),
    ).toStrictEqual([124, 'hello world!']);
    // Nested POJO and Array
    expect(
      await validate(
        (keyPath, value) => {
          switch (keyPath.join('.')) {
            case 'arr.0.a':
            case 'obj.arr.0':
              if (value !== 123) {
                throw new validationErrors.ErrorParse('should be 123');
              }
              break;
            case 'arr.0.b':
            case 'obj.arr.1':
              if (value !== 'hello world') {
                throw new validationErrors.ErrorParse('should be hello world');
              }
              break;
            case 'arr':
              expect(value).toStrictEqual([
                {
                  a: 123,
                  b: 'hello world',
                },
              ]);
              break;
            case 'obj':
              expect(value).toStrictEqual({
                arr: [123, 'hello world'],
              });
              break;
          }
          return value;
        },
        {
          arr: [
            {
              a: 123,
              b: 'hello world',
            },
          ],
          obj: {
            arr: [123, 'hello world'],
          },
        },
      ),
    ).toStrictEqual({
      arr: [
        {
          a: 123,
          b: 'hello world',
        },
      ],
      obj: {
        arr: [123, 'hello world'],
      },
    });
  });
  test('validate objects - sync', () => {
    // POJO
    expect(
      validateSync(
        (keyPath, value) => {
          switch (keyPath.join('.')) {
            case 'a':
              value = value + 1;
              break;
            case 'b':
              value = value + '!';
              break;
          }
          return value;
        },
        {
          a: 123,
          b: 'hello world',
        },
      ),
    ).toStrictEqual({
      a: 124,
      b: 'hello world!',
    });
    // Array
    expect(
      validateSync(
        (keyPath, value) => {
          switch (keyPath.join('.')) {
            case '0':
              value = value + 1;
              break;
            case '1':
              value = value + '!';
              break;
          }
          return value;
        },
        [123, 'hello world'],
      ),
    ).toStrictEqual([124, 'hello world!']);
    // Nested POJO and Array
    expect(
      validateSync(
        (keyPath, value) => {
          switch (keyPath.join('.')) {
            case 'arr.0.a':
            case 'obj.arr.0':
              if (value !== 123) {
                throw new validationErrors.ErrorParse('should be 123');
              }
              break;
            case 'arr.0.b':
            case 'obj.arr.1':
              if (value !== 'hello world') {
                throw new validationErrors.ErrorParse('should be hello world');
              }
              break;
            case 'arr':
              expect(value).toStrictEqual([
                {
                  a: 123,
                  b: 'hello world',
                },
              ]);
              break;
            case 'obj':
              expect(value).toStrictEqual({
                arr: [123, 'hello world'],
              });
              break;
          }
          return value;
        },
        {
          arr: [
            {
              a: 123,
              b: 'hello world',
            },
          ],
          obj: {
            arr: [123, 'hello world'],
          },
        },
      ),
    ).toStrictEqual({
      arr: [
        {
          a: 123,
          b: 'hello world',
        },
      ],
      obj: {
        arr: [123, 'hello world'],
      },
    });
  });
  test('validation error contains parse errors', async () => {
    // Lazy mode
    const f = () =>
      validateSync(
        (keyPath, value) => {
          switch (keyPath.join('.')) {
            case 'arr.0.a':
            case 'obj.arr.0':
              if (value !== 123) {
                throw new validationErrors.ErrorParse('should be 123');
              }
              break;
            case 'arr.0.b':
            case 'obj.arr.1':
              if (value !== 'hello world') {
                throw new validationErrors.ErrorParse('should be hello world');
              }
              break;
          }
          return value;
        },
        {
          arr: [
            {
              a: '123',
              b: 'foo bar',
            },
          ],
          obj: {
            arr: ['123', 'foo bar'],
          },
        },
      );
    expect(f).toThrow(validationErrors.ErrorValidation);
    try {
      f();
    } catch (e) {
      expect(e).toBeInstanceOf(validationErrors.ErrorValidation);
      const e_ = e as validationErrors.ErrorValidation;
      // Lazy mode should only return 1 parse error
      expect(e_.errors.length).toBe(1);
      expect(e_.errors[0]).toBeInstanceOf(validationErrors.ErrorParse);
      expect(e_.errors[0].keyPath).toStrictEqual(['arr', '0', 'a']);
      expect(e_.errors[0].value).toBe('123');
      expect(e_.errors[0].context).toStrictEqual({ a: '123', b: 'foo bar' });
    }
    // Greedy mode
    const g = async () =>
      validate(
        (keyPath, value) => {
          switch (keyPath.join('.')) {
            case 'arr.0.a':
            case 'obj.arr.0':
              if (value !== 123) {
                throw new validationErrors.ErrorParse('should be 123');
              }
              break;
            case 'arr.0.b':
            case 'obj.arr.1':
              if (value !== 'hello world') {
                throw new validationErrors.ErrorParse('should be hello world');
              }
              break;
          }
          return value;
        },
        {
          arr: [
            {
              a: '123',
              b: 'foo bar',
            },
          ],
          obj: {
            arr: ['123', 'foo bar'],
          },
        },
        {
          mode: 'greedy',
        },
      );
    await expect(g).rejects.toThrow(validationErrors.ErrorValidation);
    try {
      await g();
    } catch (e) {
      expect(e).toBeInstanceOf(validationErrors.ErrorValidation);
      const e_ = e as validationErrors.ErrorValidation;
      // Greedy mode should only return 4 parse errors
      expect(e_.errors.length).toBe(4);
      expect(e_.errors[0]).toBeInstanceOf(validationErrors.ErrorParse);
      expect(e_.errors[0].keyPath).toStrictEqual(['arr', '0', 'a']);
      expect(e_.errors[0].value).toBe('123');
      expect(e_.errors[0].context).toStrictEqual({ a: '123', b: 'foo bar' });
      expect(e_.errors[1]).toBeInstanceOf(validationErrors.ErrorParse);
      expect(e_.errors[1].keyPath).toStrictEqual(['arr', '0', 'b']);
      expect(e_.errors[1].value).toBe('foo bar');
      expect(e_.errors[1].context).toStrictEqual({ a: '123', b: 'foo bar' });
      expect(e_.errors[2]).toBeInstanceOf(validationErrors.ErrorParse);
      expect(e_.errors[2].keyPath).toStrictEqual(['obj', 'arr', '0']);
      expect(e_.errors[2].value).toBe('123');
      expect(e_.errors[2].context).toStrictEqual(['123', 'foo bar']);
      expect(e_.errors[3]).toBeInstanceOf(validationErrors.ErrorParse);
      expect(e_.errors[3].keyPath).toStrictEqual(['obj', 'arr', '1']);
      expect(e_.errors[3].value).toBe('foo bar');
      expect(e_.errors[3].context).toStrictEqual(['123', 'foo bar']);
    }
  });
  test('manipulate `this` when using function expressions', async () => {
    await validate((_, value) => {
      expect(this).toEqual({});
      return value;
    }, 'hello world');
    await validate(function (_, value) {
      expect(this[undefined!]).toBe(value);
      return value;
    }, 'hello world');
    // Mutating the root context
    expect(
      await validate(function (_, value) {
        // This has no effect because the same value is still returned
        this[undefined!] = 'foo bar';
        return value;
      }, 'hello world'),
    ).toBe('hello world');
    // Mutating nested context
    expect(
      await validate(
        async function (keyPath, value) {
          if (keyPath[0] === 'a' && keyPath[1] === 'b') {
            expect(this).toEqual({ b: 'c' });
            this['d'] = 'e';
            return 'c2';
          }
          return value;
        },
        {
          a: {
            b: 'c',
          },
        },
      ),
    ).toEqual({
      a: {
        b: 'c2',
        d: 'e',
      },
    });
  });
});
