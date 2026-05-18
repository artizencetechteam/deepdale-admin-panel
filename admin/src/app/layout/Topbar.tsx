import { Copy, ExternalLink, Eye, LogOut, Menu } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { Button } from "../../components/ui/button";
import { DrawerForm } from "../../components/ui/dialogs";
import { useToast } from "../../components/ui/toast";
import { apiRequest } from "../../lib/api-client";
import type { PreviewSessionResponse } from "../../lib/api-types";
import { routeTitles } from "../../lib/routes";
import { useAuth } from "../../lib/auth-store";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function Topbar({
  onOpenNavigation
}: {
  onOpenNavigation: () => void;
}) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { pushToast } = useToast();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string>();
  const [previewSession, setPreviewSession] =
    useState<PreviewSessionResponse | null>(null);

  const currentTitle = useMemo(() => {
    return (
      routeTitles[location.pathname] ??
      Object.entries(routeTitles).find(([path]) =>
        path !== "/" ? location.pathname.startsWith(path) : false
      )?.[1] ??
      "Admin"
    );
  }, [location.pathname]);
  const userInitial = user?.name?.trim().charAt(0).toUpperCase() ?? "D";

  async function loadPreviewSession() {
    setIsPreviewLoading(true);
    setPreviewError(undefined);

    try {
      const session = await apiRequest<PreviewSessionResponse>(
        "/api/admin/preview/session"
      );

      setPreviewSession(session);
    } catch (error) {
      setPreviewError(
        error instanceof Error
          ? error.message
          : "Unable to create a preview session"
      );
    } finally {
      setIsPreviewLoading(false);
    }
  }

  function openPreviewDrawer() {
    setIsPreviewOpen(true);
    void loadPreviewSession();
  }

  async function copyPreviewUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      pushToast("Preview URL copied");
    } catch {
      pushToast(
        "Clipboard access failed",
        "Copy the preview URL manually from the panel."
      );
    }
  }

  return (
    <>
      <header className="relative overflow-hidden rounded-[1.6rem] border border-[color:var(--dd-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.74),rgba(255,250,242,0.9))] px-4 py-4 shadow-[var(--dd-shadow-soft)] backdrop-blur-xl sm:rounded-[2rem] sm:px-6 sm:py-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,118,110,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(200,117,17,0.1),transparent_28%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-11 rounded-[1.1rem] px-0 lg:hidden"
              aria-label="Open navigation menu"
              onClick={onOpenNavigation}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="space-y-2">
              <div className="inline-flex items-center rounded-full border border-white/70 bg-white/72 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--dd-muted)]">
                Deepdale admin
              </div>
              <div className="text-[1.7rem] font-extrabold tracking-[-0.04em] text-[color:var(--dd-text)] sm:text-2xl md:text-[2rem]">
                {currentTitle}
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {/* <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={openPreviewDrawer}
              disabled={isPreviewLoading}
            >
              <Eye className="h-4 w-4" />
              {isPreviewLoading ? "Preparing preview" : "Preview"}
            </Button> */}
            <div className="inline-flex w-full items-center justify-between gap-3 rounded-[1.35rem] border border-white/70 bg-white/72 px-3 py-2 backdrop-blur-md sm:w-auto sm:justify-start">
              <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,var(--dd-primary),#2aa199)] text-sm font-extrabold text-white shadow-[0_18px_35px_-24px_rgba(15,118,110,0.9)]">
                {userInitial}
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-[color:var(--dd-text)]">
                  {user?.name}
                </div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--dd-muted)]">
                  {user?.role}
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => void logout()}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      {/* <DrawerForm
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        title="Live preview"
        description="Generate short-lived preview URLs for the landing-page payloads. These URLs include draft content and hidden sections without making them public."
      >
        <div className="space-y-5">
          <div className="rounded-[1.5rem] border border-white/70 bg-white/72 p-4 shadow-[0_16px_30px_-28px_rgba(31,45,52,0.7)]">
            <div className="text-sm font-semibold text-[color:var(--dd-text)]">
              Preview mode rules
            </div>
            <ul className="mt-3 space-y-2 text-sm text-[color:var(--dd-muted)]">
              <li>Draft collection items are included.</li>
              <li>Hidden sections are exposed to the response.</li>
              <li>Preview responses are served with `Cache-Control: no-store`.</li>
              <li>Each preview session expires automatically after 30 minutes.</li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-[color:var(--dd-muted)]">
              {previewSession ? (
                <>
                  Expires {formatDate(previewSession.expiresAt)}.
                </>
              ) : (
                <>Create a preview session to inspect draft payloads.</>
              )}
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void loadPreviewSession()}
              disabled={isPreviewLoading}
            >
              {isPreviewLoading ? "Refreshing..." : "Refresh preview links"}
            </Button>
          </div>

          {previewError ? (
            <div className="rounded-[1.35rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {previewError}
            </div>
          ) : null}

          {isPreviewLoading && !previewSession ? (
            <div className="rounded-[1.35rem] border border-dashed border-[color:var(--dd-border)] bg-white/60 px-4 py-6 text-sm text-[color:var(--dd-muted)]">
              Generating preview session...
            </div>
          ) : null}

          {previewSession ? (
            <div className="space-y-3">
              {previewSession.endpoints.map((endpoint) => (
                <div
                  key={endpoint.key}
                  className="rounded-[1.5rem] border border-white/70 bg-white/72 p-4 shadow-[0_16px_30px_-28px_rgba(31,45,52,0.7)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-semibold text-[color:var(--dd-text)]">
                        {endpoint.label}
                      </div>
                      <div className="font-mono text-xs break-all text-[color:var(--dd-muted)]">
                        {endpoint.absoluteUrl}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void copyPreviewUrl(endpoint.absoluteUrl)}
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                      <a
                        href={endpoint.absoluteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 text-sm font-semibold text-[color:var(--dd-text)] shadow-[0_10px_24px_-20px_rgba(31,45,52,0.55)] backdrop-blur-md transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-white"
                      >
                        Open
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </DrawerForm> */}
    </>
  );
}
