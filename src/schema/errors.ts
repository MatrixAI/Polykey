import { ErrorPolykey } from '../errors';

class ErrorSchema extends ErrorPolykey {}

class ErrorSchemaRunning extends ErrorSchema {}

class ErrorSchemaNotRunning extends ErrorSchema {}

class ErrorSchemaDestroyed extends ErrorSchema {}

class ErrorSchemaStateCreate extends ErrorSchema {}

class ErrorSchemaStateDelete extends ErrorSchema {}

class ErrorSchemaVersionRead extends ErrorSchema {}

class ErrorSchemaVersionParse extends ErrorSchema {}

class ErrorSchemaVersionWrite extends ErrorSchema {}

class ErrorSchemaVersionTooNew extends ErrorSchema {}

class ErrorSchemaVersionTooOld extends ErrorSchema {}

class ErrorSchemaMigrationFail extends ErrorSchema {}

class ErrorSchemaMigrationMissing extends ErrorSchema {}

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
