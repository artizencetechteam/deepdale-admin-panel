import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Topbar } from "./Topbar";
import { apiRequest } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-store";
import { useToast } from "../../components/ui/toast";

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
const logoutMock = vi.fn();

describe("Topbar", () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      status: "authenticated",
      user: {
        id: "user_admin",
        email: "admin@deepdale.local",
        name: "Deepdale Admin",
        role: "admin",
        isActive: true,
        lastLoginAt: "2026-03-08T10:00:00.000Z",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-08T10:00:00.000Z"
      },
      csrfToken: "csrf-token",
      login: vi.fn(),
      logout: logoutMock,
      refresh: vi.fn()
    });
    useToastMock.mockReturnValue({ pushToast: pushToastMock });
    apiRequestMock.mockResolvedValue({
      token: "preview-token",
      expiresAt: "2026-03-09T12:30:00.000Z",
      requestedByUserId: "user_admin",
      endpoints: [
        {
          key: "home",
          label: "Landing page payload",
          path: "/api/content/home?previewToken=preview-token",
          absoluteUrl:
            "http://localhost:4000/api/content/home?previewToken=preview-token"
        },
        {
          key: "navigation",
          label: "Header and navigation",
          path: "/api/content/navigation?previewToken=preview-token",
          absoluteUrl:
            "http://localhost:4000/api/content/navigation?previewToken=preview-token"
        },
        {
          key: "footer",
          label: "Footer payload",
          path: "/api/content/footer?previewToken=preview-token",
          absoluteUrl:
            "http://localhost:4000/api/content/footer?previewToken=preview-token"
        }
      ]
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates and displays preview links from the topbar", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/hero"]}>
        <Topbar onOpenNavigation={vi.fn()} />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith("/api/admin/preview/session");
    });
    expect(await screen.findByText("Live preview")).toBeTruthy();
    expect(await screen.findByText("Landing page payload")).toBeTruthy();
    expect(
      screen.getByText(
        "http://localhost:4000/api/content/home?previewToken=preview-token"
      )
    ).toBeTruthy();

    await userEvent.click(screen.getAllByRole("button", { name: "Copy" })[0]!);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "http://localhost:4000/api/content/home?previewToken=preview-token"
      );
    });
    expect(pushToastMock).toHaveBeenCalledWith("Preview URL copied");
  });
});
