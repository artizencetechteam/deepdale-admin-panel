import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FormField, Input, Textarea } from "../../components/ui/field";
import { MediaField } from "../../components/ui/media-field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { apiRequest } from "../../lib/api-client";
import type {
  SiteSettingsAdminView,
  SiteSettingsRestrictedView
} from "../../lib/api-types";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";
import { optionalUrlField, requiredUrlField } from "../../lib/form-schemas";
import { queryKeys } from "../../lib/query-keys";
import { canWriteAdminOnly } from "../../lib/role-utils";
import { useToast } from "../../components/ui/toast";

const settingsSchema = z.object({
  siteName: z.string().trim().min(1),
  logoUrl: requiredUrlField,
  contactEmail: z.string().email(),
  copyrightText: z.string().trim().min(1),
  chatSystemPrompt: z.string().trim().min(1),
  chatModel: z.string().trim().min(1),
  socialLinks: z.object({
    facebook: optionalUrlField,
    linkedin: optionalUrlField,
    youtube: optionalUrlField,
    twitter: optionalUrlField
  })
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function SettingsPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteAdminOnly(user?.role);
  const [requestError, setRequestError] = useState<string>();
  const settingsQuery = useQuery({
    queryKey: queryKeys.siteSettings,
    queryFn: () =>
      apiRequest<SiteSettingsAdminView | SiteSettingsRestrictedView>(
        "/api/admin/site-settings"
      )
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      siteName: "",
      logoUrl: "",
      contactEmail: "",
      copyrightText: "",
      chatSystemPrompt: "",
      chatModel: "",
      socialLinks: {
        facebook: "",
        linkedin: "",
        youtube: "",
        twitter: ""
      }
    }
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    form.reset({
      siteName: settingsQuery.data.siteName,
      logoUrl: settingsQuery.data.logoUrl,
      contactEmail: settingsQuery.data.contactEmail,
      copyrightText: settingsQuery.data.copyrightText,
      chatSystemPrompt:
        "chatSystemPrompt" in settingsQuery.data
          ? settingsQuery.data.chatSystemPrompt
          : "",
      chatModel:
        "chatModel" in settingsQuery.data ? settingsQuery.data.chatModel : "",
      socialLinks: {
        facebook: settingsQuery.data.socialLinks.facebook ?? "",
        linkedin: settingsQuery.data.socialLinks.linkedin ?? "",
        youtube: settingsQuery.data.socialLinks.youtube ?? "",
        twitter: settingsQuery.data.socialLinks.twitter ?? ""
      }
    });
  }, [form, settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (values: SettingsFormValues) =>
      apiRequest<SiteSettingsAdminView>("/api/admin/site-settings", {
        method: "PUT",
        csrfToken,
        body: {
          ...values,
          chatSystemPrompt: values.chatSystemPrompt ?? "",
          chatModel: values.chatModel ?? ""
        }
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.siteSettings });
      pushToast("Site settings saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site Settings"
        description="Manage shared branding, contact metadata, and privileged chat configuration."
        actions={
          canEdit ? (
            <Button
              onClick={form.handleSubmit((values) => saveMutation.mutate(values))}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save settings"}
            </Button>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      <Card className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="Site name" error={form.formState.errors.siteName?.message}>
            <Input {...form.register("siteName")} disabled={!canEdit} />
          </FormField>
          <FormField
            label="Contact email"
            error={form.formState.errors.contactEmail?.message}
          >
            <Input {...form.register("contactEmail")} disabled={!canEdit} />
          </FormField>
        </div>
        <FormField
          label="Copyright text"
          error={form.formState.errors.copyrightText?.message}
        >
          <Input {...form.register("copyrightText")} disabled={!canEdit} />
        </FormField>
        <MediaField
          label="Logo"
          value={form.watch("logoUrl")}
          onChange={(nextValue) => form.setValue("logoUrl", nextValue)}
          kind="image"
          disabled={!canEdit}
        />
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="Facebook URL">
            <Input {...form.register("socialLinks.facebook")} disabled={!canEdit} />
          </FormField>
          <FormField label="LinkedIn URL">
            <Input {...form.register("socialLinks.linkedin")} disabled={!canEdit} />
          </FormField>
          <FormField label="YouTube URL">
            <Input {...form.register("socialLinks.youtube")} disabled={!canEdit} />
          </FormField>
          <FormField label="Twitter URL">
            <Input {...form.register("socialLinks.twitter")} disabled={!canEdit} />
          </FormField>
        </div>
        {canEdit ? (
          <div className="space-y-5 rounded-3xl border border-[color:var(--dd-border)] bg-[color:var(--dd-panel-strong)] p-5">
            <div>
              <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
                Chat configuration
              </div>
              <div className="text-sm text-[color:var(--dd-muted)]">
                These fields are only returned to admin and superadmin roles.
              </div>
            </div>
            <FormField label="Chat model">
              <Input {...form.register("chatModel")} disabled={!canEdit} />
            </FormField>
            <FormField label="System prompt">
              <Textarea {...form.register("chatSystemPrompt")} disabled={!canEdit} />
            </FormField>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[color:var(--dd-border)] px-4 py-3 text-sm text-[color:var(--dd-muted)]">
            Your role can view shared branding settings here, but privileged chat fields are intentionally hidden.
          </div>
        )}
      </Card>
    </div>
  );
}
