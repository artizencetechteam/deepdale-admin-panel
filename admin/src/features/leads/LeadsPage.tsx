import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, PencilLine } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { DrawerForm } from "../../components/ui/dialogs";
import { EmptyState } from "../../components/ui/empty-state";
import { FormField, Input, Select, Textarea } from "../../components/ui/field";
import { PageHeader } from "../../components/ui/page-header";
import { ReadOnlyBanner } from "../../components/ui/read-only-banner";
import { Table, TableWrapper } from "../../components/ui/table";
import { apiRequest } from "../../lib/api-client";
import type { LeadRecord, LeadSource, LeadStatus, Role } from "../../lib/api-types";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";
import { queryKeys } from "../../lib/query-keys";
import { canWriteAdminOnly } from "../../lib/role-utils";
import { useToast } from "../../components/ui/toast";

const readableRoles: Role[] = ["viewer", "admin", "superadmin"];
const leadStatuses: Array<LeadStatus | "all"> = [
  "all",
  "new",
  "contacted",
  "qualified",
  "closed"
];
const leadSources: Array<LeadSource | "all"> = [
  "all",
  "support-form",
  "book-a-call"
];

const leadUpdateSchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "closed"]),
  notes: z.string().max(10000).optional()
});

type LeadUpdateValues = z.infer<typeof leadUpdateSchema>;

function hasReadAccess(role: Role | undefined) {
  return Boolean(role && readableRoles.includes(role));
}

function buildLeadQuery(filters: {
  status: LeadStatus | "all";
  source: LeadSource | "all";
  search: string;
  dateFrom: string;
  dateTo: string;
}) {
  const params = new URLSearchParams();

  if (filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.source !== "all") {
    params.set("source", filters.source);
  }

  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.dateFrom) {
    params.set("dateFrom", new Date(`${filters.dateFrom}T00:00:00`).toISOString());
  }

  if (filters.dateTo) {
    params.set("dateTo", new Date(`${filters.dateTo}T23:59:59`).toISOString());
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function LeadsPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = canWriteAdminOnly(user?.role);
  const canRead = hasReadAccess(user?.role);
  const [requestError, setRequestError] = useState<string>();
  const [filters, setFilters] = useState({
    status: "all" as LeadStatus | "all",
    source: "all" as LeadSource | "all",
    search: "",
    dateFrom: "",
    dateTo: ""
  });
  const [editorState, setEditorState] = useState<{
    open: boolean;
    lead: LeadRecord | null;
  }>({ open: false, lead: null });
  const deferredSearch = useDeferredValue(filters.search);
  const effectiveFilters = { ...filters, search: deferredSearch };
  const querySuffix = useMemo(() => buildLeadQuery(effectiveFilters), [effectiveFilters]);

  const leadForm = useForm<LeadUpdateValues>({
    resolver: zodResolver(leadUpdateSchema),
    defaultValues: {
      status: "new",
      notes: ""
    }
  });

  const leadsQuery = useQuery({
    queryKey: [...queryKeys.leads, effectiveFilters],
    enabled: canRead,
    queryFn: () => apiRequest<LeadRecord[]>(`/api/admin/leads${querySuffix}`)
  });

  const updateMutation = useMutation({
    mutationFn: (values: LeadUpdateValues) => {
      if (!editorState.lead) {
        throw new Error("No lead selected");
      }

      return apiRequest<LeadRecord>(`/api/admin/leads/${editorState.lead.id}`, {
        method: "PATCH",
        csrfToken,
        body: {
          status: values.status,
          notes: values.notes?.trim() ? values.notes.trim() : null
        }
      });
    },
    onSuccess: async () => {
      setEditorState({ open: false, lead: null });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      pushToast("Lead updated");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  function openEditor(lead: LeadRecord) {
    setEditorState({ open: true, lead });
    leadForm.reset({
      status: lead.status,
      notes: lead.notes ?? ""
    });
  }

  if (!canRead) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Leads Inbox"
          description="Access to leads is limited to viewer, admin, and superadmin roles."
        />
        <EmptyState
          title="Access restricted"
          description="Your current role is not allowed to view or manage lead submissions."
        />
      </div>
    );
  }

  const leads = leadsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads Inbox"
        description="Filter submissions, track qualification status, and review inbound demand from the public site."
        actions={
          canEdit ? (
            <a
              href={`/api/admin/leads/export.csv${querySuffix}`}
              className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--dd-border)] bg-[color:var(--dd-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--dd-text)] transition hover:bg-[color:var(--dd-panel-strong)]"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </a>
          ) : undefined
        }
      />
      {!canEdit ? <ReadOnlyBanner /> : null}
      <BackendErrorAlert message={requestError} />
      <Card className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FormField label="Status">
            <Select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as LeadStatus | "all"
                }))
              }
            >
              {leadStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Source">
            <Select
              value={filters.source}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  source: event.target.value as LeadSource | "all"
                }))
              }
            >
              {leadSources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Search">
            <Input
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              placeholder="Name, company, or email"
            />
          </FormField>
          <FormField label="Date from">
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dateFrom: event.target.value }))
              }
            />
          </FormField>
          <FormField label="Date to">
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dateTo: event.target.value }))
              }
            />
          </FormField>
        </div>
      </Card>
      {leads.length === 0 ? (
        <EmptyState
          title="No leads match these filters"
          description="Try adjusting the filters or wait for new public submissions."
        />
      ) : (
        <TableWrapper>
          <Table>
            <thead className="bg-[color:var(--dd-panel-strong)] text-xs uppercase tracking-[0.18em] text-[color:var(--dd-muted)]">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Notes</th>
                {canEdit ? <th className="px-4 py-3 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-[color:var(--dd-border)] align-top">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-[color:var(--dd-text)]">
                      {lead.fullName}
                    </div>
                    <div className="text-sm text-[color:var(--dd-muted)]">
                      {lead.companyName}
                    </div>
                    <div className="text-sm text-[color:var(--dd-muted)]">{lead.email}</div>
                    {lead.phone ? (
                      <div className="text-sm text-[color:var(--dd-muted)]">{lead.phone}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-[color:var(--dd-muted)]">{lead.source}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-[color:var(--dd-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[color:var(--dd-muted)]">
                    {formatDate(lead.submittedAt)}
                  </td>
                  <td className="px-4 py-4 text-sm text-[color:var(--dd-muted)]">
                    {lead.notes || "No notes yet"}
                  </td>
                  {canEdit ? (
                    <td className="px-4 py-4 text-right">
                      <Button variant="secondary" onClick={() => openEditor(lead)}>
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      )}
      <DrawerForm
        open={editorState.open}
        onOpenChange={(open) => setEditorState((current) => ({ ...current, open }))}
        title="Update lead"
      >
        <form className="space-y-5" onSubmit={leadForm.handleSubmit((values) => updateMutation.mutate(values))}>
          <FormField label="Status" error={leadForm.formState.errors.status?.message}>
            <Select {...leadForm.register("status")}>
              {leadStatuses.filter((status) => status !== "all").map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Notes" error={leadForm.formState.errors.notes?.message}>
            <Textarea {...leadForm.register("notes")} />
          </FormField>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditorState({ open: false, lead: null })}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DrawerForm>
    </div>
  );
}
