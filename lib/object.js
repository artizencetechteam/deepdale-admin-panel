"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compactObject = compactObject;
function compactObject(value) {
    return Object.fromEntries(Object.entries(value).filter((entry) => entry[1] !== undefined));
}
