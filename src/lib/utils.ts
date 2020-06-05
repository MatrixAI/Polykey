/**
 * Returns a 5 character long random string of lower case letters
 */
function randomString(): string {
	return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5)
}

/**
 * Inverts the provided promise
 * @param p Promise to invert
 */
function invertPromise<T>(p: Promise<T>): Promise<T> {
  return new Promise((res, rej) => p.then(rej, res));
}

/**
 * Gets the first promise fulfiled
 * @param ps List of promises
 */
function firstPromiseFulfilled<T>(ps: Promise<T>[]) {
  return invertPromise(Promise.all(ps.map(invertPromise)))
}

export { randomString, firstPromiseFulfilled }
