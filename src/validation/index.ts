import * as validationErrors from './errors';
import * as validationUtils from './utils';

async function validate(
  parser: (keyPath: Array<string>, value: any) => Promise<any>,
  data: any,
  options: { mode: 'greedy' | 'lazy' } = { mode: 'lazy' },
): Promise<any> {
  const errors: Array<validationErrors.ErrorParse> = [];
  const parse_ = async (
    keyPath: Array<string>,
    value: any,
    context: object,
  ) => {
    if (typeof value === 'object' && value != null) {
      for (const key in value) {
        value[key] = await parse_([...keyPath, key], value[key], value);
      }
    }
    try {
      value = await parser.bind(context)(keyPath, value);
    } catch (e) {
      if (e instanceof validationErrors.ErrorParse) {
        e.keyPath = keyPath;
        e.value = value;
        e.context = context;
        errors.push(e);
        // If lazy mode, short circuit evaluation
        // And throw the error up
        if (options.mode === 'lazy') {
          throw e;
        }
      } else {
        throw e;
      }
    }
    return value;
  };
  try {
    // The root context is an object containing the root data but keyed with undefined
    data = await parse_([], data, { undefined: data });
  } catch (e) {
    if (e instanceof validationErrors.ErrorParse) {
      throw new validationErrors.ErrorValidation(errors);
    } else {
      throw e;
    }
  }
  if (errors.length > 0) {
    throw new validationErrors.ErrorValidation(errors);
  }
  return data;
}

function validateSync(
  parser: (keyPath: Array<string>, value: any) => any,
  data: any,
  options: { mode: 'greedy' | 'lazy' } = { mode: 'lazy' },
): any {
  const errors: Array<validationErrors.ErrorParse> = [];
  const parse_ = (keyPath: Array<string>, value: any, context: object) => {
    if (typeof value === 'object' && value != null) {
      for (const key in value) {
        value[key] = parse_([...keyPath, key], value[key], value);
      }
    }
    try {
      value = parser.bind(context)(keyPath, value);
    } catch (e) {
      if (e instanceof validationErrors.ErrorParse) {
        e.keyPath = keyPath;
        e.value = value;
        e.context = context;
        errors.push(e);
        // If lazy mode, short circuit evaluation
        // And throw the error up
        if (options.mode === 'lazy') {
          throw e;
        }
      } else {
        throw e;
      }
    }
    return value;
  };
  try {
    // The root context is an object containing the root data but keyed with undefined
    data = parse_([], data, { undefined: data });
  } catch (e) {
    if (e instanceof validationErrors.ErrorParse) {
      throw new validationErrors.ErrorValidation(errors);
    } else {
      throw e;
    }
  }
  if (errors.length > 0) {
    throw new validationErrors.ErrorValidation(errors);
  }
  return data;
}

export {
  validate,
  validateSync,
  validationErrors as errors,
  validationUtils as utils,
};
