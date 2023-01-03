import { Subject } from 'rxjs';

const subject = new Subject<number>();

// These are dropped, nobody is listening
subject.next(1);

subject.subscribe({
  next: (v) => console.log(`observerA: ${v}`)
});

subject.next(2);

// B only gets 3 and 4
subject.subscribe({
  next: (v) => console.log(`observerB: ${v}`)
});

subject.next(3);
subject.next(4);
