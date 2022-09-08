import type { ContextCancellable, ContextTimed } from './src/contexts/types';
import type { TaskHandler } from './src/tasks/types';
import cancellable from './src/contexts/functions/cancellable';
import timed from './src/contexts/functions/timed';
import Timer from './src/timer/Timer';


const f = async (ctx: ContextTimed, a: string, b: number) => {

};

// const g = timed(f);

const h = cancellable(f);

h({}, 'abc', 3);



// const o: ContextTimed = {
//   signal: new AbortSignal(),
//   timer: new Timer,
//   c: number
// };

// ok so it has to be timed first
// cancellable(timed(f));
