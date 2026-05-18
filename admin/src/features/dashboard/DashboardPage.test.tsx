import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardPage } from "./DashboardPage";
import { renderWithQueryClient } from "../../test/test-utils";
import { apiRequest } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-store";
import { useToast } from "../../components/ui/toast";
import type { DashboardOverviewResponse } from "../../lib/api-types";

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

describe("DashboardPage", () => {
  let dashboardResponse: DashboardOverviewResponse;

  beforeEach(() => {
    pushToastMock.mockReset();
    dashboardResponse = {
      totalLeads: 12,
      newLeads24h: 2,
      totalSectionsActive: 3,
      hiddenSections: 1,
      contentItems: 16,
      draftItems: 2,
      recentLeads: [
        {
          id: "lead_1",
          fullName: "Taylor Doe",
          companyName: "Acme",
          email: "taylor@example.com",
          phone: null,
          submittedAt: "2026-03-08T08:30:00.000Z",
          source: "support-form",
          status: "new",
          notes: null,
          createdAt: "2026-03-08T08:30:00.000Z",
          updatedAt: "2026-03-08T08:30:00.000Z"
        }
      ],
      recentActivity: [],
      sectionManagers: [
        {
          key: "PRODUCT_SHOWCASE_OVERVIEW",
          label: "Product Showcase Overview",
          description: "Top headline, CTA, and prompt templates.",
          href: "/admin/hero",
          area: "landing",
          visibility: "visible",
          itemCount: 1,
          sortOrder: 0
        },
        {
          key: "HERO_SECTION",
          label: "Hero Section",
          description: "Hero tabs, main visual, and dashboard imagery.",
          href: "/admin/hero",
          area: "landing",
          visibility: "visible",
          itemCount: 1,
          sortOrder: 1
        },
        {
          key: "HEADER",
          label: "Header and Navigation",
          description: "Header links, dropdowns, and mega-menu columns.",
          href: "/admin/navigation",
          area: "global",
          visibility: "visible",
          itemCount: 6,
          sortOrder: 16
        },
        {
          key: "SECTION_CONFIG",
          label: "Section Copy and Visibility",
          description: "Shared headings, subheadings, ordering, and visibility.",
          href: "/admin/sections",
          area: "global",
          visibility: "system",
          itemCount: 1,
          sortOrder: null
        }
      ],
      quickActions: [
        { label: "Edit Hero", href: "/admin/hero" },
        { label: "Manage Products", href: "/admin/products" }
      ],
      frontendEndpoints: [
        {
          key: "home",
          label: "Landing page payload",
          method: "GET",
          path: "/api/content/home",
          auth: "public",
          description:
            "Aggregated landing-page content, section visibility, and ordered section datasets."
        },
        {
          key: "leads",
          label: "Lead capture",
          method: "POST",
          path: "/api/content/leads",
          auth: "public",
          description:
            "Submit public support-form or book-a-call leads and receive a success payload."
        }
      ]
    };

    useAuthMock.mockReturnValue(authValue);
    useToastMock.mockReturnValue({ pushToast: pushToastMock });
    apiRequestMock.mockImplementation(async (path, options) => {
      if (path === "/api/admin/dashboard/overview") {
        return dashboardResponse;
      }

      if (
        typeof path === "string" &&
        path === "/api/admin/section-states/reorder" &&
        options?.method === "PATCH"
      ) {
        const body = (options.body ?? []) as Array<{
          key: string;
          sortOrder: number;
        }>;

        dashboardResponse = {
          ...dashboardResponse,
          sectionManagers: dashboardResponse.sectionManagers.map((section) =>
            body.some((item) => item.key === section.key)
              ? {
                  ...section,
                  sortOrder:
                    body.find((item) => item.key === section.key)?.sortOrder ??
                    section.sortOrder
                }
              : section
          )
        };

        return { success: true };
      }

      if (
        typeof path === "string" &&
        path.startsWith("/api/admin/section-states/") &&
        options?.method === "PATCH"
      ) {
        const key = path.split("/").at(-1)!;
        const body = (options.body ?? {}) as {
          isVisible?: boolean;
          sortOrder?: number;
        };

        dashboardResponse = {
          ...dashboardResponse,
          sectionManagers: dashboardResponse.sectionManagers.map((section) =>
            section.key === key
              ? {
                  ...section,
                  ...(body.isVisible !== undefined
                    ? {
                        visibility: body.isVisible ? "visible" : "hidden"
                      }
                    : {}),
                  ...(body.sortOrder !== undefined
                    ? {
                        sortOrder: body.sortOrder
                      }
                    : {})
                }
              : section
          )
        };

        return {
          key,
          isVisible: body.isVisible ?? true,
          sortOrder: body.sortOrder ?? 0
        };
      }

      throw new Error(`Unhandled apiRequest call: ${options?.method ?? "GET"} ${path}`);
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("updates landing-page visibility and order directly from the dashboard", async () => {
    renderWithQueryClient(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Landing page CMS map")).toBeTruthy();
    expect(await screen.findByText("Frontend integration")).toBeTruthy();
    expect(await screen.findByText("/api/content/home")).toBeTruthy();
    expect(await screen.findByText("Product Showcase Overview")).toBeTruthy();

    await userEvent.click(
      screen.getByRole("switch", {
        name: "Toggle Product Showcase Overview visibility"
      })
    );

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/api/admin/section-states/PRODUCT_SHOWCASE_OVERVIEW",
        {
          method: "PATCH",
          csrfToken: "csrf-token",
          body: { isVisible: false }
        }
      );
    });
    await waitFor(() => {
      expect(
        screen.getByRole("switch", {
          name: "Toggle Product Showcase Overview visibility"
        }).getAttribute("aria-checked")
      ).toBe("false");
    });

    await userEvent.click(
      screen.getByRole("button", {
        name: "Move Product Showcase Overview down"
      })
    );

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/api/admin/section-states/reorder",
        {
          method: "PATCH",
          csrfToken: "csrf-token",
          body: [
            { key: "HERO_SECTION", sortOrder: 0 },
            { key: "PRODUCT_SHOWCASE_OVERVIEW", sortOrder: 1 }
          ]
        }
      );
    });
    expect(pushToastMock).toHaveBeenCalledWith("Section visibility updated");
    expect(pushToastMock).toHaveBeenCalledWith("Landing page order saved");
  });

  it("shows recent activity for admin roles", async () => {
    dashboardResponse = {
      ...dashboardResponse,
      recentActivity: [
        {
          id: "log_1",
          actorUserId: "user_admin",
          actorRole: "admin",
          actorName: "Ops Admin",
          actorEmail: "ops@deepdale.local",
          action: "update",
          resourceType: "hero",
          resourceId: "hero_1",
          resourceLabel: "Scale with AI",
          summary: "Updated hero: Scale with AI",
          metadata: null,
          ipAddress: "127.0.0.1",
          createdAt: "2026-03-08T10:00:00.000Z"
        }
      ]
    };
    useAuthMock.mockReturnValue({
      ...authValue,
      user: {
        ...authValue.user,
        role: "admin"
      }
    });

    renderWithQueryClient(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Recent activity")).toBeTruthy();
    expect(await screen.findByText("Updated hero: Scale with AI")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Full log" })).toBeTruthy();
  });
});
