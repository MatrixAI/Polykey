import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

class ErrorAudit<T> extends ErrorPolykey<T> {}

class ErrorAuditRunning<T> extends ErrorAudit<T> {
  static description = 'Audit is running';
  exitCode = sysexits.USAGE;
}

class ErrorAuditNotRunning<T> extends ErrorAudit<T> {
  static description = 'Audit is not running';
  exitCode = sysexits.USAGE;
}

class ErrorAuditDestroyed<T> extends ErrorAudit<T> {
  static description = 'Audit is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorAuditMetricPathMissing<T> extends ErrorAudit<T> {
  static description = 'Could not find AuditMetric Pzath';
  exitCode = sysexits.DATAERR;
}

class ErrorAuditNodeIdExists<T> extends ErrorAudit<T> {
  static description = 'NodeId already exists';
  exitCode = sysexits.DATAERR;
}

export {
  ErrorAudit,
  ErrorAuditRunning,
  ErrorAuditNotRunning,
  ErrorAuditDestroyed,
  ErrorAuditMetricPathMissing,
  ErrorAuditNodeIdExists,
};
