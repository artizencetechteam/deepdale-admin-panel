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
import { FormField, Input, Select, Switch, Textarea } from "../../components/ui/field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { SortableList } from "../../components/ui/sortable-list";
import { apiRequest } from "../../lib/api-client";
import type {
  MegaMenuColumn,
  MegaMenuItem,
  NavigationItem,
  PublicationStatus,
  UiOptions
} from "../../lib/api-types";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";
import { optionalUrlOrPathField } from "../../lib/form-schemas";
import {
  publicationActionLabel,
  publicationStatusClassName,
  publicationStatusLabel,
  togglePublicationStatus
} from "../../lib/publication-status";
import { queryKeys } from "../../lib/query-keys";
import { canWriteContent } from "../../lib/role-utils";
import { useToast } from "../../components/ui/toast";

const columnOptions: MegaMenuColumn[] = ["platforms", "useCases", "customers"];
const columnLabels: Record<MegaMenuColumn, string> = {
  platforms: "Platforms",
  useCases: "Use Cases",
  customers: "Customers"
};

const navigationItemSchema = z.object({
  label: z.string().trim().min(1),
  href: optionalUrlOrPathField,
  hasDropdown: z.boolean(),
  publicationStatus: z.enum(["draft", "published"])
});

const megaMenuItemSchema = z.object({
  column: z.enum(["platforms", "useCases", "customers"]),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  iconName: z.string().trim().min(1),
  iconColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  isNew: z.boolean(),
  link: optionalUrlOrPathField,
  publicationStatus: z.enum(["draft", "published"])
});

type NavigationItemValues = z.infer<typeof navigationItemSchema>;
type MegaMenuItemValues = z.infer<typeof megaMenuItemSchema>;

function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function NavigationPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role);
  const [requestError, setRequestError] = useState<string>();
  const [navigationEditor, setNavigationEditor] = useState<{
    open: boolean;
    item: NavigationItem | null;
  }>({ open: false, item: null });
  const [megaEditor, setMegaEditor] = useState<{
    open: boolean;
    item: MegaMenuItem | null;
  }>({ open: false, item: null });
  const [deleteState, setDeleteState] = useState<{
    type: "navigation" | "mega";
    id: string;
  } | null>(null);

  const navigationItemsQuery = useQuery({
    queryKey: queryKeys.navigationItems,
    queryFn: () => apiRequest<NavigationItem[]>("/api/admin/navigation-items")
  });
  const megaMenuItemsQuery = useQuery({
    queryKey: queryKeys.megaMenuItems,
    queryFn: () => apiRequest<MegaMenuItem[]>("/api/admin/mega-menu-items")
  });
  const uiOptionsQuery = useQuery({
    queryKey: queryKeys.uiOptions,
    queryFn: () => apiRequest<UiOptions>("/api/admin/meta/ui-options")
  });

  const navigationForm = useForm<NavigationItemValues>({
    resolver: zodResolver(navigationItemSchema),
    defaultValues: {
      label: "",
      href: "",
      hasDropdown: false,
      publicationStatus: "draft"
    }
  });
  const megaForm = useForm<MegaMenuItemValues>({
    resolver: zodResolver(megaMenuItemSchema),
    defaultValues: {
      column: "platforms",
      title: "",
      description: "",
      iconName: "",
      iconColor: "#0f766e",
      isNew: false,
      link: "",
      publicationStatus: "draft"
    }
  });

  const navigationItems = sortByOrder(navigationItemsQuery.data ?? []);
  const megaMenuItems = sortByOrder(megaMenuItemsQuery.data ?? []);

  const navigationMutation = useMutation({
    mutationFn: (values: NavigationItemValues) => {
      const body = {
        label: values.label,
        href: values.href?.trim() ? values.href.trim() : undefined,
        hasDropdown: values.hasDropdown,
        publicationStatus: values.publicationStatus,
        sortOrder: navigationEditor.item?.sortOrder ?? navigationItems.length
      };

      if (navigationEditor.item) {
        return apiRequest<NavigationItem>(
          `/api/admin/navigation-items/${navigationEditor.item.id}`,
          {
            method: "PUT",
            csrfToken,
            body
          }
        );
      }

      return apiRequest<NavigationItem>("/api/admin/navigation-items", {
        method: "POST",
        csrfToken,
        body
      });
    },
    onSuccess: async () => {
      setNavigationEditor({ open: false, item: null });
      navigationForm.reset({
        label: "",
        href: "",
        hasDropdown: false,
        publicationStatus: "draft"
      });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.navigationItems });
      pushToast("Navigation item saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const megaMutation = useMutation({
    mutationFn: (values: MegaMenuItemValues) => {
      const sortOrder = megaEditor.item
        ? megaEditor.item.column === values.column
          ? megaEditor.item.sortOrder
          : megaMenuItems.filter(
              (item) =>
                item.column === values.column && item.id !== megaEditor.item?.id
            ).length
        : megaMenuItems.filter((item) => item.column === values.column).length;

      const body = {
        column: values.column,
        title: values.title,
        description: values.description,
        iconName: values.iconName,
        iconColor: values.iconColor,
        isNew: values.isNew,
        link: values.link?.trim() ? values.link.trim() : undefined,
        publicationStatus: values.publicationStatus,
        sortOrder
      };

      if (megaEditor.item) {
        return apiRequest<MegaMenuItem>(
          `/api/admin/mega-menu-items/${megaEditor.item.id}`,
          {
            method: "PUT",
            csrfToken,
            body
          }
        );
      }

      return apiRequest<MegaMenuItem>("/api/admin/mega-menu-items", {
        method: "POST",
        csrfToken,
        body
      });
    },
    onSuccess: async () => {
      setMegaEditor({ open: false, item: null });
      megaForm.reset({
        column: "platforms",
        title: "",
        description: "",
        iconName: "",
        iconColor: "#0f766e",
        isNew: false,
        link: "",
        publicationStatus: "draft"
      });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.megaMenuItems });
      pushToast("Mega menu item saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const navigationReorderMutation = useMutation({
    mutationFn: (items: NavigationItem[]) =>
      apiRequest<{ success: boolean }>("/api/admin/navigation-items/reorder", {
        method: "PATCH",
        csrfToken,
        body: items.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.navigationItems });
      pushToast("Navigation order saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const megaReorderMutation = useMutation({
    mutationFn: (items: MegaMenuItem[]) =>
      apiRequest<{ success: boolean }>("/api/admin/mega-menu-items/reorder", {
        method: "PATCH",
        csrfToken,
        body: items.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.megaMenuItems });
      pushToast("Mega menu order saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteState) {
        return;
      }

      const path =
        deleteState.type === "navigation"
          ? `/api/admin/navigation-items/${deleteState.id}`
          : `/api/admin/mega-menu-items/${deleteState.id}`;

      await apiRequest<void>(path, {
        method: "DELETE",
        csrfToken
      });
    },
    onSuccess: async () => {
      setDeleteState(null);
      setRequestError(undefined);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.navigationItems }),
        queryClient.invalidateQueries({ queryKey: queryKeys.megaMenuItems })
      ]);
      pushToast("Entry deleted");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const navigationPublicationMutation = useMutation({
    mutationFn: ({
      id,
      publicationStatus
    }: {
      id: string;
      publicationStatus: PublicationStatus;
    }) =>
      apiRequest<NavigationItem>(
        `/api/admin/navigation-items/${id}/publication-status`,
        {
          method: "PATCH",
          csrfToken,
          body: { publicationStatus }
        }
      ),
    onSuccess: async (_item, variables) => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.navigationItems });
      pushToast(
        variables.publicationStatus === "published"
          ? "Navigation item published"
          : "Navigation item moved to draft"
      );
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const megaPublicationMutation = useMutation({
    mutationFn: ({
      id,
      publicationStatus
    }: {
      id: string;
      publicationStatus: PublicationStatus;
    }) =>
      apiRequest<MegaMenuItem>(`/api/admin/mega-menu-items/${id}/publication-status`, {
        method: "PATCH",
        csrfToken,
        body: { publicationStatus }
      }),
    onSuccess: async (_item, variables) => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.megaMenuItems });
      pushToast(
        variables.publicationStatus === "published"
          ? "Mega menu item published"
          : "Mega menu item moved to draft"
      );
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  function openNavigationEditor(item?: NavigationItem) {
    setNavigationEditor({
      open: true,
      item: item ?? null
    });
    navigationForm.reset({
      label: item?.label ?? "",
      href: item?.href ?? "",
      hasDropdown: item?.hasDropdown ?? false,
      publicationStatus: item?.publicationStatus ?? "draft"
    });
  }

  function openMegaEditor(item?: MegaMenuItem) {
    setMegaEditor({
      open: true,
      item: item ?? null
    });
    megaForm.reset({
      column: item?.column ?? "platforms",
      title: item?.title ?? "",
      description: item?.description ?? "",
      iconName: item?.iconName ?? "",
      iconColor: item?.iconColor ?? "#0f766e",
      isNew: item?.isNew ?? false,
      link: item?.link ?? "",
      publicationStatus: item?.publicationStatus ?? "draft"
    });
  }

  return (
    <div className="space-y-6">
      <datalist id="deepdale-icon-names">
        {(uiOptionsQuery.data?.iconNames ?? []).map((iconName) => (
          <option key={iconName} value={iconName} />
        ))}
      </datalist>
      <PageHeader
        title="Navigation"
        description="Manage top-level navigation items and the three-column mega menu content."
        actions={
          canEdit ? (
            <>
              <Button variant="secondary" onClick={() => openNavigationEditor()}>
                <Plus className="h-4 w-4" />
                Add nav item
              </Button>
              <Button onClick={() => openMegaEditor()}>
                <Plus className="h-4 w-4" />
                Add mega item
              </Button>
            </>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      <div className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
        <Card className="space-y-4">
          <div className="space-y-1">
            <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
              Navigation items
            </div>
            <div className="text-sm text-[color:var(--dd-muted)]">
              Drag to define the order used across the public header.
            </div>
          </div>
          {navigationItems.length === 0 ? (
            <EmptyState
              title="No navigation items yet"
              description="Create the first item to build the public header."
            />
          ) : (
            <SortableList
              items={navigationItems}
              onReorder={(items) => {
                queryClient.setQueryData(
                  queryKeys.navigationItems,
                  items.map((item, index) => ({ ...item, sortOrder: index }))
                );
                navigationReorderMutation.mutate(items);
              }}
              renderItem={(item) => (
                <div className="space-y-3">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-semibold text-[color:var(--dd-text)]">
                        {item.label}
                      </div>
                      <div className="mt-1 text-sm text-[color:var(--dd-muted)]">
                        {item.href || "Dropdown parent with no direct link"}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-full bg-[color:var(--dd-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                        {item.hasDropdown ? "Dropdown" : "Direct link"}
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
                      <Button variant="secondary" onClick={() => openNavigationEditor(item)}>
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          navigationPublicationMutation.mutate({
                            id: item.id,
                            publicationStatus: togglePublicationStatus(
                              item.publicationStatus
                            )
                          })
                        }
                        disabled={navigationPublicationMutation.isPending}
                      >
                        {publicationActionLabel(item.publicationStatus)}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setDeleteState({ type: "navigation", id: item.id })}
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
        <div className="grid gap-6 xl:grid-cols-3">
          {columnOptions.map((column) => {
            const columnItems = megaMenuItems.filter((item) => item.column === column);

            return (
              <Card key={column} className="space-y-4">
                <div className="space-y-1">
                  <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
                    {columnLabels[column]}
                  </div>
                  <div className="text-sm text-[color:var(--dd-muted)]">
                    Reorder items inside the {columnLabels[column].toLowerCase()} column.
                  </div>
                </div>
                {columnItems.length === 0 ? (
                  <EmptyState
                    title="No items"
                    description="This mega menu column does not have any entries yet."
                  />
                ) : (
                  <SortableList
                    items={columnItems}
                    onReorder={(items) => {
                      const nextById = new Map(
                        items.map((item, index) => [item.id, { ...item, sortOrder: index }])
                      );
                      queryClient.setQueryData(
                        queryKeys.megaMenuItems,
                        megaMenuItems.map((item) => nextById.get(item.id) ?? item)
                      );
                      megaReorderMutation.mutate(items);
                    }}
                    renderItem={(item) => (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="font-semibold text-[color:var(--dd-text)]">
                              {item.title}
                            </div>
                            <div className="mt-1 text-sm text-[color:var(--dd-muted)]">
                              {item.description}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {item.isNew ? (
                              <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                                New
                              </div>
                            ) : null}
                            <div
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${publicationStatusClassName(item.publicationStatus)}`}
                            >
                              {publicationStatusLabel(item.publicationStatus)}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-[color:var(--dd-muted)]">
                          <span className="rounded-full border border-[color:var(--dd-border)] px-3 py-1">
                            {item.iconName}
                          </span>
                          <span className="rounded-full border border-[color:var(--dd-border)] px-3 py-1">
                            {item.link || "No link"}
                          </span>
                        </div>
                        {canEdit ? (
                          <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" onClick={() => openMegaEditor(item)}>
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() =>
                                megaPublicationMutation.mutate({
                                  id: item.id,
                                  publicationStatus: togglePublicationStatus(
                                    item.publicationStatus
                                  )
                                })
                              }
                              disabled={megaPublicationMutation.isPending}
                            >
                              {publicationActionLabel(item.publicationStatus)}
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setDeleteState({ type: "mega", id: item.id })}
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
            );
          })}
        </div>
      </div>
      <DrawerForm
        open={navigationEditor.open}
        onOpenChange={(open) => setNavigationEditor((current) => ({ ...current, open }))}
        title={navigationEditor.item ? "Edit navigation item" : "Create navigation item"}
      >
        <form className="space-y-5" onSubmit={navigationForm.handleSubmit((values) => navigationMutation.mutate(values))}>
          <FormField label="Label" error={navigationForm.formState.errors.label?.message}>
            <Input {...navigationForm.register("label")} />
          </FormField>
          <FormField label="Href" hint="Leave empty for dropdown parents.">
            <Input {...navigationForm.register("href")} />
          </FormField>
          <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--dd-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-[color:var(--dd-text)]">Has dropdown</div>
              <div className="text-sm text-[color:var(--dd-muted)]">
                Toggle this for items that open the mega menu.
              </div>
            </div>
            <Switch
              checked={navigationForm.watch("hasDropdown")}
              onCheckedChange={(nextValue) => navigationForm.setValue("hasDropdown", nextValue)}
            />
          </div>
          <FormField
            label="Publication status"
            hint="Draft navigation items stay in the CMS but are excluded from the public header."
            error={navigationForm.formState.errors.publicationStatus?.message}
          >
            <Select {...navigationForm.register("publicationStatus")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setNavigationEditor({ open: false, item: null })}>
              Cancel
            </Button>
            <Button type="submit" disabled={navigationMutation.isPending}>
              {navigationMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DrawerForm>
      <DrawerForm
        open={megaEditor.open}
        onOpenChange={(open) => setMegaEditor((current) => ({ ...current, open }))}
        title={megaEditor.item ? "Edit mega menu item" : "Create mega menu item"}
      >
        <form className="space-y-5" onSubmit={megaForm.handleSubmit((values) => megaMutation.mutate(values))}>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Column" error={megaForm.formState.errors.column?.message}>
              <Select {...megaForm.register("column")}>
                {columnOptions.map((option) => (
                  <option key={option} value={option}>
                    {columnLabels[option]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Icon color" error={megaForm.formState.errors.iconColor?.message}>
              <Input type="color" {...megaForm.register("iconColor")} />
            </FormField>
          </div>
          <FormField label="Title" error={megaForm.formState.errors.title?.message}>
            <Input {...megaForm.register("title")} />
          </FormField>
          <FormField
            label="Description"
            error={megaForm.formState.errors.description?.message}
          >
            <Textarea {...megaForm.register("description")} />
          </FormField>
          <FormField label="Icon name" error={megaForm.formState.errors.iconName?.message}>
            <Input list="deepdale-icon-names" {...megaForm.register("iconName")} />
          </FormField>
          <FormField label="Link">
            <Input {...megaForm.register("link")} />
          </FormField>
          <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--dd-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-[color:var(--dd-text)]">Mark as new</div>
              <div className="text-sm text-[color:var(--dd-muted)]">
                Adds a small badge in the mega menu.
              </div>
            </div>
            <Switch
              checked={megaForm.watch("isNew")}
              onCheckedChange={(nextValue) => megaForm.setValue("isNew", nextValue)}
            />
          </div>
          <FormField
            label="Publication status"
            hint="Draft mega menu items stay in the CMS but are excluded from the public header."
            error={megaForm.formState.errors.publicationStatus?.message}
          >
            <Select {...megaForm.register("publicationStatus")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setMegaEditor({ open: false, item: null })}>
              Cancel
            </Button>
            <Button type="submit" disabled={megaMutation.isPending}>
              {megaMutation.isPending ? "Saving..." : "Save"}
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
        title="Delete navigation entry"
        description="This permanently removes the selected navigation or mega menu item."
      />
    </div>
  );
}
