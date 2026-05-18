import { describe, expect, it } from "vitest";

import {
  leadSourceFromApi,
  leadSourceToApi,
  serializeAdminSiteSettings,
  serializePublicSiteSettings
} from "./mappers";

describe("mappers", () => {
  it("maps lead sources between API and persistence formats", () => {
    expect(leadSourceFromApi("support-form")).toBe("support_form");
    expect(leadSourceToApi("book_a_call")).toBe("book-a-call");
  });

  it("hides private chat settings from public site settings", () => {
    const settings = {
      id: 1,
      siteName: "Deepdale",
      logoUrl: "https://example.com/logo.png",
      contactEmail: "contact@example.com",
      copyrightText: "Copyright",
      chatSystemPrompt: "private",
      chatModel: "gpt-4o-mini",
      socialFacebook: "https://facebook.com/deepdale",
      socialLinkedin: null,
      socialYoutube: null,
      socialTwitter: null,
      createdByUserId: null,
      updatedByUserId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z")
    };

    const admin = serializeAdminSiteSettings(settings as never);
    const publicSettings = serializePublicSiteSettings(settings as never);

    expect(admin.chatSystemPrompt).toBe("private");
    expect(publicSettings).not.toHaveProperty("chatSystemPrompt");
    expect(publicSettings.socialLinks.facebook).toBe(
      "https://facebook.com/deepdale"
    );
  });
});
