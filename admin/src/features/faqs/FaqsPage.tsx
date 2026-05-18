import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDeleteDialog, DrawerForm } from "../../components/ui/dialogs";
import { EmptyState } from "../../components/ui/empty-state";
import { FormField, Input, Select, Switch, Textarea } from "../../components/ui/field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { SortableList } from "../../components/ui/sortable-list";
import { apiRequest } from "../../lib/api-client";
import type { FaqCategory, FaqItem, PublicationStatus } from "../../lib/api-types";
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
import { useToast } from "../../components/ui/toast";

const categorySchema = z.object({
  label: z.string().trim().min(1),
  publicationStatus: z.enum(["draft", "published"])
});

const faqItemSchema = z.object({
  categoryId: z.string().min(1),
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
  isActive: z.boolean(),
  publicationStatus: z.enum(["draft", "published"])
});

type CategoryFormValues = z.infer<typeof categorySchema>;
type FaqItemFormValues = z.infer<typeof faqItemSchema>;

function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function FaqsPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [categoryEditor, setCategoryEditor] = useState<{
    open: boolean;
    category: FaqCategory | null;
  }>({
    open: false,
    category: null
  });
  const [itemEditor, setItemEditor] = useState<{
    open: boolean;
    item: FaqItem | null;
  }>({
    open: false,
    item: null
  });
  const [deleteState, setDeleteState] = useState<{
    type: "category" | "item";
    id: string;
  } | null>(null);
  const [requestError, setRequestError] = useState<string>();
  const categoriesQuery = useQuery({
    queryKey: queryKeys.faqCategories,
    queryFn: () => apiRequest<FaqCategory[]>("/api/admin/faq-categories")
  });
  const itemsQuery = useQuery({
    queryKey: queryKeys.faqs,
    queryFn: () => apiRequest<FaqItem[]>("/api/admin/faqs")
  });

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      label: "",
      publicationStatus: "draft"
    }
  });
  const itemForm = useForm<FaqItemFormValues>({
    resolver: zodResolver(faqItemSchema),
    defaultValues: {
      categoryId: "",
      question: "",
      answer: "",
      isActive: true,
      publicationStatus: "draft"
    }
  });

  const categories = sortByOrder(categoriesQuery.data ?? []);
  const items = sortByOrder(itemsQuery.data ?? []);
  const filteredItems =
    selectedCategoryId === "all"
      ? items
      : items.filter((item) => item.categoryId === selectedCategoryId);

  useEffect(() => {
    if (selectedCategoryId === "all") {
      return;
    }

    if (!categories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(categories[0]?.id ?? "all");
    }
  }, [categories, selectedCategoryId]);

  const categoryMutation = useMutation({
    mutationFn: (values: CategoryFormValues) => {
      if (categoryEditor.category) {
        return apiRequest<FaqCategory>(
          `/api/admin/faq-categories/${categoryEditor.category.id}`,
          {
            method: "PUT",
            csrfToken,
            body: {
              label: values.label,
              publicationStatus: values.publicationStatus,
              sortOrder: categoryEditor.category.sortOrder
            }
          }
        );
      }

      return apiRequest<FaqCategory>("/api/admin/faq-categories", {
        method: "POST",
        csrfToken,
        body: {
          label: values.label,
          publicationStatus: values.publicationStatus,
          sortOrder: categories.length
        }
      });
    },
    onSuccess: async () => {
      setCategoryEditor({ open: false, category: null });
      categoryForm.reset({ label: "", publicationStatus: "draft" });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.faqCategories });
      pushToast("FAQ category saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const itemMutation = useMutation({
    mutationFn: (values: FaqItemFormValues) => {
      if (itemEditor.item) {
        return apiRequest<FaqItem>(`/api/admin/faqs/${itemEditor.item.id}`, {
          method: "PUT",
          csrfToken,
          body: {
            ...values,
            sortOrder: itemEditor.item.sortOrder
          }
        });
      }

      const nextSortOrder = items.filter((item) => item.categoryId === values.categoryId).length;

      return apiRequest<FaqItem>("/api/admin/faqs", {
        method: "POST",
        csrfToken,
        body: {
          ...values,
          sortOrder: nextSortOrder
        }
      });
    },
    onSuccess: async () => {
      setItemEditor({ open: false, item: null });
      itemForm.reset({
        categoryId: selectedCategoryId === "all" ? categories[0]?.id ?? "" : selectedCategoryId,
        question: "",
        answer: "",
        isActive: true,
        publicationStatus: "draft"
      });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.faqs });
      pushToast("FAQ item saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const categoryReorderMutation = useMutation({
    mutationFn: (nextItems: FaqCategory[]) =>
      apiRequest<{ success: boolean }>("/api/admin/faq-categories/reorder", {
        method: "PATCH",
        csrfToken,
        body: nextItems.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.faqCategories });
      pushToast("Category order saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const itemReorderMutation = useMutation({
    mutationFn: (nextItems: FaqItem[]) =>
      apiRequest<{ success: boolean }>("/api/admin/faqs/reorder", {
        method: "PATCH",
        csrfToken,
        body: nextItems.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.faqs });
      pushToast("FAQ order saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteState) {
        return;
      }

      if (deleteState.type === "category") {
        await apiRequest<void>(`/api/admin/faq-categories/${deleteState.id}`, {
          method: "DELETE",
          csrfToken
        });
      } else {
        await apiRequest<void>(`/api/admin/faqs/${deleteState.id}`, {
          method: "DELETE",
          csrfToken
        });
      }
    },
    onSuccess: async () => {
      setDeleteState(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.faqCategories }),
        queryClient.invalidateQueries({ queryKey: queryKeys.faqs })
      ]);
      pushToast("Entry deleted");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const categoryPublicationMutation = useMutation({
    mutationFn: ({
      id,
      publicationStatus
    }: {
      id: string;
      publicationStatus: PublicationStatus;
    }) =>
      apiRequest<FaqCategory>(`/api/admin/faq-categories/${id}/publication-status`, {
        method: "PATCH",
        csrfToken,
        body: { publicationStatus }
      }),
    onSuccess: async (_category, variables) => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.faqCategories });
      pushToast(
        variables.publicationStatus === "published"
          ? "FAQ category published"
          : "FAQ category moved to draft"
      );
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const itemPublicationMutation = useMutation({
    mutationFn: ({
      id,
      publicationStatus
    }: {
      id: string;
      publicationStatus: PublicationStatus;
    }) =>
      apiRequest<FaqItem>(`/api/admin/faqs/${id}/publication-status`, {
        method: "PATCH",
        csrfToken,
        body: { publicationStatus }
      }),
    onSuccess: async (_item, variables) => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.faqs });
      pushToast(
        variables.publicationStatus === "published"
          ? "FAQ item published"
          : "FAQ item moved to draft"
      );
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  function openCategoryEditor(category?: FaqCategory) {
    setCategoryEditor({
      open: true,
      category: category ?? null
    });
    categoryForm.reset({
      label: category?.label ?? "",
      publicationStatus: category?.publicationStatus ?? "draft"
    });
  }

  function openItemEditor(item?: FaqItem) {
    setItemEditor({
      open: true,
      item: item ?? null
    });
    itemForm.reset({
      categoryId:
        item?.categoryId ?? (selectedCategoryId === "all" ? categories[0]?.id ?? "" : selectedCategoryId),
      question: item?.question ?? "",
      answer: item?.answer ?? "",
      isActive: item?.isActive ?? true,
      publicationStatus: item?.publicationStatus ?? "draft"
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="FAQ Manager"
        description="Control category tabs and the individual FAQ entries shown on the public site."
        actions={
          canEdit ? (
            <>
              <Button variant="secondary" onClick={() => openCategoryEditor()}>
                <Plus className="h-4 w-4" />
                Add category
              </Button>
              <Button onClick={() => openItemEditor()}>
                <Plus className="h-4 w-4" />
                Add FAQ
              </Button>
            </>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      <div className="grid gap-6 xl:grid-cols-[0.7fr,1.3fr]">
        <Card className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-extrabold text-[color:var(--dd-text)]">Categories</div>
              <div className="text-sm text-[color:var(--dd-muted)]">Drag to reorder the visible tabs.</div>
            </div>
            <Button variant="ghost" onClick={() => setSelectedCategoryId("all")}>
              All items
            </Button>
          </div>
          {categories.length === 0 ? (
            <EmptyState
              title="No categories yet"
              description="Create the first category before adding FAQ entries."
            />
          ) : (
            <SortableList
              items={categories}
              onReorder={(nextItems) => {
                queryClient.setQueryData(queryKeys.faqCategories, nextItems.map((item, index) => ({ ...item, sortOrder: index })));
                categoryReorderMutation.mutate(nextItems);
              }}
              renderItem={(category) => (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
                        selectedCategoryId === category.id
                          ? "bg-teal-700 text-white"
                          : "bg-transparent text-[color:var(--dd-text)]"
                      }`}
                    >
                      {category.label}
                    </button>
                    <div
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${publicationStatusClassName(category.publicationStatus)}`}
                    >
                      {publicationStatusLabel(category.publicationStatus)}
                    </div>
                  </div>
                  {canEdit ? (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => openCategoryEditor(category)}>
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          categoryPublicationMutation.mutate({
                            id: category.id,
                            publicationStatus: togglePublicationStatus(
                              category.publicationStatus
                            )
                          })
                        }
                        disabled={categoryPublicationMutation.isPending}
                      >
                        {publicationActionLabel(category.publicationStatus)}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setDeleteState({ type: "category", id: category.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            />
          )}
        </Card>
        <Card className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-extrabold text-[color:var(--dd-text)]">FAQ items</div>
              <div className="text-sm text-[color:var(--dd-muted)]">
                {selectedCategoryId === "all"
                  ? "Viewing all FAQ entries. Select a category to reorder them."
                  : "Drag to reorder items within the selected category."}
              </div>
            </div>
          </div>
          {filteredItems.length === 0 ? (
            <EmptyState
              title="No FAQ items yet"
              description="Create the first FAQ entry for this category."
            />
          ) : selectedCategoryId === "all" ? (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[color:var(--dd-border)] bg-white/70 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--dd-accent)]">
                        {item.categoryLabel}
                      </div>
                      <div className="mt-2 font-semibold text-[color:var(--dd-text)]">
                        {item.question}
                      </div>
                      <div className="mt-2 text-sm text-[color:var(--dd-muted)]">
                        {item.answer}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                          item.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {item.isActive ? "Active" : "Hidden"}
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${publicationStatusClassName(item.publicationStatus)}`}
                      >
                        {publicationStatusLabel(item.publicationStatus)}
                      </div>
                    </div>
                    {canEdit ? (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => openItemEditor(item)}>
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            itemPublicationMutation.mutate({
                              id: item.id,
                              publicationStatus: togglePublicationStatus(
                                item.publicationStatus
                              )
                            })
                          }
                          disabled={itemPublicationMutation.isPending}
                        >
                          {publicationActionLabel(item.publicationStatus)}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setDeleteState({ type: "item", id: item.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <SortableList
              items={filteredItems}
              onReorder={(nextItems) => {
                const nextById = new Map(
                  nextItems.map((item, index) => [item.id, { ...item, sortOrder: index }])
                );
                queryClient.setQueryData(
                  queryKeys.faqs,
                  items.map((item) => nextById.get(item.id) ?? item)
                );
                itemReorderMutation.mutate(nextItems);
              }}
              renderItem={(item) => (
                <div className="space-y-3">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-semibold text-[color:var(--dd-text)]">
                        {item.question}
                      </div>
                      <div className="mt-2 text-sm text-[color:var(--dd-muted)]">
                        {item.answer}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-full bg-[color:var(--dd-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                        {item.isActive ? "Active" : "Hidden"}
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${publicationStatusClassName(item.publicationStatus)}`}
                      >
                        {publicationStatusLabel(item.publicationStatus)}
                      </div>
                    </div>
                  </div>
                  {canEdit ? (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => openItemEditor(item)}>
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          itemPublicationMutation.mutate({
                            id: item.id,
                            publicationStatus: togglePublicationStatus(
                              item.publicationStatus
                            )
                          })
                        }
                        disabled={itemPublicationMutation.isPending}
                      >
                        {publicationActionLabel(item.publicationStatus)}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setDeleteState({ type: "item", id: item.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            />
          )}
        </Card>
      </div>
      <DrawerForm
        open={categoryEditor.open}
        onOpenChange={(open) => setCategoryEditor((current) => ({ ...current, open }))}
        title={categoryEditor.category ? "Edit category" : "Create category"}
      >
        <form className="space-y-5" onSubmit={categoryForm.handleSubmit((values) => categoryMutation.mutate(values))}>
          <FormField label="Label" error={categoryForm.formState.errors.label?.message}>
            <Input {...categoryForm.register("label")} />
          </FormField>
          <FormField
            label="Publication status"
            hint="Draft categories stay in the CMS but are excluded from the public FAQ tabs."
            error={categoryForm.formState.errors.publicationStatus?.message}
          >
            <Select {...categoryForm.register("publicationStatus")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setCategoryEditor({ open: false, category: null })}>
              Cancel
            </Button>
            <Button type="submit" disabled={categoryMutation.isPending}>
              {categoryMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DrawerForm>
      <DrawerForm
        open={itemEditor.open}
        onOpenChange={(open) => setItemEditor((current) => ({ ...current, open }))}
        title={itemEditor.item ? "Edit FAQ item" : "Create FAQ item"}
      >
        <form className="space-y-5" onSubmit={itemForm.handleSubmit((values) => itemMutation.mutate(values))}>
          <FormField label="Category" error={itemForm.formState.errors.categoryId?.message}>
            <Select {...itemForm.register("categoryId")}>
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Question" error={itemForm.formState.errors.question?.message}>
            <Input {...itemForm.register("question")} />
          </FormField>
          <FormField label="Answer" error={itemForm.formState.errors.answer?.message}>
            <Textarea {...itemForm.register("answer")} />
          </FormField>
          <FormField
            label="Publication status"
            hint="Draft FAQ items stay in the CMS but are excluded from the public FAQ section."
            error={itemForm.formState.errors.publicationStatus?.message}
          >
            <Select {...itemForm.register("publicationStatus")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--dd-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-[color:var(--dd-text)]">Visible on site</div>
              <div className="text-sm text-[color:var(--dd-muted)]">
                Toggle whether the entry is shown publicly.
              </div>
            </div>
            <Switch
              checked={itemForm.watch("isActive")}
              onCheckedChange={(nextValue) => itemForm.setValue("isActive", nextValue)}
            />
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setItemEditor({ open: false, item: null })}>
              Cancel
            </Button>
            <Button type="submit" disabled={itemMutation.isPending}>
              {itemMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DrawerForm>
      <ConfirmDeleteDialog
        open={Boolean(deleteState)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteState(null);
          }
        }}
        onConfirm={() => deleteMutation.mutate()}
        busy={deleteMutation.isPending}
        title="Delete entry"
        description="This change is permanent and will immediately affect the admin collection."
      />
    </div>
  );
}
