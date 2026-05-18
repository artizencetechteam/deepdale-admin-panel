import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FaqsPage } from "./FaqsPage";
import { renderWithQueryClient } from "../../test/test-utils";
import { apiRequest } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-store";
import { useToast } from "../../components/ui/toast";
import type { FaqCategory, FaqItem } from "../../lib/api-types";

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

describe("FaqsPage", () => {
  let categories: FaqCategory[];
  let items: FaqItem[];

  beforeEach(() => {
    categories = [
      {
        id: "faq_category_1",
        label: "General",
        sortOrder: 0,
        publicationStatus: "published",
        createdAt: "2026-03-08T10:00:00.000Z",
        updatedAt: "2026-03-08T10:00:00.000Z"
      }
    ];
    items = [
      {
        id: "faq_item_1",
        categoryId: "faq_category_1",
        categoryLabel: "General",
        question: "How does billing work?",
        answer: "Monthly or annual plans are supported.",
        sortOrder: 0,
        isActive: true,
        publicationStatus: "draft",
        createdAt: "2026-03-08T10:00:00.000Z",
        updatedAt: "2026-03-08T10:00:00.000Z"
      }
    ];
    pushToastMock.mockReset();
    useAuthMock.mockReturnValue(authValue);
    useToastMock.mockReturnValue({ pushToast: pushToastMock });
    apiRequestMock.mockImplementation(async (path, options) => {
      if (path === "/api/admin/faq-categories" && (!options?.method || options.method === "GET")) {
        return categories;
      }

      if (path === "/api/admin/faqs" && (!options?.method || options.method === "GET")) {
        return items;
      }

      if (path === "/api/admin/faqs/faq_item_1/publication-status" && options?.method === "PATCH") {
        items = items.map((item) =>
          item.id === "faq_item_1"
            ? {
                ...item,
                publicationStatus: "published"
              }
            : item
        );

        return items[0]!;
      }

      throw new Error(`Unhandled apiRequest call: ${options?.method ?? "GET"} ${path}`);
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("publishes a faq item inline", async () => {
    renderWithQueryClient(<FaqsPage />);

    expect(await screen.findByText("How does billing work?")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/api/admin/faqs/faq_item_1/publication-status",
        {
          method: "PATCH",
          csrfToken: "csrf-token",
          body: {
            publicationStatus: "published"
          }
        }
      );
    });
    expect(pushToastMock).toHaveBeenCalledWith("FAQ item published");
  });
});
