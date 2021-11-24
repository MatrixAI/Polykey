import type { POJO } from './types';

import { CustomError } from 'ts-custom-error';

class ErrorPolykey extends CustomError {
  data: POJO;
  description: string = 'Polykey error';
  exitCode: number = 1;
  constructor(message: string = '', data: POJO = {}) {
    super(message);
    this.data = data;
  }
  toJSON(): string {
    return JSON.stringify({
      name: this.name,
      description: this.description,
      message: this.message,
      exitCode: this.exitCode,
      data: this.data,
      stack: this.stack,
    });
  }
}

export default ErrorPolykey;
