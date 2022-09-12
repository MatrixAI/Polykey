import { Timer } from '@matrixai/timer';

const contexts = new WeakMap<object, number>();

function getContextIndex(
  target: any,
  key: string | symbol,
  targetName: string,
): number {
  const contextIndex = contexts.get(target[key]);
  if (contextIndex == null) {
    throw new TypeError(
      `\`${targetName}.${key.toString()}\` does not have a \`@context\` parameter decorator`,
    );
  }
  return contextIndex;
}

function checkContextCancellable(
  ctx: any,
  key: string | symbol,
  targetName: string,
): void {
  if (typeof ctx !== 'object' || ctx === null) {
    throw new TypeError(
      `\`${targetName}.${key.toString()}\` decorated \`@context\` parameter is not a context object`,
    );
  }
  if (ctx.signal !== undefined && !(ctx.signal instanceof AbortSignal)) {
    throw new TypeError(
      `\`${targetName}.${key.toString()}\` decorated \`@context\` parameter's \`signal\` property is not an instance of \`AbortSignal\``,
    );
  }
}

function checkContextTimed(
  ctx: any,
  key: string | symbol,
  targetName: string,
): void {
  if (typeof ctx !== 'object' || ctx === null) {
    throw new TypeError(
      `\`${targetName}.${key.toString()}\` decorated \`@context\` parameter is not a context object`,
    );
  }
  if (ctx.signal !== undefined && !(ctx.signal instanceof AbortSignal)) {
    throw new TypeError(
      `\`${targetName}.${key.toString()}\` decorated \`@context\` parameter's \`signal\` property is not an instance of \`AbortSignal\``,
    );
  }
  if (ctx.timer !== undefined && !(ctx.timer instanceof Timer)) {
    throw new TypeError(
      `\`${targetName}.${key.toString()}\` decorated \`@context\` parameter's \`timer\` property is not an instance of \`Timer\``,
    );
  }
}

export {
  contexts,
  getContextIndex,
  checkContextCancellable,
  checkContextTimed,
};
