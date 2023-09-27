import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

class ErrorSchema<T> extends ErrorPolykey<T> {}

class ErrorSchemaRunning<T> extends ErrorSchema<T> {
  static description = 'Schema is running';
  exitCode = sysexits.USAGE;
}

class ErrorSchemaNotRunning<T> extends ErrorSchema<T> {
  static description = 'Schema is not running';
  exitCode = sysexits.USAGE;
}

class ErrorSchemaDestroyed<T> extends ErrorSchema<T> {
  static description = 'Schema is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorSchemaStateCreate<T> extends ErrorSchema<T> {
  static description = 'Unable to create schema state';
  exitCode = sysexits.IOERR;
}

class ErrorSchemaStateDelete<T> extends ErrorSchema<T> {
  static description = 'Unable to delete schema state';
  exitCode = sysexits.IOERR;
}

class ErrorSchemaVersionRead<T> extends ErrorSchema<T> {
  static description = 'Unable to read schema version';
  exitCode = sysexits.IOERR;
}

class ErrorSchemaVersionParse<T> extends ErrorSchema<T> {
  static description = 'Invalid schema version';
  exitCode = sysexits.IOERR;
}

class ErrorSchemaVersionWrite<T> extends ErrorSchema<T> {
  static description = 'Unable to write schema version';
  exitCode = sysexits.IOERR;
}

class ErrorSchemaVersionTooNew<T> extends ErrorSchema<T> {
  static description = 'Invalid state version';
  exitCode = sysexits.USAGE;
}

class ErrorSchemaVersionTooOld<T> extends ErrorSchema<T> {
  static description = 'Unable to upgrade schema version';
  exitCode = sysexits.USAGE;
}

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
