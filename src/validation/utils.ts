/**
 * General parsing utilities for validating all input data
 * All functions here must marshal `data: any` into their respective domain type
 * Failing to do so, they must throw the `validationErrors.ErrorParse`
 * The parse error message must focus on why the validation failed
 * @module
 */
import * as validationErrors from './errors';

function parseInteger(data: any): number {
  data = parseInt(data);
  if (isNaN(data)) {
    throw new validationErrors.ErrorParse('Number is invalid');
  }
  return data;
}

function parseNumber(data: any): number {
  data = parseFloat(data);
  if (isNaN(data)) {
    throw new validationErrors.ErrorParse('Number is invalid');
  }
  return data;
}

export { parseInteger, parseNumber };
