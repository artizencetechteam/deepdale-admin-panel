"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadSourceToApi = leadSourceToApi;
exports.leadSourceFromApi = leadSourceFromApi;
exports.serializeAdminSiteSettings = serializeAdminSiteSettings;
exports.serializeRestrictedAdminSiteSettings = serializeRestrictedAdminSiteSettings;
exports.serializeSiteSettingsForRole = serializeSiteSettingsForRole;
exports.serializePublicSiteSettings = serializePublicSiteSettings;
function leadSourceToApi(source) {
    return source === "support_form" ? "support-form" : "book-a-call";
}
function leadSourceFromApi(source) {
    return source === "support-form" ? "support_form" : "book_a_call";
}
function serializeAdminSiteSettings(record) {
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
function serializeRestrictedAdminSiteSettings(record) {
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
function serializeSiteSettingsForRole(record, role) {
    return role === "admin" || role === "superadmin"
        ? serializeAdminSiteSettings(record)
        : serializeRestrictedAdminSiteSettings(record);
}
function serializePublicSiteSettings(record) {
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
