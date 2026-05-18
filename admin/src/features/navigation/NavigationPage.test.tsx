import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NavigationPage } from "./NavigationPage";
import { renderWithQueryClient } from "../../test/test-utils";
import { apiRequest } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-store";
import { useToast } from "../../components/ui/toast";
import type { MegaMenuItem, NavigationItem, UiOptions } from "../../lib/api-types";

vi.mock("../../lib/api-client", () => ({
  apiRequest: vi.fn()
}));

vi.mock("../../lib/auth-store", () => ({
  useAuth: vi.fn()
}));

vi.mock("../../components/ui/toast", () => ({
  useToast: vi.fn()
}));

vi.mock("../../components/ui/sortable-list", () => ({
  SortableList: ({
    items,
    renderItem
  }: {
    items: Array<{ id: string }>;
    renderItem: (item: { id: string }, index: number) => React.ReactNode;
  }) => <div>{items.map((item, index) => <div key={item.id}>{renderItem(item, index)}</div>)}</div>
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

describe("NavigationPage", () => {
  let navigationItems: NavigationItem[];
  let megaMenuItems: MegaMenuItem[];

  beforeEach(() => {
    navigationItems = [
      {
        id: "nav_1",
        label: "Platform",
        href: "/platform",
        hasDropdown: false,
        sortOrder: 0,
        publicationStatus: "draft",
        createdAt: "2026-03-08T10:00:00.000Z",
        updatedAt: "2026-03-08T10:00:00.000Z"
      }
    ];
    megaMenuItems = [];
    pushToastMock.mockReset();
    useAuthMock.mockReturnValue(authValue);
    useToastMock.mockReturnValue({ pushToast: pushToastMock });
    apiRequestMock.mockImplementation(async (path, options) => {
      if (path === "/api/admin/navigation-items" && (!options?.method || options.method === "GET")) {
        return navigationItems;
      }

      if (path === "/api/admin/mega-menu-items" && (!options?.method || options.method === "GET")) {
        return megaMenuItems;
      }

      if (path === "/api/admin/meta/ui-options") {
        return { gradientPresets: [], iconNames: [] } satisfies UiOptions;
      }

      if (
        path === "/api/admin/navigation-items/nav_1/publication-status" &&
        options?.method === "PATCH"
      ) {
        navigationItems = navigationItems.map((item) =>
          item.id === "nav_1"
            ? {
                ...item,
                publicationStatus: "published"
              }
            : item
        );

        return navigationItems[0]!;
      }

      throw new Error(`Unhandled apiRequest call: ${options?.method ?? "GET"} ${path}`);
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("publishes a navigation item inline", async () => {
    renderWithQueryClient(<NavigationPage />);

    expect(await screen.findByText("Platform")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/api/admin/navigation-items/nav_1/publication-status",
        {
          method: "PATCH",
          csrfToken: "csrf-token",
          body: {
            publicationStatus: "published"
          }
        }
      );
    });
    expect(pushToastMock).toHaveBeenCalledWith("Navigation item published");
  });
});
