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
import { FormField, Input, Select, Switch } from "../../components/ui/field";
import { MediaField } from "../../components/ui/media-field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { SortableList } from "../../components/ui/sortable-list";
import { apiRequest } from "../../lib/api-client";
import type { Integration, PublicationStatus } from "../../lib/api-types";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";
import { optionalUrlField } from "../../lib/form-schemas";
import {
  publicationActionLabel,
  publicationStatusClassName,
  publicationStatusLabel,
  togglePublicationStatus
} from "../../lib/publication-status";
import { queryKeys } from "../../lib/query-keys";
import { canWriteContent } from "../../lib/role-utils";
import { useToast } from "../../components/ui/toast";

const rowOptions = [1, 2, 3] as const;

const integrationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  shortLabel: z.string().trim().min(1).max(8),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  logoUrl: optionalUrlField,
  row: z.coerce.number().int().min(1).max(3),
  isActive: z.boolean(),
  publicationStatus: z.enum(["draft", "published"])
});

type IntegrationValues = z.infer<typeof integrationSchema>;

function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function IntegrationsPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role);
  const [requestError, setRequestError] = useState<string>();
  const [editorState, setEditorState] = useState<{
    open: boolean;
    integration: Integration | null;
  }>({ open: false, integration: null });
  const [deleteId, setDeleteId] = useState<string>();

  const integrationsQuery = useQuery({
    queryKey: queryKeys.integrations,
    queryFn: () => apiRequest<Integration[]>("/api/admin/integrations")
  });

  const integrations = sortByOrder(integrationsQuery.data ?? []);

  const form = useForm<IntegrationValues>({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      name: "",
      shortLabel: "",
      color: "#0f766e",
      logoUrl: "",
      row: 1,
      isActive: true,
      publicationStatus: "draft"
    }
  });

  const saveMutation = useMutation({
    mutationFn: (values: IntegrationValues) => {
      const body = {
        name: values.name,
        shortLabel: values.shortLabel,
        color: values.color,
        logoUrl: values.logoUrl?.trim() ? values.logoUrl.trim() : undefined,
        row: values.row,
        isActive: values.isActive,
        publicationStatus: values.publicationStatus,
        sortOrder: editorState.integration
          ? editorState.integration.row === values.row
            ? editorState.integration.sortOrder
            : integrations.filter(
                (item) =>
                  item.row === values.row && item.id !== editorState.integration?.id
              ).length
          : integrations.filter((item) => item.row === values.row).length
      };

      if (editorState.integration) {
        return apiRequest<Integration>(
          `/api/admin/integrations/${editorState.integration.id}`,
          {
            method: "PUT",
            csrfToken,
            body
          }
        );
      }

      return apiRequest<Integration>("/api/admin/integrations", {
        method: "POST",
        csrfToken,
        body
      });
    },
    onSuccess: async () => {
      setEditorState({ open: false, integration: null });
      form.reset({
        name: "",
        shortLabel: "",
        color: "#0f766e",
        logoUrl: "",
        row: 1,
        isActive: true,
        publicationStatus: "draft"
      });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
      pushToast("Integration saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const reorderMutation = useMutation({
    mutationFn: (items: Integration[]) =>
      apiRequest<{ success: boolean }>("/api/admin/integrations/reorder", {
        method: "PATCH",
        csrfToken,
        body: items.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
      pushToast("Integration order saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest<void>(`/api/admin/integrations/${deleteId}`, {
        method: "DELETE",
        csrfToken
      }),
    onSuccess: async () => {
      setDeleteId(undefined);
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
      pushToast("Integration deleted");
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
      apiRequest<Integration>(`/api/admin/integrations/${id}/publication-status`, {
        method: "PATCH",
        csrfToken,
        body: { publicationStatus }
      }),
    onSuccess: async (_integration, variables) => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
      pushToast(
        variables.publicationStatus === "published"
          ? "Integration published"
          : "Integration moved to draft"
      );
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  function openEditor(integration?: Integration) {
    setEditorState({ open: true, integration: integration ?? null });
    form.reset({
      name: integration?.name ?? "",
      shortLabel: integration?.shortLabel ?? "",
      color: integration?.color ?? "#0f766e",
      logoUrl: integration?.logoUrl ?? "",
      row: integration?.row ?? 1,
      isActive: integration?.isActive ?? true,
      publicationStatus: integration?.publicationStatus ?? "draft"
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Manage integration badges, assign them to marquee rows, and optionally attach logos."
        actions={
          canEdit ? (
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4" />
              Add integration
            </Button>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      <div className="grid gap-6 xl:grid-cols-3">
        {rowOptions.map((row) => {
          const rowItems = integrations.filter((item) => item.row === row);

          return (
            <Card key={row} className="space-y-4">
              <div className="space-y-1">
                <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
                  Row {row}
                </div>
                <div className="text-sm text-[color:var(--dd-muted)]">
                  Reorder the badges shown in marquee row {row}.
                </div>
              </div>
              {rowItems.length === 0 ? (
                <EmptyState
                  title="No integrations"
                  description={`Add the first integration badge for row ${row}.`}
                />
              ) : (
                <SortableList
                  items={rowItems}
                  onReorder={(items) => {
                    const nextById = new Map(
                      items.map((item, index) => [item.id, { ...item, sortOrder: index }])
                    );
                    queryClient.setQueryData(
                      queryKeys.integrations,
                      integrations.map((item) => nextById.get(item.id) ?? item)
                    );
                    reorderMutation.mutate(items);
                  }}
                  renderItem={(integration) => (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-extrabold text-white"
                            style={{ backgroundColor: integration.color }}
                          >
                            {integration.shortLabel}
                          </div>
                          <div>
                            <div className="font-semibold text-[color:var(--dd-text)]">
                              {integration.name}
                            </div>
                            <div className="text-sm text-[color:var(--dd-muted)]">
                              {integration.logoUrl ? "Logo attached" : "Badge only"}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                              integration.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-stone-200 text-stone-700"
                            }`}
                          >
                            {integration.isActive ? "Active" : "Hidden"}
                          </div>
                          <div
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${publicationStatusClassName(integration.publicationStatus)}`}
                          >
                            {publicationStatusLabel(integration.publicationStatus)}
                          </div>
                        </div>
                      </div>
                      {integration.logoUrl ? (
                        <div className="overflow-hidden rounded-2xl border border-[color:var(--dd-border)] bg-white p-4">
                          <img
                            src={integration.logoUrl}
                            alt={integration.name}
                            className="h-16 w-full object-contain"
                          />
                        </div>
                      ) : null}
                      {canEdit ? (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => openEditor(integration)}>
                            Edit
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() =>
                              publicationMutation.mutate({
                                id: integration.id,
                                publicationStatus: togglePublicationStatus(
                                  integration.publicationStatus
                                )
                              })
                            }
                            disabled={publicationMutation.isPending}
                          >
                            {publicationActionLabel(integration.publicationStatus)}
                          </Button>
                          <Button variant="ghost" onClick={() => setDeleteId(integration.id)}>
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
        title={editorState.integration ? "Edit integration" : "Create integration"}
      >
        <form className="space-y-5" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Name" error={form.formState.errors.name?.message}>
              <Input {...form.register("name")} />
            </FormField>
            <FormField
              label="Short label"
              hint="Up to 8 characters for the fallback badge."
              error={form.formState.errors.shortLabel?.message}
            >
              <Input {...form.register("shortLabel")} />
            </FormField>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Row" error={form.formState.errors.row?.message}>
              <Select {...form.register("row")}>
                {rowOptions.map((row) => (
                  <option key={row} value={row}>
                    Row {row}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Badge color" error={form.formState.errors.color?.message}>
              <Input type="color" {...form.register("color")} />
            </FormField>
          </div>
          <MediaField
            label="Optional logo image"
            value={form.watch("logoUrl") ?? ""}
            onChange={(nextValue) =>
              form.setValue("logoUrl", nextValue, { shouldDirty: true })
            }
            disabled={!canEdit}
            kind="image"
          />
          <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--dd-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-[color:var(--dd-text)]">Visible on site</div>
              <div className="text-sm text-[color:var(--dd-muted)]">
                Hide the integration badge without deleting it.
              </div>
            </div>
            <Switch
              checked={form.watch("isActive")}
              onCheckedChange={(nextValue) => form.setValue("isActive", nextValue)}
            />
          </div>
          <FormField
            label="Publication status"
            hint="Draft integrations stay in the CMS but are excluded from the public site."
            error={form.formState.errors.publicationStatus?.message}
          >
            <Select {...form.register("publicationStatus")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          <Card className="space-y-3 p-4">
            <div className="text-sm font-semibold text-[color:var(--dd-text)]">
              Badge preview
            </div>
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] text-lg font-extrabold text-white"
                style={{ backgroundColor: form.watch("color") }}
              >
                {form.watch("shortLabel") || "ID"}
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-[color:var(--dd-text)]">
                  {form.watch("name") || "Integration name"}
                </div>
                <div className="text-sm text-[color:var(--dd-muted)]">
                  Row {form.watch("row")} • {form.watch("isActive") ? "Active" : "Hidden"}
                </div>
              </div>
            </div>
          </Card>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditorState({ open: false, integration: null })}>
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
        title="Delete integration"
        description="This permanently removes the integration badge entry."
      />
    </div>
  );
}
