import { ErrorPolykey, sysexits } from '../../errors';

class ErrorRateLimiter<T> extends ErrorPolykey<T> {}

class ErrorRateLimiterInvalidTokens<T> extends ErrorRateLimiter<T> {
  static description = 'Consumed tokens must be greater than 0';
  exitCode = sysexits.USAGE;
}

export { ErrorRateLimiter, ErrorRateLimiterInvalidTokens };
