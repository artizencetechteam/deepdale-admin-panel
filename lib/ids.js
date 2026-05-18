"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newId = newId;
const cuid2_1 = require("@paralleldrive/cuid2");
function newId() {
    return (0, cuid2_1.createId)();
}
