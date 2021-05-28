import { createCommand } from '../utils';

import commandGetPrimaryKeyPair from './commandGetRootKeyPair';
import commandRenewKeyPair from './commandRenewKeyPair';
import commandResetKeyPair from './commandResetKeyPair';
import commandSignKeys from './commandSignKeys';
import commandVerifyKeys from './commandVerifyKeys';
import commandDecryptKeys from './commandDecryptKeys';
import commandEncryptKeys from './commandEncryptKeys';
import commandCertChain from '../keys/commandCertChain';
import commandChangePassword from '../keys/commandChangePassword';
import commandRootCert from './commandGetCert';

const commandKeys = createCommand('keys');
commandKeys.description('manipulate keys');
commandKeys.addCommand(commandGetPrimaryKeyPair);
commandKeys.addCommand(commandRenewKeyPair);
commandKeys.addCommand(commandResetKeyPair);
commandKeys.addCommand(commandSignKeys);
commandKeys.addCommand(commandVerifyKeys);
commandKeys.addCommand(commandEncryptKeys);
commandKeys.addCommand(commandDecryptKeys);
commandKeys.addCommand(commandCertChain);
commandKeys.addCommand(commandChangePassword);
commandKeys.addCommand(commandRootCert);

export default commandKeys;
