import {
  LayoutDashboard,
  MessageSquareText,
  Image,
  Settings,
  PanelsTopLeft,
  FormInput,
  MenuSquare,
  LibraryBig,
  Users,
  Inbox,
  Quote,
  PlugZap,
  Workflow,
  LayoutGrid,
  ChartColumn,
  ListOrdered,
  Sparkles,
  PhoneCall,
  History
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { Card } from "../../components/ui/card";
import {
  Sheet, 
  SheetCloseButton,
  SheetContent,
  SheetDescription,
  SheetTitle
} from "../../components/ui/sheet";
import { cn } from "../../lib/cn";
import { appNavItems } from "../../lib/routes";
import { useAuth } from "../../lib/auth-store";
import type { Role } from "../../lib/api-types";

const icons: Record<string, typeof LayoutDashboard> = {
  Overview: LayoutDashboard,
  Hero: Image,
  // Products: Boxes,
  // Partners: Handshake,
  // "Voice Scenarios": Mic,
  "Automation Engines": Workflow,
  Capabilities: LayoutGrid,
  "ROI Industries": ChartColumn,
  "Process Steps": ListOrdered,
  "Product Features": Sparkles,
  Callers: PhoneCall,
  FAQs: MessageSquareText,
  Testimonials: Quote,
  Integrations: PlugZap,
  Settings: Settings,
  Sections: PanelsTopLeft,
  "Lead Form": FormInput,
  Navigation: MenuSquare,
  Footer: LibraryBig,
  Media: Image,
  Leads: Inbox,
  "Activity Log": History,
  Users: Users
};

function isVisible(role: Role | undefined, item: (typeof appNavItems)[number]) {
  if (!role) {
    return false;
  }

  if (item.visibleFor) {
    return item.visibleFor.includes(role);
  }

  return true;
}

export function Sidebar({
  mobileOpen,
  onMobileOpenChange
}: {
  mobileOpen: boolean;
  onMobileOpenChange: (nextOpen: boolean) => void;
}) {
  const { user } = useAuth();
  const role = user?.role;

  return (
    <>
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left">
          <SidebarContent
            mobile
            role={role}
            onClose={() => onMobileOpenChange(false)}
          />
        </SheetContent>
      </Sheet>
      <aside className="relative hidden shrink-0 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-72 lg:self-start lg:p-4 xl:w-80 xl:p-6">
        <SidebarContent role={role} />
      </aside>
    </>
  );
}

function SidebarContent({
  mobile = false,
  role,
  onClose
}: {
  mobile?: boolean;
  role?: Role | undefined;
  onClose?: () => void;
}) {
  const visibleItems = appNavItems.filter(
    (item) =>
      isVisible(role, item) &&
      item.label !== "Products" &&
      item.label !== "Partners" &&
      item.label !== "Voice Scenarios"
  );

  return (
    <Card
      childrenClassName="flex h-full min-h-0 flex-col gap-5"
      className={cn(
        "overflow-hidden p-4 sm:p-5",
        mobile
          ? "h-full max-h-full"
          : "h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)]"
      )}
    >
      <div className="rounded-[1.6rem] bg-[linear-gradient(135deg,#163a3a,#0f766e_58%,#df8c25)] p-6 text-white shadow-[0_28px_60px_-34px_rgba(15,118,110,0.95)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">
              Deepdale
            </div>
            <div className="mt-4 text-2xl font-extrabold tracking-[-0.04em]">
              Admin Console
            </div>
          </div>
          {mobile ? <SheetCloseButton /> : null}
        </div>
        {mobile ? (
          <>
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <SheetDescription className="sr-only">
              Browse the Deepdale admin workspace sections.
            </SheetDescription>
          </>
        ) : null}
        <p className="mt-3 max-w-xs text-sm leading-6 text-white/78">
          Control content, settings, and operations from one refined workspace.
        </p>
      </div>
      <div className="px-2">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--dd-muted)]">
          Workspace
        </div>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-1 pr-1 [scrollbar-gutter:stable]">
        <div className="space-y-1.5">
          {visibleItems.map((item) => {
            const Icon = icons[item.label] ?? LayoutDashboard;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/"}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-sm font-medium transition duration-200",
                    isActive
                      ? "border-transparent bg-[linear-gradient(135deg,var(--dd-primary),var(--dd-primary-strong))] text-white shadow-[0_20px_34px_-24px_rgba(15,118,110,0.92)]"
                      : "border-transparent text-[color:var(--dd-muted)] hover:border-white/70 hover:bg-white/70 hover:text-[color:var(--dd-text)]"
                  )
                }
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-current transition group-hover:bg-white/80 group-hover:text-[color:var(--dd-primary)]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
      <div className="rounded-[1.5rem] border border-[color:var(--dd-border)] bg-white/65 p-4 backdrop-blur-md">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--dd-accent)]">
          Session
        </div>
        <div className="mt-2 text-sm font-semibold text-[color:var(--dd-text)]">
          {role ? "Authenticated workspace" : "Signed out"}
        </div>
        <div className="mt-1 text-xs uppercase tracking-[0.22em] text-[color:var(--dd-muted)]">
          {role ?? "guest"}
        </div>
      </div>
    </Card>
  );
}
