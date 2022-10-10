import type { PublicKey, PrivateKey, Certificate } from '../types';
import type { CertId, NodeId } from '../../ids/types';
import * as x509 from '@peculiar/x509';
import * as asn1 from '@peculiar/asn1-schema';
import * as asn1X509 from '@peculiar/asn1-x509';
import webcrypto, { importPrivateKey, importPublicKey } from './webcrypto';
import {
  publicKeyToNodeId,
  publicKeyFromPrivateKeyEd25519,
} from './asymmetric';
import * as ids from '../../ids';
import * as utils from '../../utils';
import config from '../../config';

x509.cryptoProvider.set(webcrypto);

@asn1.AsnType({ type: asn1.AsnTypeTypes.Choice })
class PolykeyVersionString {
  @asn1.AsnProp({ type: asn1.AsnPropTypes.IA5String })
  public value: string;
}

@asn1.AsnType({ type: asn1.AsnTypeTypes.Choice })
class PolykeyNodeSignatureString {
  @asn1.AsnProp({ type: asn1.AsnPropTypes.OctetString })
  public value: ArrayBuffer;
}

class PolykeyVersionExtension extends x509.Extension {
  public readonly version: string;

  public constructor(raw: ArrayBuffer);
  public constructor(version: string, critical?: boolean);
  public constructor(...args: any[]) {
    if (args[0] instanceof ArrayBuffer || ArrayBuffer.isView(args[0])) {
      super(args[0]);
      const versionString = asn1.AsnConvert.parse(
        this.value,
        PolykeyVersionString,
      );
      this.version = versionString.value;
    } else {
      const versionString = new PolykeyVersionString();
      versionString.value = args[0];
      super(
        config.oids.extensions.polykeyVersion,
        args[1],
        asn1.AsnSerializer.serialize(versionString),
      );
      this.version = args[0];
    }
  }
}

class PolykeyNodeSignatureExtension extends x509.Extension {
  public readonly signature: string;
  public readonly signatureBytes: ArrayBuffer;

  public constructor(raw: ArrayBuffer);
  public constructor(signature: string, critical?: boolean);
  public constructor(...args: any[]) {
    if (args[0] instanceof ArrayBuffer || ArrayBuffer.isView(args[0])) {
      super(args[0]);
      const signatureString = asn1.AsnConvert.parse(
        this.value,
        PolykeyNodeSignatureString,
      );
      this.signature = utils.bufferWrap(signatureString.value).toString('hex');
      this.signatureBytes = signatureString.value;
    } else {
      const signature_ = Buffer.from(args[0], 'hex');
      const signatureString = new PolykeyNodeSignatureString();
      signatureString.value = signature_;
      super(
        config.oids.extensions.nodeSignature,
        args[1],
        asn1.AsnSerializer.serialize(signatureString),
      );
      this.signature = args[0];
      this.signatureBytes = signature_;
    }
  }
}

/**
 * Statically registers the PolykeyVersionExtension
 */
x509.ExtensionFactory.register(
  config.oids.extensions.polykeyVersion,
  PolykeyVersionExtension,
);

/**
 * Statically registers the NodeSignatureExtension
 */
x509.ExtensionFactory.register(
  config.oids.extensions.nodeSignature,
  PolykeyNodeSignatureExtension,
);

const extendedKeyUsageFlags = {
  serverAuth: '1.3.6.1.5.5.7.3.1',
  clientAuth: '1.3.6.1.5.5.7.3.2',
  codeSigning: '1.3.6.1.5.5.7.3.3',
  emailProtection: '1.3.6.1.5.5.7.3.4',
  timeStamping: '1.3.6.1.5.5.7.3.8',
  ocspSigning: '1.3.6.1.5.5.7.3.9',
};

/**
 * Generate x509 certificate.
 * Duration is in seconds.
 * X509 certificates currently use `UTCTime` format for `notBefore` and `notAfter`.
 * This means:
 *   - Only second resolution.
 *   - Minimum date for validity is 1970-01-01T00:00:00Z (inclusive).
 *   - Maximum date for valdity is 2049-12-31T23:59:59Z (inclusive).
 */
async function generateCertificate({
  certId,
  subjectKeyPair,
  issuerPrivateKey,
  duration,
  subjectAttrsExtra = [],
  issuerAttrsExtra = [],
}: {
  certId: CertId;
  subjectKeyPair: {
    publicKey: PublicKey;
    privateKey: PrivateKey;
  };
  issuerPrivateKey: PrivateKey;
  duration: number;
  subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>;
  issuerAttrsExtra?: Array<{ [key: string]: Array<string> }>;
}): Promise<Certificate> {
  const subjectPublicKey = utils.bufferWrap(
    subjectKeyPair.publicKey,
  ) as PublicKey;
  const subjectPublicCryptoKey = await importPublicKey(
    subjectKeyPair.publicKey,
  );
  const subjectPrivateCryptoKey = await importPrivateKey(
    subjectKeyPair.privateKey,
  );
  const issuerPrivateCryptoKey = await importPrivateKey(issuerPrivateKey);
  if (duration < 0) {
    throw new RangeError('`duration` must be positive');
  }
  const now = new Date();
  // X509 `UTCTime` format only has resolution of seconds
  // this truncates to second resolution
  const notBeforeDate = new Date(now.getTime() - (now.getTime() % 1000));
  const notAfterDate = new Date(now.getTime() - (now.getTime() % 1000));
  // If the duration is 0, then only the `now` is valid
  notAfterDate.setSeconds(notAfterDate.getSeconds() + duration);
  if (notBeforeDate < new Date(0)) {
    throw new RangeError(
      '`notBeforeDate` cannot be before 1970-01-01T00:00:00Z',
    );
  }
  if (notAfterDate > new Date(new Date('2050').getTime() - 1)) {
    throw new RangeError('`notAfterDate` cannot be after 2049-12-31T23:59:59Z');
  }
  const subjectNodeId = publicKeyToNodeId(subjectPublicKey);
  const issuerPublicKey = publicKeyFromPrivateKeyEd25519(issuerPrivateKey);
  const issuerNodeId = publicKeyToNodeId(issuerPublicKey);
  const serialNumber = ids.encodeCertId(certId);
  const subjectNodeIdEncoded = ids.encodeNodeId(subjectNodeId);
  const issuerNodeIdEncoded = ids.encodeNodeId(issuerNodeId);
  // The entire subject attributes and issuer attributes
  // is constructed via `x509.Name` class
  // By default this supports on a limited set of names:
  // CN, L, ST, O, OU, C, DC, E, G, I, SN, T
  // If custom names are desired, this needs to change to constructing
  // `new x509.Name('FOO=BAR', { FOO: '1.2.3.4' })` manually
  // And each custom attribute requires a registered OID
  // Because the OID is what is encoded into ASN.1
  const subjectAttrs = [
    {
      CN: [subjectNodeIdEncoded],
    },
    // Filter out conflicting CN attributes
    ...subjectAttrsExtra.filter((attr) => !('CN' in attr)),
  ];
  const issuerAttrs = [
    {
      CN: [issuerNodeIdEncoded],
    },
    // Filter out conflicting CN attributes
    ...issuerAttrsExtra.filter((attr) => !('CN' in attr)),
  ];
  const certConfig = {
    serialNumber,
    notBefore: notBeforeDate,
    notAfter: notAfterDate,
    subject: subjectAttrs,
    issuer: issuerAttrs,
    signingAlgorithm: {
      name: 'EdDSA',
    },
    publicKey: subjectPublicCryptoKey,
    signingKey: subjectPrivateCryptoKey,
    extensions: [
      new x509.BasicConstraintsExtension(true),
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.keyCertSign |
          x509.KeyUsageFlags.cRLSign |
          x509.KeyUsageFlags.digitalSignature |
          x509.KeyUsageFlags.nonRepudiation |
          x509.KeyUsageFlags.keyAgreement |
          x509.KeyUsageFlags.keyEncipherment |
          x509.KeyUsageFlags.dataEncipherment,
      ),
      new x509.ExtendedKeyUsageExtension([
        extendedKeyUsageFlags.serverAuth,
        extendedKeyUsageFlags.clientAuth,
        extendedKeyUsageFlags.codeSigning,
        extendedKeyUsageFlags.emailProtection,
        extendedKeyUsageFlags.timeStamping,
        extendedKeyUsageFlags.ocspSigning,
      ]),
      new x509.SubjectAlternativeNameExtension({
        dns: [subjectNodeIdEncoded],
        url: [`pk://${subjectNodeIdEncoded}`],
        ip: ['127.0.0.1', '::1'],
      }),
      await x509.SubjectKeyIdentifierExtension.create(subjectPublicCryptoKey),
      new PolykeyVersionExtension(config.sourceVersion),
    ] as Array<x509.Extension>,
  };
  // Sign it first with the subject private key to acquire the node signature
  // Then set the node signature extension, and resign it with the issuer's private key
  const nodeSignature = (await x509.X509CertificateGenerator.create(certConfig))
    .signature;
  certConfig.extensions.push(
    new PolykeyNodeSignatureExtension(
      utils.bufferWrap(nodeSignature).toString('hex'),
    ),
  );
  certConfig.signingKey = issuerPrivateCryptoKey;
  return await x509.X509CertificateGenerator.create(certConfig);
}

/**
 * Checks if 2 certificates are exactly the same
 * This checks equality of the raw data buffer
 */
function certEqual(cert1: Certificate, cert2: Certificate): boolean {
  return cert1.equal(cert2);
}

/**
 * Checks if the subject certificate was issued by the issuer certificate
 * This is done by checking all attributes for equality.
 * This does not perform a signature check.
 */
function certIssuedBy(subject: Certificate, issuer: Certificate): boolean {
  // Names are arrays of attributes
  const issuerSubject: x509.JsonName = issuer.subjectName.toJSON();
  const subjectIssuer: x509.JsonName = subject.issuerName.toJSON();
  if (issuerSubject.length !== subjectIssuer.length) {
    return false;
  }
  // There is no designated order for the attributes, so we must sort
  issuerSubject.sort((a, b) => {
    const aKeys = Object.keys(a).sort().toString();
    const bKeys = Object.keys(b).sort().toString();
    if (aKeys < bKeys) {
      return -1;
    }
    if (aKeys > bKeys) {
      return 1;
    }
    return 0;
  });
  subjectIssuer.sort((a, b) => {
    const aKeys = Object.keys(a).sort().toString();
    const bKeys = Object.keys(b).sort().toString();
    if (aKeys < bKeys) {
      return -1;
    }
    if (aKeys > bKeys) {
      return 1;
    }
    return 0;
  });
  // Each attribute is an object containing multiple key values
  // and each key can have multiple values
  // { KEY1: [VALUE, VALUE], KEY2: [VALUE, VALUE] }
  return issuerSubject.every((subjectAttr, i) => {
    const subjectKeys = Object.keys(subjectAttr).sort();
    const issuerKeys = Object.keys(subjectIssuer[i]).sort();
    if (subjectKeys.length !== issuerKeys.length) {
      return false;
    }
    return subjectKeys.every((key, j) => {
      if (key !== issuerKeys[j]) {
        return false;
      }
      const subjectValues = subjectAttr[key].sort();
      const issuerValues = subjectIssuer[i][key].sort();
      if (subjectValues.length !== issuerValues.length) {
        return false;
      }
      return subjectValues.every((value, k) => {
        return value === issuerValues[k];
      });
    });
  });
}

/**
 * Checks if the certificate is valid for a date.
 * Certificates are valid for a time range.
 * The time range is exclusive i.e. not-before and not-after.
 */
function certNotExpiredBy(cert: Certificate, now: Date = new Date()): boolean {
  const time = now.getTime();
  return cert.notBefore.getTime() <= time && time <= cert.notAfter.getTime();
}

/**
 * Checks if certificate is signed by public key.
 * This does not check if the certificate is valid for the current datetime.
 */
async function certSignedBy(
  cert: Certificate,
  publicKey: BufferSource | CryptoKey,
): Promise<boolean> {
  if (utils.isBufferSource(publicKey)) {
    publicKey = await importPublicKey(publicKey);
  }
  return cert.verify({
    publicKey,
    signatureOnly: true,
  });
}

function certNodeId(cert: Certificate): NodeId | undefined {
  const subject = cert.subjectName.toJSON();
  const subjectNodeId = subject.find((attr) => 'CN' in attr)?.CN[0];
  if (subjectNodeId != null) {
    return ids.decodeNodeId(subjectNodeId);
  }
  return undefined;
}

/**
 * Checks if the certificate's node signature is valid.
 * This has to extract the TBS data, remove the node signature extension.
 * Then verify the signature against the mutated TBS data.
 */
async function certNodeSigned(cert: Certificate): Promise<boolean> {
  const nodeSignatureExtension = cert.getExtension(
    config.oids.extensions.nodeSignature,
  );
  if (!(nodeSignatureExtension instanceof PolykeyNodeSignatureExtension)) {
    return false;
  }
  // @ts-ignore - use private tbs property
  const tbsData = cert.tbs;
  const tbs = asn1.AsnConvert.parse(tbsData, asn1X509.TBSCertificate);
  // Filter out the node signature extension
  tbs.extensions = tbs.extensions!.filter(
    (ext) => ext.extnID !== config.oids.extensions.nodeSignature,
  );
  // TBS data without the node signature extension
  const tbsData_ = asn1.AsnConvert.serialize(tbs);
  const publicKey = await cert.publicKey.export();
  return webcrypto.subtle.verify(
    cert.signatureAlgorithm,
    publicKey,
    nodeSignatureExtension.signatureBytes,
    tbsData_,
  );
}

export {
  PolykeyVersionString,
  PolykeyVersionExtension,
  PolykeyNodeSignatureString,
  PolykeyNodeSignatureExtension,
  extendedKeyUsageFlags,
  generateCertificate,
  certEqual,
  certNodeId,
  certIssuedBy,
  certNotExpiredBy,
  certSignedBy,
  certNodeSigned,
};

export { createCertIdGenerator, encodeCertId, decodeCertId } from '../../ids';
