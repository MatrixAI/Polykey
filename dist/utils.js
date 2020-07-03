"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Returns a 5 character long random string of lower case letters
 */
function randomString() {
    return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
}
exports.randomString = randomString;
/**
 * Inverts the provided promise
 * @param p Promise to invert
 */
function invertPromise(p) {
    return new Promise((res, rej) => p.then(rej, res));
}
/**
 * Gets the first promise fulfiled
 * @param ps List of promises
 */
function firstPromiseFulfilled(ps) {
    return invertPromise(Promise.all(ps.map(invertPromise)));
}
exports.firstPromiseFulfilled = firstPromiseFulfilled;
//# sourceMappingURL=utils.js.map