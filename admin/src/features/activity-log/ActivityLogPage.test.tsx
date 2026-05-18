import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActivityLogPage } from "./ActivityLogPage";
import { renderWithQueryClient } from "../../test/test-utils";
import { apiRequest } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-store";
import type { ActivityLogEntry } from "../../lib/api-types";

vi.mock("../../lib/api-client", () => ({
  apiRequest: vi.fn()
}));

vi.mock("../../lib/auth-store", () => ({
  useAuth: vi.fn()
}));

const apiRequestMock = vi.mocked(apiRequest);
const useAuthMock = vi.mocked(useAuth);

const adminAuthValue = {
  status: "authenticated" as const,
  user: {
    id: "user_admin",
    email: "ops@deepdale.local",
    name: "Ops Admin",
    role: "admin" as const,
    isActive: true,
    lastLoginAt: "2026-03-09T09:00:00.000Z",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-09T09:00:00.000Z"
  },
  csrfToken: "csrf-token",
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn()
};

describe("ActivityLogPage", () => {
  let entries: ActivityLogEntry[];

  beforeEach(() => {
    entries = [
      {
        id: "log_1",
        actorUserId: "user_admin",
        actorRole: "admin",
        actorName: "Ops Admin",
        actorEmail: "ops@deepdale.local",
        action: "update",
        resourceType: "hero",
        resourceId: "1",
        resourceLabel: "Scale with AI",
        summary: "Updated hero: Scale with AI",
        metadata: null,
        ipAddress: "127.0.0.1",
        createdAt: "2026-03-09T10:00:00.000Z"
      }
    ];
    useAuthMock.mockReturnValue(adminAuthValue);
    apiRequestMock.mockImplementation(async (path) => {
      if (String(path).startsWith("/api/admin/activity-log")) {
        return entries;
      }

      throw new Error(`Unhandled apiRequest call: ${String(path)}`);
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders audit entries and refetches with filters", async () => {
    renderWithQueryClient(<ActivityLogPage />);

    expect(await screen.findByText("Updated hero: Scale with AI")).toBeTruthy();

    await userEvent.selectOptions(screen.getByLabelText("Action"), "update");
    await userEvent.type(screen.getByLabelText("Resource type"), "hero");

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/api/admin/activity-log?action=update&resourceType=hero&limit=50"
      );
    });
  });
});
