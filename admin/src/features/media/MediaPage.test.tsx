import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaPage } from "./MediaPage";
import { renderWithQueryClient } from "../../test/test-utils";
import { apiRequest, uploadMedia } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-store";
import { useToast } from "../../components/ui/toast";
import type { MediaAsset } from "../../lib/api-types";

vi.mock("../../lib/api-client", () => ({
  apiRequest: vi.fn(),
  uploadMedia: vi.fn()
}));

vi.mock("../../lib/auth-store", () => ({
  useAuth: vi.fn()
}));

vi.mock("../../components/ui/toast", () => ({
  useToast: vi.fn()
}));

const apiRequestMock = vi.mocked(apiRequest);
const uploadMediaMock = vi.mocked(uploadMedia);
const useAuthMock = vi.mocked(useAuth);
const useToastMock = vi.mocked(useToast);
const pushToastMock = vi.fn();

const authValue = {
  status: "authenticated" as const,
  user: {
    id: "user_editor",
    email: "editor@deepdale.local",
    name: "Editor User",
    role: "editor" as const,
    isActive: true,
    lastLoginAt: "2026-03-08T10:00:00.000Z",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-08T10:00:00.000Z"
  },
  csrfToken: "csrf-token",
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn()
};

describe("MediaPage", () => {
  let assets: MediaAsset[];

  beforeEach(() => {
    assets = [
      {
        id: "asset_1",
        kind: "image",
        filename: "hero.png",
        originalFilename: "hero.png",
        mimeType: "image/png",
        sizeBytes: 2048,
        storageKey: "uploads/hero.png",
        publicUrl: "https://cdn.deepdale.ai/hero.png",
        createdByUserId: "user_editor",
        createdAt: "2026-03-08T10:00:00.000Z",
        updatedAt: "2026-03-08T10:00:00.000Z"
      }
    ];
    pushToastMock.mockReset();
    useAuthMock.mockReturnValue(authValue);
    useToastMock.mockReturnValue({ pushToast: pushToastMock });
    apiRequestMock.mockImplementation(async (path, options) => {
      if (path === "/api/admin/media" && (!options?.method || options.method === "GET")) {
        return assets;
      }

      if (path === "/api/admin/media/asset_2" && options?.method === "DELETE") {
        assets = assets.filter((asset) => asset.id !== "asset_2");
        return undefined;
      }

      throw new Error(`Unhandled apiRequest call: ${options?.method ?? "GET"} ${path}`);
    });
    uploadMediaMock.mockImplementation(async (file, kind) => {
      const uploaded: MediaAsset = {
        id: "asset_2",
        kind,
        filename: file.name,
        originalFilename: file.name,
        mimeType: file.type || "audio/mpeg",
        sizeBytes: file.size,
        storageKey: `uploads/${file.name}`,
        publicUrl: `https://cdn.deepdale.ai/${file.name}`,
        createdByUserId: "user_editor",
        createdAt: "2026-03-08T10:01:00.000Z",
        updatedAt: "2026-03-08T10:01:00.000Z"
      };
      assets = [...assets, uploaded];
      return uploaded;
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("uploads media and focuses the list on the uploaded kind", async () => {
    renderWithQueryClient(<MediaPage />);

    expect(await screen.findByText("hero.png")).toBeTruthy();

    await userEvent.selectOptions(screen.getByLabelText("Upload as"), "audio");
    const file = new File(["audio"], "demo.mp3", { type: "audio/mpeg" });
    await userEvent.upload(screen.getByLabelText("File"), file);
    await userEvent.click(screen.getByRole("button", { name: "Upload media" }));

    await waitFor(() => {
      expect(uploadMediaMock).toHaveBeenCalledWith(file, "audio", "csrf-token");
    });

    expect(await screen.findByText("demo.mp3")).toBeTruthy();
    expect(screen.queryByText("hero.png")).toBeNull();
    expect(pushToastMock).toHaveBeenCalledWith("Media uploaded");
  });
});
