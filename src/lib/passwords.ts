import { verify, hash } from "@node-rs/argon2";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    algorithm: 2,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return verify(passwordHash, password);
}
