import { Router } from "express";
import { type LeadStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../../lib/prisma";
import { parseWithSchema } from "../../lib/validation";
import { requireCsrf } from "../../middleware/csrf";
import { requireRole } from "../../middleware/roles";
import { leadSourceToApi } from "../../lib/mappers";
import { recordActivity } from "../../lib/activity-log";

const leadQuerySchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "closed"]).optional(),
  source: z.enum(["support-form", "book-a-call"]).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().trim().optional()
});

const leadUpdateSchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "closed"]).optional(),
  notes: z.string().max(10_000).nullable().optional()
});

function buildLeadWhere(query: z.infer<typeof leadQuerySchema>) {
  const where: Record<string, unknown> = {};

  if (query.status) {
    where.status = query.status as LeadStatus;
  }

  if (query.source === "support-form") {
    where.source = "support_form";
  }

  if (query.source === "book-a-call") {
    where.source = "book_a_call";
  }

  if (query.dateFrom || query.dateTo) {
    const submittedAt: Record<string, Date> = {};

    if (query.dateFrom) {
      submittedAt.gte = new Date(query.dateFrom);
    }

    if (query.dateTo) {
      submittedAt.lte = new Date(query.dateTo);
    }

    where.submittedAt = submittedAt;
  }

  if (query.search) {
    Object.assign(where, {
      OR: [
        { fullName: { contains: query.search, mode: "insensitive" as const } },
        {
          companyName: { contains: query.search, mode: "insensitive" as const }
        },
        { email: { contains: query.search, mode: "insensitive" as const } }
      ]
    });
  }

  return where;
}

function serializeLead(lead: {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string | null;
  submittedAt: Date;
  source: "support_form" | "book_a_call";
  status: "new" | "contacted" | "qualified" | "closed";
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...lead,
    source: leadSourceToApi(lead.source)
  };
}

function csvEscape(value: string | null | undefined): string {
  const normalized = value ?? "";
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function createLeadsRouter(): Router {
  const router = Router();

  router.get(
    "/",
    requireRole("viewer", "admin", "superadmin"),
    async (request, response) => {
      const query = parseWithSchema(leadQuerySchema, request.query);
      const leads = await prisma.leadSubmission.findMany({
        where: buildLeadWhere(query),
        orderBy: {
          submittedAt: "desc"
        }
      });

      response.json({
        data: leads.map(serializeLead)
      });
    }
  );

  router.get(
    "/export.csv",
    requireRole("admin", "superadmin"),
    async (request, response) => {
      const query = parseWithSchema(leadQuerySchema, request.query);
      const leads = await prisma.leadSubmission.findMany({
        where: buildLeadWhere(query),
        orderBy: {
          submittedAt: "desc"
        }
      });

      const header = [
        "id",
        "fullName",
        "companyName",
        "email",
        "phone",
        "source",
        "status",
        "submittedAt",
        "notes"
      ].join(",");
      const lines = leads.map((lead) =>
        [
          csvEscape(lead.id),
          csvEscape(lead.fullName),
          csvEscape(lead.companyName),
          csvEscape(lead.email),
          csvEscape(lead.phone),
          csvEscape(leadSourceToApi(lead.source)),
          csvEscape(lead.status),
          csvEscape(lead.submittedAt.toISOString()),
          csvEscape(lead.notes)
        ].join(",")
      );

      response
        .status(200)
        .type("text/csv")
        .attachment("deepdale-leads.csv")
        .send([header, ...lines].join("\n"));
    }
  );

  router.get(
    "/:id",
    requireRole("viewer", "admin", "superadmin"),
    async (request, response) => {
      const id = String(request.params.id ?? "");
      const lead = await prisma.leadSubmission.findUniqueOrThrow({
        where: {
          id
        }
      });

      response.json({
        data: serializeLead(lead)
      });
    }
  );

  router.patch(
    "/:id",
    requireRole("admin", "superadmin"),
    requireCsrf,
    async (request, response) => {
      const input = parseWithSchema(leadUpdateSchema, request.body);
      const id = String(request.params.id ?? "");
      const data: Record<string, unknown> = {};

      if (input.status !== undefined) {
        data.status = input.status;
      }

      if (input.notes !== undefined) {
        data.notes = input.notes;
      }

      const lead = await prisma.leadSubmission.update({
        where: {
          id
        },
        data
      });

      await recordActivity({
        request,
        action: "update",
        resourceType: "leads",
        resourceId: lead.id,
        resourceLabel: lead.fullName,
        summary: `Updated lead: ${lead.fullName}`,
        metadata: {
          status: lead.status
        }
      });

      response.json({
        data: serializeLead(lead)
      });
    }
  );

  return router;
}
