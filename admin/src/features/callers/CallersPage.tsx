import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlayCircle, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { ConfirmDeleteDialog, DrawerForm } from "../../components/ui/dialogs";
import { EmptyState } from "../../components/ui/empty-state";
import { FormField, Input, Select, Textarea } from "../../components/ui/field";
import { MediaField } from "../../components/ui/media-field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { SortableList } from "../../components/ui/sortable-list";
import { useToast } from "../../components/ui/toast";
import { apiRequest } from "../../lib/api-client";
import type { CallerProfile, PublicationStatus } from "../../lib/api-types";
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

const callerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(120),
  image: requiredUrlField,
  sampleLine: z.string().trim().min(1).max(5000),
  voicePitch: z.coerce.number().min(0.5).max(2),
  publicationStatus: z.enum(["draft", "published"])
});

type CallerValues = z.infer<typeof callerSchema>;

function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

async function requestPreviewAudio(text: string, voicePitch: number): Promise<string> {
  const response = await fetch("/api/admin/tts/preview/caller", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text, voicePitch })
  });

  if (!response.ok) {
    try {
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      throw new Error(payload.error?.message ?? response.statusText);
    } catch {
      throw new Error(response.statusText);
    }
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function CallersPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role);
  const [requestError, setRequestError] = useState<string>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [previewError, setPreviewError] = useState<string>();
  const [previewBusy, setPreviewBusy] = useState(false);
  const [editorState, setEditorState] = useState<{
    open: boolean;
    caller: CallerProfile | null;
  }>({ open: false, caller: null });
  const [deleteId, setDeleteId] = useState<string>();

  const callersQuery = useQuery({
    queryKey: queryKeys.callers,
    queryFn: () => apiRequest<CallerProfile[]>("/api/admin/callers")
  });

  const callers = sortByOrder(callersQuery.data ?? []);

  const form = useForm<CallerValues>({
    resolver: zodResolver(callerSchema),
    defaultValues: {
      name: "",
      role: "",
      image: "",
      sampleLine: "",
      voicePitch: 1,
      publicationStatus: "draft"
    }
  });

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const saveMutation = useMutation({
    mutationFn: (values: CallerValues) => {
      const body = {
        ...values,
        sortOrder: editorState.caller?.sortOrder ?? callers.length
      };

      if (editorState.caller) {
        return apiRequest<CallerProfile>(`/api/admin/callers/${editorState.caller.id}`, {
          method: "PUT",
          csrfToken,
          body
        });
      }

      return apiRequest<CallerProfile>("/api/admin/callers", {
        method: "POST",
        csrfToken,
        body
      });
    },
    onSuccess: async () => {
      setEditorState({ open: false, caller: null });
      form.reset({
        name: "",
        role: "",
        image: "",
        sampleLine: "",
        voicePitch: 1,
        publicationStatus: "draft"
      });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.callers });
      pushToast("Caller saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const reorderMutation = useMutation({
    mutationFn: (items: CallerProfile[]) =>
      apiRequest<{ success: boolean }>("/api/admin/callers/reorder", {
        method: "PATCH",
        csrfToken,
        body: items.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.callers });
      pushToast("Caller order saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest<void>(`/api/admin/callers/${deleteId}`, {
        method: "DELETE",
        csrfToken
      }),
    onSuccess: async () => {
      setDeleteId(undefined);
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.callers });
      pushToast("Caller deleted");
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
      apiRequest<CallerProfile>(`/api/admin/callers/${id}/publication-status`, {
        method: "PATCH",
        csrfToken,
        body: { publicationStatus }
      }),
    onSuccess: async (_caller, variables) => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.callers });
      pushToast(
        variables.publicationStatus === "published"
          ? "Caller published"
          : "Caller moved to draft"
      );
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  async function handlePreview() {
    try {
      setPreviewBusy(true);
      setPreviewError(undefined);
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return undefined;
      });

      const url = await requestPreviewAudio(
        form.getValues("sampleLine"),
        form.getValues("voicePitch")
      );
      setPreviewUrl(url);
    } catch (error) {
      setPreviewError(getErrorMessage(error, "Unable to generate preview audio"));
    } finally {
      setPreviewBusy(false);
    }
  }

  function openEditor(caller?: CallerProfile) {
    setEditorState({ open: true, caller: caller ?? null });
    setPreviewError(undefined);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return undefined;
    });
    form.reset({
      name: caller?.name ?? "",
      role: caller?.role ?? "",
      image: caller?.image ?? "",
      sampleLine: caller?.sampleLine ?? "",
      voicePitch: caller?.voicePitch ?? 1,
      publicationStatus: caller?.publicationStatus ?? "draft"
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Callers"
        description="Manage caller showcase profiles, their sample lines, and preview synthesized audio with the configured voice stack."
        actions={
          canEdit ? (
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4" />
              Add caller
            </Button>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      {callers.length === 0 ? (
        <EmptyState
          title="No callers yet"
          description="Create the first caller profile for the caller showcase section."
        />
      ) : (
        <SortableList
          items={callers}
          onReorder={(items) => {
            queryClient.setQueryData(
              queryKeys.callers,
              items.map((item, index) => ({ ...item, sortOrder: index }))
            );
            reorderMutation.mutate(items);
          }}
          renderItem={(caller) => (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[180px,1fr]">
                <div className="overflow-hidden rounded-2xl border border-[color:var(--dd-border)] bg-white">
                  <img
                    src={caller.image}
                    alt={caller.name}
                    className="h-36 w-full object-cover"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-semibold text-[color:var(--dd-text)]">
                        {caller.name}
                      </div>
                      <div className="mt-1 text-sm text-[color:var(--dd-muted)]">
                        {caller.role}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-full bg-[color:var(--dd-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                        Pitch {caller.voicePitch.toFixed(1)}x
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${publicationStatusClassName(caller.publicationStatus)}`}
                      >
                        {publicationStatusLabel(caller.publicationStatus)}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--dd-border)] bg-[color:var(--dd-panel)] px-4 py-3 text-sm text-[color:var(--dd-muted)]">
                    {caller.sampleLine}
                  </div>
                </div>
              </div>
              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => openEditor(caller)}>
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      publicationMutation.mutate({
                        id: caller.id,
                        publicationStatus: togglePublicationStatus(
                          caller.publicationStatus
                        )
                      })
                    }
                    disabled={publicationMutation.isPending}
                  >
                    {publicationActionLabel(caller.publicationStatus)}
                  </Button>
                  <Button variant="ghost" onClick={() => setDeleteId(caller.id)}>
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
        title={editorState.caller ? "Edit caller" : "Create caller"}
      >
        <form className="space-y-5" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Name" error={form.formState.errors.name?.message}>
              <Input {...form.register("name")} />
            </FormField>
            <FormField label="Role" error={form.formState.errors.role?.message}>
              <Input {...form.register("role")} />
            </FormField>
          </div>
          <MediaField
            label="Caller image"
            value={form.watch("image")}
            onChange={(nextValue) =>
              form.setValue("image", nextValue, { shouldDirty: true })
            }
            disabled={!canEdit}
            kind="image"
          />
          <FormField
            label="Sample line"
            error={form.formState.errors.sampleLine?.message}
          >
            <Textarea {...form.register("sampleLine")} className="min-h-36" />
          </FormField>
          <FormField
            label="Voice pitch"
            hint="Use values between 0.5 and 2.0."
            error={form.formState.errors.voicePitch?.message}
          >
            <Input
              type="number"
              min="0.5"
              max="2"
              step="0.1"
              {...form.register("voicePitch", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Publication status"
            hint="Draft callers stay in the CMS but are excluded from the public site."
            error={form.formState.errors.publicationStatus?.message}
          >
            <Select {...form.register("publicationStatus")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          <div className="space-y-3 rounded-3xl border border-[color:var(--dd-border)] bg-[color:var(--dd-panel)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-[color:var(--dd-text)]">
                  TTS preview
                </div>
                <div className="text-sm text-[color:var(--dd-muted)]">
                  Generate sample MP3 output from the current caller line.
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={() => void handlePreview()} disabled={previewBusy}>
                <PlayCircle className="h-4 w-4" />
                {previewBusy ? "Generating..." : "Preview audio"}
              </Button>
            </div>
            {previewError ? <BackendErrorAlert message={previewError} /> : null}
            {previewUrl ? <audio controls className="w-full" src={previewUrl} /> : null}
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditorState({ open: false, caller: null })}>
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
        title="Delete caller"
        description="This permanently removes the caller profile."
      />
    </div>
  );
}
