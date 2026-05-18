import { TtlCache } from "./cache";

export const publicContentCache = new TtlCache<unknown>(60_000);
