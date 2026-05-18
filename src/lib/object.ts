export function compactObject<TValue extends Record<string, unknown>>(
  value: TValue
): Partial<TValue> {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== undefined)
  ) as Partial<TValue>;
}
