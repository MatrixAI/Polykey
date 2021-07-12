import commandSendNotification from './commandSendNotification';
import commandReadNotifications from './commandReadNotifications';
import commandClearNotifications from './commandClearNotifications';
import { createCommand } from '../utils';

const commandNotifications = createCommand('notifications');
commandNotifications.description('notifications commands');
commandNotifications.addCommand(commandSendNotification);
commandNotifications.addCommand(commandReadNotifications);
commandNotifications.addCommand(commandClearNotifications);

export default commandNotifications;
