import { ErrorTypeCommit } from '../../errors';

/* eslint-disable */
// The amount of work that went into crafting these cases to handle
// -0 (just so we don't lose that information when parsing and reconstructing)
// but can also default to +0 was extraordinary.

function simpleSign(n) {
  return Math.sign(n) || (Object.is(n, -0) ? -1 : 1);
}

function negateExceptForZero(n) {
  return n === 0 ? n : -n;
}

function formatTimezoneOffset(minutes) {
  const sign = simpleSign(negateExceptForZero(minutes));
  minutes = Math.abs(minutes);
  const hours = Math.floor(minutes / 60);
  minutes -= hours * 60;
  let strHours = String(hours);
  let strMinutes = String(minutes);
  if (strHours.length < 2) strHours = '0' + strHours;
  if (strMinutes.length < 2) strMinutes = '0' + strMinutes;
  return (sign === -1 ? '-' : '+') + strHours + strMinutes;
}

function parseTimezoneOffset(offset) {
  let [, sign, hours, minutes] = offset.match(/(\+|-)(\d\d)(\d\d)/);
  minutes = (sign === '+' ? 1 : -1) * (Number(hours) * 60 + Number(minutes));
  return negateExceptForZero(minutes);
}

function parseAuthor(author) {
  const [, name, email, timestamp, offset] = author.match(/^(.*) <(.*)> (.*) (.*)$/);
  return {
    name: name,
    email: email,
    timestamp: Number(timestamp),
    timezoneOffset: parseTimezoneOffset(offset),
  };
}

function normalize(str) {
  // remove all <CR>
  str = str.replace(/\r/g, '');
  // no extra newlines up front
  str = str.replace(/^\n+/, '');
  // and a single newline at the end
  str = str.replace(/\n+$/, '') + '\n';
  return str;
}

function indent(str) {
  return (
    str
      .trim()
      .split('\n')
      .map((x) => ' ' + x)
      .join('\n') + '\n'
  );
}

function outdent(str) {
  return str
    .split('\n')
    .map((x) => x.replace(/^ /, ''))
    .join('\n');
}

// TODO: Make all functions have static async signature?

class GitCommit {
  _commit: string;
  constructor(commit) {
    if (typeof commit === 'string') {
      this._commit = commit;
    } else if (Buffer.isBuffer(commit)) {
      this._commit = commit.toString('utf8');
    } else if (typeof commit === 'object') {
      this._commit = GitCommit.render(commit);
    } else {
      throw new ErrorTypeCommit('invalid type passed to GitCommit constructor');
    }
  }

  static fromPayloadSignature({ payload, signature }) {
    const headers = GitCommit.justHeaders(payload);
    const message = GitCommit.justMessage(payload);
    const commit = normalize(headers + '\ngpgsig' + indent(signature) + '\n' + message);
    return new GitCommit(commit);
  }

  static from(commit) {
    return new GitCommit(commit);
  }

  toObject() {
    return Buffer.from(this._commit, 'utf8');
  }

  // Todo: allow setting the headers and message
  headers() {
    return this.parseHeaders();
  }

  // Todo: allow setting the headers and message
  message() {
    return GitCommit.justMessage(this._commit);
  }

  parse() {
    return Object.assign({ message: this.message() }, this.headers());
  }

  static justMessage(commit) {
    return normalize(commit.slice(commit.indexOf('\n\n') + 2));
  }

  static justHeaders(commit) {
    return commit.slice(0, commit.indexOf('\n\n'));
  }

  parseHeaders() {
    const headers = GitCommit.justHeaders(this._commit).split('\n');
    const hs: string[] = [];
    for (const h of headers) {
      if (h[0] === ' ') {
        // combine with previous header (without space indent)
        hs[hs.length - 1] += '\n' + h.slice(1);
      } else {
        hs.push(h);
      }
    }
    const obj: any = {
      parent: [],
    };
    for (const h of hs) {
      const key = h.slice(0, h.indexOf(' '));
      const value = h.slice(h.indexOf(' ') + 1);
      if (Array.isArray(obj[key])) {
        obj[key].push(value);
      } else {
        obj[key] = value;
      }
    }
    if (obj.author) {
      obj.author = parseAuthor(obj.author);
    }
    if (obj.committer) {
      obj.committer = parseAuthor(obj.committer);
    }
    return obj;
  }

  static renderHeaders(obj) {
    let headers = '';
    if (obj.tree) {
      headers += `tree ${obj.tree}\n`;
    } else {
      headers += `tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904\n`; // the null tree
    }
    if (obj.parent) {
      if (obj.parent.length === undefined) {
        throw new ErrorTypeCommit(`commit 'parent' property should be an array`);
      }
      for (const p of obj.parent) {
        headers += `parent ${p}\n`;
      }
    }
    const author = obj.author;
    headers += `author ${author.name} <${author.email}> ${author.timestamp} ${formatTimezoneOffset(
      author.timezoneOffset,
    )}\n`;
    const committer = obj.committer || obj.author;
    headers += `committer ${committer.name} <${committer.email}> ${committer.timestamp} ${formatTimezoneOffset(
      committer.timezoneOffset,
    )}\n`;
    if (obj.gpgsig) {
      headers += 'gpgsig' + indent(obj.gpgsig);
    }
    return headers;
  }

  static render(obj) {
    return GitCommit.renderHeaders(obj) + '\n' + normalize(obj.message);
  }

  render() {
    return this._commit;
  }

  withoutSignature() {
    const commit = normalize(this._commit);
    if (commit.indexOf('\ngpgsig') === -1) return commit;
    const headers = commit.slice(0, commit.indexOf('\ngpgsig'));
    const message = commit.slice(
      commit.indexOf('-----END PGP SIGNATURE-----\n') + '-----END PGP SIGNATURE-----\n'.length,
    );
    return normalize(headers + '\n' + message);
  }

  isolateSignature() {
    const signature = this._commit.slice(
      this._commit.indexOf('-----BEGIN PGP SIGNATURE-----'),
      this._commit.indexOf('-----END PGP SIGNATURE-----') + '-----END PGP SIGNATURE-----'.length,
    );
    return outdent(signature);
  }
}

export default GitCommit;
