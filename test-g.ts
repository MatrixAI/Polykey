function *concatStrings(): Generator<void, string, string | null> {
    let result = '';
    while (true) {
        const data = yield;
        if (data === null) {
            return result;
        }
        result += data;
    }
}

function *combine() {
  return (yield* concatStrings()) + 'FINISH';
}

const g = combine();
g.next();
g.next("a");
g.next("b");
g.next("c");
const r = g.next(null);
console.log(r.value);
