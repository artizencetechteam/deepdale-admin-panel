import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PlayCircle, Plus, Trash2 } from "lucide-react";
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
import { apiRequest } from "../../lib/api-client";
import type { PublicationStatus, VoiceScenario } from "../../lib/api-types";
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

const voiceScenarioSchema = z.object({
  tag: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  image: requiredUrlField,
  script: z.string().trim().min(1).max(5000),
  publicationStatus: z.enum(["draft", "published"])
});

type VoiceScenarioValues = z.infer<typeof voiceScenarioSchema>;

function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

async function requestPreviewAudio(text: string): Promise<string> {
  const response = await fetch("/api/admin/tts/preview/voice-scenario", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
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

export function VoiceScenariosPage() {
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
    scenario: VoiceScenario | null;
  }>({ open: false, scenario: null });
  const [deleteId, setDeleteId] = useState<string>();

  const scenariosQuery = useQuery({
    queryKey: queryKeys.voiceScenarios,
    queryFn: () => apiRequest<VoiceScenario[]>("/api/admin/voice-scenarios")
  });

  const scenarios = sortByOrder(scenariosQuery.data ?? []);

  const form = useForm<VoiceScenarioValues>({
    resolver: zodResolver(voiceScenarioSchema),
    defaultValues: {
      tag: "",
      title: "",
      description: "",
      image: "",
      script: "",
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
    mutationFn: (values: VoiceScenarioValues) => {
      const body = {
        ...values,
        sortOrder: editorState.scenario?.sortOrder ?? scenarios.length
      };

      if (editorState.scenario) {
        return apiRequest<VoiceScenario>(
          `/api/admin/voice-scenarios/${editorState.scenario.id}`,
          {
            method: "PUT",
            csrfToken,
            body
          }
        );
      }

      return apiRequest<VoiceScenario>("/api/admin/voice-scenarios", {
        method: "POST",
        csrfToken,
        body
      });
    },
    onSuccess: async () => {
      setEditorState({ open: false, scenario: null });
      form.reset({
        tag: "",
        title: "",
        description: "",
        image: "",
        script: "",
        publicationStatus: "draft"
      });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.voiceScenarios });
      pushToast("Voice scenario saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const reorderMutation = useMutation({
    mutationFn: (items: VoiceScenario[]) =>
      apiRequest<{ success: boolean }>("/api/admin/voice-scenarios/reorder", {
        method: "PATCH",
        csrfToken,
        body: items.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.voiceScenarios });
      pushToast("Voice scenario order saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest<void>(`/api/admin/voice-scenarios/${deleteId}`, {
        method: "DELETE",
        csrfToken
      }),
    onSuccess: async () => {
      setDeleteId(undefined);
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.voiceScenarios });
      pushToast("Voice scenario deleted");
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
      apiRequest<VoiceScenario>(
        `/api/admin/voice-scenarios/${id}/publication-status`,
        {
          method: "PATCH",
          csrfToken,
          body: { publicationStatus }
        }
      ),
    onSuccess: async (_scenario, variables) => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.voiceScenarios });
      pushToast(
        variables.publicationStatus === "published"
          ? "Voice scenario published"
          : "Voice scenario moved to draft"
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

      const url = await requestPreviewAudio(form.getValues("script"));
      setPreviewUrl(url);
    } catch (error) {
      setPreviewError(getErrorMessage(error, "Unable to generate preview audio"));
    } finally {
      setPreviewBusy(false);
    }
  }

  function openEditor(scenario?: VoiceScenario) {
    setEditorState({ open: true, scenario: scenario ?? null });
    setPreviewError(undefined);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return undefined;
    });
    form.reset({
      tag: scenario?.tag ?? "",
      title: scenario?.title ?? "",
      description: scenario?.description ?? "",
      image: scenario?.image ?? "",
      script: scenario?.script ?? "",
      publicationStatus: scenario?.publicationStatus ?? "draft"
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voice Scenarios"
        description="Manage scenario cards, update scripts, and preview sample speech for each use case."
        actions={
          canEdit ? (
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4" />
              Add scenario
            </Button>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      {scenariosQuery.isLoading && (
        <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--dd-border)] bg-white/70 p-6">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
          <span className="text-sm font-medium text-[color:var(--dd-muted)]">Loading voice scenarios…</span>
        </div>
      )}
      {scenarios.length === 0 && !scenariosQuery.isLoading ? (
        <EmptyState
          title="No voice scenarios yet"
          description="Create the first scenario to populate the voice demos section."
        />
      ) : (
        <SortableList
          items={scenarios}
          onReorder={(items) => {
            queryClient.setQueryData(
              queryKeys.voiceScenarios,
              items.map((item, index) => ({ ...item, sortOrder: index }))
            );
            reorderMutation.mutate(items);
          }}
          renderItem={(scenario) => (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[180px,1fr]">
                <div className="overflow-hidden rounded-2xl border border-[color:var(--dd-border)] bg-white">
                  <img
                    src={scenario.image}
                    alt={scenario.title}
                    className="!h-40 w-full object-contain"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--dd-accent)]">
                        {scenario.tag}
                      </div>
                      <div className="mt-1 font-semibold text-[color:var(--dd-text)]">
                        {scenario.title}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-full bg-[color:var(--dd-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                        #{scenario.sortOrder + 1}
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${publicationStatusClassName(scenario.publicationStatus)}`}
                      >
                        {publicationStatusLabel(scenario.publicationStatus)}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-[color:var(--dd-muted)]">
                    {scenario.description}
                  </div>
                  <div className="rounded-2xl border border-[color:var(--dd-border)] bg-[color:var(--dd-panel)] px-4 py-3 text-sm text-[color:var(--dd-muted)]">
                    {scenario.script}
                  </div>
                </div>
              </div>
              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => openEditor(scenario)}>
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      publicationMutation.mutate({
                        id: scenario.id,
                        publicationStatus: togglePublicationStatus(
                          scenario.publicationStatus
                        )
                      })
                    }
                    disabled={publicationMutation.isPending}
                  >
                    {publicationActionLabel(scenario.publicationStatus)}
                  </Button>
                  <Button variant="ghost" onClick={() => setDeleteId(scenario.id)}>
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
        title={editorState.scenario ? "Edit voice scenario" : "Create voice scenario"}
      >
        <form className="space-y-5" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <BackendErrorAlert message={saveMutation.isError ? getErrorMessage(saveMutation.error) : undefined} />
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Tag" error={form.formState.errors.tag?.message}>
              <Input {...form.register("tag")} error={!!form.formState.errors.tag} />
            </FormField>
            <FormField label="Title" error={form.formState.errors.title?.message}>
              <Input {...form.register("title")} error={!!form.formState.errors.title} />
            </FormField>
          </div>
          <FormField
            label="Description"
            error={form.formState.errors.description?.message}
          >
            <Textarea {...form.register("description")} error={!!form.formState.errors.description} />
          </FormField>
          <MediaField
            label="Scenario image"
            value={form.watch("image")}
            onChange={(nextValue) =>
              form.setValue("image", nextValue, { shouldDirty: true })
            }
            disabled={!canEdit}
            kind="image"
          />
          <FormField
            label="Publication status"
            hint="Draft scenarios stay in the CMS but are excluded from the public site."
            error={form.formState.errors.publicationStatus?.message}
          >
            <Select {...form.register("publicationStatus")} error={!!form.formState.errors.publicationStatus}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          <FormField label="Script" error={form.formState.errors.script?.message}>
            <Textarea {...form.register("script")} className="min-h-44" error={!!form.formState.errors.script} />
          </FormField>
          <div className="space-y-3 rounded-3xl border border-[color:var(--dd-border)] bg-[color:var(--dd-panel)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-[color:var(--dd-text)]">
                  TTS preview
                </div>
                <div className="text-sm text-[color:var(--dd-muted)]">
                  Generate sample MP3 output from the current script using the configured provider.
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
            <Button type="button" variant="secondary" onClick={() => setEditorState({ open: false, scenario: null })}>
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
        title="Delete voice scenario"
        description="This permanently removes the scenario card."
      />
    </div>
  );
}
