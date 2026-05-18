import { describe, expect, it } from "vitest";

import { appNavItems, routeTitles } from "./routes";

describe("admin route registry", () => {
  it("includes the implemented admin feature routes", () => {
    expect(appNavItems.map((item) => item.href)).toEqual([
      "/",
      "/hero",
      "/products",
      "/partners",
      "/voice-scenarios",
      "/automation-engines",
      "/capabilities",
      "/roi",
      "/process-steps",
      "/product-features",
      "/callers",
      "/faqs",
      "/testimonials",
      "/integrations",
      "/settings",
      "/sections",
      "/lead-form",
      "/navigation",
      "/footer",
      "/media",
      "/leads",
      "/activity-log",
      "/users"
    ]);
  });

  it("keeps sensitive pages restricted to the expected roles", () => {
    const leadsItem = appNavItems.find((item) => item.href === "/leads");
    const activityLogItem = appNavItems.find(
      (item) => item.href === "/activity-log"
    );
    const usersItem = appNavItems.find((item) => item.href === "/users");

    expect(leadsItem?.visibleFor).toEqual(["viewer", "admin", "superadmin"]);
    expect(activityLogItem?.visibleFor).toEqual(["admin", "superadmin"]);
    expect(usersItem?.visibleFor).toEqual(["superadmin"]);
  });

  it("provides titles for the operational pages", () => {
    expect(routeTitles["/products"]).toBe("Products");
    expect(routeTitles["/partners"]).toBe("Partners");
    expect(routeTitles["/voice-scenarios"]).toBe("Voice Scenarios");
    expect(routeTitles["/automation-engines"]).toBe("Automation Engines");
    expect(routeTitles["/capabilities"]).toBe("Capabilities");
    expect(routeTitles["/roi"]).toBe("ROI Industries");
    expect(routeTitles["/process-steps"]).toBe("Process Steps");
    expect(routeTitles["/product-features"]).toBe("Product Features");
    expect(routeTitles["/callers"]).toBe("Callers");
    expect(routeTitles["/sections"]).toBe("Sections");
    expect(routeTitles["/lead-form"]).toBe("Lead Form");
    expect(routeTitles["/navigation"]).toBe("Navigation");
    expect(routeTitles["/footer"]).toBe("Footer");
    expect(routeTitles["/integrations"]).toBe("Integrations");
    expect(routeTitles["/media"]).toBe("Media Library");
    expect(routeTitles["/leads"]).toBe("Leads Inbox");
    expect(routeTitles["/activity-log"]).toBe("Activity Log");
    expect(routeTitles["/users"]).toBe("User Management");
  });
});
