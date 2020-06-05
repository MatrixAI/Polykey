"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sha1_1 = __importDefault(require("sha.js/sha1"));
// This is modeled after @dominictarr's "shasum" module,
// but without the 'json-stable-stringify' dependency and
// extra type-casting features.
function shasum(buffer) {
    return new sha1_1.default().update(buffer).digest('hex');
}
exports.default = shasum;
//# sourceMappingURL=shasum.js.map