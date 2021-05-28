import { createCommand } from '../utils';
import commandEcho from './commandEcho';

const commandEchoes = createCommand('echoes');
commandEchoes.description('echo things');
commandEchoes.addCommand(commandEcho);

export default commandEchoes;
