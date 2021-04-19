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

export { ErrorPolykey, ErrorUndefinedBehaviour };

export * from './keys/errors';
export * from './vaults/errors';
export * from './git/errors';
export * from './gestalts/errors';
export * from './identities/errors';
export * from './agent/errors';
export * from './client/errors';
export * from './grpc/errors';
export * from './workers/errors';
