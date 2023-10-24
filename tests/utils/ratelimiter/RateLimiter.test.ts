import RateLimiter from '@/utils/ratelimiter/RateLimiter';
import { sleep } from '@/utils';

describe(`${RateLimiter.name}`, () => {
  let rateLimiter: RateLimiter;

  afterEach(() => {
    rateLimiter.stop();
  });

  test('limits rate', async () => {
    rateLimiter = new RateLimiter(undefined, 100);
    expect(rateLimiter.consume('', 101)).toBeFalse();
    expect(rateLimiter.consume('', 1)).toBeTrue();
    expect(rateLimiter.consume('', 50)).toBeTrue();
    expect(rateLimiter.consume('', 49)).toBeTrue();
    expect(rateLimiter.tokens('')).toBe(0);
    expect(rateLimiter.consume('', 1)).toBeFalse();
    expect(rateLimiter.tokens('')).toBe(0);
  });
  test('can refresh rate', async () => {
    rateLimiter = new RateLimiter(undefined, 100);
    expect(rateLimiter.consume('', 50)).toBeTrue();
    expect(rateLimiter.tokens('')).toBe(50);
    rateLimiter.refill();
    expect(rateLimiter.tokens('')).toBe(100);
    rateLimiter.refill();
    expect(rateLimiter.tokens('')).toBe(100);
  });
  test('independent rates', async () => {
    rateLimiter = new RateLimiter(undefined, 100);
    expect(rateLimiter.consume('a', 50)).toBeTrue();
    expect(rateLimiter.tokens('a')).toBe(50);
    expect(rateLimiter.tokens('b')).toBe(100);
    expect(rateLimiter.consume('b', 50)).toBeTrue();
    expect(rateLimiter.tokens('b')).toBe(50);
    expect(rateLimiter.consume('a', 50)).toBeTrue();
    expect(rateLimiter.consume('a', 1)).toBeFalse();
    expect(rateLimiter.consume('b', 25)).toBeTrue();
    expect(rateLimiter.consume('b', 26)).toBeFalse();
  });
  test('only positive tokens can be consumed', async () => {
    rateLimiter = new RateLimiter(undefined, 100);
    expect(() => rateLimiter.consume('', 0)).toThrow();
    expect(() => rateLimiter.consume('', -100)).toThrow();
    expect(() => rateLimiter.consume('', -1)).toThrow();
    expect(() => rateLimiter.consume('', -0)).toThrow();
  });
  test('rates refresh on an interval', async () => {
    rateLimiter = new RateLimiter(undefined, 100);
    expect(rateLimiter.consume('', 50)).toBeTrue();
    rateLimiter.startRefillInterval();
    expect(rateLimiter.tokens('')).toBe(50);
    await sleep(1500);
    expect(rateLimiter.tokens('')).toBe(100);
  });
});
