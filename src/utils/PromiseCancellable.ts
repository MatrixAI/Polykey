type PromiseCancellableController = ((signal: AbortSignal) => void) | AbortController;

class PromiseCancellable<T> extends Promise<T> {
  public static resolve(): PromiseCancellable<void>;
  public static resolve<T>(value: T | PromiseLike<T>): PromiseCancellable<T>;
  public static resolve<T>(value?: T | PromiseLike<T>): PromiseCancellable<T> {
    return super.resolve(value) as PromiseCancellable<T>;
  }

  public static reject<T = never>(reason?: any): PromiseCancellable<T> {
    return super.reject(reason) as PromiseCancellable<T>;
  }

  public static all<T extends readonly unknown[] | []>(
    values: T,
    controller?: PromiseCancellableController
  ): PromiseCancellable<{ -readonly [P in keyof T]: Awaited<T[P]> }>;
  public static all<T>(
    values: Iterable<T | PromiseLike<T>>,
    controller?: PromiseCancellableController
  ): PromiseCancellable<Awaited<T>[]>;
  public static all<T>(
    values: Iterable<T | PromiseLike<T>>,
    controller?: PromiseCancellableController
  ): PromiseCancellable<Awaited<T>[]> {
    const p = super.all(values) as PromiseCancellable<Awaited<T>[]>;
    if (typeof controller === 'function') {
      controller(p.abortController.signal);
    } else if (controller != null) {
      p.abortController = controller;
    } else {
      p.abortController.signal.onabort = () => {
        p.reject(p.abortController.signal.reason);
      };
    }
    return p;
  }

  public static allSettled<T extends readonly unknown[] | []>(
    values: T,
    controller?: PromiseCancellableController
  ): PromiseCancellable<{ -readonly [P in keyof T]: PromiseSettledResult<Awaited<T[P]>> }>;
  public static allSettled<T>(
    values: Iterable<T | PromiseLike<T>>,
    controller?: PromiseCancellableController
  ): PromiseCancellable<PromiseSettledResult<Awaited<T>>[]>;
  public static allSettled<T>(
    values: Iterable<T | PromiseLike<T>>,
    controller?: PromiseCancellableController
  ): PromiseCancellable<PromiseSettledResult<Awaited<T>>[]> {
    const p = super.allSettled(values) as PromiseCancellable<PromiseSettledResult<Awaited<T>>[]>;
    if (typeof controller === 'function') {
      controller(p.abortController.signal);
    } else if (controller != null) {
      p.abortController = controller;
    } else {
      p.abortController.signal.onabort = () => {
        p.reject(p.abortController.signal.reason);
      };
    }
    return p;
  }

  public static race<T extends readonly unknown[] | []>(
    values: T,
    controller?: PromiseCancellableController
  ): PromiseCancellable<Awaited<T[number]>>;
  public static race<T>(
    values: Iterable<T | PromiseLike<T>>,
    controller?: PromiseCancellableController
  ): PromiseCancellable<Awaited<T>>;
  public static race<T>(
    values: Iterable<T | PromiseLike<T>>,
    controller?: PromiseCancellableController
  ): PromiseCancellable<Awaited<T>> {
    const p = super.race(values) as PromiseCancellable<Awaited<T>>;
    if (typeof controller === 'function') {
      controller(p.abortController.signal);
    } else if (controller != null) {
      p.abortController = controller;
    } else {
      p.abortController.signal.onabort = () => {
        p.reject(p.abortController.signal.reason);
      };
    }
    return p;
  }

  public static any<T extends readonly unknown[] | []>(
    values: T,
    controller?: PromiseCancellableController
  ): Promise<Awaited<T[number]>>;
  public static any<T>(
    values: Iterable<T | PromiseLike<T>>,
    controller?: PromiseCancellableController
  ): Promise<Awaited<T>>;
  public static any<T>(
    values: Iterable<T | PromiseLike<T>>,
    controller?: PromiseCancellableController
  ): PromiseCancellable<Awaited<T>> {
    const p = super.any(values) as PromiseCancellable<Awaited<T>>;
    if (typeof controller === 'function') {
      controller(p.abortController.signal);
    } else if (controller != null) {
      p.abortController = controller;
    } else {
      p.abortController.signal.onabort = () => {
        p.reject(p.abortController.signal.reason);
      };
    }
    return p;
  }

  public static from<T>(
    p: PromiseLike<T>,
    controller?: PromiseCancellableController
  ): PromiseCancellable<T> {
    if (p instanceof PromiseCancellable) return p;
    if (typeof controller === 'function')   {
      return new this<T>((resolve, reject, signal) => {
        controller(signal);
        void p.then(resolve, reject)
      });
    } else if (controller != null) {
      return new this<T>((resolve, reject) => {
        void p.then(resolve, reject)
      }, controller);
    } else {
      return new this<T>((resolve, reject, signal) => {
        signal.onabort = () => {
          reject(signal.reason);
        };
        void p.then(resolve, reject)
      });
    }
  }

  protected readonly reject: (reason?: any) => void;
  protected abortController: AbortController;

  public constructor(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void,
      signal: AbortSignal
    ) => void,
    abortController: AbortController = new AbortController
  ) {
    let reject_: (reason?: any) => void;
    super((resolve, reject) => {
      reject_ = reject;
      executor(resolve, reject, abortController.signal);
    });
    this.reject = reject_!;
    this.abortController = abortController;
  }

  public get [Symbol.toStringTag](): string {
    return this.constructor.name;
  }

  public cancel(reason?: any): void {
    this.abortController.abort(reason);
  }

  public then<TResult1 = T, TResult2 = never>(
    onFulfilled?: ((value: T, signal: AbortSignal) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onRejected?: ((reason: any, signal: AbortSignal) => TResult2 | PromiseLike<TResult2>) | undefined | null,
    controller?: PromiseCancellableController
  ): PromiseCancellable<TResult1 | TResult2> {
    let signal;
    let onFulfilled_;
    let onRejected_;
    if (typeof onFulfilled === 'function') {
      onFulfilled_ = (value: T) => onFulfilled(value, signal);
    }
    if (typeof onRejected === 'function') {
      onRejected_ = (reason: any) => onRejected(reason, signal);
    }
    const p = super.then<TResult1, TResult2>(
      onFulfilled_,
      onRejected_
    ) as PromiseCancellable<TResult1 | TResult2>;
    if (typeof controller === 'function') {
      controller(p.abortController.signal);
    } else if (controller != null) {
      p.abortController = controller;
    } else {
      p.abortController.signal.onabort = () => {
        p.reject(p.abortController.signal.reason);
      };
    }
    signal = p.abortController.signal;
    return p;
  }

  public catch<TResult = never>(
    onRejected?: ((reason: any, signal: AbortSignal) => TResult | PromiseLike<TResult>) | undefined | null,
    controller?: PromiseCancellableController
  ): PromiseCancellable<T | TResult> {
    let signal;
    let onRejected_;
    if (typeof onRejected === 'function') {
      onRejected_ = (reason: any) => onRejected(reason, signal);
    }
    const p = super.catch(onRejected_) as PromiseCancellable<T | TResult>;
    if (typeof controller === 'function') {
      controller(p.abortController.signal);
    } else if (controller != null) {
      p.abortController = controller;
    } else {
      p.abortController.signal.onabort = () => {
        p.reject(p.abortController.signal.reason);
      };
    }
    signal = p.abortController.signal;
    return p;
  }

  public finally(
    onFinally?: ((signal: AbortSignal) => void) | undefined | null,
    controller?: PromiseCancellableController
  ): PromiseCancellable<T> {
    let signal;
    let onFinally_;
    if (typeof onFinally === 'function') {
      onFinally_ = () => onFinally(signal);
    }
    const p = super.finally(onFinally_) as PromiseCancellable<T>;
    if (typeof controller === 'function') {
      controller(p.abortController.signal);
    } else if (controller != null) {
      p.abortController = controller;
    } else {
      p.abortController.signal.onabort = () => {
        p.reject(p.abortController.signal.reason);
      };
    }
    signal = p.abortController.signal;
    return p;
  }
}

export default PromiseCancellable;
