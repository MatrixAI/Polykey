/**
 * Returns a 5 character long random string of lower case letters
 */
declare function randomString(): string;
/**
 * Gets the first promise fulfiled
 * @param ps List of promises
 */
declare function firstPromiseFulfilled<T>(ps: Promise<T>[]): Promise<T[]>;
export { randomString, firstPromiseFulfilled };
