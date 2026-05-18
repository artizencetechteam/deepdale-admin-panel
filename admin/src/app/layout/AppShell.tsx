import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

function RouteContentFallback() {
  return (
    <div className="rounded-[1.75rem] border border-[color:var(--dd-border)] bg-white/70 px-6 py-10 text-sm text-[color:var(--dd-muted)] shadow-[var(--dd-shadow-soft)] backdrop-blur-md">
      <div className="inline-flex items-center gap-3">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[color:var(--dd-primary)]" />
        Loading page...
      </div>
    </div>
  );
}

export function AppShell() {
  const location = useLocation();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  useEffect(() => {
    setMobileNavigationOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen overflow-x-clip lg:flex lg:items-start">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-teal-500/16 blur-3xl" />
        <div className="absolute right-0 top-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cyan-500/8 blur-3xl" />
      </div>
      <Sidebar
        mobileOpen={mobileNavigationOpen}
        onMobileOpenChange={setMobileNavigationOpen}
      />
      <main className="relative min-w-0 flex-1 px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-6">
          <Topbar onOpenNavigation={() => setMobileNavigationOpen(true)} />
          <Suspense fallback={<RouteContentFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
