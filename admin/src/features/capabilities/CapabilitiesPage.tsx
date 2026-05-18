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
import { MediaField } from "../../components/ui/media-field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { SortableList } from "../../components/ui/sortable-list";
import { apiRequest } from "../../lib/api-client";
import type {
  CapabilityCard,
  CapabilityColumn,
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
import { useToast } from "../../components/ui/toast";

const columnOptions: CapabilityColumn[] = ["left", "middle", "right"];
const columnLabels: Record<CapabilityColumn, string> = {
  left: "Left Column",
  middle: "Middle Column",
  right: "Right Column"
};

const capabilitySchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),
  iconName: z.string().trim().min(1),
  iconUrl: z.string().optional(),
  column: z.enum(["left", "middle", "right"]),
  publicationStatus: z.enum(["draft", "published"])
});

type CapabilityValues = z.infer<typeof capabilitySchema>;

function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function CapabilitiesPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role);
  const [requestError, setRequestError] = useState<string>();
  const [editorState, setEditorState] = useState<{
    open: boolean;
    capability: CapabilityCard | null;
  }>({ open: false, capability: null });
  const [deleteId, setDeleteId] = useState<string>();

  const capabilitiesQuery = useQuery({
    queryKey: queryKeys.capabilities,
    queryFn: () => apiRequest<CapabilityCard[]>("/api/admin/capabilities")
  });
  const uiOptionsQuery = useQuery({
    queryKey: queryKeys.uiOptions,
    queryFn: () => apiRequest<UiOptions>("/api/admin/meta/ui-options")
  });

  const capabilities = sortByOrder(capabilitiesQuery.data ?? []);
  const iconNames = uiOptionsQuery.data?.iconNames ?? [];

  const form = useForm<CapabilityValues>({
    resolver: zodResolver(capabilitySchema),
    defaultValues: {
      title: "",
      description: "",
      iconName: "",
      iconUrl: "",
      column: "left",
      publicationStatus: "draft"
    }
  });

  const saveMutation = useMutation({
    mutationFn: (values: CapabilityValues) => {
      const body = {
        ...values,
        sortOrder: editorState.capability
          ? editorState.capability.column === values.column
            ? editorState.capability.sortOrder
            : capabilities.filter(
                (item) =>
                  item.column === values.column && item.id !== editorState.capability?.id
              ).length
          : capabilities.filter((item) => item.column === values.column).length
      };

      if (editorState.capability) {
        return apiRequest<CapabilityCard>(
          `/api/admin/capabilities/${editorState.capability.id}`,
          {
            method: "PUT",
            csrfToken,
            body
          }
        );
      }

      return apiRequest<CapabilityCard>("/api/admin/capabilities", {
        method: "POST",
        csrfToken,
        body
      });
    },
    onSuccess: async () => {
      setEditorState({ open: false, capability: null });
      form.reset({
        title: "",
        description: "",
        iconName: "",
        iconUrl: "",
        column: "left",
        publicationStatus: "draft"
      });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.capabilities });
      pushToast("Capability saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const reorderMutation = useMutation({
    mutationFn: (items: CapabilityCard[]) =>
      apiRequest<{ success: boolean }>("/api/admin/capabilities/reorder", {
        method: "PATCH",
        csrfToken,
        body: items.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.capabilities });
      pushToast("Capability order saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest<void>(`/api/admin/capabilities/${deleteId}`, {
        method: "DELETE",
        csrfToken
      }),
    onSuccess: async () => {
      setDeleteId(undefined);
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.capabilities });
      pushToast("Capability deleted");
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
      apiRequest<CapabilityCard>(`/api/admin/capabilities/${id}/publication-status`, {
        method: "PATCH",
        csrfToken,
        body: { publicationStatus }
      }),
    onSuccess: async (_capability, variables) => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.capabilities });
      pushToast(
        variables.publicationStatus === "published"
          ? "Capability published"
          : "Capability moved to draft"
      );
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  function openEditor(capability?: CapabilityCard) {
    setEditorState({ open: true, capability: capability ?? null });
    form.reset({
      title: capability?.title ?? "",
      description: capability?.description ?? "",
      iconName: capability?.iconName ?? "",
      iconUrl: capability?.iconUrl ?? "",
      column: capability?.column ?? "left",
      publicationStatus: capability?.publicationStatus ?? "draft"
    });
  }

  return (
    <div className="space-y-6">
      <datalist id="deepdale-capability-icons">
        {iconNames.map((iconName) => (
          <option key={iconName} value={iconName} />
        ))}
      </datalist>
      <PageHeader
        title="Capabilities"
        description="Manage the capability grid, searchable icon names, and column assignment across the three-column layout."
        actions={
          canEdit ? (
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4" />
              Add capability
            </Button>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      <div className="grid gap-6 xl:grid-cols-3">
        {columnOptions.map((column) => {
          const columnItems = capabilities.filter((item) => item.column === column);

          return (
            <Card key={column} className="space-y-4">
              <div className="space-y-1">
                <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
                  {columnLabels[column]}
                </div>
                <div className="text-sm text-[color:var(--dd-muted)]">
                  Reorder cards within the {columnLabels[column].toLowerCase()}.
                </div>
              </div>
              {columnItems.length === 0 ? (
                <EmptyState
                  title="No capabilities"
                  description={`Add the first card for the ${columnLabels[column].toLowerCase()}.`}
                />
              ) : (
                <SortableList
                  items={columnItems}
                  onReorder={(items) => {
                    const nextById = new Map(
                      items.map((item, index) => [item.id, { ...item, sortOrder: index }])
                    );
                    queryClient.setQueryData(
                      queryKeys.capabilities,
                      capabilities.map((item) => nextById.get(item.id) ?? item)
                    );
                    reorderMutation.mutate(items);
                  }}
                  renderItem={(capability) => (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-semibold text-[color:var(--dd-text)]">
                            {capability.title}
                          </div>
                          <div className="mt-2 text-sm text-[color:var(--dd-muted)]">
                            {capability.description}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {capability.iconUrl && (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--dd-border)] bg-white p-1">
                              <img
                                src={capability.iconUrl}
                                alt={capability.title}
                                className="h-full w-full object-contain"
                              />
                            </div>
                          )}
                          <div className="rounded-full border border-[color:var(--dd-border)] px-3 py-1 text-xs text-[color:var(--dd-muted)]">
                            {capability.iconName}
                          </div>
                          <div
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${publicationStatusClassName(capability.publicationStatus)}`}
                          >
                            {publicationStatusLabel(capability.publicationStatus)}
                          </div>
                        </div>
                      </div>
                      {canEdit ? (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => openEditor(capability)}>
                            Edit
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() =>
                              publicationMutation.mutate({
                                id: capability.id,
                                publicationStatus: togglePublicationStatus(
                                  capability.publicationStatus
                                )
                              })
                            }
                            disabled={publicationMutation.isPending}
                          >
                            {publicationActionLabel(capability.publicationStatus)}
                          </Button>
                          <Button variant="ghost" onClick={() => setDeleteId(capability.id)}>
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
        title={editorState.capability ? "Edit capability" : "Create capability"}
      >
        <form className="space-y-5" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <FormField label="Title" error={form.formState.errors.title?.message}>
            <Input {...form.register("title")} />
          </FormField>
          <MediaField
            label="Icon Image (Optional)"
            hint="Upload a custom icon for this capability. If not provided, the default Lucide icon name will be used."
            value={form.watch("iconUrl")}
            onChange={(url) => form.setValue("iconUrl", url, { shouldDirty: true })}
            disabled={!canEdit}
            kind="image"
          />
          <FormField
            label="Description"
            error={form.formState.errors.description?.message}
          >
            <Textarea {...form.register("description")} />
          </FormField>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Icon name" error={form.formState.errors.iconName?.message}>
              <Input list="deepdale-capability-icons" {...form.register("iconName")} />
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
            hint="Draft capabilities stay in the CMS but are excluded from the public site."
            error={form.formState.errors.publicationStatus?.message}
          >
            <Select {...form.register("publicationStatus")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditorState({ open: false, capability: null })}>
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
        title="Delete capability"
        description="This permanently removes the capability card."
      />
    </div>
  );
}
