import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FormField, Input, Textarea } from "../../components/ui/field";
import { MediaField } from "../../components/ui/media-field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { SortableList } from "../../components/ui/sortable-list";
import { apiRequest } from "../../lib/api-client";
import type { HeroContentResponse } from "../../lib/api-types";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";
import { requiredUrlOrPathField, optionalUrlField } from "../../lib/form-schemas";
import { queryKeys } from "../../lib/query-keys";
import { canWriteContent } from "../../lib/role-utils";
import { useToast } from "../../components/ui/toast";

const itemSchema = z.object({
  value: z.string().trim().min(1)
});

const tabSchema = z.object({
  label: z.string().trim().min(1),
  image: optionalUrlField,
  content: z.string().trim().optional()
});

const heroSchema = z.object({
  headline: z.string().trim().min(1),
  subheadline: z.string().trim().min(1),
  ctaText: z.string().trim().min(1),
  ctaLink: requiredUrlOrPathField,
  promptTemplates: z.array(itemSchema).max(12),
  heroTabs: z.array(tabSchema).min(1).max(6),
  heroHeading: z.string().trim().min(1),
  heroBackgroundImage: optionalUrlField,
  heroDashboardImage: optionalUrlField
});

type HeroFormValues = z.infer<typeof heroSchema>;

function toFormValues(hero: HeroContentResponse): HeroFormValues {
  return {
    headline: hero.headline,
    subheadline: hero.subheadline,
    ctaText: hero.ctaText,
    ctaLink: hero.ctaLink,
    promptTemplates: hero.promptTemplates.map((value) => ({ value })),
    heroTabs: hero.heroTabs.map((tab) => ({
      label: tab.label,
      image: tab.image ?? "",
      content: tab.content ?? ""
    })),
    heroHeading: hero.heroHeading,
    heroBackgroundImage: hero.heroBackgroundImage ?? "",
    heroDashboardImage: hero.heroDashboardImage ?? ""
  };
}

export function HeroPage() {
  const { user, csrfToken } = useAuth();
  const canEdit = canWriteContent(user?.role);
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [requestError, setRequestError] = useState<string>();
  const heroQuery = useQuery({
    queryKey: queryKeys.hero,
    queryFn: () => apiRequest<HeroContentResponse>("/api/admin/hero")
  });
  const form = useForm<HeroFormValues>({
    resolver: zodResolver(heroSchema),
    defaultValues: {
      headline: "",
      subheadline: "",
      ctaText: "",
      ctaLink: "",
      promptTemplates: [{ value: "" }],
      heroTabs: [{ label: "", image: "", content: "" }],
      heroHeading: "",
      heroBackgroundImage: "",
      heroDashboardImage: ""
    }
  });
  const promptTemplates = useFieldArray({
    control: form.control,
    name: "promptTemplates"
  });
  const heroTabs = useFieldArray({
    control: form.control,
    name: "heroTabs"
  });

  useEffect(() => {
    if (heroQuery.data) {
      form.reset(toFormValues(heroQuery.data));
    }
  }, [form, heroQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (values: HeroFormValues) =>
      apiRequest<HeroContentResponse>("/api/admin/hero", {
        method: "PUT",
        csrfToken,
        body: {
          ...values,
          promptTemplates: values.promptTemplates.map((item) => item.value),
          heroTabs: values.heroTabs.map((item) => ({
            label: item.label,
            image: item.image,
            content: item.content
          }))
        }
      }),
    onSuccess: async (data) => {
      setRequestError(undefined);
      form.reset(toFormValues(data));
      await queryClient.invalidateQueries({ queryKey: queryKeys.hero });
      pushToast("Hero content saved");
    },
    onError: (error) => {
      setRequestError(getErrorMessage(error, "Unable to save hero content"));
    }
  });

  const preview = form.watch();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hero Manager"
        description="Update the marketing hero, prompt templates, and top-level product tabs."
        actions={
          canEdit ? (
            <Button
              onClick={form.handleSubmit((values) => saveMutation.mutate(values))}
              loading={saveMutation.isPending}
            >
              Save hero
            </Button>
          ) : undefined
        }
      />
      {heroQuery.isLoading && (
        <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--dd-border)] bg-white/70 p-6">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
          <span className="text-sm font-medium text-[color:var(--dd-muted)]">Loading hero content…</span>
        </div>
      )}
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card>
          <form className="space-y-5" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
            <BackendErrorAlert message={requestError} />
            <FormField label="Headline" error={form.formState.errors.headline?.message}>
              <Input {...form.register("headline")} disabled={!canEdit} error={!!form.formState.errors.headline} />
            </FormField>
            <FormField label="Subheadline" error={form.formState.errors.subheadline?.message}>
              <Textarea {...form.register("subheadline")} disabled={!canEdit} error={!!form.formState.errors.subheadline} />
            </FormField>
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="CTA text" error={form.formState.errors.ctaText?.message}>
                <Input {...form.register("ctaText")} disabled={!canEdit} error={!!form.formState.errors.ctaText} />
              </FormField>
              <FormField label="CTA link" error={form.formState.errors.ctaLink?.message}>
                <Input {...form.register("ctaLink")} disabled={!canEdit} error={!!form.formState.errors.ctaLink} />
              </FormField>
            </div>
            <FormField label="Hero heading" error={form.formState.errors.heroHeading?.message}>
              <Input {...form.register("heroHeading")} disabled={!canEdit} error={!!form.formState.errors.heroHeading} />
            </FormField>
            <MediaField
              label="Hero background image"
              value={form.watch("heroBackgroundImage")}
              onChange={(nextValue) => form.setValue("heroBackgroundImage", nextValue, { shouldDirty: true })}
              disabled={!canEdit}
              kind="image"
              maxSize={5 * 1024 * 1024}
              hint="Max size 5MB"
            />
            <MediaField
              label="Hero dashboard image"
              value={form.watch("heroDashboardImage")}
              onChange={(nextValue) => form.setValue("heroDashboardImage", nextValue, { shouldDirty: true })}
              disabled={!canEdit}
              kind="image"
              maxSize={5 * 1024 * 1024}
              hint="Max size 5MB"
            />
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--dd-text)]">Hero tabs</div>
                  <div className="text-xs text-[color:var(--dd-muted)]">
                    Reorder the primary product tabs in the visual hero.
                  </div>
                </div>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => heroTabs.append({ label: "New tab", image: "", content: "" })}
                  >
                    <Plus className="h-4 w-4" />
                    Add tab
                  </Button>
                ) : null}
              </div>
              <SortableList
                items={heroTabs.fields.map((field, index) => ({
                  id: field.id,
                  label: form.watch(`heroTabs.${index}.label`),
                  image: form.watch(`heroTabs.${index}.image`),
                  content: form.watch(`heroTabs.${index}.content`)
                }))}
                onReorder={(items) =>
                  heroTabs.replace(items.map((item) => ({ 
                    label: item.label, 
                    image: item.image, 
                    content: item.content 
                  })))
                }
                renderItem={(item, index) => (
                  <div className="flex flex-col gap-4 rounded-3xl border border-[color:var(--dd-border)] bg-gray-50/50 p-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-teal-800">Tab {index + 1}</div>
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => heroTabs.remove(index)}
                          className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Tab label">
                        <Input
                          {...form.register(`heroTabs.${index}.label`)}
                          disabled={!canEdit}
                          placeholder="e.g. Platform"
                        />
                      </FormField>
                      <MediaField
                        label="Tab image"
                        value={form.watch(`heroTabs.${index}.image`)}
                        onChange={(val) => form.setValue(`heroTabs.${index}.image`, val, { shouldDirty: true })}
                        disabled={!canEdit}
                        maxSize={5 * 1024 * 1024}
                        hint="Custom image for this tab"
                      />
                    </div>
                    <FormField label="Tab content">
                      <Textarea
                        {...form.register(`heroTabs.${index}.content`)}
                        disabled={!canEdit}
                        placeholder="Content to display when this tab is active..."
                        rows={3}
                      />
                    </FormField>
                  </div>
                )}
              />
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--dd-text)]">
                    Prompt templates
                  </div>
                  <div className="text-xs text-[color:var(--dd-muted)]">
                    Manage the suggested prompts in the hero chat experience.
                  </div>
                </div>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => promptTemplates.append({ value: "New prompt" })}
                  >
                    <Plus className="h-4 w-4" />
                    Add prompt
                  </Button>
                ) : null}
              </div>
              <div className="space-y-3">
                {promptTemplates.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center"
                  >
                    <Input
                      disabled={!canEdit}
                      value={form.watch(`promptTemplates.${index}.value`)}
                      onChange={(event) =>
                        form.setValue(`promptTemplates.${index}.value`, event.target.value, {
                          shouldDirty: true
                        })
                      }
                    />
                    {canEdit ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => promptTemplates.remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </form>
        </Card>
        {/* <Card className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[color:var(--dd-primary-soft)] p-3 text-teal-800">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
                Live preview
              </div>
              <div className="text-sm text-[color:var(--dd-muted)]">
                Preview the hero content as editors update it.
              </div>
            </div>
          </div>
          <div
            className="overflow-hidden rounded-[2rem] border border-[color:var(--dd-border)] bg-[color:var(--dd-primary)] p-6 text-white"
            style={{
              backgroundImage: preview.heroBackgroundImage
                ? `linear-gradient(rgba(15, 23, 42, 0.35), rgba(15, 23, 42, 0.65)), url(${preview.heroBackgroundImage})`
                : undefined,
              backgroundSize: "cover"
            }}
          >
            <div className="flex flex-wrap gap-2">
              {preview.heroTabs.map((tab) => (
                <span
                  key={tab.value}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                >
                  {tab.value}
                </span>
              ))}
            </div>
            <div className="mt-6 max-w-xl">
              <div className="text-sm uppercase tracking-[0.18em] text-white/70">
                {preview.headline}
              </div>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight">
                {preview.heroHeading}
              </h2>
              <p className="mt-4 text-sm text-white/80">{preview.subheadline}</p>
              <div className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-teal-800">
                {preview.ctaText}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {preview.promptTemplates.map((template) => (
                  <span
                    key={template.value}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/85"
                  >
                    {template.value}
                  </span>
                ))}
              </div>
            </div>
            {preview.heroDashboardImage ? (
              <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/40">
                <img
                  src={preview.heroDashboardImage}
                  alt="Hero dashboard preview"
                  className="h-48 w-full object-cover sm:h-64"
                />
              </div>
            ) : null}
          </div>
        </Card> */}
      </div>
    </div>
  );
}
