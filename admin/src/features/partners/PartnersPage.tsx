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
import { FormField, Input, Select, Switch } from "../../components/ui/field";
import { MediaField } from "../../components/ui/media-field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { SortableList } from "../../components/ui/sortable-list";
import { apiRequest } from "../../lib/api-client";
import type { Partner, PublicationStatus } from "../../lib/api-types";
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

const partnerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  logoUrl: z.string().trim().min(1).max(2000),
  isActive: z.boolean(),
  publicationStatus: z.enum(["draft", "published"])
});

type PartnerValues = z.infer<typeof partnerSchema>;

function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

// toSvgImageSource removed as logos are now standard images (URLs)

export function PartnersPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role);
  const [requestError, setRequestError] = useState<string>();
  const [editorState, setEditorState] = useState<{
    open: boolean;
    partner: Partner | null;
  }>({ open: false, partner: null });
  const [deleteId, setDeleteId] = useState<string>();

  const partnersQuery = useQuery({
    queryKey: queryKeys.partners,
    queryFn: () => apiRequest<Partner[]>("/api/admin/partners")
  });

  const partners = sortByOrder(partnersQuery.data ?? []);

  const form = useForm<PartnerValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: "",
      logoUrl: "",
      isActive: true,
      publicationStatus: "draft"
    }
  });

  const saveMutation = useMutation({
    mutationFn: (values: PartnerValues) => {
      const body = {
        ...values,
        sortOrder: editorState.partner?.sortOrder ?? partners.length
      };

      if (editorState.partner) {
        return apiRequest<Partner>(`/api/admin/partners/${editorState.partner.id}`, {
          method: "PUT",
          csrfToken,
          body
        });
      }

      return apiRequest<Partner>("/api/admin/partners", {
        method: "POST",
        csrfToken,
        body
      });
    },
    onSuccess: async () => {
      setEditorState({ open: false, partner: null });
      form.reset({
        name: "",
        logoUrl: "",
        isActive: true,
        publicationStatus: "draft"
      });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.partners });
      pushToast("Partner saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const reorderMutation = useMutation({
    mutationFn: (items: Partner[]) =>
      apiRequest<{ success: boolean }>("/api/admin/partners/reorder", {
        method: "PATCH",
        csrfToken,
        body: items.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.partners });
      pushToast("Partner order saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest<void>(`/api/admin/partners/${deleteId}`, {
        method: "DELETE",
        csrfToken
      }),
    onSuccess: async () => {
      setDeleteId(undefined);
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.partners });
      pushToast("Partner deleted");
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
      apiRequest<Partner>(`/api/admin/partners/${id}/publication-status`, {
        method: "PATCH",
        csrfToken,
        body: { publicationStatus }
      }),
    onSuccess: async (_partner, variables) => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.partners });
      pushToast(
        variables.publicationStatus === "published"
          ? "Partner published"
          : "Partner moved to draft"
      );
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  function openEditor(partner?: Partner) {
    setEditorState({ open: true, partner: partner ?? null });
    form.reset({
      name: partner?.name ?? "",
      logoUrl: partner?.logoUrl ?? "",
      isActive: partner?.isActive ?? true,
      publicationStatus: partner?.publicationStatus ?? "draft"
    });
  }

  const previewUrl = form.watch("logoUrl");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partners"
        description="Manage trusted-by logo marks, reorder the marquee, and toggle partner visibility without deleting the entry."
        actions={
          canEdit ? (
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4" />
              Add partner
            </Button>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      {partnersQuery.isLoading && (
        <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--dd-border)] bg-white/70 p-6">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
          <span className="text-sm font-medium text-[color:var(--dd-muted)]">Loading partners…</span>
        </div>
      )}
      {partners.length === 0 && !partnersQuery.isLoading ? (
        <EmptyState
          title="No partners yet"
          description="Create the first trusted-by logo entry."
        />
      ) : (
        <SortableList
          items={partners}
          onReorder={(items) => {
            queryClient.setQueryData(
              queryKeys.partners,
              items.map((item, index) => ({ ...item, sortOrder: index }))
            );
            reorderMutation.mutate(items);
          }}
          renderItem={(partner) => (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[160px,1fr]">
                <div className="flex items-center justify-center rounded-2xl border border-[color:var(--dd-border)] bg-white p-6">
                  <img
                    src={partner.logoUrl}
                    alt={partner.name}
                    className="max-h-20 w-full object-contain"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="font-semibold text-[color:var(--dd-text)]">
                      {partner.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                          partner.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {partner.isActive ? "Active" : "Hidden"}
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${publicationStatusClassName(partner.publicationStatus)}`}
                      >
                        {publicationStatusLabel(partner.publicationStatus)}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--dd-border)] bg-[color:var(--dd-panel)] px-4 py-3 text-sm text-[color:var(--dd-muted)]">
                    Partner logo is stored as a URL to an uploaded image or external asset.
                  </div>
                </div>
              </div>
              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => openEditor(partner)}>
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      publicationMutation.mutate({
                        id: partner.id,
                        publicationStatus: togglePublicationStatus(
                          partner.publicationStatus
                        )
                      })
                    }
                    disabled={publicationMutation.isPending}
                  >
                    {publicationActionLabel(partner.publicationStatus)}
                  </Button>
                  <Button variant="ghost" onClick={() => setDeleteId(partner.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        />
      )}
      <DrawerForm
        open={editorState.open}
        onOpenChange={(open) => setEditorState((current) => ({ ...current, open }))}
        title={editorState.partner ? "Edit partner" : "Create partner"}
      >
        <form className="space-y-5" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <BackendErrorAlert message={saveMutation.isError ? getErrorMessage(saveMutation.error) : undefined} />
          <FormField label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} error={!!form.formState.errors.name} />
          </FormField>
          <MediaField
            label="Partner logo"
            hint="Upload an image file (PNG, JPG, WebP) from your computer or choose from the library."
            value={form.watch("logoUrl")}
            onChange={(nextValue: string) =>
              form.setValue("logoUrl", nextValue, { shouldDirty: true })
            }
            disabled={!canEdit}
            kind="image"
          />
          <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--dd-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-[color:var(--dd-text)]">Visible on site</div>
              <div className="text-sm text-[color:var(--dd-muted)]">
                Hide the partner logo without deleting it.
              </div>
            </div>
            <Switch
              checked={form.watch("isActive")}
              onCheckedChange={(nextValue) => form.setValue("isActive", nextValue)}
            />
          </div>
          <FormField
            label="Publication status"
            hint="Draft partners stay in the CMS but are excluded from the public site."
            error={form.formState.errors.publicationStatus?.message}
          >
            <Select {...form.register("publicationStatus")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          {previewUrl ? (
            <Card className="space-y-3 p-4">
              <div className="text-sm font-semibold text-[color:var(--dd-text)]">
                Preview
              </div>
              <div className="flex items-center justify-center rounded-2xl border border-[color:var(--dd-border)] bg-white p-8">
                <img
                  src={previewUrl}
                  alt="Partner preview"
                  className="max-h-24 w-full object-contain"
                />
              </div>
            </Card>
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditorState({ open: false, partner: null })}>
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
        title="Delete partner"
        description="This permanently removes the partner logo entry."
      />
    </div>
  );
}
