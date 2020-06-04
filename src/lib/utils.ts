function randomString(): string {
	return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5)
}

function invertPromise<T>(p: Promise<T>): Promise<T> {
  return new Promise((res, rej) => p.then(rej, res));
}

function firstPromiseFulfilled<T>(ps: Promise<T>[]) {
  return invertPromise(Promise.all(ps.map(invertPromise)))
}

export { randomString, firstPromiseFulfilled }
