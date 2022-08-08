const abc = new AbortController();

abc.signal.onabort = (e: Event) => {
  console.log(e);
  console.log(this);
  // @ts-ignore
  console.log(e.target.reason);
  // @ts-ignore
  console.log(e.currentTarget.reason);
  console.log('REASON:', abc.signal.reason);
};

// so we just need th reason
// cause it's not going to be there
// currentTarget is where the listener is attached
// target is where it was emitted
// it was emitted on the original reason
// ok I think i understand


abc.abort('oh');




// abc.signal.onabort

// onabort: ((this: AbortSignal, ev: Event) => any) | null;
