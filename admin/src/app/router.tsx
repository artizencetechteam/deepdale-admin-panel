import { lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { AppProviders } from "./providers";
import { AppShell } from "./layout/AppShell";
import { EmptyState } from "../components/ui/empty-state";
import { useAuth } from "../lib/auth-store";
import { LoginPage } from "../features/auth/LoginPage";

const DashboardPage = lazy(() =>
  import("../features/dashboard/DashboardPage").then((module) => ({
    default: module.DashboardPage
  }))
);
const HeroPage = lazy(() =>
  import("../features/hero/HeroPage").then((module) => ({
    default: module.HeroPage
  }))
);
const ProductsPage = lazy(() =>
  import("../features/products/ProductsPage").then((module) => ({
    default: module.ProductsPage
  }))
);
const PartnersPage = lazy(() =>
  import("../features/partners/PartnersPage").then((module) => ({
    default: module.PartnersPage
  }))
);
const VoiceScenariosPage = lazy(() =>
  import("../features/voice-scenarios/VoiceScenariosPage").then((module) => ({
    default: module.VoiceScenariosPage
  }))
);
const AutomationEnginesPage = lazy(() =>
  import("../features/automation-engines/AutomationEnginesPage").then((module) => ({
    default: module.AutomationEnginesPage
  }))
);
const CapabilitiesPage = lazy(() =>
  import("../features/capabilities/CapabilitiesPage").then((module) => ({
    default: module.CapabilitiesPage
  }))
);
const RoiIndustriesPage = lazy(() =>
  import("../features/roi/RoiIndustriesPage").then((module) => ({
    default: module.RoiIndustriesPage
  }))
);
const ProcessStepsPage = lazy(() =>
  import("../features/process-steps/ProcessStepsPage").then((module) => ({
    default: module.ProcessStepsPage
  }))
);
const ProductFeaturesPage = lazy(() =>
  import("../features/product-features/ProductFeaturesPage").then((module) => ({
    default: module.ProductFeaturesPage
  }))
);
const CallersPage = lazy(() =>
  import("../features/callers/CallersPage").then((module) => ({
    default: module.CallersPage
  }))
);
const FaqsPage = lazy(() =>
  import("../features/faqs/FaqsPage").then((module) => ({
    default: module.FaqsPage
  }))
);
const TestimonialsPage = lazy(() =>
  import("../features/testimonials/TestimonialsPage").then((module) => ({
    default: module.TestimonialsPage
  }))
);
const IntegrationsPage = lazy(() =>
  import("../features/integrations/IntegrationsPage").then((module) => ({
    default: module.IntegrationsPage
  }))
);
const SettingsPage = lazy(() =>
  import("../features/settings/SettingsPage").then((module) => ({
    default: module.SettingsPage
  }))
);
const SectionsPage = lazy(() =>
  import("../features/sections/SectionsPage").then((module) => ({
    default: module.SectionsPage
  }))
);
const LeadFormPage = lazy(() =>
  import("../features/lead-form/LeadFormPage").then((module) => ({
    default: module.LeadFormPage
  }))
);
const NavigationPage = lazy(() =>
  import("../features/navigation/NavigationPage").then((module) => ({
    default: module.NavigationPage
  }))
);
const FooterPage = lazy(() =>
  import("../features/footer/FooterPage").then((module) => ({
    default: module.FooterPage
  }))
);
const MediaPage = lazy(() =>
  import("../features/media/MediaPage").then((module) => ({
    default: module.MediaPage
  }))
);
const LeadsPage = lazy(() =>
  import("../features/leads/LeadsPage").then((module) => ({
    default: module.LeadsPage
  }))
);
const ActivityLogPage = lazy(() =>
  import("../features/activity-log/ActivityLogPage").then((module) => ({
    default: module.ActivityLogPage
  }))
);
const UsersPage = lazy(() =>
  import("../features/users/UsersPage").then((module) => ({
    default: module.UsersPage
  }))
);

function ProtectedRoute() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <div className="p-10 text-sm text-[color:var(--dd-muted)]">Loading admin session...</div>;
  }

  if (auth.status === "anonymous") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function GuestRoute() {
  const auth = useAuth();

  if (auth.status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function RestrictedPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-[color:var(--dd-text)]">{title}</h1>
      <EmptyState
        title="Access restricted"
        description="Your current role does not allow you to access this page."
      />
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter basename="/admin">
      <AppProviders>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/hero" element={<HeroPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/partners" element={<PartnersPage />} />
              <Route path="/voice-scenarios" element={<VoiceScenariosPage />} />
              <Route path="/automation-engines" element={<AutomationEnginesPage />} />
              <Route path="/capabilities" element={<CapabilitiesPage />} />
              <Route path="/roi" element={<RoiIndustriesPage />} />
              <Route path="/process-steps" element={<ProcessStepsPage />} />
              <Route path="/product-features" element={<ProductFeaturesPage />} />
              <Route path="/callers" element={<CallersPage />} />
              <Route path="/faqs" element={<FaqsPage />} />
              <Route path="/testimonials" element={<TestimonialsPage />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/sections" element={<SectionsPage />} />
              <Route path="/lead-form" element={<LeadFormPage />} />
              <Route path="/navigation" element={<NavigationPage />} />
              <Route path="/footer" element={<FooterPage />} />
              <Route path="/media" element={<MediaPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/activity-log" element={<ActivityLogPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route
                path="*"
                element={<RestrictedPage title="Not found" />}
              />
            </Route>
          </Route>
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}
