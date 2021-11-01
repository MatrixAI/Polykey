const sysexits = Object.freeze({
  OK: 0,
  GENERAL: 1,
  // Sysexit standard starts at 64 to avoid conflicts
  USAGE: 64,
  DATAERR: 65,
  NOINPUT: 66,
  NOUSER: 67,
  NOHOST: 68,
  UNAVAILABLE: 69,
  SOFTWARE: 70,
  OSERR: 71,
  OSFILE: 72,
  CANTCREAT: 73,
  IOERR: 74,
  TEMPFAIL: 75,
  PROTOCOL: 76,
  NOPERM: 77,
  CONFIG: 78,
  CANNOT_EXEC: 126,
  COMMAND_NOT_FOUND: 127,
  INVALID_EXIT_ARG: 128,
  // 128+ are reserved for signal exits
  UNKNOWN: 255,
});

export default sysexits;
