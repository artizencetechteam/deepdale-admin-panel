"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const argon2_1 = require("@node-rs/argon2");
async function hashPassword(password) {
    return (0, argon2_1.hash)(password, {
        algorithm: 2,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1
    });
}
async function verifyPassword(password, passwordHash) {
    return (0, argon2_1.verify)(passwordHash, password);
}
