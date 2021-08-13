import { createCommand } from '../utils';
import claim from './claim';
import authenticate from './authenticate';
import get from './get';
import list from './list';
import permissions from './permissions';
import trust from './trust';
import untrust from './untrust';
import allow from './allow';
import disallow from './disallow';
import search from './search';
import discover from './discover';

const commandIdentities = createCommand('identities');
commandIdentities.description('identities commands');
commandIdentities.addCommand(claim);
commandIdentities.addCommand(authenticate);
commandIdentities.addCommand(get);
commandIdentities.addCommand(list);
commandIdentities.addCommand(permissions);
commandIdentities.addCommand(trust);
commandIdentities.addCommand(untrust);
commandIdentities.addCommand(allow);
commandIdentities.addCommand(disallow);
commandIdentities.addCommand(search);
commandIdentities.addCommand(discover);

export default commandIdentities;
