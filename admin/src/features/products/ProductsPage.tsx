import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDeleteDialog, DrawerForm } from "../../components/ui/dialogs";
import { EmptyState } from "../../components/ui/empty-state";
import { FormField, Input, Select, Textarea } from "../../components/ui/field";
import { MediaField } from "../../components/ui/media-field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { SortableList } from "../../components/ui/sortable-list";
import { apiRequest } from "../../lib/api-client";
import type {
  ProductCard,
  PublicationStatus,
  UiOptions
} from "../../lib/api-types";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";
import { requiredUrlField } from "../../lib/form-schemas";
import {
  publicationActionLabel,
  publicationStatusClassName,
  publicationStatusLabel,
  togglePublicationStatus
} from "../../lib/publication-status";
import { queryKeys } from "../../lib/query-keys";
import { canWriteContent } from "../../lib/role-utils";
import { useToast } from "../../components/ui/toast";

const productSchema = z.object({
  brand: z.string().trim().max(100).optional().or(z.literal("")),
  image: requiredUrlField,
  title: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  gradientPreset: z.string().trim().min(1),
  buttonGradientPreset: z.string().trim().min(1),
  publicationStatus: z.enum(["draft", "published"])
});

type ProductValues = z.infer<typeof productSchema>;

function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function ProductsPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role);
  const [requestError, setRequestError] = useState<string>();
  const [editorState, setEditorState] = useState<{
    open: boolean;
    product: ProductCard | null;
  }>({ open: false, product: null });
  const [deleteId, setDeleteId] = useState<string>();

  const productsQuery = useQuery({
    queryKey: queryKeys.products,
    queryFn: () => apiRequest<ProductCard[]>("/api/admin/products")
  });
  const uiOptionsQuery = useQuery({
    queryKey: queryKeys.uiOptions,
    queryFn: () => apiRequest<UiOptions>("/api/admin/meta/ui-options")
  });

  const products = sortByOrder(productsQuery.data ?? []);
  const gradientPresets = uiOptionsQuery.data?.gradientPresets ?? [];

  const form = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      brand: "",
      image: "",
      title: "",
      description: "",
      gradientPreset: "",
      buttonGradientPreset: "",
      publicationStatus: "draft"
    }
  });

  const saveMutation = useMutation({
    mutationFn: (values: ProductValues) => {
      const body = {
        ...values,
        sortOrder: editorState.product?.sortOrder ?? products.length
      };

      if (editorState.product) {
        return apiRequest<ProductCard>(`/api/admin/products/${editorState.product.id}`, {
          method: "PUT",
          csrfToken,
          body
        });
      }

      return apiRequest<ProductCard>("/api/admin/products", {
        method: "POST",
        csrfToken,
        body
      });
    },
    onSuccess: async () => {
      setEditorState({ open: false, product: null });
      form.reset({
        brand: "",
        image: "",
        title: "",
        description: "",
        gradientPreset: gradientPresets[0]?.token ?? "",
        buttonGradientPreset: gradientPresets[0]?.token ?? "",
        publicationStatus: "draft"
      });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.products });
      pushToast("Product saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const reorderMutation = useMutation({
    mutationFn: (items: ProductCard[]) =>
      apiRequest<{ success: boolean }>("/api/admin/products/reorder", {
        method: "PATCH",
        csrfToken,
        body: items.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.products });
      pushToast("Product order saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest<void>(`/api/admin/products/${deleteId}`, {
        method: "DELETE",
        csrfToken
      }),
    onSuccess: async () => {
      setDeleteId(undefined);
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.products });
      pushToast("Product deleted");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const publicationMutation = useMutation({
    mutationFn: ({
      id,
      publicationStatus
    }: {
      id: string;
      publicationStatus: PublicationStatus;
    }) =>
      apiRequest<ProductCard>(`/api/admin/products/${id}/publication-status`, {
        method: "PATCH",
        csrfToken,
        body: { publicationStatus }
      }),
    onSuccess: async (_product, variables) => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.products });
      pushToast(
        variables.publicationStatus === "published"
          ? "Product published"
          : "Product moved to draft"
      );
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  function openEditor(product?: ProductCard) {
    setEditorState({ open: true, product: product ?? null });
    form.reset({
      brand: product?.brand ?? "",
      image: product?.image ?? "",
      title: product?.title ?? "",
      description: product?.description ?? "",
      gradientPreset: product?.gradientPreset ?? gradientPresets[0]?.token ?? "",
      buttonGradientPreset:
        product?.buttonGradientPreset ?? gradientPresets[0]?.token ?? "",
      publicationStatus: product?.publicationStatus ?? "draft"
    });
  }

  const previewGradient = gradientPresets.find(
    (preset) => preset.token === form.watch("gradientPreset")
  );
  const previewButtonGradient = gradientPresets.find(
    (preset) => preset.token === form.watch("buttonGradientPreset")
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage product showcase cards, their imagery, and the gradients used across the public landing page."
        actions={
          canEdit ? (
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4" />
              Add product
            </Button>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      {productsQuery.isLoading && (
        <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--dd-border)] bg-white/70 p-6">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
          <span className="text-sm font-medium text-[color:var(--dd-muted)]">Loading products…</span>
        </div>
      )}
      {products.length === 0 && !productsQuery.isLoading ? (
        <EmptyState
          title="No products yet"
          description="Create the first product card for the showcase section."
        />
      ) : (
        <SortableList
          items={products}
          onReorder={(items) => {
            queryClient.setQueryData(
              queryKeys.products,
              items.map((item, index) => ({ ...item, sortOrder: index }))
            );
            reorderMutation.mutate(items);
          }}
          renderItem={(product) => {
            const cardGradient = gradientPresets.find(
              (preset) => preset.token === product.gradientPreset
            );
            const buttonGradient = gradientPresets.find(
              (preset) => preset.token === product.buttonGradientPreset
            );

            return (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[160px,1fr]">
                  <div className="overflow-hidden rounded-2xl border border-[color:var(--dd-border)] bg-white">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="h-32 w-full object-cover"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--dd-accent)]">
                          {product.brand}
                        </div>
                        <div className="mt-1 font-semibold text-[color:var(--dd-text)]">
                          {product.title}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-full bg-[color:var(--dd-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                          #{product.sortOrder + 1}
                        </div>
                        <div
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${publicationStatusClassName(product.publicationStatus)}`}
                        >
                          {publicationStatusLabel(product.publicationStatus)}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-[color:var(--dd-muted)]">
                      {product.description}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div className="rounded-2xl border border-[color:var(--dd-border)] bg-white p-2">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--dd-muted)]">
                          Card
                        </div>
                        <div
                          className="h-8 w-24 rounded-xl"
                          style={{ background: cardGradient?.preview }}
                        />
                      </div>
                      <div className="rounded-2xl border border-[color:var(--dd-border)] bg-white p-2">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--dd-muted)]">
                          Button
                        </div>
                        <div
                          className="h-8 w-24 rounded-xl"
                          style={{ background: buttonGradient?.preview }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {canEdit ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => openEditor(product)}>
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        publicationMutation.mutate({
                          id: product.id,
                          publicationStatus: togglePublicationStatus(
                            product.publicationStatus
                          )
                        })
                      }
                      disabled={publicationMutation.isPending}
                    >
                      {publicationActionLabel(product.publicationStatus)}
                    </Button>
                    <Button variant="ghost" onClick={() => setDeleteId(product.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          }}
        />
      )}
      <DrawerForm
        open={editorState.open}
        onOpenChange={(open) => setEditorState((current) => ({ ...current, open }))}
        title={editorState.product ? "Edit product" : "Create product"}
      >
        <form className="space-y-5" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <BackendErrorAlert message={saveMutation.isError ? getErrorMessage(saveMutation.error) : undefined} />
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Brand" error={form.formState.errors.brand?.message}>
              <Input {...form.register("brand")} error={!!form.formState.errors.brand} />
            </FormField>
            <FormField label="Title" error={form.formState.errors.title?.message}>
              <Input {...form.register("title")} error={!!form.formState.errors.title} />
            </FormField>
          </div>
          <FormField label="Description" error={form.formState.errors.description?.message}>
            <Textarea {...form.register("description")} error={!!form.formState.errors.description} />
          </FormField>
          <MediaField
            label="Product image"
            value={form.watch("image")}
            onChange={(nextValue) =>
              form.setValue("image", nextValue, { shouldDirty: true })
            }
            disabled={!canEdit}
            kind="image"
          />
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Card gradient"
              error={form.formState.errors.gradientPreset?.message}
            >
              <Select {...form.register("gradientPreset")}>
                {gradientPresets.map((preset) => (
                  <option key={preset.token} value={preset.token}>
                    {preset.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Button gradient"
              error={form.formState.errors.buttonGradientPreset?.message}
            >
              <Select {...form.register("buttonGradientPreset")}>
                {gradientPresets.map((preset) => (
                  <option key={preset.token} value={preset.token}>
                    {preset.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField
            label="Publication status"
            hint="Draft products stay in the CMS but are excluded from the public site."
            error={form.formState.errors.publicationStatus?.message}
          >
            <Select {...form.register("publicationStatus")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="space-y-3 p-4">
              <div className="text-sm font-semibold text-[color:var(--dd-text)]">
                Card gradient preview
              </div>
              <div
                className="h-16 rounded-2xl"
                style={{ background: previewGradient?.preview }}
              />
            </Card>
            <Card className="space-y-3 p-4">
              <div className="text-sm font-semibold text-[color:var(--dd-text)]">
                Button gradient preview
              </div>
              <div
                className="h-16 rounded-2xl"
                style={{ background: previewButtonGradient?.preview }}
              />
              <div className="text-sm text-[color:var(--dd-muted)]">
                {publicationStatusLabel(form.watch("publicationStatus"))}
              </div>
            </Card>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditorState({ open: false, product: null })}>
              Cancel
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      </DrawerForm>
      <ConfirmDeleteDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(undefined);
          }
        }}
        onConfirm={() => deleteMutation.mutate()}
        busy={deleteMutation.isPending}
        title="Delete product"
        description="This permanently removes the product card."
      />
    </div>
  );
}
