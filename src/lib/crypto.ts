import { createHash, randomBytes } from "node:crypto";

export function randomToken(size = 32): string {
  return randomBytes(size).toString("hex");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
