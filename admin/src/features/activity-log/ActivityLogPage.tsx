import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { FormField, Input, Select } from "../../components/ui/field";
import { PageHeader } from "../../components/ui/page-header";
import { Table, TableWrapper } from "../../components/ui/table";
import { apiRequest } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-store";
import { queryKeys } from "../../lib/query-keys";
import { hasRole } from "../../lib/role-utils";
import type { ActivityLogAction, ActivityLogEntry } from "../../lib/api-types";

const actionOptions: Array<ActivityLogAction | "all"> = [
  "all",
  "create",
  "update",
  "delete",
  "reorder",
  "toggle_visibility",
  "login",
  "logout",
  "set_password"
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function buildQuery(filters: {
  action: ActivityLogAction | "all";
  resourceType: string;
  dateFrom: string;
  dateTo: string;
  limit: string;
}) {
  const params = new URLSearchParams();

  if (filters.action !== "all") {
    params.set("action", filters.action);
  }

  if (filters.resourceType.trim()) {
    params.set("resourceType", filters.resourceType.trim());
  }

  if (filters.dateFrom) {
    params.set("dateFrom", new Date(`${filters.dateFrom}T00:00:00`).toISOString());
  }

  if (filters.dateTo) {
    params.set("dateTo", new Date(`${filters.dateTo}T23:59:59`).toISOString());
  }

  params.set("limit", filters.limit);

  const query = params.toString();
  return query ? `?${query}` : "";
}

function actionTone(action: ActivityLogAction) {
  if (action === "delete") {
    return "bg-rose-100 text-rose-700";
  }

  if (action === "create" || action === "login") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (action === "toggle_visibility" || action === "set_password") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-sky-100 text-sky-700";
}

export function ActivityLogPage() {
  const { user } = useAuth();
  const canRead = hasRole(user?.role, "admin", "superadmin");
  const [filters, setFilters] = useState({
    action: "all" as ActivityLogAction | "all",
    resourceType: "",
    dateFrom: "",
    dateTo: "",
    limit: "50"
  });
  const deferredResourceType = useDeferredValue(filters.resourceType);
  const effectiveFilters = {
    ...filters,
    resourceType: deferredResourceType
  };
  const querySuffix = useMemo(
    () => buildQuery(effectiveFilters),
    [effectiveFilters]
  );
  const activityQuery = useQuery({
    queryKey: [...queryKeys.activityLog, effectiveFilters],
    enabled: canRead,
    queryFn: () =>
      apiRequest<ActivityLogEntry[]>(`/api/admin/activity-log${querySuffix}`)
  });

  const resourceTypesQuery = useQuery({
    queryKey: ["activity-log", "meta", "resource-types"],
    enabled: canRead,
    queryFn: () =>
      apiRequest<string[]>("/api/admin/activity-log/meta/resource-types")
  });

  if (!canRead) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Activity Log"
          description="Review who changed admin-managed content, users, media, and sessions."
        />
        <EmptyState
          title="Access restricted"
          description="Only admin and superadmin roles can access the audit trail."
        />
      </div>
    );
  }

  const entries = activityQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        description="Track who changed CMS content, admin accounts, media, section state, and authentication sessions."
      />
      <BackendErrorAlert
        message={activityQuery.error instanceof Error ? activityQuery.error.message : undefined}
      />
      <Card className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FormField label="Action">
            <Select
              value={filters.action}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  action: event.target.value as ActivityLogAction | "all"
                }))
              }
            >
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Resource type">
            <Select
              value={filters.resourceType}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  resourceType: event.target.value
                }))
              }
            >
              <option value="">All resources</option>
              {resourceTypesQuery.data?.map((type: string) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Date from">
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  dateFrom: event.target.value
                }))
              }
            />
          </FormField>
          <FormField label="Date to">
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  dateTo: event.target.value
                }))
              }
            />
          </FormField>
          <FormField label="Rows">
            <Select
              value={filters.limit}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  limit: event.target.value
                }))
              }
            >
              {["25", "50", "100"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </Card>
      {entries.length === 0 ? (
        <EmptyState
          title="No activity found"
          description="Try widening the filter range or wait for new admin actions to be recorded."
        />
      ) : (
        <TableWrapper>
          <Table>
            <thead className="bg-[color:var(--dd-panel-strong)] text-xs uppercase tracking-[0.18em] text-[color:var(--dd-muted)]">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Summary</th>
                <th className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-t border-[color:var(--dd-border)] align-top"
                >
                  <td className="px-4 py-4 text-sm text-[color:var(--dd-muted)]">
                    {formatDate(entry.createdAt)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-[color:var(--dd-text)]">
                      {entry.actorName ?? "System"}
                    </div>
                    <div className="text-sm text-[color:var(--dd-muted)]">
                      {entry.actorEmail ?? entry.actorRole ?? "unknown"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${actionTone(
                        entry.action
                      )}`}
                    >
                      {entry.action.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-[color:var(--dd-muted)]">
                    <div>{entry.resourceType}</div>
                    {entry.resourceLabel ? (
                      <div className="font-medium text-[color:var(--dd-text)]">
                        {entry.resourceLabel}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-sm text-[color:var(--dd-text)]">
                    {entry.summary}
                  </td>
                  <td className="px-4 py-4 text-sm text-[color:var(--dd-muted)]">
                    {entry.ipAddress ?? "n/a"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      )}
    </div>
  );
}
