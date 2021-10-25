import send from './send';
import read from './read';
import clear from './clear';
import { createCommand } from '../utils';

const commandNotifications = createCommand('notifications');
commandNotifications.description('notifications commands');
commandNotifications.addCommand(send);
commandNotifications.addCommand(read);
commandNotifications.addCommand(clear);

export default commandNotifications;
