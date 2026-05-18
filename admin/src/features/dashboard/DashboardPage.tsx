import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Blocks,
  ExternalLink,
  EyeOff,
  Inbox,
  PanelTop,
  TriangleAlert,
  WalletCards
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { cn } from "../../lib/cn";
import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Switch } from "../../components/ui/field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { Table, TableWrapper } from "../../components/ui/table";
import { apiRequest } from "../../lib/api-client";
import { useToast } from "../../components/ui/toast";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";
import type {
  DashboardActivityEntry,
  DashboardOverviewResponse,
  DashboardSectionManager,
  FrontendIntegrationEndpoint
} from "../../lib/api-types";
import { queryKeys } from "../../lib/query-keys";
import { canWriteContent, hasRole } from "../../lib/role-utils";

const visibilityStyles = {
  visible: "bg-emerald-100 text-emerald-700",
  hidden: "bg-stone-200 text-stone-700",
  system: "bg-sky-100 text-sky-700"
} as const;

const visibilityLabels = {
  visible: "Visible",
  hidden: "Hidden",
  system: "System"
} as const;

const readinessStyles = {
  live: "bg-emerald-100 text-emerald-700",
  hidden: "bg-amber-100 text-amber-800",
  empty: "bg-rose-100 text-rose-700",
  configured: "bg-sky-100 text-sky-700"
} as const;

const readinessLabels = {
  live: "Live",
  hidden: "Hidden",
  empty: "Needs content",
  configured: "Configured"
} as const;

const summaryCardThemes = [
  "bg-[linear-gradient(135deg,rgba(15,118,110,0.12),rgba(255,255,255,0.82))]",
  "bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(255,255,255,0.82))]",
  "bg-[linear-gradient(135deg,rgba(249,115,22,0.12),rgba(255,255,255,0.82))]",
  "bg-[linear-gradient(135deg,rgba(120,113,108,0.16),rgba(255,255,255,0.82))]",
  "bg-[linear-gradient(135deg,rgba(217,119,6,0.12),rgba(255,255,255,0.82))]",
  "bg-[linear-gradient(135deg,rgba(225,29,72,0.12),rgba(255,255,255,0.82))]",
  "bg-[linear-gradient(135deg,rgba(234,179,8,0.14),rgba(255,255,255,0.82))]"
] as const;

function formatItemCount(itemCount: number | null) {
  return itemCount === null ? "Shared" : itemCount.toString();
}

function sortByOrder(sections: DashboardSectionManager[]) {
  return [...sections].sort(
    (left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0)
  );
}

function getSectionReadiness(section: DashboardSectionManager) {
  if ((section.itemCount ?? 0) === 0) {
    return "empty";
  }

  if (section.visibility === "hidden") {
    return "hidden";
  }

  return section.visibility === "system" ? "configured" : "live";
}

function buildSummaryCards(
  data: DashboardOverviewResponse | undefined,
  needsAttentionCount: number
) {
  return [
    {
      key: "totalLeads",
      label: "Total leads",
      icon: Inbox,
      value: data?.totalLeads ?? "-"
    },
    {
      key: "newLeads24h",
      label: "New in 24h",
      icon: WalletCards,
      value: data?.newLeads24h ?? "-"
    },
    {
      key: "totalSectionsActive",
      label: "Sections active",
      icon: PanelTop,
      value: data?.totalSectionsActive ?? "-"
    },
    {
      key: "hiddenSections",
      label: "Sections hidden",
      icon: EyeOff,
      value: data?.hiddenSections ?? "-"
    },
    {
      key: "contentItems",
      label: "Content items",
      icon: Blocks,
      value: data?.contentItems ?? "-"
    },
    {
      key: "draftItems",
      label: "Draft items",
      icon: TriangleAlert,
      value: data?.draftItems ?? "-"
    },
    {
      key: "needsAttention",
      label: "Needs attention",
      icon: TriangleAlert,
      value: data ? needsAttentionCount : "-"
    }
  ] as const;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function ActivityRow({ entry }: { entry: DashboardActivityEntry }) {
  return (
    <div className="rounded-[1.35rem] border border-white/70 bg-white/72 p-4 shadow-[0_12px_26px_-24px_rgba(31,45,52,0.65)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-semibold text-[color:var(--dd-text)]">
          {entry.summary}
        </div>
        <span className="rounded-full bg-[color:var(--dd-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
          {entry.action.replaceAll("_", " ")}
        </span>
      </div>
      <div className="mt-2 text-sm text-[color:var(--dd-muted)]">
        {entry.actorName ?? entry.actorEmail ?? "System"} | {entry.resourceType} |{" "}
        {formatDate(entry.createdAt)}
      </div>
    </div>
  );
}

function FrontendEndpointRow({
  endpoint
}: {
  endpoint: FrontendIntegrationEndpoint;
}) {
  return (
    <div className="rounded-[1.45rem] border border-white/70 bg-white/72 p-4 shadow-[0_16px_30px_-28px_rgba(31,45,52,0.7)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[color:var(--dd-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
              {endpoint.method}
            </span>
            <span className="rounded-full bg-[color:var(--dd-panel-strong)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--dd-text)]">
              {endpoint.auth === "public" ? "Public" : "Admin"}
            </span>
            <span className="font-semibold text-[color:var(--dd-text)]">
              {endpoint.label}
            </span>
          </div>
          <div className="font-mono text-xs text-[color:var(--dd-muted)]">
            {endpoint.path}
          </div>
          <div className="text-sm text-[color:var(--dd-muted)]">
            {endpoint.description}
          </div>
        </div>
        {endpoint.method === "GET" ? (
          <a
            href={endpoint.path}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/85 px-3 py-2 text-sm font-semibold text-[color:var(--dd-text)] transition hover:-translate-y-0.5 hover:bg-white"
          >
            Open
            <ExternalLink className="h-4 w-4 text-[color:var(--dd-accent)]" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteContent(user?.role) && Boolean(csrfToken);
  const canReadActivity = hasRole(user?.role, "admin", "superadmin");
  const [requestError, setRequestError] = useState<string>();
  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () =>
      apiRequest<DashboardOverviewResponse>("/api/admin/dashboard/overview")
  });
  const data = dashboardQuery.data;
  const landingSections = sortByOrder(
    data?.sectionManagers.filter((section) => section.area === "landing") ?? []
  );
  const globalManagers =
    data?.sectionManagers.filter((section) => section.area === "global") ?? [];
  const emptyManagers =
    data?.sectionManagers.filter(
      (section) =>
        section.visibility !== "system" &&
        section.itemCount !== null &&
        section.itemCount === 0
    ) ?? [];
  const hiddenManagers =
    data?.sectionManagers.filter(
      (section) => section.visibility === "hidden"
    ) ?? [];
  const needsAttentionCount = new Set(
    [...emptyManagers, ...hiddenManagers].map((section) => section.key)
  ).size;
  const summaryCards = buildSummaryCards(data, needsAttentionCount);

  const visibilityMutation = useMutation({
    mutationFn: ({ key, isVisible }: { key: string; isVisible: boolean }) =>
      apiRequest(`/api/admin/section-states/${key}`, {
        method: "PATCH",
        csrfToken: csrfToken ?? null,
        body: { isVisible }
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      pushToast("Section visibility updated");
    },
    onError: (error) => {
      setRequestError(
        getErrorMessage(error, "Unable to update section visibility")
      );
    }
  });

  const reorderMutation = useMutation({
    mutationFn: (sections: DashboardSectionManager[]) =>
      apiRequest<{ success: boolean }>("/api/admin/section-states/reorder", {
        method: "PATCH",
        csrfToken: csrfToken ?? null,
        body: sections.map((section, index) => ({
          key: section.key,
          sortOrder: index
        }))
      }),
    onSuccess: async () => {
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      pushToast("Landing page order saved");
    },
    onError: (error) => {
      setRequestError(
        getErrorMessage(error, "Unable to reorder landing sections")
      );
    }
  });

  function moveSection(key: string, direction: -1 | 1) {
    const currentIndex = landingSections.findIndex(
      (section) => section.key === key
    );
    const nextIndex = currentIndex + direction;

    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= landingSections.length
    ) {
      return;
    }

    const nextSections = [...landingSections];
    const currentSection = nextSections[currentIndex];
    const targetSection = nextSections[nextIndex];

    nextSections[currentIndex] = targetSection!;
    nextSections[nextIndex] = currentSection!;
    reorderMutation.mutate(nextSections);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Overview"
        description="Track CMS readiness, manage every Deepdale landing-page section, and hand the public API contract directly to the frontend team."
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      <Card className="overflow-hidden border-transparent bg-[linear-gradient(135deg,#173734,#0f766e_52%,#d68a25)] p-0 text-white shadow-[0_42px_85px_-48px_rgba(15,118,110,0.98)]">
          <div className="grid gap-6 px-4 py-5 sm:px-6 sm:py-7 lg:grid-cols-[1.2fr,0.8fr] lg:px-8">
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-white/72">
              Live workspace
            </div>
            <div className="max-w-2xl space-y-3">
              <div className="text-[2rem] font-extrabold tracking-[-0.05em] sm:text-3xl">
                Deepdale's landing-page CMS is centralized here.
              </div>
              <p className="max-w-xl text-sm leading-7 text-white/80">
                Manage section order, visibility, content readiness, and
                frontend handoff from one control room.
              </p>
            </div>
          </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.5rem] border border-white/14 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/62">
                Landing sections
              </div>
              <div className="mt-2 text-2xl font-extrabold">
                {landingSections.length}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/14 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/62">
                Global areas
              </div>
              <div className="mt-2 text-2xl font-extrabold">
                {globalManagers.length}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/14 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/62">
                Frontend endpoints
              </div>
              <div className="mt-2 text-2xl font-extrabold">
                {data?.frontendEndpoints.length ?? 0}
              </div>
            </div>
          </div>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <Card
              key={card.key}
              className={`space-y-3 ${summaryCardThemes[index] ?? ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[color:var(--dd-muted)]">
                  {card.label}
                </span>
                <div className="rounded-[1.2rem] border border-white/70 bg-white/80 p-3 text-teal-800 shadow-[0_16px_30px_-24px_rgba(31,45,52,0.48)]">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-4xl font-extrabold tracking-[-0.05em] text-[color:var(--dd-text)]">
                {dashboardQuery.isLoading ? "..." : card.value}
              </div>
            </Card>
          );
        })}
      </div>

      {(data?.leadTrends.length ?? 0) > 0 ? (
        <Card className="space-y-6">
          <div className="space-y-1">
            <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
              Lead capture trends
            </div>
            <div className="text-sm text-[color:var(--dd-muted)]">
                Visualization of daily submissions for the past 14 days.
            </div>
          </div>
          <div className="flex h-48 items-end gap-1.5 sm:gap-3">
             {data?.leadTrends.map((trend) => {
                const max = Math.max(...data.leadTrends.map(t => t.count), 1);
                const height = Math.max((trend.count / max) * 100, 4);
                const isToday = trend.date === new Date().toISOString().split("T")[0];

                return (
                    <div key={trend.date} className="group relative flex-1 flex flex-col items-center gap-2">
                        <div 
                            className={cn(
                                "w-full rounded-t-lg transition-all duration-500",
                                isToday ? "bg-teal-600 shadow-[0_0_20px_rgba(13,148,136,0.3)]" : "bg-teal-100 hover:bg-teal-200"
                            )} 
                            style={{ height: `${height}%` }}
                        />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap z-10">
                            {trend.count} leads
                        </div>
                        <div className="text-[10px] font-medium text-[color:var(--dd-muted)] rotate-45 sm:rotate-0 mt-2">
                            {trend.date.split("-")[2]}
                        </div>
                    </div>
                )
             })}
          </div>
        </Card>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Card className="space-y-4">
          <div className="space-y-1">
            <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
              Recent leads
            </div>
            <div className="text-sm text-[color:var(--dd-muted)]">
              Latest submissions captured through the public site.
            </div>
          </div>
          <TableWrapper>
            <Table>
              <thead className="bg-[color:var(--dd-panel-strong)] text-xs uppercase tracking-[0.18em] text-[color:var(--dd-muted)]">
                <tr>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-t border-[color:var(--dd-border)]"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-[color:var(--dd-text)]">
                        {lead.fullName}
                      </div>
                      <div className="text-xs text-[color:var(--dd-muted)]">
                        {lead.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--dd-muted)]">
                      {lead.companyName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[color:var(--dd-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        </Card>
        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="space-y-1">
              <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
                Quick actions
              </div>
              <div className="text-sm text-[color:var(--dd-muted)]">
                Jump directly into the highest-priority content areas.
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {data?.quickActions.map((action) => (
                <Link
                  key={action.href}
                  to={action.href.replace("/admin", "") || "/"}
                  className="flex items-center justify-between rounded-[1.35rem] border border-white/70 bg-white/72 px-4 py-4 text-sm font-semibold text-[color:var(--dd-text)] shadow-[0_12px_26px_-24px_rgba(31,45,52,0.65)] transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <span>{action.label}</span>
                  <ArrowRight className="h-4 w-4 text-[color:var(--dd-accent)]" />
                </Link>
              ))}
            </div>
          </Card>
          {canReadActivity ? (
            <Card className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
                    Recent activity
                  </div>
                  <div className="text-sm text-[color:var(--dd-muted)]">
                    Latest admin changes across content, users, media, leads,
                    and sessions.
                  </div>
                </div>
                <Link
                  to="/activity-log"
                  className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--dd-border)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--dd-text)] transition hover:bg-[color:var(--dd-panel)]"
                >
                  Full log
                  <ArrowRight className="h-4 w-4 text-[color:var(--dd-accent)]" />
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                {data?.recentActivity.map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} />
                ))}
                {data?.recentActivity.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[color:var(--dd-border)] bg-white/60 px-4 py-6 text-sm text-[color:var(--dd-muted)]">
                    No admin activity has been logged yet.
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
      {/* <div className="grid gap-6 xl:grid-cols-[0.8fr,1.2fr]">
        <Card className="space-y-4">
          <div className="space-y-1">
            <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
              Needs attention
            </div>
            <div className="text-sm text-[color:var(--dd-muted)]">
              Hidden sections and empty managers that still need setup before
              the landing page is fully populated.
            </div>
          </div>
          {needsAttentionCount === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--dd-border)] bg-white/60 px-4 py-6 text-sm text-[color:var(--dd-muted)]">
              All landing-page managers are populated and currently visible.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {emptyManagers.map((section) => (
                <div
                  key={`empty-${section.key}`}
                  className="flex flex-col gap-4 rounded-[1.4rem] border border-white/70 bg-white/72 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-[color:var(--dd-text)]">
                      {section.label}
                    </div>
                    <div className="text-sm text-[color:var(--dd-muted)]">
                      No records have been created for this manager yet.
                    </div>
                  </div>
                  <Link
                    to={section.href.replace("/admin", "") || "/"}
                    className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--dd-border)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--dd-text)] transition hover:bg-[color:var(--dd-panel)]"
                  >
                    Setup
                    <ArrowRight className="h-4 w-4 text-[color:var(--dd-accent)]" />
                  </Link>
                </div>
              ))}
              {hiddenManagers.map((section) => (
                <div
                  key={`hidden-${section.key}`}
                  className="flex flex-col gap-4 rounded-[1.4rem] border border-white/70 bg-white/72 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-[color:var(--dd-text)]">
                      {section.label}
                    </div>
                    <div className="text-sm text-[color:var(--dd-muted)]">
                      Hidden from the public site. Re-enable it here or in the
                      dedicated manager.
                    </div>
                  </div>
                  <Link
                    to={section.href.replace("/admin", "") || "/"}
                    className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--dd-border)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--dd-text)] transition hover:bg-[color:var(--dd-panel)]"
                  >
                    Manage
                    <ArrowRight className="h-4 w-4 text-[color:var(--dd-accent)]" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
                Frontend integration
              </div>
              <div className="text-sm text-[color:var(--dd-muted)]">
                Public payloads your frontend should consume for the Deepdale
                landing page plus the machine-readable contract.
              </div>
            </div>
            <a
              href="/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--dd-border)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--dd-text)] transition hover:bg-[color:var(--dd-panel)]"
            >
              OpenAPI
              <ExternalLink className="h-4 w-4 text-[color:var(--dd-accent)]" />
            </a>
          </div>
          <div className="flex flex-col gap-3">
            {data?.frontendEndpoints.map((endpoint) => (
              <FrontendEndpointRow key={endpoint.key} endpoint={endpoint} />
            ))}
          </div>
        </Card>
      </div> */}
      {/* <div className="grid gap-6 xl:grid-cols-[1.3fr,0.7fr]">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
                Landing page CMS map
              </div>
              <div className="text-sm text-[color:var(--dd-muted)]">
                Reorder the public landing-page sections, toggle their
                visibility, and jump into the dedicated manager for each content
                block.
              </div>
            </div>
            <Link
              to="/sections"
              className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--dd-border)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--dd-text)] transition hover:bg-[color:var(--dd-panel)]"
            >
              Shared copy
              <ArrowRight className="h-4 w-4 text-[color:var(--dd-accent)]" />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {landingSections.map((section, index) => {
              const readiness = getSectionReadiness(section);

              return (
                <div
                  key={section.key}
                  className="rounded-[1.5rem] border border-white/70 bg-white/72 p-4 shadow-[0_16px_30px_-28px_rgba(31,45,52,0.7)]"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-[color:var(--dd-panel-strong)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--dd-text)]">
                          #{(section.sortOrder ?? index) + 1}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${readinessStyles[readiness]}`}
                        >
                          {readinessLabels[readiness]}
                        </span>
                        <div className="font-semibold text-[color:var(--dd-text)]">
                          {section.label}
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                            visibilityStyles[section.visibility]
                          }`}
                        >
                          {visibilityLabels[section.visibility]}
                        </span>
                      </div>
                      <div className="text-sm text-[color:var(--dd-muted)]">
                        {section.description}
                      </div>
                    </div>
                    <div className="text-sm text-[color:var(--dd-muted)]">
                      Records: {formatItemCount(section.itemCount)}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 border-t border-[color:var(--dd-border)] pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-[color:var(--dd-muted)]">
                          Public visibility
                        </span>
                        <Switch
                          aria-label={`Toggle ${section.label} visibility`}
                          title={`Toggle ${section.label} visibility`}
                          checked={section.visibility === "visible"}
                          disabled={!canEdit || visibilityMutation.isPending}
                          onCheckedChange={(nextValue) => {
                            visibilityMutation.mutate({
                              key: section.key,
                              isVisible: nextValue
                            });
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="px-3"
                          aria-label={`Move ${section.label} up`}
                          title={`Move ${section.label} up`}
                          disabled={
                            !canEdit || reorderMutation.isPending || index === 0
                          }
                          onClick={() => moveSection(section.key, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="px-3"
                          aria-label={`Move ${section.label} down`}
                          title={`Move ${section.label} down`}
                          disabled={
                            !canEdit ||
                            reorderMutation.isPending ||
                            index === landingSections.length - 1
                          }
                          onClick={() => moveSection(section.key, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm text-[color:var(--dd-muted)]">
                        Section manager
                      </span>
                      <Link
                        to={section.href.replace("/admin", "") || "/"}
                        className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--dd-border)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--dd-text)] transition hover:bg-[color:var(--dd-panel)]"
                      >
                        Manage
                        <ArrowRight className="h-4 w-4 text-[color:var(--dd-accent)]" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="space-y-4">
          <div className="space-y-1">
            <div className="text-lg font-extrabold text-[color:var(--dd-text)]">
              Global CMS areas
            </div>
            <div className="text-sm text-[color:var(--dd-muted)]">
              Shared Deepdale controls that support the landing page beyond a
              single section.
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {globalManagers.map((section) => {
              const readiness = getSectionReadiness(section);

              return (
                <div
                  key={section.key}
                  className="rounded-[1.45rem] border border-white/70 bg-white/72 px-4 py-4 shadow-[0_16px_30px_-28px_rgba(31,45,52,0.7)]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="font-semibold text-[color:var(--dd-text)]">
                        {section.label}
                      </div>
                      <div className="text-sm text-[color:var(--dd-muted)]">
                        {section.description}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        visibilityStyles[section.visibility]
                      }`}
                    >
                      {visibilityLabels[section.visibility]}
                    </span>
                  </div>
                  <div className="mt-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${readinessStyles[readiness]}`}
                    >
                      {readinessLabels[readiness]}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 border-t border-[color:var(--dd-border)] pt-4 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[color:var(--dd-muted)]">
                        Records: {formatItemCount(section.itemCount)}
                      </span>
                      {section.visibility === "system" ? null : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-[color:var(--dd-muted)]">
                            Public visibility
                          </span>
                          <Switch
                            aria-label={`Toggle ${section.label} visibility`}
                            title={`Toggle ${section.label} visibility`}
                            checked={section.visibility === "visible"}
                            disabled={!canEdit || visibilityMutation.isPending}
                            onCheckedChange={(nextValue) => {
                              visibilityMutation.mutate({
                                key: section.key,
                                isVisible: nextValue
                              });
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[color:var(--dd-muted)]">
                        Open manager
                      </span>
                      <Link
                        to={section.href.replace("/admin", "") || "/"}
                        className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--dd-border)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--dd-text)] transition hover:bg-[color:var(--dd-panel)]"
                      >
                        Manage
                        <ArrowRight className="h-4 w-4 text-[color:var(--dd-accent)]" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div> */}
    </div>
  );
}
