import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDeleteDialog, DrawerForm } from "../../components/ui/dialogs";
import { EmptyState } from "../../components/ui/empty-state";
import { FormField, Input, Select, Textarea } from "../../components/ui/field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { SortableList } from "../../components/ui/sortable-list";
import { useToast } from "../../components/ui/toast";
import { apiRequest } from "../../lib/api-client";
import type {
  ProductFeature,
  ProductFeatureColumn,
  PublicationStatus,
  UiOptions
} from "../../lib/api-types";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";
import {
  publicationActionLabel,
  publicationStatusClassName,
  publicationStatusLabel,
  togglePublicationStatus
} from "../../lib/publication-status";
import { queryKeys } from "../../lib/query-keys";
import { canWriteContent } from "../../lib/role-utils";

const columnOptions: ProductFeatureColumn[] = ["left", "right"];
const columnLabels: Record<ProductFeatureColumn, string> = {
  left: "Left Column",
  right: "Right Column"
};

const productFeatureSchema = z.object({
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(2000),
  iconName: z.string().trim().min(1),
  column: z.enum(["left", "right"]),
  publicationStatus: z.enum(["draft", "published"])
});

type ProductFeatureValues = z.infer<typeof productFeatureSchema>;

function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function ProductFeaturesPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role);
  const [requestError, setRequestError] = useState<string>();
  const [editorState, setEditorState] = useState<{
    open: boolean;
    feature: ProductFeature | null;
  }>({ open: false, feature: null });
  const [deleteId, setDeleteId] = useState<string>();

  const productFeaturesQuery = useQuery({
    queryKey: queryKeys.productFeatures,
    queryFn: () => apiRequest<ProductFeature[]>("/api/admin/product-features")
  });
  const uiOptionsQuery = useQuery({
    queryKey: queryKeys.uiOptions,
    queryFn: () => apiRequest<UiOptions>("/api/admin/meta/ui-options")
  });

  const productFeatures = sortByOrder(productFeaturesQuery.data ?? []);
  const iconNames = uiOptionsQuery.data?.iconNames ?? [];

  const form = useForm<ProductFeatureValues>({
    resolver: zodResolver(productFeatureSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      description: "",
      iconName: "",
      column: "left",
      publicationStatus: "draft"
    }
  });

  const saveMutation = useMutation({
    mutationFn: (values: ProductFeatureValues) => {
      const body = {
        ...values,
        sortOrder: editorState.feature
          ? editorState.feature.column === values.column
            ? editorState.feature.sortOrder
            : productFeatures.filter(
                (item) =>
                  item.column === values.column && item.id !== editorState.feature?.id
              ).length
          : productFeatures.filter((item) => item.column === values.column).length
      };

      if (editorState.feature) {
        return apiRequest<ProductFeature>(
          `/api/admin/product-features/${editorState.feature.id}`,
          {
            method: "PUT",
            csrfToken,
            body
          }
        );
      }

      return apiRequest<ProductFeature>("/api/admin/product-features", {
        method: "POST",
        csrfToken,
        body
      });
    },
    onSuccess: async () => {
      setEditorState({ open: false, feature: null });
      form.reset({
        title: "",
        subtitle: "",
        description: "",
        iconName: "",
        column: "left",
        publicationStatus: "draft"
      });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.productFeatures });
      pushToast("Product feature saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const reorderMutation = useMutation({
    mutationFn: (items: ProductFeature[]) =>
      apiRequest<{ success: boolean }>("/api/admin/product-features/reorder", {
        method: "PATCH",
        csrfToken,
        body: items.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.productFeatures });
      pushToast("Product feature order saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest<void>(`/api/admin/product-features/${deleteId}`, {
        method: "DELETE",
        csrfToken
      }),
    onSuccess: async () => {
      setDeleteId(undefined);
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.productFeatures });
      pushToast("Product feature deleted");
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
      apiRequest<ProductFeature>(
        `/api/admin/product-features/${id}/publication-status`,
        {
          method: "PATCH",
          csrfToken,
          body: { publicationStatus }
        }
      ),
    onSuccess: async (_feature, variables) => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.productFeatures });
      pushToast(
        variables.publicationStatus === "published"
          ? "Product feature published"
          : "Product feature moved to draft"
      );
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  function openEditor(feature?: ProductFeature) {
    setEditorState({ open: true, feature: feature ?? null });
    form.reset({
      title: feature?.title ?? "",
      subtitle: feature?.subtitle ?? "",
      description: feature?.description ?? "",
      iconName: feature?.iconName ?? "",
      column: feature?.column ?? "left",
      publicationStatus: feature?.publicationStatus ?? "draft"
    });
  }

  return (
    <div className="space-y-6">
      <datalist id="deepdale-product-feature-icons">
        {iconNames.map((iconName) => (
          <option key={iconName} value={iconName} />
        ))}
      </datalist>
      <PageHeader
        title="Product Features"
        description="Manage the side columns that frame the product center image, including feature icon names and per-column ordering."
        actions={
          canEdit ? (
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4" />
              Add feature
            </Button>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      <div className="grid gap-6 xl:grid-cols-2">
        {columnOptions.map((column) => {
          const columnItems = productFeatures.filter((item) => item.column === column);

          return (
            <Card key={column} className="space-y-4">
              <div className="space-y-1">
                <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
                  {columnLabels[column]}
                </div>
                <div className="text-sm text-[color:var(--dd-muted)]">
                  Reorder the features that appear in the {columnLabels[column].toLowerCase()}.
                </div>
              </div>
              {columnItems.length === 0 ? (
                <EmptyState
                  title="No features"
                  description={`Add the first feature for the ${columnLabels[column].toLowerCase()}.`}
                />
              ) : (
                <SortableList
                  items={columnItems}
                  onReorder={(items) => {
                    const nextById = new Map(
                      items.map((item, index) => [item.id, { ...item, sortOrder: index }])
                    );
                    queryClient.setQueryData(
                      queryKeys.productFeatures,
                      productFeatures.map((item) => nextById.get(item.id) ?? item)
                    );
                    reorderMutation.mutate(items);
                  }}
                  renderItem={(feature) => (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-semibold text-[color:var(--dd-text)]">
                            {feature.title}
                          </div>
                          <div className="mt-1 text-sm text-[color:var(--dd-accent)]">
                            {feature.subtitle}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="rounded-full border border-[color:var(--dd-border)] px-3 py-1 text-xs text-[color:var(--dd-muted)]">
                            {feature.iconName}
                          </div>
                          <div
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${publicationStatusClassName(feature.publicationStatus)}`}
                          >
                            {publicationStatusLabel(feature.publicationStatus)}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-[color:var(--dd-muted)]">
                        {feature.description}
                      </div>
                      {canEdit ? (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => openEditor(feature)}>
                            Edit
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() =>
                              publicationMutation.mutate({
                                id: feature.id,
                                publicationStatus: togglePublicationStatus(
                                  feature.publicationStatus
                                )
                              })
                            }
                            disabled={publicationMutation.isPending}
                          >
                            {publicationActionLabel(feature.publicationStatus)}
                          </Button>
                          <Button variant="ghost" onClick={() => setDeleteId(feature.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}
                />
              )}
            </Card>
          );
        })}
      </div>
      <DrawerForm
        open={editorState.open}
        onOpenChange={(open) => setEditorState((current) => ({ ...current, open }))}
        title={editorState.feature ? "Edit product feature" : "Create product feature"}
      >
        <form className="space-y-5" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Title" error={form.formState.errors.title?.message}>
              <Input {...form.register("title")} />
            </FormField>
            <FormField label="Subtitle" error={form.formState.errors.subtitle?.message}>
              <Input {...form.register("subtitle")} />
            </FormField>
          </div>
          <FormField
            label="Description"
            error={form.formState.errors.description?.message}
          >
            <Textarea {...form.register("description")} />
          </FormField>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Icon name" error={form.formState.errors.iconName?.message}>
              <Input list="deepdale-product-feature-icons" {...form.register("iconName")} />
            </FormField>
            <FormField label="Column" error={form.formState.errors.column?.message}>
              <Select {...form.register("column")}>
                {columnOptions.map((column) => (
                  <option key={column} value={column}>
                    {columnLabels[column]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField
            label="Publication status"
            hint="Draft features stay in the CMS but are excluded from the public site."
            error={form.formState.errors.publicationStatus?.message}
          >
            <Select {...form.register("publicationStatus")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditorState({ open: false, feature: null })}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
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
        title="Delete product feature"
        description="This permanently removes the product feature card."
      />
    </div>
  );
}
