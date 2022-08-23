import context from '@/contexts/decorators/context';
import * as contextsUtils from '@/contexts/utils';

describe('contexts/utils', () => {
  test('context parameter decorator', () => {
    class C {
      f(@context _a: any) {}
      g(_a: any, @context _b: any) {}
      h(_a: any, _b: any, @context ..._rest: Array<any>) {}
    }
    expect(contextsUtils.contexts.get(C.prototype.f)).toBe(0);
    expect(contextsUtils.contexts.get(C.prototype.g)).toBe(1);
    expect(contextsUtils.contexts.get(C.prototype.h)).toBe(2);
    const c = new C();
    expect(contextsUtils.contexts.get(c.f)).toBe(0);
    expect(contextsUtils.contexts.get(c.g)).toBe(1);
    expect(contextsUtils.contexts.get(c.h)).toBe(2);
  });
  test('context parameter decorator can only be used once', () => {
    expect(() => {
      class C {
        f(@context _a: any, @context _b: any) {}
      }
      new C();
    }).toThrow(TypeError);
  });
});
