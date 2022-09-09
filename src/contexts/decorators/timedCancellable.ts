
// equivalent to timed(cancellable())
// timeout is always lazy
// it's only if you call cancel
// PLUS this only works with PromiseLike
// the timed just wraps that together
// and the result is a bit more efficient
// to avoid having to chain the signals up too much

function timedCancellable(
  lazy: boolean = false,
  delay: number = Infinity,
  errorTimeoutConstructor: new () => Error = contextsErrors.ErrorContextsTimedTimeOut,
) {

}

export default timedCancellable;
