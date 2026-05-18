import { afterEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "./api-client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiRequest", () => {
  it("accepts bare JSON success payloads", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      })
    );

    const response = await apiRequest<{ success: boolean }>("/api/admin/test");

    expect(response).toEqual({ success: true });
  });

  it("throws ApiClientError for empty success bodies instead of leaking JSON parser errors", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("", { status: 200 }));

    await expect(apiRequest("/api/admin/test")).rejects.toMatchObject({
      name: "ApiClientError",
      status: 200,
      code: "empty_response"
    });
  });
});
