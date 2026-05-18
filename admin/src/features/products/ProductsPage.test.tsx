import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProductsPage } from "./ProductsPage";
import { renderWithQueryClient } from "../../test/test-utils";
import { apiRequest } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-store";
import { useToast } from "../../components/ui/toast";
import type { ProductCard, UiOptions } from "../../lib/api-types";

vi.mock("../../lib/api-client", () => ({
  apiRequest: vi.fn()
}));

vi.mock("../../lib/auth-store", () => ({
  useAuth: vi.fn()
}));

vi.mock("../../components/ui/toast", () => ({
  useToast: vi.fn()
}));

vi.mock("../../components/ui/media-field", () => ({
  MediaField: ({
    label,
    value,
    onChange,
    disabled
  }: {
    label: string;
    value?: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <label className="flex flex-col gap-2">
      <span>{label}</span>
      <input
        aria-label={label}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </label>
  )
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

const gradientOptions: UiOptions = {
  gradientPresets: [
    { token: "sunrise", label: "Sunrise", preview: "linear-gradient(red, orange)" },
    { token: "ocean", label: "Ocean", preview: "linear-gradient(blue, teal)" }
  ],
  iconNames: []
};

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

describe("ProductsPage", () => {
  let products: ProductCard[];

  beforeEach(() => {
    products = [];
    pushToastMock.mockReset();
    useAuthMock.mockReturnValue(authValue);
    useToastMock.mockReturnValue({ pushToast: pushToastMock });
    apiRequestMock.mockImplementation(async (path, options) => {
      if (path === "/api/admin/products" && (!options?.method || options.method === "GET")) {
        return products;
      }

      if (path === "/api/admin/meta/ui-options") {
        return gradientOptions;
      }

      if (path === "/api/admin/products" && options?.method === "POST") {
        const nextProduct: ProductCard = {
          id: "product_1",
          brand: (options.body as ProductCard).brand,
          image: (options.body as ProductCard).image,
          title: (options.body as ProductCard).title,
          description: (options.body as ProductCard).description,
          gradientPreset: (options.body as ProductCard).gradientPreset,
          buttonGradientPreset: (options.body as ProductCard).buttonGradientPreset,
          sortOrder: (options.body as ProductCard).sortOrder,
          publicationStatus: (options.body as ProductCard).publicationStatus,
          createdAt: "2026-03-08T10:00:00.000Z",
          updatedAt: "2026-03-08T10:00:00.000Z"
        };
        products = [nextProduct];
        return nextProduct;
      }

      if (
        path === "/api/admin/products/product_1/publication-status" &&
        options?.method === "PATCH"
      ) {
        products = products.map((product) =>
          product.id === "product_1"
            ? {
                ...product,
                publicationStatus: (options.body as ProductCard).publicationStatus
              }
            : product
        );

        return products[0]!;
      }

      throw new Error(`Unhandled apiRequest call: ${options?.method ?? "GET"} ${path}`);
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("creates a product and refreshes the list", async () => {
    renderWithQueryClient(<ProductsPage />);

    expect(await screen.findByText("No products yet")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Add product" }));
    await userEvent.type(screen.getByLabelText("Brand"), "VoiceAgent");
    await userEvent.type(screen.getByLabelText("Title"), "Always-on AI assistant");
    await userEvent.type(
      screen.getByLabelText("Description"),
      "Handles qualification and appointment booking."
    );
    await userEvent.type(
      screen.getByLabelText("Product image"),
      "https://cdn.deepdale.ai/voice-agent.png"
    );
    await userEvent.selectOptions(screen.getByLabelText("Card gradient"), "sunrise");
    await userEvent.selectOptions(screen.getByLabelText("Button gradient"), "ocean");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /Publication status/i }),
      "draft"
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith("/api/admin/products", {
        method: "POST",
        csrfToken: "csrf-token",
        body: {
          brand: "VoiceAgent",
          image: "https://cdn.deepdale.ai/voice-agent.png",
          title: "Always-on AI assistant",
          description: "Handles qualification and appointment booking.",
          gradientPreset: "sunrise",
          buttonGradientPreset: "ocean",
          publicationStatus: "draft",
          sortOrder: 0
        }
      });
    });
    expect(await screen.findByText("VoiceAgent")).toBeTruthy();
    expect(await screen.findByText("Draft")).toBeTruthy();
    expect(pushToastMock).toHaveBeenCalledWith("Product saved");
  }, 20_000);

  it("publishes a draft product inline", async () => {
    products = [
      {
        id: "product_1",
        brand: "VoiceAgent",
        image: "https://cdn.deepdale.ai/voice-agent.png",
        title: "Always-on AI assistant",
        description: "Handles qualification and appointment booking.",
        gradientPreset: "sunrise",
        buttonGradientPreset: "ocean",
        sortOrder: 0,
        publicationStatus: "draft",
        createdAt: "2026-03-08T10:00:00.000Z",
        updatedAt: "2026-03-08T10:00:00.000Z"
      }
    ];

    renderWithQueryClient(<ProductsPage />);

    expect(await screen.findByText("Draft")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/api/admin/products/product_1/publication-status",
        {
          method: "PATCH",
          csrfToken: "csrf-token",
          body: {
            publicationStatus: "published"
          }
        }
      );
    });
    expect(pushToastMock).toHaveBeenCalledWith("Product published");
  });
});
