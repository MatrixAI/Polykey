import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
  protected kCapture: symbol;

  constructor(...args: ConstructorParameters<typeof EventEmitter>) {
    super(...args);
    // EventEmitter's captureRejections option is only accessible through a private symbol
    // Here we augment the construction and save it as a property
    const symbols = Object.getOwnPropertySymbols(this);
    this.kCapture = symbols[0];
  }

  public async emitAsync(
    event: string | symbol,
    ...args: Array<any>
  ): Promise<boolean> {
    const listeners = this.rawListeners(event);
    if (listeners.length < 1) {
      return false;
    }
    let result;
    try {
      for (const listener of listeners) {
        result = listener.apply(this, args);
        await result;
      }
    } catch (e) {
      if (!this[this.kCapture]) {
        throw e;
      }
      // The capture rejections mechanism only applies to promises
      if (!(result instanceof Promise)) {
        throw e;
      }
      // Queues error handling asynchronously to avoid bubbling up rejections
      // This matches the behaviour of EventEmitter which uses `process.nextTick`
      queueMicrotask(() => {
        if (typeof this[EventEmitter.captureRejectionSymbol] === 'function') {
          this[EventEmitter.captureRejectionSymbol](e, event, ...args);
        } else {
          // Disable the capture rejections mechanism to avoid infinite loop
          const prev = this[this.kCapture];
          // If the error handler throws, it results in `uncaughtException`
          try {
            this[this.kCapture] = false;
            this.emit('error', e);
          } finally {
            this[this.kCapture] = prev;
          }
        }
      });
    }
    return true;
  }
}

export default EventBus;
