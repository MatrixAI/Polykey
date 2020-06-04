"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function randomString() {
    return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
}
exports.randomString = randomString;
//# sourceMappingURL=utils.js.map