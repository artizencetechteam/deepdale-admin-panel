import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppRouter } from "./router";

type FetchHandler = (context: {
  url: URL;
  method: string;
  body: unknown;
}) => Response | Promise<Response>;

const viewerUser = {
  id: "user_viewer",
  email: "viewer@deepdale.local",
  name: "Viewer User",
  role: "viewer" as const,
  isActive: true,
  lastLoginAt: "2026-03-08T07:00:00.000Z",
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-08T07:00:00.000Z"
};

const superadminUser = {
  id: "user_superadmin",
  email: "root@deepdale.local",
  name: "Root Admin",
  role: "superadmin" as const,
  isActive: true,
  lastLoginAt: "2026-03-08T08:00:00.000Z",
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-08T08:00:00.000Z"
};

function jsonEnvelope(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function jsonError(status: number, message: string, code = "request_failed") {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message
      }
    }),
    {
      status,
      statusText: message,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}

function installFetchMock(handlers: Record<string, FetchHandler>) {
  return vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
    const request = input instanceof Request ? input : null;
    const url = new URL(request?.url ?? String(input), "http://localhost");
    const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
    const rawBody = init?.body;
    const body =
      typeof rawBody === "string" && rawBody.length > 0
        ? (JSON.parse(rawBody) as unknown)
        : undefined;
    const handler = handlers[`${method} ${url.pathname}`];

    if (!handler) {
      throw new Error(`Unhandled fetch: ${method} ${url.pathname}`);
    }

    return handler({ url, method, body });
  });
}

function renderAt(pathname: string) {
  window.history.pushState({}, "", pathname);
  return render(<AppRouter />);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
});

describe("AppRouter", () => {
  it("redirects anonymous users to the login screen", async () => {
    installFetchMock({
      "GET /api/admin/auth/me": () =>
        jsonError(401, "Unauthorized", "unauthorized")
    });

    renderAt("/admin/");

    expect(await screen.findByText("Welcome back")).toBeTruthy();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/admin/login");
    });
  });

  it("falls back to the login screen when auth bootstrap fails unexpectedly", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    installFetchMock({
      "GET /api/admin/auth/me": () =>
        jsonError(500, "Internal Server Error", "server_error")
    });

    renderAt("/admin/");

    expect(await screen.findByText("Welcome back")).toBeTruthy();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/admin/login");
    });

    consoleErrorSpy.mockRestore();
  });

  it("supports the login flow and loads the viewer dashboard", async () => {
    const dashboardOverview = {
      totalLeads: 12,
      newLeads24h: 2,
      totalSectionsActive: 14,
      hiddenSections: 0,
      contentItems: 34,
      draftItems: 3,
      recentLeads: [
        {
          id: "lead_1",
          fullName: "Taylor Doe",
          companyName: "Acme",
          email: "taylor@example.com",
          phone: null,
          submittedAt: "2026-03-08T08:30:00.000Z",
          source: "support-form" as const,
          status: "new" as const,
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
          area: "landing" as const,
          visibility: "visible" as const,
          itemCount: 1,
          sortOrder: 0
        },
        {
          key: "HEADER",
          label: "Header and Navigation",
          description: "Header links, dropdowns, and mega-menu columns.",
          href: "/admin/navigation",
          area: "global" as const,
          visibility: "visible" as const,
          itemCount: 6,
          sortOrder: 16
        }
      ],
      quickActions: [
        { label: "Edit Hero", href: "/admin/hero" },
        { label: "Manage Products", href: "/admin/products" },
        { label: "Manage FAQs", href: "/admin/faqs" },
        { label: "Review Leads", href: "/admin/leads" }
      ],
      frontendEndpoints: [
        {
          key: "home",
          label: "Landing page payload",
          method: "GET" as const,
          path: "/api/content/home",
          auth: "public" as const,
          description:
            "Aggregated landing-page content, section visibility, and ordered section datasets."
        }
      ]
    };

    installFetchMock({
      "GET /api/admin/auth/me": () =>
        jsonError(401, "Unauthorized", "unauthorized"),
      "POST /api/admin/auth/login": ({ body }) => {
        expect(body).toEqual({
          email: "viewer@deepdale.local",
          password: "Password123!"
        });

        return jsonEnvelope({
          user: viewerUser,
          csrfToken: "csrf-token"
        });
      },
      "GET /api/admin/dashboard/overview": () => jsonEnvelope(dashboardOverview)
    });

    renderAt("/admin/login");

    const emailInput = await screen.findByLabelText("Email");
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "viewer@deepdale.local");

    const passwordInput = screen.getByLabelText("Password");
    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, "Password123!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Dashboard Overview", {}, { timeout: 10_000 })
    ).toBeTruthy();
    expect(screen.getByText("Viewer User")).toBeTruthy();
    expect(screen.getByText("Process Steps")).toBeTruthy();
    expect(await screen.findByText("Product Showcase Overview")).toBeTruthy();
    expect(await screen.findByText("Header and Navigation")).toBeTruthy();
    expect(screen.queryByText("Users")).toBeNull();
    expect(await screen.findByText("Taylor Doe")).toBeTruthy();
  }, 15_000);

  it("loads the users page for superadmin sessions", async () => {
    installFetchMock({
      "GET /api/admin/auth/me": () => jsonEnvelope(superadminUser),
      "GET /api/admin/auth/csrf": () => jsonEnvelope({ csrfToken: "csrf-token" }),
      "GET /api/admin/users": () =>
        jsonEnvelope([
          superadminUser,
          {
            id: "user_admin",
            email: "ops@deepdale.local",
            name: "Ops Admin",
            role: "admin",
            isActive: true,
            lastLoginAt: null,
            createdAt: "2026-03-02T00:00:00.000Z",
            updatedAt: "2026-03-08T08:00:00.000Z"
          }
        ])
    });

    renderAt("/admin/users");

    expect(
      await screen.findByRole("heading", { name: "User Management" }, {
        timeout: 10_000
      })
    ).toBeTruthy();
    expect(screen.getAllByText("User Management").length).toBeGreaterThan(0);
    expect(screen.getByText("Root Admin")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Activity Log" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Users" })).toBeTruthy();
    expect(await screen.findByText("Ops Admin")).toBeTruthy();
  }, 15_000);

  it("treats /dashboard as an alias of the overview route", async () => {
    installFetchMock({
      "GET /api/admin/auth/me": () => jsonEnvelope(viewerUser),
      "GET /api/admin/auth/csrf": () => jsonEnvelope({ csrfToken: "csrf-token" }),
      "GET /api/admin/dashboard/overview": () =>
        jsonEnvelope({
          totalLeads: 12,
          newLeads24h: 2,
          totalSectionsActive: 14,
          hiddenSections: 0,
          contentItems: 34,
          draftItems: 0,
          recentLeads: [],
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
            }
          ],
          quickActions: [{ label: "Edit Hero", href: "/admin/hero" }],
          frontendEndpoints: [
            {
              key: "home",
              label: "Landing page payload",
              method: "GET",
              path: "/api/content/home",
              auth: "public",
              description:
                "Aggregated landing-page content, section visibility, and ordered section datasets."
            }
          ]
        })
    });

    renderAt("/admin/dashboard");

    expect(
      await screen.findByText("Dashboard Overview", {}, { timeout: 10_000 })
    ).toBeTruthy();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/admin");
    });
  }, 15_000);

  it("opens the mobile navigation drawer from the topbar", async () => {
    installFetchMock({
      "GET /api/admin/auth/me": () => jsonEnvelope(viewerUser),
      "GET /api/admin/auth/csrf": () => jsonEnvelope({ csrfToken: "csrf-token" }),
      "GET /api/admin/dashboard/overview": () =>
        jsonEnvelope({
          totalLeads: 12,
          newLeads24h: 2,
          totalSectionsActive: 14,
          hiddenSections: 0,
          contentItems: 34,
          draftItems: 0,
          recentLeads: [],
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
            }
          ],
          quickActions: [{ label: "Edit Hero", href: "/admin/hero" }],
          frontendEndpoints: [
            {
              key: "home",
              label: "Landing page payload",
              method: "GET",
              path: "/api/content/home",
              auth: "public",
              description:
                "Aggregated landing-page content, section visibility, and ordered section datasets."
            }
          ]
        })
    });

    renderAt("/admin/");

    expect(
      await screen.findByText("Dashboard Overview", {}, { timeout: 10_000 })
    ).toBeTruthy();

    await userEvent.click(
      screen.getByRole("button", { name: "Open navigation menu" })
    );

    const dialog = await screen.findByRole("dialog", { name: "Navigation menu" });
    expect(within(dialog).getByRole("link", { name: "Products" })).toBeTruthy();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Close panel" })
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Navigation menu" })
      ).toBeNull();
    });
  }, 15_000);
});
