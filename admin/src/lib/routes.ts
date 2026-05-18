import type { Role } from "./api-types";

export type AppNavItem = {
  label: string;
  href: string;
  minRole?: Role;
  visibleFor?: Role[];
};

export const appNavItems: AppNavItem[] = [
  { label: "Overview", href: "/" },
  { label: "Hero", href: "/hero" },
  { label: "Products", href: "/products" },
  { label: "Partners", href: "/partners" },
  { label: "Voice Scenarios", href: "/voice-scenarios" },
  { label: "Automation Engines", href: "/automation-engines" },
  { label: "Capabilities", href: "/capabilities" },
  { label: "ROI Industries", href: "/roi" },
  { label: "Process Steps", href: "/process-steps" },
  { label: "Product Features", href: "/product-features" },
  { label: "Callers", href: "/callers" },
  { label: "FAQs", href: "/faqs" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "Integrations", href: "/integrations" },
  { label: "Settings", href: "/settings" },
  { label: "Sections", href: "/sections" },
  { label: "Lead Form", href: "/lead-form" },
  { label: "Navigation", href: "/navigation" },
  { label: "Footer", href: "/footer" },
  { label: "Media", href: "/media" },
  { label: "Leads", href: "/leads", visibleFor: ["viewer", "admin", "superadmin"] },
  { label: "Activity Log", href: "/activity-log", visibleFor: ["admin", "superadmin"] },
  { label: "Users", href: "/users", visibleFor: ["superadmin"] }
];

export const routeTitles: Record<string, string> = {
  "/": "Overview",
  "/hero": "Hero Manager",
  "/products": "Products",
  "/partners": "Partners",
  "/voice-scenarios": "Voice Scenarios",
  "/automation-engines": "Automation Engines",
  "/capabilities": "Capabilities",
  "/roi": "ROI Industries",
  "/process-steps": "Process Steps",
  "/product-features": "Product Features",
  "/callers": "Callers",
  "/faqs": "FAQ Manager",
  "/testimonials": "Testimonials",
  "/integrations": "Integrations",
  "/settings": "Site Settings",
  "/sections": "Sections",
  "/lead-form": "Lead Form",
  "/navigation": "Navigation",
  "/footer": "Footer",
  "/media": "Media Library",
  "/leads": "Leads Inbox",
  "/activity-log": "Activity Log",
  "/users": "User Management",
  "/login": "Admin Login"
};
