import type { LeadSource, Role, SiteSettings } from "@prisma/client";

export function leadSourceToApi(
  source: LeadSource
): "support-form" | "book-a-call" {
  return source === "support_form" ? "support-form" : "book-a-call";
}

export function leadSourceFromApi(
  source: "support-form" | "book-a-call"
): LeadSource {
  return source === "support-form" ? "support_form" : "book_a_call";
}

export function serializeAdminSiteSettings(record: SiteSettings) {
  return {
    siteName: record.siteName,
    logoUrl: record.logoUrl,
    contactEmail: record.contactEmail,
    copyrightText: record.copyrightText,
    chatSystemPrompt: record.chatSystemPrompt,
    chatModel: record.chatModel,
    socialLinks: {
      facebook: record.socialFacebook,
      linkedin: record.socialLinkedin,
      youtube: record.socialYoutube,
      twitter: record.socialTwitter
    },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export function serializeRestrictedAdminSiteSettings(record: SiteSettings) {
  return {
    siteName: record.siteName,
    logoUrl: record.logoUrl,
    contactEmail: record.contactEmail,
    copyrightText: record.copyrightText,
    socialLinks: {
      facebook: record.socialFacebook,
      linkedin: record.socialLinkedin,
      youtube: record.socialYoutube,
      twitter: record.socialTwitter
    },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export function serializeSiteSettingsForRole(
  record: SiteSettings,
  role?: Role
) {
  return role === "admin" || role === "superadmin"
    ? serializeAdminSiteSettings(record)
    : serializeRestrictedAdminSiteSettings(record);
}

export function serializePublicSiteSettings(record: SiteSettings) {
  return {
    siteName: record.siteName,
    logoUrl: record.logoUrl,
    contactEmail: record.contactEmail,
    copyrightText: record.copyrightText,
    socialLinks: {
      facebook: record.socialFacebook,
      linkedin: record.socialLinkedin,
      youtube: record.socialYoutube,
      twitter: record.socialTwitter
    }
  };
}
