declare function randomString(): string;
declare function firstPromiseFulfilled<T>(ps: Promise<T>[]): Promise<T[]>;
export { randomString, firstPromiseFulfilled };
