import { ErrorPolykey } from '../errors';

class ErrorSchema<T> extends ErrorPolykey<T> {}

class ErrorSchemaRunning<T> extends ErrorSchema<T> {}

class ErrorSchemaNotRunning<T> extends ErrorSchema<T> {}

class ErrorSchemaDestroyed<T> extends ErrorSchema<T> {}

class ErrorSchemaStateCreate<T> extends ErrorSchema<T> {}

class ErrorSchemaStateDelete<T> extends ErrorSchema<T> {}

class ErrorSchemaVersionRead<T> extends ErrorSchema<T> {}

class ErrorSchemaVersionParse<T> extends ErrorSchema<T> {}

class ErrorSchemaVersionWrite<T> extends ErrorSchema<T> {}

class ErrorSchemaVersionTooNew<T> extends ErrorSchema<T> {}

class ErrorSchemaVersionTooOld<T> extends ErrorSchema<T> {}

class ErrorSchemaMigrationFail<T> extends ErrorSchema<T> {}

class ErrorSchemaMigrationMissing<T> extends ErrorSchema<T> {}

export {
  ErrorSchema,
  ErrorSchemaRunning,
  ErrorSchemaNotRunning,
  ErrorSchemaDestroyed,
  ErrorSchemaStateCreate,
  ErrorSchemaStateDelete,
  ErrorSchemaVersionRead,
  ErrorSchemaVersionParse,
  ErrorSchemaVersionWrite,
  ErrorSchemaVersionTooNew,
  ErrorSchemaVersionTooOld,
  ErrorSchemaMigrationFail,
  ErrorSchemaMigrationMissing,
};
