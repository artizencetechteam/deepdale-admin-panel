import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDeleteDialog, DrawerForm } from "../../components/ui/dialogs";
import { EmptyState } from "../../components/ui/empty-state";
import { FormField, Input, Select } from "../../components/ui/field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { SortableList } from "../../components/ui/sortable-list";
import { apiRequest } from "../../lib/api-client";
import type {
  FooterLinkGroup,
  FooterLinkInput,
  PublicationStatus,
  SiteSettingsAdminView,
  SiteSettingsRestrictedView
} from "../../lib/api-types";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";
import {
  optionalUrlField,
  requiredUrlOrPathField
} from "../../lib/form-schemas";
import {
  publicationActionLabel,
  publicationStatusClassName,
  publicationStatusLabel,
  togglePublicationStatus
} from "../../lib/publication-status";
import { queryKeys } from "../../lib/query-keys";
import { canWriteAdminOnly, canWriteContent } from "../../lib/role-utils";
import { useToast } from "../../components/ui/toast";

const footerMetaSchema = z.object({
  copyrightText: z.string().trim().min(1),
  facebook: optionalUrlField,
  linkedin: optionalUrlField,
  youtube: optionalUrlField,
  twitter: optionalUrlField
});

const footerGroupSchema = z.object({
  heading: z.string().trim().min(1),
  links: z
    .array(
      z.object({
        label: z.string().trim().min(1),
        href: requiredUrlOrPathField
      })
    )
    .min(1)
    .max(20),
  publicationStatus: z.enum(["draft", "published"])
});

type FooterMetaValues = z.infer<typeof footerMetaSchema>;
type FooterGroupValues = z.infer<typeof footerGroupSchema>;

function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function FooterPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEditLinks = canWriteContent(user?.role);
  const canEditMeta = canWriteAdminOnly(user?.role);
  const [requestError, setRequestError] = useState<string>();
  const [editorState, setEditorState] = useState<{
    open: boolean;
    group: FooterLinkGroup | null;
  }>({ open: false, group: null });
  const [deleteId, setDeleteId] = useState<string>();

  const footerGroupsQuery = useQuery({
    queryKey: queryKeys.footerLinkGroups,
    queryFn: () => apiRequest<FooterLinkGroup[]>("/api/admin/footer-link-groups")
  });
  const settingsQuery = useQuery({
    queryKey: queryKeys.siteSettings,
    queryFn: () =>
      apiRequest<SiteSettingsAdminView | SiteSettingsRestrictedView>(
        "/api/admin/site-settings"
      )
  });

  const metaForm = useForm<FooterMetaValues>({
    resolver: zodResolver(footerMetaSchema),
    defaultValues: {
      copyrightText: "",
      facebook: "",
      linkedin: "",
      youtube: "",
      twitter: ""
    }
  });
  const groupForm = useForm<FooterGroupValues>({
    resolver: zodResolver(footerGroupSchema),
    defaultValues: {
      heading: "",
      links: [{ label: "", href: "" }],
      publicationStatus: "draft"
    }
  });
  const linkFields = useFieldArray({
    control: groupForm.control,
    name: "links"
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    metaForm.reset({
      copyrightText: settingsQuery.data.copyrightText,
      facebook: settingsQuery.data.socialLinks.facebook ?? "",
      linkedin: settingsQuery.data.socialLinks.linkedin ?? "",
      youtube: settingsQuery.data.socialLinks.youtube ?? "",
      twitter: settingsQuery.data.socialLinks.twitter ?? ""
    });
  }, [metaForm, settingsQuery.data]);

  const footerGroups = sortByOrder(footerGroupsQuery.data ?? []);

  const footerMetaMutation = useMutation({
    mutationFn: (values: FooterMetaValues) => {
      if (!settingsQuery.data || !("chatSystemPrompt" in settingsQuery.data)) {
        throw new Error("Privileged site settings are unavailable for this session");
      }

      return apiRequest<SiteSettingsAdminView>("/api/admin/site-settings", {
        method: "PUT",
        csrfToken,
        body: {
          siteName: settingsQuery.data.siteName,
          logoUrl: settingsQuery.data.logoUrl,
          contactEmail: settingsQuery.data.contactEmail,
          copyrightText: values.copyrightText,
          chatSystemPrompt: settingsQuery.data.chatSystemPrompt,
          chatModel: settingsQuery.data.chatModel,
          socialLinks: {
            facebook: values.facebook?.trim() || undefined,
            linkedin: values.linkedin?.trim() || undefined,
            youtube: values.youtube?.trim() || undefined,
            twitter: values.twitter?.trim() || undefined
          }
        }
      });
    },
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.siteSettings });
      pushToast("Footer metadata saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const footerGroupMutation = useMutation({
    mutationFn: (values: FooterGroupValues) => {
      const links: FooterLinkInput[] = values.links.map((link, index) => ({
        label: link.label,
        href: link.href,
        sortOrder: index
      }));

      if (editorState.group) {
        return apiRequest<FooterLinkGroup>(
          `/api/admin/footer-link-groups/${editorState.group.id}`,
          {
            method: "PUT",
            csrfToken,
            body: {
              heading: values.heading,
              links,
              publicationStatus: values.publicationStatus,
              sortOrder: editorState.group.sortOrder
            }
          }
        );
      }

      return apiRequest<FooterLinkGroup>("/api/admin/footer-link-groups", {
        method: "POST",
        csrfToken,
        body: {
          heading: values.heading,
          links,
          publicationStatus: values.publicationStatus,
          sortOrder: footerGroups.length
        }
      });
    },
    onSuccess: async () => {
      setEditorState({ open: false, group: null });
      groupForm.reset({
        heading: "",
        links: [{ label: "", href: "" }],
        publicationStatus: "draft"
      });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.footerLinkGroups });
      pushToast("Footer link group saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const reorderMutation = useMutation({
    mutationFn: (items: FooterLinkGroup[]) =>
      apiRequest<{ success: boolean }>("/api/admin/footer-link-groups/reorder", {
        method: "PATCH",
        csrfToken,
        body: items.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.footerLinkGroups });
      pushToast("Footer group order saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest<void>(`/api/admin/footer-link-groups/${deleteId}`, {
        method: "DELETE",
        csrfToken
      }),
    onSuccess: async () => {
      setDeleteId(undefined);
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.footerLinkGroups });
      pushToast("Footer group deleted");
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
      apiRequest<FooterLinkGroup>(
        `/api/admin/footer-link-groups/${id}/publication-status`,
        {
          method: "PATCH",
          csrfToken,
          body: { publicationStatus }
        }
      ),
    onSuccess: async (_group, variables) => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.footerLinkGroups });
      pushToast(
        variables.publicationStatus === "published"
          ? "Footer group published"
          : "Footer group moved to draft"
      );
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  function openEditor(group?: FooterLinkGroup) {
    setEditorState({
      open: true,
      group: group ?? null
    });
    groupForm.reset({
      heading: group?.heading ?? "",
      links:
        group?.links.map((link) => ({
          label: link.label,
          href: link.href
        })) ?? [{ label: "", href: "" }],
      publicationStatus: group?.publicationStatus ?? "draft"
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Footer"
        description="Manage footer link groups and the public-facing social and copyright metadata."
        actions={
          canEditLinks ? (
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4" />
              Add link group
            </Button>
          ) : undefined
        }
      />
      {!canEditLinks && !canEditMeta ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <Card className="space-y-5">
          <div className="space-y-1">
            <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
              Footer metadata
            </div>
            <div className="text-sm text-[color:var(--dd-muted)]">
              Social links and copyright live in site settings but are surfaced here for footer editing.
            </div>
          </div>
          {!canEditMeta ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--dd-border)] px-4 py-3 text-sm text-[color:var(--dd-muted)]">
              Only admin and superadmin users can update social links and copyright.
            </div>
          ) : null}
          <form className="space-y-5" onSubmit={metaForm.handleSubmit((values) => footerMetaMutation.mutate(values))}>
            <FormField
              label="Copyright text"
              error={metaForm.formState.errors.copyrightText?.message}
            >
              <Input {...metaForm.register("copyrightText")} disabled={!canEditMeta} />
            </FormField>
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="Facebook URL">
                <Input {...metaForm.register("facebook")} disabled={!canEditMeta} />
              </FormField>
              <FormField label="LinkedIn URL">
                <Input {...metaForm.register("linkedin")} disabled={!canEditMeta} />
              </FormField>
              <FormField label="YouTube URL">
                <Input {...metaForm.register("youtube")} disabled={!canEditMeta} />
              </FormField>
              <FormField label="Twitter URL">
                <Input {...metaForm.register("twitter")} disabled={!canEditMeta} />
              </FormField>
            </div>
            {canEditMeta ? (
              <div className="flex justify-end">
                <Button type="submit" disabled={footerMetaMutation.isPending}>
                  {footerMetaMutation.isPending ? "Saving..." : "Save metadata"}
                </Button>
              </div>
            ) : null}
          </form>
        </Card>
        <Card className="space-y-4">
          <div className="space-y-1">
            <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
              Footer link groups
            </div>
            <div className="text-sm text-[color:var(--dd-muted)]">
              Reorder groups and maintain the link structure used in the public footer.
            </div>
          </div>
          {footerGroups.length === 0 ? (
            <EmptyState
              title="No footer groups yet"
              description="Create the first footer link group to populate the site footer."
            />
          ) : (
            <SortableList
              items={footerGroups}
              onReorder={(items) => {
                queryClient.setQueryData(
                  queryKeys.footerLinkGroups,
                  items.map((item, index) => ({ ...item, sortOrder: index }))
                );
                reorderMutation.mutate(items);
              }}
              renderItem={(group) => (
                <div className="space-y-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-semibold text-[color:var(--dd-text)]">
                        {group.heading}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {group.links.map((link) => (
                          <span
                            key={link.id}
                            className="rounded-full border border-[color:var(--dd-border)] px-3 py-1 text-xs text-[color:var(--dd-muted)]"
                          >
                            {link.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-full bg-[color:var(--dd-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                        {group.links.length} links
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${publicationStatusClassName(group.publicationStatus)}`}
                      >
                        {publicationStatusLabel(group.publicationStatus)}
                      </div>
                    </div>
                  </div>
                  {canEditLinks ? (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => openEditor(group)}>
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          publicationMutation.mutate({
                            id: group.id,
                            publicationStatus: togglePublicationStatus(
                              group.publicationStatus
                            )
                          })
                        }
                        disabled={publicationMutation.isPending}
                      >
                        {publicationActionLabel(group.publicationStatus)}
                      </Button>
                      <Button variant="ghost" onClick={() => setDeleteId(group.id)}>
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
        open={editorState.open}
        onOpenChange={(open) => setEditorState((current) => ({ ...current, open }))}
        title={editorState.group ? "Edit footer group" : "Create footer group"}
      >
        <form className="space-y-5" onSubmit={groupForm.handleSubmit((values) => footerGroupMutation.mutate(values))}>
          <FormField label="Heading" error={groupForm.formState.errors.heading?.message}>
            <Input {...groupForm.register("heading")} />
          </FormField>
          <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--dd-text)]">Links</div>
                <div className="text-xs text-[color:var(--dd-muted)]">
                  Add each label and destination shown in this group.
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={() => linkFields.append({ label: "", href: "" })}>
                <Plus className="h-4 w-4" />
                Add link
              </Button>
            </div>
            {linkFields.fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 rounded-2xl border border-[color:var(--dd-border)] bg-[color:var(--dd-panel)] p-4 md:grid-cols-[0.8fr,1.2fr,auto]">
                <Input placeholder="Label" {...groupForm.register(`links.${index}.label`)} />
                <Input placeholder="Href" {...groupForm.register(`links.${index}.href`)} />
                <Button type="button" variant="ghost" onClick={() => linkFields.remove(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <FormField
            label="Publication status"
            hint="Draft footer groups stay in the CMS but are excluded from the public footer."
            error={groupForm.formState.errors.publicationStatus?.message}
          >
            <Select {...groupForm.register("publicationStatus")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditorState({ open: false, group: null })}>
              Cancel
            </Button>
            <Button type="submit" disabled={footerGroupMutation.isPending}>
              {footerGroupMutation.isPending ? "Saving..." : "Save"}
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
        title="Delete footer group"
        description="This permanently removes the group and all links inside it."
      />
    </div>
  );
}
