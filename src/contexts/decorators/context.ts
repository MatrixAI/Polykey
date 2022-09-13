import * as contextsUtils from '../utils';

/**
 * Context parameter decorator
 * It is only allowed to be used once
 */
function context(target: any, key: string | symbol, index: number) {
  const targetName = target['name'] ?? target.constructor.name;
  const method = target[key];
  if (contextsUtils.contexts.has(method)) {
    throw new TypeError(
      `\`${targetName}.${key.toString()}\` redeclares \`@context\` decorator`,
    );
  }
  contextsUtils.contexts.set(method, index);
}

export default context;
