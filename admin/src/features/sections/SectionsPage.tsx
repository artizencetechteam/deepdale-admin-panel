import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, GripVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { FormField, Input, Switch, Textarea } from "../../components/ui/field";
import { MediaField } from "../../components/ui/media-field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { SortableList } from "../../components/ui/sortable-list";
import { apiRequest } from "../../lib/api-client";
import type { SectionConfig, SectionConfigInput, SectionState } from "../../lib/api-types";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";
import { requiredUrlField } from "../../lib/form-schemas";
import { queryKeys } from "../../lib/query-keys";
import { canWriteContent } from "../../lib/role-utils";
import { useToast } from "../../components/ui/toast";

const configSchema = z.object({
  voiceAgentsHeading: z.string().trim().min(1),
  voiceAgentsSubheading: z.string().trim().min(1),
  voiceAgentsBodyText: z.string().trim().min(1),
  automationHeading: z.string().trim().min(1),
  automationSubheading: z.string().trim().min(1),
  automationCtaBannerText: z.string().trim().min(1),
  automationCtaBannerButton: z.string().trim().min(1),
  modelCreationLine1: z.string().trim().min(1),
  modelCreationLine2: z.string().trim().min(1),
  modelCreationLine3: z.string().trim().min(1),
  processStepsHeading: z.string().trim().min(1),
  processStepsSubheading: z.string().trim().min(1),
  productsOverviewHeading: z.string().trim().min(1),
  productsOverviewSubheading: z.string().trim().min(1),
  productFeaturesCenterImageUrl: requiredUrlField,
  callerShowcaseHeading: z.string().trim().min(1),
  callerShowcaseSubheading: z.string().trim().min(1),
  testimonialsHeading: z.string().trim().min(1),
  faqHeading: z.string().trim().min(1),
  integrationsHeading: z.string().trim().min(1),
  integrationsSubheading: z.string().trim().min(1),
  integrationsCtaText: z.string().trim().min(1),
  partnershipHeading: z.string().trim().min(1),
  roiBadgeText: z.string().trim().min(1),
  roiHeading: z.string().trim().min(1),
  footerTagline: z.string().trim().min(1),
  footerBrandText: z.string().trim().min(1)
});

type SectionConfigValues = z.infer<typeof configSchema>;
type SectionFieldName = keyof SectionConfigValues;
type SortableSectionState = SectionState & { id: string };

const sectionLabelMap: Record<string, string> = {
  PRODUCT_SHOWCASE_OVERVIEW: "Product Showcase Overview",
  HERO_SECTION: "Hero Section",
  PRODUCT_SHOWCASE_SECTION: "Product Cards",
  PARTNERSHIP_SECTION: "Partners Marquee",
  VOICE_AGENTS_SECTION: "Voice Scenarios",
  AUTOMATION_ENGINES_SECTION: "Automation Engines",
  MODEL_CREATION_GRID_SECTION: "Capability Grid",
  ROI_SNAPSHOT_SECTION: "ROI Snapshot",
  PROCESS_STEPS_SECTION: "Process Steps",
  POWERFUL_PRODUCTS_OVERVIEW_SECTION: "Product Features",
  CALLER_SHOWCASE_SECTION: "Caller Showcase",
  TESTIMONIALS_SECTION: "Testimonials",
  FAQ_SECTION: "FAQs",
  INTEGRATIONS_SECTION: "Integrations",
  SUPPORT_LEAD_FORM_SECTION: "Support Lead Form",
  SITE_FOOTER_SECTION: "Site Footer",
  HEADER: "Header",
  CHAT: "Chat"
};

const configSections: Array<{
  title: string;
  description: string;
  fields: Array<{
    name: SectionFieldName;
    label: string;
    multiline?: boolean;
    media?: boolean;
  }>;
}> = [
  {
    title: "Voice Agents",
    description: "Heading, supporting copy, and section introduction text.",
    fields: [
      { name: "voiceAgentsHeading", label: "Heading" },
      { name: "voiceAgentsSubheading", label: "Subheading" },
      { name: "voiceAgentsBodyText", label: "Body text", multiline: true }
    ]
  },
  {
    title: "Automation Engines",
    description: "Main headline and CTA strip copy.",
    fields: [
      { name: "automationHeading", label: "Heading" },
      { name: "automationSubheading", label: "Subheading" },
      { name: "automationCtaBannerText", label: "CTA banner text" },
      { name: "automationCtaBannerButton", label: "CTA button label" }
    ]
  },
  {
    title: "Model Creation Grid",
    description: "Three-line copy around the central orb.",
    fields: [
      { name: "modelCreationLine1", label: "Line 1" },
      { name: "modelCreationLine2", label: "Line 2" },
      { name: "modelCreationLine3", label: "Line 3" }
    ]
  },
  {
    title: "Process And Product Overview",
    description: "Headings for process and feature overview sections.",
    fields: [
      { name: "processStepsHeading", label: "Process heading" },
      { name: "processStepsSubheading", label: "Process subheading" },
      { name: "productsOverviewHeading", label: "Products heading" },
      { name: "productsOverviewSubheading", label: "Products subheading" },
      {
        name: "productFeaturesCenterImageUrl",
        label: "Product features center image",
        media: true
      }
    ]
  },
  {
    title: "Callers And Social Proof",
    description: "Copy for callers, testimonials, and FAQ sections.",
    fields: [
      { name: "callerShowcaseHeading", label: "Caller heading" },
      { name: "callerShowcaseSubheading", label: "Caller subheading" },
      { name: "testimonialsHeading", label: "Testimonials heading" },
      { name: "faqHeading", label: "FAQ heading" }
    ]
  },
  {
    title: "Integrations And Partnership",
    description: "Headings used for integrations, ROI, and partner trust.",
    fields: [
      { name: "integrationsHeading", label: "Integrations heading" },
      { name: "integrationsSubheading", label: "Integrations subheading" },
      { name: "integrationsCtaText", label: "Integrations CTA text" },
      { name: "partnershipHeading", label: "Partnership heading" },
      { name: "roiBadgeText", label: "ROI badge text" },
      { name: "roiHeading", label: "ROI heading" }
    ]
  },
  {
    title: "Footer",
    description: "Branding copy that appears in the site footer.",
    fields: [
      { name: "footerTagline", label: "Footer tagline", multiline: true },
      { name: "footerBrandText", label: "Footer brand text" }
    ]
  }
];

function toConfigValues(config: SectionConfig): SectionConfigValues {
  return {
    voiceAgentsHeading: config.voiceAgentsHeading,
    voiceAgentsSubheading: config.voiceAgentsSubheading,
    voiceAgentsBodyText: config.voiceAgentsBodyText,
    automationHeading: config.automationHeading,
    automationSubheading: config.automationSubheading,
    automationCtaBannerText: config.automationCtaBannerText,
    automationCtaBannerButton: config.automationCtaBannerButton,
    modelCreationLine1: config.modelCreationLine1,
    modelCreationLine2: config.modelCreationLine2,
    modelCreationLine3: config.modelCreationLine3,
    processStepsHeading: config.processStepsHeading,
    processStepsSubheading: config.processStepsSubheading,
    productsOverviewHeading: config.productsOverviewHeading,
    productsOverviewSubheading: config.productsOverviewSubheading,
    productFeaturesCenterImageUrl: config.productFeaturesCenterImageUrl,
    callerShowcaseHeading: config.callerShowcaseHeading,
    callerShowcaseSubheading: config.callerShowcaseSubheading,
    testimonialsHeading: config.testimonialsHeading,
    faqHeading: config.faqHeading,
    integrationsHeading: config.integrationsHeading,
    integrationsSubheading: config.integrationsSubheading,
    integrationsCtaText: config.integrationsCtaText,
    partnershipHeading: config.partnershipHeading,
    roiBadgeText: config.roiBadgeText,
    roiHeading: config.roiHeading,
    footerTagline: config.footerTagline,
    footerBrandText: config.footerBrandText
  };
}

function sortStates(states: SectionState[]) {
  return [...states].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function SectionsPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role);
  const [requestError, setRequestError] = useState<string>();

  const sectionConfigQuery = useQuery({
    queryKey: queryKeys.sectionConfig,
    queryFn: () => apiRequest<SectionConfig>("/api/admin/section-config")
  });
  const sectionStatesQuery = useQuery({
    queryKey: queryKeys.sectionStates,
    queryFn: () => apiRequest<SectionState[]>("/api/admin/section-states")
  });

  const form = useForm<SectionConfigValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      voiceAgentsHeading: "",
      voiceAgentsSubheading: "",
      voiceAgentsBodyText: "",
      automationHeading: "",
      automationSubheading: "",
      automationCtaBannerText: "",
      automationCtaBannerButton: "",
      modelCreationLine1: "",
      modelCreationLine2: "",
      modelCreationLine3: "",
      processStepsHeading: "",
      processStepsSubheading: "",
      productsOverviewHeading: "",
      productsOverviewSubheading: "",
      productFeaturesCenterImageUrl: "",
      callerShowcaseHeading: "",
      callerShowcaseSubheading: "",
      testimonialsHeading: "",
      faqHeading: "",
      integrationsHeading: "",
      integrationsSubheading: "",
      integrationsCtaText: "",
      partnershipHeading: "",
      roiBadgeText: "",
      roiHeading: "",
      footerTagline: "",
      footerBrandText: ""
    }
  });

  useEffect(() => {
    if (sectionConfigQuery.data) {
      form.reset(toConfigValues(sectionConfigQuery.data));
    }
  }, [form, sectionConfigQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (values: SectionConfigValues) =>
      apiRequest<SectionConfig>("/api/admin/section-config", {
        method: "PUT",
        csrfToken,
        body: values satisfies SectionConfigInput
      }),
    onSuccess: async (data) => {
      setRequestError(undefined);
      form.reset(toConfigValues(data));
      await queryClient.invalidateQueries({ queryKey: queryKeys.sectionConfig });
      pushToast("Section copy saved");
    },
    onError: (error) => {
      setRequestError(getErrorMessage(error, "Unable to save section headings"));
    }
  });

  const reorderMutation = useMutation({
    mutationFn: (items: SortableSectionState[]) =>
      apiRequest<{ success: boolean }>("/api/admin/section-states/reorder", {
        method: "PATCH",
        csrfToken,
        body: items.map((item, index) => ({
          key: item.key,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sectionStates });
      pushToast("Section order saved");
    },
    onError: (error) => {
      setRequestError(getErrorMessage(error, "Unable to reorder sections"));
    }
  });

  const visibilityMutation = useMutation({
    mutationFn: ({
      key,
      isVisible
    }: {
      key: string;
      isVisible: boolean;
    }) =>
      apiRequest<SectionState>(`/api/admin/section-states/${key}`, {
        method: "PATCH",
        csrfToken,
        body: { isVisible }
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sectionStates });
      pushToast("Section visibility updated");
    },
    onError: (error) => {
      setRequestError(getErrorMessage(error, "Unable to update visibility"));
    }
  });

  const sortableStates = useMemo(
    () =>
      sortStates(sectionStatesQuery.data ?? []).map((state) => ({
        ...state,
        id: state.key
      })),
    [sectionStatesQuery.data]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sections"
        description="Manage section visibility, section order, and all shared headings used across the landing page."
        actions={
          canEdit ? (
            <Button
              onClick={form.handleSubmit((values) => saveMutation.mutate(values))}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save headings"}
            </Button>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      <div className="grid gap-6 xl:grid-cols-[0.78fr,1.22fr]">
        <Card className="space-y-4">
          <div className="space-y-1">
            <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
              Section order and visibility
            </div>
            <div className="text-sm text-[color:var(--dd-muted)]">
              Drag sections into public display order and hide them without losing content.
            </div>
          </div>
          {sortableStates.length === 0 ? (
            <EmptyState
              title="No sections found"
              description="Section state records were not returned by the backend."
            />
          ) : (
            <SortableList
              items={sortableStates}
              onReorder={(items) => {
                queryClient.setQueryData(
                  queryKeys.sectionStates,
                  items.map(({ id: _id, ...item }, index) => ({
                    ...item,
                    sortOrder: index
                  }))
                );
                reorderMutation.mutate(items);
              }}
              renderItem={(item) => (
                <div className="space-y-3">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="font-semibold text-[color:var(--dd-text)]">
                        {sectionLabelMap[item.key] ?? item.key}
                      </div>
                      <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--dd-muted)]">
                        {item.key.replaceAll("_", " ")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-[color:var(--dd-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                        #{item.sortOrder + 1}
                      </div>
                      <GripVertical className="h-4 w-4 text-[color:var(--dd-muted)]" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--dd-border)] bg-[color:var(--dd-panel)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-[color:var(--dd-primary-soft)] p-2 text-teal-800">
                        <EyeOff className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-[color:var(--dd-text)]">
                          Public visibility
                        </div>
                        <div className="text-sm text-[color:var(--dd-muted)]">
                          {item.isVisible ? "Shown on the public site" : "Hidden from the public site"}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={item.isVisible}
                      disabled={!canEdit || visibilityMutation.isPending}
                      onCheckedChange={(nextValue) => {
                        queryClient.setQueryData(
                          queryKeys.sectionStates,
                          sortableStates.map((state) =>
                            state.key === item.key
                              ? { ...state, isVisible: nextValue }
                              : state
                          )
                        );
                        visibilityMutation.mutate({ key: item.key, isVisible: nextValue });
                      }}
                    />
                  </div>
                </div>
              )}
            />
          )}
        </Card>
        <Card>
          <form className="space-y-8" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
            {configSections.map((section) => (
              <section key={section.title} className="space-y-5 border-b border-[color:var(--dd-border)] pb-8 last:border-b-0 last:pb-0">
                <div className="space-y-1">
                  <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
                    {section.title}
                  </div>
                  <div className="text-sm text-[color:var(--dd-muted)]">
                    {section.description}
                  </div>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  {section.fields.map((field) => {
                    if (field.media) {
                      return (
                        <div key={field.name} className="md:col-span-2">
                          <MediaField
                            label={field.label}
                            value={form.watch(field.name)}
                            onChange={(nextValue) =>
                              form.setValue(field.name, nextValue, {
                                shouldDirty: true
                              })
                            }
                            disabled={!canEdit}
                            kind="image"
                          />
                        </div>
                      );
                    }

                    if (field.multiline) {
                      return (
                        <FormField
                          key={field.name}
                          label={field.label}
                          error={form.formState.errors[field.name]?.message}
                        >
                          <Textarea {...form.register(field.name)} disabled={!canEdit} />
                        </FormField>
                      );
                    }

                    return (
                      <FormField
                        key={field.name}
                        label={field.label}
                        error={form.formState.errors[field.name]?.message}
                      >
                        <Input {...form.register(field.name)} disabled={!canEdit} />
                      </FormField>
                    );
                  })}
                </div>
              </section>
            ))}
          </form>
        </Card>
      </div>
    </div>
  );
}
