import { describe, expect, it } from "vitest";

import { compactObject } from "./object";

describe("compactObject", () => {
  it("removes undefined values and preserves null", () => {
    expect(
      compactObject({
        a: "value",
        b: undefined,
        c: null
      })
    ).toEqual({
      a: "value",
      c: null
    });
  });
});
