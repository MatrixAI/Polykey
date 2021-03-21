import { PolykeyAgent } from '../../Polykey';

let agent: PolykeyAgent;

process.on('message', async (polykeyPath: string) => {
  agent = new PolykeyAgent(polykeyPath);
  await agent.startServer();
  process.send && process.send('started');
});
