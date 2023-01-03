import type {
  Transformer,
  TransformerFlushCallback,
  TransformerTransformCallback,
} from 'stream/web';
import { TransformStream } from 'stream/web';

class BufferStreamToSnipped implements Transformer<Buffer, Buffer> {
  protected buffer = Buffer.alloc(0);
  protected iteration = 0;
  protected snippingPattern: Array<number>;

  constructor(snippingPattern: Array<number>) {
    this.snippingPattern = snippingPattern;
  }

  transform: TransformerTransformCallback<Buffer, Buffer> = async (
    chunk,
    controller,
  ) => {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const snipAmount =
        this.snippingPattern[this.iteration % this.snippingPattern.length];
      if (snipAmount > this.buffer.length) break;
      this.iteration += 1;
      const returnBuffer = this.buffer.subarray(0, snipAmount);
      controller.enqueue(returnBuffer);
      this.buffer = this.buffer.subarray(snipAmount);
    }
  };

  flush: TransformerFlushCallback<Buffer> = (controller) => {
    controller.enqueue(this.buffer);
  };
}

/**
 * This is used to convert regular chunks into randomly sized chunks based on
 * a provided pattern. This is to replicate randomness introduced by packets
 * splitting up the data.
 */
class BufferStreamToSnippedStream extends TransformStream {
  constructor(snippingPattern: Array<number>) {
    super(new BufferStreamToSnipped(snippingPattern));
  }
}

class BufferStreamToNoisy implements Transformer<Buffer, Buffer> {
  protected iteration = 0;
  protected noise: Array<Buffer>;

  constructor(noise: Array<Buffer>) {
    this.noise = noise;
  }

  transform: TransformerTransformCallback<Buffer, Buffer> = async (
    chunk,
    controller,
  ) => {
    const noiseBuffer = this.noise[this.iteration % this.noise.length];
    const newBuffer = Buffer.from(Buffer.concat([chunk, noiseBuffer]));
    controller.enqueue(newBuffer);
    this.iteration += 1;
  };
}

/**
 * This is used to convert regular chunks into randomly sized chunks based on
 * a provided pattern. This is to replicate randomness introduced by packets
 * splitting up the data.
 */
class BufferStreamToNoisyStream extends TransformStream {
  constructor(noise: Array<Buffer>) {
    super(new BufferStreamToNoisy(noise));
  }
}

export { BufferStreamToSnippedStream, BufferStreamToNoisyStream };
