import { createCommand } from '../utils';
import echo from './echo';

const commandEchoes = createCommand('echoes');
commandEchoes.description('echo things');
commandEchoes.addCommand(echo);

export default commandEchoes;
