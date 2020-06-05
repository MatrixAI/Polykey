"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const shasum_1 = __importDefault(require("./shasum"));
class GitObject {
    static hash({ type, object }) {
        let buffer = Buffer.concat([
            Buffer.from(`${type} ${object.byteLength.toString()}\0`),
            Buffer.from(object)
        ]);
        let oid = shasum_1.default(buffer);
        return oid;
    }
    static wrap({ type, object }) {
        let buffer = Buffer.concat([
            Buffer.from(`${type} ${object.byteLength.toString()}\0`),
            object
        ]);
        let oid = shasum_1.default(buffer);
        return {
            oid,
            buffer
        };
    }
    static unwrap({ oid, buffer }) {
        if (oid) {
            let sha = shasum_1.default(buffer);
            if (sha !== oid) {
                throw (new Error(`SHA check failed! Expected ${oid}, computed ${sha}`));
            }
        }
        let s = buffer.indexOf(32); // first space
        let i = buffer.indexOf(0); // first null value
        let type = buffer.slice(0, s).toString('utf8'); // get type of object
        let length = buffer.slice(s + 1, i).toString('utf8'); // get type of object
        let actualLength = buffer.length - (i + 1);
        // verify length
        if (parseInt(length) !== actualLength) {
            throw (new Error(`Length mismatch: expected ${length} bytes but got ${actualLength} instead.`));
        }
        return {
            type,
            object: Buffer.from(buffer.slice(i + 1))
        };
    }
}
exports.default = GitObject;
//# sourceMappingURL=GitObject.js.map