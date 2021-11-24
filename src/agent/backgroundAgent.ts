import PolykeyAgent from '../PolykeyAgent';

let polykeyAgent: PolykeyAgent;

async function handle(signal) {
  process.stdout.write(`Caught ${signal}...`);
  process.stdout.write('stopping polykeyAgent...');
  try {
    await polykeyAgent.stop();
  } catch (e) {
    process.stderr.write('Failed to stop agent.', e);
  }
  process.stdout.write('exiting...');
  process.exit(1);
}

process.on('message', async (startOptions: string) => {
  // Split the message into password and string
  const ops = JSON.parse(startOptions);
  try {
    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password: ops.password,
      nodePath: ops.nodePath,
    });
    // Catching kill signals.
    process.send && process.send('started');
    process.on('SIGINT', handle);
    process.on('SIGTERM', handle);
  } catch (e) {
    process.send && process.send(e.message);
    process.exit(1); // Force an exit in the case of improper start.
  }
});
