import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { ConfirmDeleteDialog, DrawerForm } from "../../components/ui/dialogs";
import { EmptyState } from "../../components/ui/empty-state";
import { FormField, Input, Select, Textarea } from "../../components/ui/field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { SortableList } from "../../components/ui/sortable-list";
import { useToast } from "../../components/ui/toast";
import { apiRequest } from "../../lib/api-client";
import type { ProcessStep, PublicationStatus } from "../../lib/api-types";
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

const processStepSchema = z.object({
  label: z.string().trim().min(1).max(20),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(2000),
  publicationStatus: z.enum(["draft", "published"])
});

type ProcessStepValues = z.infer<typeof processStepSchema>;

function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function ProcessStepsPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role);
  const [requestError, setRequestError] = useState<string>();
  const [editorState, setEditorState] = useState<{
    open: boolean;
    step: ProcessStep | null;
  }>({ open: false, step: null });
  const [deleteId, setDeleteId] = useState<string>();

  const stepsQuery = useQuery({
    queryKey: queryKeys.processSteps,
    queryFn: () => apiRequest<ProcessStep[]>("/api/admin/process-steps")
  });

  const steps = sortByOrder(stepsQuery.data ?? []);

  const form = useForm<ProcessStepValues>({
    resolver: zodResolver(processStepSchema),
    defaultValues: {
      label: "",
      title: "",
      description: "",
      publicationStatus: "draft"
    }
  });

  const saveMutation = useMutation({
    mutationFn: (values: ProcessStepValues) => {
      const body = {
        ...values,
        sortOrder: editorState.step?.sortOrder ?? steps.length
      };

      if (editorState.step) {
        return apiRequest<ProcessStep>(`/api/admin/process-steps/${editorState.step.id}`, {
          method: "PUT",
          csrfToken,
          body
        });
      }

      return apiRequest<ProcessStep>("/api/admin/process-steps", {
        method: "POST",
        csrfToken,
        body
      });
    },
    onSuccess: async () => {
      setEditorState({ open: false, step: null });
      form.reset({
        label: "",
        title: "",
        description: "",
        publicationStatus: "draft"
      });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.processSteps });
      pushToast("Process step saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const reorderMutation = useMutation({
    mutationFn: (items: ProcessStep[]) =>
      apiRequest<{ success: boolean }>("/api/admin/process-steps/reorder", {
        method: "PATCH",
        csrfToken,
        body: items.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.processSteps });
      pushToast("Process step order saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest<void>(`/api/admin/process-steps/${deleteId}`, {
        method: "DELETE",
        csrfToken
      }),
    onSuccess: async () => {
      setDeleteId(undefined);
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.processSteps });
      pushToast("Process step deleted");
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
      apiRequest<ProcessStep>(`/api/admin/process-steps/${id}/publication-status`, {
        method: "PATCH",
        csrfToken,
        body: { publicationStatus }
      }),
    onSuccess: async (_step, variables) => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.processSteps });
      pushToast(
        variables.publicationStatus === "published"
          ? "Process step published"
          : "Process step moved to draft"
      );
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  function openEditor(step?: ProcessStep) {
    setEditorState({ open: true, step: step ?? null });
    form.reset({
      label: step?.label ?? "",
      title: step?.title ?? "",
      description: step?.description ?? "",
      publicationStatus: step?.publicationStatus ?? "draft"
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Process Steps"
        description="Manage the step-by-step sequence shown in the process section, including short labels and longer explanatory copy."
        actions={
          canEdit ? (
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4" />
              Add step
            </Button>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      {steps.length === 0 ? (
        <EmptyState
          title="No process steps yet"
          description="Create the first step for the process section."
        />
      ) : (
        <SortableList
          items={steps}
          onReorder={(items) => {
            queryClient.setQueryData(
              queryKeys.processSteps,
              items.map((item, index) => ({ ...item, sortOrder: index }))
            );
            reorderMutation.mutate(items);
          }}
          renderItem={(step) => (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--dd-accent)]">
                      {step.label}
                    </div>
                    <div className="mt-1 font-semibold text-[color:var(--dd-text)]">
                      {step.title}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full bg-[color:var(--dd-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                      #{step.sortOrder + 1}
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${publicationStatusClassName(step.publicationStatus)}`}
                    >
                      {publicationStatusLabel(step.publicationStatus)}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-[color:var(--dd-muted)]">{step.description}</div>
              </div>
              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => openEditor(step)}>
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      publicationMutation.mutate({
                        id: step.id,
                        publicationStatus: togglePublicationStatus(step.publicationStatus)
                      })
                    }
                    disabled={publicationMutation.isPending}
                  >
                    {publicationActionLabel(step.publicationStatus)}
                  </Button>
                  <Button variant="ghost" onClick={() => setDeleteId(step.id)}>
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
        title={editorState.step ? "Edit process step" : "Create process step"}
      >
        <form className="space-y-5" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Step label"
              hint="Keep this short so it works as an eyebrow or numbered tag."
              error={form.formState.errors.label?.message}
            >
              <Input {...form.register("label")} />
            </FormField>
            <FormField label="Title" error={form.formState.errors.title?.message}>
              <Input {...form.register("title")} />
            </FormField>
          </div>
          <FormField
            label="Description"
            error={form.formState.errors.description?.message}
          >
            <Textarea {...form.register("description")} />
          </FormField>
          <FormField
            label="Publication status"
            hint="Draft steps stay in the CMS but are excluded from the public site."
            error={form.formState.errors.publicationStatus?.message}
          >
            <Select {...form.register("publicationStatus")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditorState({ open: false, step: null })}>
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
        title="Delete process step"
        description="This permanently removes the process step."
      />
    </div>
  );
}
