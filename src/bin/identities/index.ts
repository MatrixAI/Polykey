import { createCommand } from '../utils';
import commandAugmentKeynode from './commandAugmentKeynode';
import commandAuthenticateProvider from './commandAuthenticateProvider';
import commandGetGestalts from './commandGetGestalts';
import commandLinkGestalts from './commandLinkGestalts';
import commandListGestalts from './commandListGestalts';
import commandTrustGestalts from './commandTrustGestalts';

const commandIdentities = createCommand('identities');
commandIdentities.description('identities commands');
commandIdentities.addCommand(commandAugmentKeynode);
commandIdentities.addCommand(commandAuthenticateProvider);
commandIdentities.addCommand(commandGetGestalts);
commandIdentities.addCommand(commandLinkGestalts);
commandIdentities.addCommand(commandListGestalts);
commandIdentities.addCommand(commandTrustGestalts);

export default commandIdentities;
