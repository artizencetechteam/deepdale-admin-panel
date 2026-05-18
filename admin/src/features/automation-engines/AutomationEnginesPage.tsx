import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDeleteDialog, DrawerForm } from "../../components/ui/dialogs";
import { EmptyState } from "../../components/ui/empty-state";
import { FormField, Input, Select } from "../../components/ui/field";
import { MediaField } from "../../components/ui/media-field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { SortableList } from "../../components/ui/sortable-list";
import { apiRequest } from "../../lib/api-client";
import type {
  AutomationEngine,
  LayoutDirection,
  PublicationStatus,
  UiOptions
} from "../../lib/api-types";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";
import { requiredUrlField, requiredUrlOrPathField } from "../../lib/form-schemas";
import {
  publicationActionLabel,
  publicationStatusClassName,
  publicationStatusLabel,
  togglePublicationStatus
} from "../../lib/publication-status";
import { queryKeys } from "../../lib/query-keys";
import { canWriteContent } from "../../lib/role-utils";
import { useToast } from "../../components/ui/toast";

const layoutDirections: LayoutDirection[] = ["left", "right"];

const bulletSchema = z.object({
  value: z.string().trim().min(1).max(240)
});

const automationEngineSchema = z.object({
  tag: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  bulletPoints: z.array(bulletSchema).min(1).max(10),
  ctaLabel: z.string().trim().min(1).max(80),
  ctaLink: requiredUrlOrPathField,
  ctaGradientPreset: z.string().trim().min(1),
  image: requiredUrlField,
  imageAlt: z.string().trim().min(1).max(200),
  layoutDirection: z.enum(["left", "right"]),
  publicationStatus: z.enum(["draft", "published"])
});

type AutomationEngineValues = z.infer<typeof automationEngineSchema>;

function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function AutomationEnginesPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role);
  const [requestError, setRequestError] = useState<string>();
  const [editorState, setEditorState] = useState<{
    open: boolean;
    engine: AutomationEngine | null;
  }>({ open: false, engine: null });
  const [deleteId, setDeleteId] = useState<string>();

  const enginesQuery = useQuery({
    queryKey: queryKeys.automationEngines,
    queryFn: () => apiRequest<AutomationEngine[]>("/api/admin/automation-engines")
  });
  const uiOptionsQuery = useQuery({
    queryKey: queryKeys.uiOptions,
    queryFn: () => apiRequest<UiOptions>("/api/admin/meta/ui-options")
  });

  const engines = sortByOrder(enginesQuery.data ?? []);
  const gradientPresets = uiOptionsQuery.data?.gradientPresets ?? [];

  const form = useForm<AutomationEngineValues>({
    resolver: zodResolver(automationEngineSchema),
    defaultValues: {
      tag: "",
      title: "",
      bulletPoints: [{ value: "" }],
      ctaLabel: "",
      ctaLink: "",
      ctaGradientPreset: "",
      image: "",
      imageAlt: "",
      layoutDirection: "left",
      publicationStatus: "draft"
    }
  });

  const bulletPoints = useFieldArray({
    control: form.control,
    name: "bulletPoints"
  });

  const saveMutation = useMutation({
    mutationFn: (values: AutomationEngineValues) => {
      const body = {
        ...values,
        bulletPoints: values.bulletPoints.map((item) => item.value),
        sortOrder: editorState.engine?.sortOrder ?? engines.length
      };

      if (editorState.engine) {
        return apiRequest<AutomationEngine>(
          `/api/admin/automation-engines/${editorState.engine.id}`,
          {
            method: "PUT",
            csrfToken,
            body
          }
        );
      }

      return apiRequest<AutomationEngine>("/api/admin/automation-engines", {
        method: "POST",
        csrfToken,
        body
      });
    },
    onSuccess: async () => {
      setEditorState({ open: false, engine: null });
      form.reset({
        tag: "",
        title: "",
        bulletPoints: [{ value: "" }],
        ctaLabel: "",
        ctaLink: "",
        ctaGradientPreset: gradientPresets[0]?.token ?? "",
        image: "",
        imageAlt: "",
        layoutDirection: "left",
        publicationStatus: "draft"
      });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.automationEngines });
      pushToast("Automation engine saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const reorderMutation = useMutation({
    mutationFn: (items: AutomationEngine[]) =>
      apiRequest<{ success: boolean }>("/api/admin/automation-engines/reorder", {
        method: "PATCH",
        csrfToken,
        body: items.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.automationEngines });
      pushToast("Automation engine order saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest<void>(`/api/admin/automation-engines/${deleteId}`, {
        method: "DELETE",
        csrfToken
      }),
    onSuccess: async () => {
      setDeleteId(undefined);
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.automationEngines });
      pushToast("Automation engine deleted");
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
      apiRequest<AutomationEngine>(
        `/api/admin/automation-engines/${id}/publication-status`,
        {
          method: "PATCH",
          csrfToken,
          body: { publicationStatus }
        }
      ),
    onSuccess: async (_engine, variables) => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.automationEngines });
      pushToast(
        variables.publicationStatus === "published"
          ? "Automation engine published"
          : "Automation engine moved to draft"
      );
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  function openEditor(engine?: AutomationEngine) {
    setEditorState({ open: true, engine: engine ?? null });
    form.reset({
      tag: engine?.tag ?? "",
      title: engine?.title ?? "",
      bulletPoints:
        engine?.bulletPoints.map((value) => ({ value })) ?? [{ value: "" }],
      ctaLabel: engine?.ctaLabel ?? "",
      ctaLink: engine?.ctaLink ?? "",
      ctaGradientPreset: engine?.ctaGradientPreset ?? gradientPresets[0]?.token ?? "",
      image: engine?.image ?? "",
      imageAlt: engine?.imageAlt ?? "",
      layoutDirection: engine?.layoutDirection ?? "left",
      publicationStatus: engine?.publicationStatus ?? "draft"
    });
  }

  const previewGradient = gradientPresets.find(
    (preset) => preset.token === form.watch("ctaGradientPreset")
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automation Engines"
        description="Manage feature blocks, bullet lists, CTA styling, and left-right layout direction for each engine."
        actions={
          canEdit ? (
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4" />
              Add engine
            </Button>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      {enginesQuery.isLoading && (
        <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--dd-border)] bg-white/70 p-6">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
          <span className="text-sm font-medium text-[color:var(--dd-muted)]">Loading automation engines…</span>
        </div>
      )}
      {engines.length === 0 && !enginesQuery.isLoading ? (
        <EmptyState
          title="No automation engines yet"
          description="Create the first engine block for the public section."
        />
      ) : (
        <SortableList
          items={engines}
          onReorder={(items) => {
            queryClient.setQueryData(
              queryKeys.automationEngines,
              items.map((item, index) => ({ ...item, sortOrder: index }))
            );
            reorderMutation.mutate(items);
          }}
          renderItem={(engine) => {
            const gradient = gradientPresets.find(
              (preset) => preset.token === engine.ctaGradientPreset
            );

            return (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[180px,1fr]">
                  <div className="overflow-hidden rounded-2xl border border-[color:var(--dd-border)] bg-white">
                    <img
                      src={engine.image}
                      alt={engine.imageAlt}
                      className="!h-66 w-full object-contain"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--dd-accent)]">
                          {engine.tag}
                        </div>
                        <div className="mt-1 font-semibold text-[color:var(--dd-text)]">
                          {engine.title}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-full bg-[color:var(--dd-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                          {engine.layoutDirection}
                        </div>
                        <div
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${publicationStatusClassName(engine.publicationStatus)}`}
                        >
                          {publicationStatusLabel(engine.publicationStatus)}
                        </div>
                      </div>
                    </div>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-[color:var(--dd-muted)]">
                      {engine.bulletPoints.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-full px-4 py-2 text-sm font-semibold text-white"
                        style={{ background: gradient?.preview }}
                      >
                        {engine.ctaLabel}
                      </div>
                      <div className="text-sm text-[color:var(--dd-muted)]">{engine.ctaLink}</div>
                    </div>
                  </div>
                </div>
                {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => openEditor(engine)}>
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      publicationMutation.mutate({
                        id: engine.id,
                        publicationStatus: togglePublicationStatus(
                          engine.publicationStatus
                        )
                      })
                    }
                    disabled={publicationMutation.isPending}
                  >
                    {publicationActionLabel(engine.publicationStatus)}
                  </Button>
                  <Button variant="ghost" onClick={() => setDeleteId(engine.id)}>
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
        title={editorState.engine ? "Edit automation engine" : "Create automation engine"}
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
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-[color:var(--dd-text)]">
                  Bullet points
                </div>
                <div className="text-xs text-[color:var(--dd-muted)]">
                  Reorder the supporting bullets that appear in the content block.
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={() => bulletPoints.append({ value: "New bullet point" })}>
                <Plus className="h-4 w-4" />
                Add point
              </Button>
            </div>
            <SortableList
              items={bulletPoints.fields.map((field, index) => ({
                id: field.id,
                value: form.watch(`bulletPoints.${index}.value`)
              }))}
              onReorder={(items) => {
                bulletPoints.replace(items.map((item) => ({ value: item.value })));
              }}
              renderItem={(item, index) => (
                <div className="flex items-center gap-3">
                  <Input
                    value={item.value}
                    onChange={(event) =>
                      form.setValue(`bulletPoints.${index}.value`, event.target.value, {
                        shouldDirty: true
                      })
                    }
                  />
                  <Button type="button" variant="ghost" onClick={() => bulletPoints.remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="CTA label" error={form.formState.errors.ctaLabel?.message}>
              <Input {...form.register("ctaLabel")} error={!!form.formState.errors.ctaLabel} />
            </FormField>
            <FormField label="CTA link" error={form.formState.errors.ctaLink?.message}>
              <Input {...form.register("ctaLink")} error={!!form.formState.errors.ctaLink} />
            </FormField>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="CTA gradient"
              error={form.formState.errors.ctaGradientPreset?.message}
            >
              <Select {...form.register("ctaGradientPreset")}>
                {gradientPresets.map((preset) => (
                  <option key={preset.token} value={preset.token}>
                    {preset.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Layout direction"
              error={form.formState.errors.layoutDirection?.message}
            >
              <Select {...form.register("layoutDirection")}>
                {layoutDirections.map((direction) => (
                  <option key={direction} value={direction}>
                    {direction}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <MediaField
            label="Engine image"
            value={form.watch("image")}
            onChange={(nextValue) =>
              form.setValue("image", nextValue, { shouldDirty: true })
            }
            disabled={!canEdit}
            kind="image"
          />
          <FormField label="Image alt text" error={form.formState.errors.imageAlt?.message}>
            <Input {...form.register("imageAlt")} error={!!form.formState.errors.imageAlt} />
          </FormField>
          <FormField
            label="Publication status"
            hint="Draft engine blocks stay in the CMS but are excluded from the public site."
            error={form.formState.errors.publicationStatus?.message}
          >
            <Select {...form.register("publicationStatus")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          <Card className="space-y-3 p-4">
            <div className="text-sm font-semibold text-[color:var(--dd-text)]">CTA preview</div>
            <div
              className="inline-flex rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ background: previewGradient?.preview }}
            >
              {form.watch("ctaLabel") || "CTA label"}
            </div>
          </Card>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditorState({ open: false, engine: null })}>
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
        title="Delete automation engine"
        description="This permanently removes the engine block."
      />
    </div>
  );
}
