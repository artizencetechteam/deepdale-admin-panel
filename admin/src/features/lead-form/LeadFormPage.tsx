import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FormField, Input, Textarea } from "../../components/ui/field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { SortableList } from "../../components/ui/sortable-list";
import { apiRequest } from "../../lib/api-client";
import type { SupportFormConfig } from "../../lib/api-types";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";
import { requiredUrlField } from "../../lib/form-schemas";
import { queryKeys } from "../../lib/query-keys";
import { canWriteContent } from "../../lib/role-utils";
import { useToast } from "../../components/ui/toast";

const itemSchema = z.object({
  value: z.string().trim().min(1)
});

const leadFormSchema = z.object({
  heading: z.string().trim().min(1),
  subheading: z.string().trim().min(1),
  checkItems: z.array(itemSchema).min(1).max(8),
  submitButtonText: z.string().trim().min(1),
  successMessage: z.string().trim().min(1),
  privacyPolicyText: z.string().trim().min(1),
  privacyPolicyUrl: requiredUrlField
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

function toFormValues(config: SupportFormConfig): LeadFormValues {
  return {
    heading: config.heading,
    subheading: config.subheading,
    checkItems: config.checkItems.map((value) => ({ value })),
    submitButtonText: config.submitButtonText,
    successMessage: config.successMessage,
    privacyPolicyText: config.privacyPolicyText,
    privacyPolicyUrl: config.privacyPolicyUrl
  };
}

export function LeadFormPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role);
  const [requestError, setRequestError] = useState<string>();

  const supportFormQuery = useQuery({
    queryKey: queryKeys.supportFormConfig,
    queryFn: () => apiRequest<SupportFormConfig>("/api/admin/support-form-config")
  });

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      heading: "",
      subheading: "",
      checkItems: [{ value: "" }],
      submitButtonText: "",
      successMessage: "",
      privacyPolicyText: "",
      privacyPolicyUrl: ""
    }
  });

  const checkItems = useFieldArray({
    control: form.control,
    name: "checkItems"
  });

  useEffect(() => {
    if (supportFormQuery.data) {
      form.reset(toFormValues(supportFormQuery.data));
    }
  }, [form, supportFormQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (values: LeadFormValues) =>
      apiRequest<SupportFormConfig>("/api/admin/support-form-config", {
        method: "PUT",
        csrfToken,
        body: {
          ...values,
          checkItems: values.checkItems.map((item) => item.value)
        }
      }),
    onSuccess: async (data) => {
      setRequestError(undefined);
      form.reset(toFormValues(data));
      await queryClient.invalidateQueries({ queryKey: queryKeys.supportFormConfig });
      pushToast("Lead form settings saved");
    },
    onError: (error) => {
      setRequestError(getErrorMessage(error, "Unable to save lead form settings"));
    }
  });

  const preview = form.watch();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Form"
        description="Control the support lead form copy, checklist items, success state, and privacy disclaimer."
        actions={
          canEdit ? (
            <Button
              onClick={form.handleSubmit((values) => saveMutation.mutate(values))}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save lead form"}
            </Button>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <Card>
          <form className="space-y-5" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
            <FormField label="Heading" error={form.formState.errors.heading?.message}>
              <Input {...form.register("heading")} disabled={!canEdit} />
            </FormField>
            <FormField label="Subheading" error={form.formState.errors.subheading?.message}>
              <Textarea {...form.register("subheading")} disabled={!canEdit} />
            </FormField>
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--dd-text)]">
                    Value checklist
                  </div>
                  <div className="text-xs text-[color:var(--dd-muted)]">
                    Drag to reorder the supporting promise bullets shown beside the form.
                  </div>
                </div>
                {canEdit ? (
                  <Button type="button" variant="secondary" onClick={() => checkItems.append({ value: "New check item" })}>
                    <Plus className="h-4 w-4" />
                    Add item
                  </Button>
                ) : null}
              </div>
              <SortableList
                items={checkItems.fields.map((field, index) => ({
                  id: field.id,
                  value: form.watch(`checkItems.${index}.value`)
                }))}
                onReorder={(items) => {
                  checkItems.replace(items.map((item) => ({ value: item.value })));
                }}
                renderItem={(item, index) => (
                  <div className="flex items-center gap-3">
                    <Input
                      value={item.value}
                      disabled={!canEdit}
                      onChange={(event) =>
                        form.setValue(`checkItems.${index}.value`, event.target.value, {
                          shouldDirty: true
                        })
                      }
                    />
                    {canEdit ? (
                      <Button type="button" variant="ghost" onClick={() => checkItems.remove(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                )}
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                label="Submit button"
                error={form.formState.errors.submitButtonText?.message}
              >
                <Input {...form.register("submitButtonText")} disabled={!canEdit} />
              </FormField>
              <FormField
                label="Privacy policy URL"
                error={form.formState.errors.privacyPolicyUrl?.message}
              >
                <Input {...form.register("privacyPolicyUrl")} disabled={!canEdit} />
              </FormField>
            </div>
            <FormField
              label="Success message"
              error={form.formState.errors.successMessage?.message}
            >
              <Textarea {...form.register("successMessage")} disabled={!canEdit} />
            </FormField>
            <FormField
              label="Privacy policy text"
              hint="HTML-safe copy is allowed here and will be sanitized by the backend."
              error={form.formState.errors.privacyPolicyText?.message}
            >
              <Textarea {...form.register("privacyPolicyText")} disabled={!canEdit} />
            </FormField>
          </form>
        </Card>
        <Card className="space-y-5">
          <div>
            <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
              Lead form preview
            </div>
            <div className="text-sm text-[color:var(--dd-muted)]">
              Quick visual check of the content shown on the public site.
            </div>
          </div>
          <div className="rounded-[2rem] border border-[color:var(--dd-border)] bg-[color:var(--dd-panel)] p-6">
            <div className="space-y-2">
              <div className="text-2xl font-extrabold text-[color:var(--dd-text)]">
                {preview.heading}
              </div>
              <div className="text-sm text-[color:var(--dd-muted)]">
                {preview.subheading}
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {preview.checkItems.map((item) => (
                <div key={item.value} className="flex items-start gap-3">
                  <div className="rounded-full bg-[color:var(--dd-primary-soft)] p-2 text-teal-800">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="text-sm text-[color:var(--dd-text)]">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-[color:var(--dd-border)] bg-white p-4">
              <div className="grid gap-3">
                <Input placeholder="Full name" disabled />
                <Input placeholder="Company name" disabled />
                <Input placeholder="Work email" disabled />
              </div>
              <Button className="mt-4 w-full" disabled>
                {preview.submitButtonText || "Submit"}
              </Button>
            </div>
            <div className="mt-5 text-sm text-[color:var(--dd-muted)]">
              Success message: {preview.successMessage}
            </div>
            <div
              className="mt-5 text-sm text-[color:var(--dd-muted)]"
              dangerouslySetInnerHTML={{ __html: preview.privacyPolicyText || "" }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
