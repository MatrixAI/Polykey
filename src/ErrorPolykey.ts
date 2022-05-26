import type { Class } from '@matrixai/errors';
import { AbstractError } from '@matrixai/errors';
import sysexits from './utils/sysexits';

class ErrorPolykey<T> extends AbstractError<T> {
  static description: string = 'Polykey error';
  exitCode: number = sysexits.GENERAL;

  public static fromJSON<T extends Class<any>>(
    this: T,
    json: any,
  ): InstanceType<T> {
    if (
      typeof json !== 'object' ||
      json.type !== this.name ||
      typeof json.data !== 'object' ||
      typeof json.data.message !== 'string' ||
      isNaN(Date.parse(json.data.timestamp)) ||
      typeof json.data.description !== 'string' ||
      typeof json.data.data !== 'object' ||
      typeof json.data.exitCode !== 'number' ||
      ('stack' in json.data && typeof json.data.stack !== 'string')
    ) {
      throw new TypeError(`Cannot decode JSON to ${this.name}`);
    }
    const e = new this(json.data.message, {
      timestamp: new Date(json.data.timestamp),
      data: json.data.data,
      cause: json.data.cause,
    });
    e.exitCode = json.data.exitCode;
    e.stack = json.data.stack;
    return e;
  }

  public toJSON(): any {
    const json = super.toJSON();
    json.data.description = this.description;
    json.data.exitCode = this.exitCode;
    return json;
  }
}

export default ErrorPolykey;
