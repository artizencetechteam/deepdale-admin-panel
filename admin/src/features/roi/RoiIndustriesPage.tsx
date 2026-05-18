import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { ConfirmDeleteDialog, DrawerForm } from "../../components/ui/dialogs";
import { EmptyState } from "../../components/ui/empty-state";
import { FormField, Input, Select } from "../../components/ui/field";
import { MediaField } from "../../components/ui/media-field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { SortableList } from "../../components/ui/sortable-list";
import { apiRequest } from "../../lib/api-client";
import type { IndustryROI, PublicationStatus } from "../../lib/api-types";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";
import { optionalUrlField, requiredUrlField } from "../../lib/form-schemas";
import {
  publicationActionLabel,
  publicationStatusClassName,
  publicationStatusLabel,
  togglePublicationStatus
} from "../../lib/publication-status";
import { queryKeys } from "../../lib/query-keys";
import { canWriteContent } from "../../lib/role-utils";
import { useToast } from "../../components/ui/toast";

const useCaseSchema = z.object({
  value: z.string().trim().min(1).max(120)
});

const roiIndustrySchema = z.object({
  label: z.string().trim().min(1).max(120),
  image: requiredUrlField,
  useCases: z.array(useCaseSchema).min(1).max(8),
  cvr: z.string().trim().min(1).max(40),
  secondaryMetric: z.string().trim().min(1).max(40),
  audioLabel: z.string().trim().min(1).max(80),
  audioDuration: z.string().trim().min(1).max(20),
  audioFile: optionalUrlField,
  publicationStatus: z.enum(["draft", "published"])
});

type RoiIndustryValues = z.infer<typeof roiIndustrySchema>;

function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function RoiIndustriesPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role);
  const [requestError, setRequestError] = useState<string>();
  const [editorState, setEditorState] = useState<{
    open: boolean;
    industry: IndustryROI | null;
  }>({ open: false, industry: null });
  const [deleteId, setDeleteId] = useState<string>();

  const industriesQuery = useQuery({
    queryKey: queryKeys.roiIndustries,
    queryFn: () => apiRequest<IndustryROI[]>("/api/admin/roi-industries")
  });

  const industries = sortByOrder(industriesQuery.data ?? []);

  const form = useForm<RoiIndustryValues>({
    resolver: zodResolver(roiIndustrySchema),
    defaultValues: {
      label: "",
      image: "",
      useCases: [{ value: "" }],
      cvr: "",
      secondaryMetric: "",
      audioLabel: "",
      audioDuration: "",
      audioFile: "",
      publicationStatus: "draft"
    }
  });

  const useCases = useFieldArray({
    control: form.control,
    name: "useCases"
  });

  const saveMutation = useMutation({
    mutationFn: (values: RoiIndustryValues) => {
      const body = {
        ...values,
        useCases: values.useCases.map((item) => item.value),
        audioFile: values.audioFile?.trim() ? values.audioFile.trim() : undefined,
        sortOrder: editorState.industry?.sortOrder ?? industries.length
      };

      if (editorState.industry) {
        return apiRequest<IndustryROI>(
          `/api/admin/roi-industries/${editorState.industry.id}`,
          {
            method: "PUT",
            csrfToken,
            body
          }
        );
      }

      return apiRequest<IndustryROI>("/api/admin/roi-industries", {
        method: "POST",
        csrfToken,
        body
      });
    },
    onSuccess: async () => {
      setEditorState({ open: false, industry: null });
      form.reset({
        label: "",
        image: "",
        useCases: [{ value: "" }],
        cvr: "",
        secondaryMetric: "",
        audioLabel: "",
        audioDuration: "",
        audioFile: "",
        publicationStatus: "draft"
      });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.roiIndustries });
      pushToast("ROI industry saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const reorderMutation = useMutation({
    mutationFn: (items: IndustryROI[]) =>
      apiRequest<{ success: boolean }>("/api/admin/roi-industries/reorder", {
        method: "PATCH",
        csrfToken,
        body: items.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.roiIndustries });
      pushToast("ROI industry order saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest<void>(`/api/admin/roi-industries/${deleteId}`, {
        method: "DELETE",
        csrfToken
      }),
    onSuccess: async () => {
      setDeleteId(undefined);
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.roiIndustries });
      pushToast("ROI industry deleted");
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
      apiRequest<IndustryROI>(`/api/admin/roi-industries/${id}/publication-status`, {
        method: "PATCH",
        csrfToken,
        body: { publicationStatus }
      }),
    onSuccess: async (_industry, variables) => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.roiIndustries });
      pushToast(
        variables.publicationStatus === "published"
          ? "ROI industry published"
          : "ROI industry moved to draft"
      );
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  function openEditor(industry?: IndustryROI) {
    setEditorState({ open: true, industry: industry ?? null });
    form.reset({
      label: industry?.label ?? "",
      image: industry?.image ?? "",
      useCases: industry?.useCases.map((value) => ({ value })) ?? [{ value: "" }],
      cvr: industry?.cvr ?? "",
      secondaryMetric: industry?.secondaryMetric ?? "",
      audioLabel: industry?.audioLabel ?? "",
      audioDuration: industry?.audioDuration ?? "",
      audioFile: industry?.audioFile ?? "",
      publicationStatus: industry?.publicationStatus ?? "draft"
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="ROI Industries"
        description="Manage industry stats, preview assets, and audio snippets used in the ROI section."
        actions={
          canEdit ? (
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4" />
              Add industry
            </Button>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      {industries.length === 0 ? (
        <EmptyState
          title="No ROI industries yet"
          description="Create the first industry card for the ROI snapshot section."
        />
      ) : (
        <SortableList
          items={industries}
          onReorder={(items) => {
            queryClient.setQueryData(
              queryKeys.roiIndustries,
              items.map((item, index) => ({ ...item, sortOrder: index }))
            );
            reorderMutation.mutate(items);
          }}
          renderItem={(industry) => (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[180px,1fr]">
                <div className="overflow-hidden rounded-2xl border border-[color:var(--dd-border)] bg-white">
                  <img
                    src={industry.image}
                    alt={industry.label}
                    className="h-36 w-full object-cover"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="font-semibold text-[color:var(--dd-text)]">
                      {industry.label}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-full bg-[color:var(--dd-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                        #{industry.sortOrder + 1}
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${publicationStatusClassName(industry.publicationStatus)}`}
                      >
                        {publicationStatusLabel(industry.publicationStatus)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {industry.useCases.map((useCase) => (
                      <span
                        key={useCase}
                        className="rounded-full border border-[color:var(--dd-border)] px-3 py-1 text-xs text-[color:var(--dd-muted)]"
                      >
                        {useCase}
                      </span>
                    ))}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-[color:var(--dd-border)] bg-[color:var(--dd-panel)] px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--dd-muted)]">
                        CVR
                      </div>
                      <div className="mt-1 font-semibold text-[color:var(--dd-text)]">
                        {industry.cvr}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--dd-border)] bg-[color:var(--dd-panel)] px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--dd-muted)]">
                        Secondary metric
                      </div>
                      <div className="mt-1 font-semibold text-[color:var(--dd-text)]">
                        {industry.secondaryMetric}
                      </div>
                    </div>
                  </div>
                  {industry.audioFile ? (
                    <div className="rounded-2xl border border-[color:var(--dd-border)] bg-[color:var(--dd-panel)] px-4 py-3">
                      <div className="mb-2 text-sm font-semibold text-[color:var(--dd-text)]">
                        {industry.audioLabel} ({industry.audioDuration})
                      </div>
                      <audio controls className="w-full" src={industry.audioFile} />
                    </div>
                  ) : null}
                </div>
              </div>
              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => openEditor(industry)}>
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      publicationMutation.mutate({
                        id: industry.id,
                        publicationStatus: togglePublicationStatus(
                          industry.publicationStatus
                        )
                      })
                    }
                    disabled={publicationMutation.isPending}
                  >
                    {publicationActionLabel(industry.publicationStatus)}
                  </Button>
                  <Button variant="ghost" onClick={() => setDeleteId(industry.id)}>
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
        title={editorState.industry ? "Edit ROI industry" : "Create ROI industry"}
      >
        <form className="space-y-5" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <FormField label="Industry label" error={form.formState.errors.label?.message}>
            <Input {...form.register("label")} />
          </FormField>
          <MediaField
            label="Industry image"
            value={form.watch("image")}
            onChange={(nextValue) =>
              form.setValue("image", nextValue, { shouldDirty: true })
            }
            disabled={!canEdit}
            kind="image"
          />
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-[color:var(--dd-text)]">Use cases</div>
                <div className="text-xs text-[color:var(--dd-muted)]">
                  Add up to 8 use-case pills for this industry.
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={() => useCases.append({ value: "New use case" })}>
                <Plus className="h-4 w-4" />
                Add use case
              </Button>
            </div>
            <SortableList
              items={useCases.fields.map((field, index) => ({
                id: field.id,
                value: form.watch(`useCases.${index}.value`)
              }))}
              onReorder={(items) => {
                useCases.replace(items.map((item) => ({ value: item.value })));
              }}
              renderItem={(item, index) => (
                <div className="flex items-center gap-3">
                  <Input
                    value={item.value}
                    onChange={(event) =>
                      form.setValue(`useCases.${index}.value`, event.target.value, {
                        shouldDirty: true
                      })
                    }
                  />
                  <Button type="button" variant="ghost" onClick={() => useCases.remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="CVR" error={form.formState.errors.cvr?.message}>
              <Input {...form.register("cvr")} />
            </FormField>
            <FormField
              label="Secondary metric"
              error={form.formState.errors.secondaryMetric?.message}
            >
              <Input {...form.register("secondaryMetric")} />
            </FormField>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Audio label"
              error={form.formState.errors.audioLabel?.message}
            >
              <Input {...form.register("audioLabel")} />
            </FormField>
            <FormField
              label="Audio duration"
              error={form.formState.errors.audioDuration?.message}
            >
              <Input {...form.register("audioDuration")} />
            </FormField>
          </div>
          <MediaField
            label="Optional audio file"
            value={form.watch("audioFile") ?? ""}
            onChange={(nextValue) =>
              form.setValue("audioFile", nextValue, { shouldDirty: true })
            }
            disabled={!canEdit}
            kind="audio"
          />
          <FormField
            label="Publication status"
            hint="Draft ROI cards stay in the CMS but are excluded from the public site."
            error={form.formState.errors.publicationStatus?.message}
          >
            <Select {...form.register("publicationStatus")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditorState({ open: false, industry: null })}>
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
        title="Delete ROI industry"
        description="This permanently removes the ROI industry card."
      />
    </div>
  );
}
