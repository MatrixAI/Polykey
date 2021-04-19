import type { POJO } from './types';

import { CustomError } from 'ts-custom-error';

class ErrorPolykey extends CustomError {
  data: POJO;
  constructor(message: string = '', data: POJO = {}) {
    super(message);
    this.data = data;
  }
  toJSON(): string {
    return JSON.stringify({
      name: this.name,
      message: this.message,
      data: this.data,
      stack: this.stack,
    });
  }
}

class ErrorUndefinedBehaviour extends ErrorPolykey {}

/**
 * Git errors
 */
class ErrorGit extends ErrorPolykey {}

/**
 * Discovery errors
 */
class ErrorDiscovery extends ErrorPolykey {}

/**
 * Identities errors
 */
class ErrorIdentities extends ErrorPolykey {}

/**
 * CLI errors
 */
class ErrorCLI extends ErrorPolykey {}

export {
  ErrorPolykey,
  ErrorUndefinedBehaviour,
  ErrorGit,
  ErrorDiscovery,
  ErrorIdentities,
  ErrorCLI,
};

export * from './keys/errors';
export * from './grpc/errors';
export * from './client/errors';
