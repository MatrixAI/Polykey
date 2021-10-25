import root from './root';
import renew from './renew';
import reset from './reset';
import sign from './sign';
import verify from './verify';
import decrypt from './decrypt';
import encrypt from './encrypt';
import certchain from './certchain';
import password from './password';
import cert from './cert';
import * as binUtils from '../utils';

const commandKeys = binUtils.createCommand('keys');
commandKeys.description('manipulate keys');
commandKeys.addCommand(root);
commandKeys.addCommand(renew);
commandKeys.addCommand(reset);
commandKeys.addCommand(sign);
commandKeys.addCommand(verify);
commandKeys.addCommand(encrypt);
commandKeys.addCommand(decrypt);
commandKeys.addCommand(certchain);
commandKeys.addCommand(password);
commandKeys.addCommand(cert);

export default commandKeys;
