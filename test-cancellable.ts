type PromiseLikeCancellable<T> = PromiseLike<T> & { cancel(): void };

function isPromiseLikeCancellable<T>(value: unknown): value is PromiseLikeCancellable<T> {
  return typeof value === 'object' &&
  value !== null &&
  typeof value['then'] === 'function' &&
  typeof value['cancel'] === 'function';
}

type PromiseCancelHandler = (
  reason: any,
  reject: (reason?: any) => void,
) => void;

class PromiseCancellable<T> extends Promise<T> {
  public static from<T>(
    p: PromiseLike<T>,
    onCancel?: PromiseCancelHandler
  ): PromiseCancellable<T> {
    return new this(
      (resolve, reject) => void p.then(resolve, reject),
      onCancel
    );
  }

  protected reject: (reason?: any) => void;
  protected onCancel: PromiseCancelHandler;

  public constructor(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void
    ) => void,
    onCancel: PromiseCancelHandler = (reason, reject) => void reject(reason)
  ) {
    let reject_;
    super((resolve, reject) => {
      reject_ = reject;
      executor(resolve, reject);
    });
    this.reject = reject_;
    this.onCancel = onCancel;
  }

  public cancel(reason?: any): void {
    this.onCancel(reason, this.reject);
  }
}

function f(ctx: { signal: AbortSignal }): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      resolve('result');
    }, 1000);
    ctx.signal.onabort = () => {
      clearTimeout(timeout);
      console.log('ABORTING SIDE EFFECT');
      if (ctx.signal.reason === undefined) {
        reject(new Error('Aborted F'));
      } else {
        reject(new Error('Aborted F', { cause: ctx.signal.reason }));
      }
    };
  });
}

async function main () {

  const abortController = new AbortController();
  const p = f({ signal: abortController.signal });
  const pC = PromiseCancellable.from(
    p,
    (reason) => {
      abortController.abort(reason);
    }
  );

  // Ok the reason can now be anything
  pC.cancel('The Reason');

  try {
    const r = await pC;
    console.log('GOT THE RESULT', r);
  } catch (e) {
    console.log('GOT THE ERROR', typeof e, e);
  }

}

// all<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>[]>;
// all<T extends readonly unknown[] | []>(values: T): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }>;
// Promise.all

void main();
