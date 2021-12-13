import type {
  NextCall,
  Interceptor,
  InterceptorOptions,
} from '@grpc/grpc-js/build/src/client-interceptors';
import EventEmitter from 'events';
import Counter from 'resource-counter';
import * as grpc from '@grpc/grpc-js';

/**
 * Client-side flow count interceptor
 * A flow count is a count of the number flows
 * A flow is the entire asynchronous GRPC call including asynchronous interceptor operations
 * Except for onReceiveMessage, any asynchronous operations in the inteceptors counts towards an active flow
 * Must be used as the FIRST interceptor in the interceptor list
 * This is only necessary while GRPC doesn't support awaiting asynchronous interceptors
 */
class FlowCountInterceptor extends EventEmitter {
  /**
   * This is the actual interceptor needed by GRPC
   * It is an arrow function property so that `this` is bound
   */
  public readonly interceptor: Interceptor = (
    options: InterceptorOptions,
    nextCall: NextCall,
  ) => {
    const flowId = this.createFlow();
    const requester = {
      start: (metadata, _, next) => {
        next(metadata, {
          onReceiveMetadata: (metadata, next) => {
            // On leading metadata, subtract the flow count
            // Leading metadata is always received first before messages
            // Or steam data chunks
            // And before the trailing status
            this.subtractFlow(flowId);
            next(metadata);
          },
          onReceiveStatus: (status, next) => {
            // Trailing status occurs at the end of responses and streams
            if (status.code !== grpc.status.OK) {
              // On trailing status, the leading metadata may or may not have executed
              // For example exceeding the deadline results in a local
              // deadline status which can occur before leading metadata is sent
              // If the flow count is 1, then leading metadata has been received
              // If the flow count is 2, then the leading metadata has not been received
              const flowCount = this.flows.get(flowId);
              if (flowCount === 1) {
                this.subtractFlow(flowId);
              } else if (flowCount === 2) {
                this.destroyFlow(flowId);
              }
            } else {
              // Under normal conditions, we woulde expect the leading metadata to have been sent
              this.subtractFlow(flowId);
            }
            next(status);
            return;
          },
        });
      },
      cancel: (next) => {
        // If the client cancels, destroy the flow
        this.destroyFlow(flowId);
        next();
        return;
      },
    };
    return new grpc.InterceptingCall(nextCall(options), requester);
  };
  protected flows: Map<number, number> = new Map();
  protected counter: Counter = new Counter();

  get flowCount(): number {
    return this.flows.size;
  }

  protected createFlow(): number {
    const flowId = this.counter.allocate();
    // Only 2 asynchronous inbound interceptors have to be tracked
    // leading metadata and trailing status interceptors
    const flowCount = 2;
    this.flows.set(flowId, flowCount);
    return flowId;
  }

  protected subtractFlow(flowId: number): void {
    let count = this.flows.get(flowId)!;
    if (--count > 0) {
      this.flows.set(flowId, count);
    } else {
      this.destroyFlow(flowId);
    }
  }

  protected destroyFlow(flowId: number): void {
    this.flows.delete(flowId);
    this.counter.deallocate(flowId);
    if (this.flows.size === 0) {
      this.emit('empty');
    }
  }
}

export default FlowCountInterceptor;
