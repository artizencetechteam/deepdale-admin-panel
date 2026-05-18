import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UsersPage } from "./UsersPage";
import { renderWithQueryClient } from "../../test/test-utils";
import { apiRequest } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-store";
import { useToast } from "../../components/ui/toast";
import type { AdminUser } from "../../lib/api-types";

vi.mock("../../lib/api-client", () => ({
  apiRequest: vi.fn()
}));

vi.mock("../../lib/auth-store", () => ({
  useAuth: vi.fn()
}));

vi.mock("../../components/ui/toast", () => ({
  useToast: vi.fn()
}));

const apiRequestMock = vi.mocked(apiRequest);
const useAuthMock = vi.mocked(useAuth);
const useToastMock = vi.mocked(useToast);
const pushToastMock = vi.fn();

const superadminAuthValue = {
  status: "authenticated" as const,
  user: {
    id: "user_superadmin",
    email: "root@deepdale.local",
    name: "Root Admin",
    role: "superadmin" as const,
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

describe("UsersPage", () => {
  let users: AdminUser[];

  beforeEach(() => {
    users = [
      {
        id: "user_superadmin",
        email: "root@deepdale.local",
        name: "Root Admin",
        role: "superadmin",
        isActive: true,
        lastLoginAt: "2026-03-08T10:00:00.000Z",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-08T10:00:00.000Z"
      }
    ];
    pushToastMock.mockReset();
    useAuthMock.mockReturnValue(superadminAuthValue);
    useToastMock.mockReturnValue({ pushToast: pushToastMock });
    apiRequestMock.mockImplementation(async (path, options) => {
      if (path === "/api/admin/users" && (!options?.method || options.method === "GET")) {
        return users;
      }

      if (path === "/api/admin/users" && options?.method === "POST") {
        const nextUser: AdminUser = {
          id: "user_ops",
          email: (options.body as AdminUser & { password: string }).email,
          name: (options.body as AdminUser & { password: string }).name,
          role: (options.body as AdminUser & { password: string }).role,
          isActive: (options.body as AdminUser & { password: string }).isActive,
          lastLoginAt: null,
          createdAt: "2026-03-08T10:10:00.000Z",
          updatedAt: "2026-03-08T10:10:00.000Z"
        };
        users = [...users, nextUser];
        return nextUser;
      }

      if (path === "/api/admin/users/user_ops/set-password" && options?.method === "POST") {
        return undefined;
      }

      throw new Error(`Unhandled apiRequest call: ${options?.method ?? "GET"} ${path}`);
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("creates a user and resets the password", async () => {
    renderWithQueryClient(<UsersPage />);

    expect(await screen.findByText("Root Admin")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Add user" }));
    await userEvent.type(screen.getByLabelText("Name"), "Ops Admin");
    await userEvent.type(screen.getByLabelText("Email"), "ops@deepdale.local");
    await userEvent.selectOptions(screen.getByLabelText("Role"), "admin");
    await userEvent.type(screen.getByLabelText("Password"), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith("/api/admin/users", {
        method: "POST",
        csrfToken: "csrf-token",
        body: {
          email: "ops@deepdale.local",
          name: "Ops Admin",
          role: "admin",
          isActive: true,
          password: "Password123!"
        }
      });
    });

    const opsRow = await screen.findByText("Ops Admin");
    expect(pushToastMock).toHaveBeenCalledWith("User saved");

    const row = opsRow.closest("tr");
    expect(row).not.toBeNull();
    await userEvent.click(within(row!).getByRole("button", { name: /Password/i }));
    await userEvent.type(screen.getByLabelText("New password"), "UpdatedPass123!");
    await userEvent.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith("/api/admin/users/user_ops/set-password", {
        method: "POST",
        csrfToken: "csrf-token",
        body: {
          password: "UpdatedPass123!"
        }
      });
    });
    expect(pushToastMock).toHaveBeenCalledWith("Password updated");
  }, 20_000);
});
