"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorageAdapter = getStorageAdapter;
const env_1 = require("../../config/env");
const local_1 = require("./local");
const s3_1 = require("./s3");
let storageSingleton = null;
function getStorageAdapter() {
    if (!storageSingleton) {
        storageSingleton =
            env_1.env.UPLOAD_DRIVER === "s3"
                ? new s3_1.S3CompatibleStorage()
                : new local_1.LocalDiskStorage();
    }
    return storageSingleton;
}
