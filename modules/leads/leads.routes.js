"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLeadsRouter = createLeadsRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const validation_1 = require("../../lib/validation");
const csrf_1 = require("../../middleware/csrf");
const roles_1 = require("../../middleware/roles");
const mappers_1 = require("../../lib/mappers");
const activity_log_1 = require("../../lib/activity-log");
const leadQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(["new", "contacted", "qualified", "closed"]).optional(),
    source: zod_1.z.enum(["support-form", "book-a-call"]).optional(),
    dateFrom: zod_1.z.string().datetime().optional(),
    dateTo: zod_1.z.string().datetime().optional(),
    search: zod_1.z.string().trim().optional()
});
const leadUpdateSchema = zod_1.z.object({
    status: zod_1.z.enum(["new", "contacted", "qualified", "closed"]).optional(),
    notes: zod_1.z.string().max(10_000).nullable().optional()
});
function buildLeadWhere(query) {
    const where = {};
    if (query.status) {
        where.status = query.status;
    }
    if (query.source === "support-form") {
        where.source = "support_form";
    }
    if (query.source === "book-a-call") {
        where.source = "book_a_call";
    }
    if (query.dateFrom || query.dateTo) {
        const submittedAt = {};
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
                { fullName: { contains: query.search, mode: "insensitive" } },
                {
                    companyName: { contains: query.search, mode: "insensitive" }
                },
                { email: { contains: query.search, mode: "insensitive" } }
            ]
        });
    }
    return where;
}
function serializeLead(lead) {
    return {
        ...lead,
        source: (0, mappers_1.leadSourceToApi)(lead.source)
    };
}
function csvEscape(value) {
    const normalized = value ?? "";
    return `"${normalized.replaceAll('"', '""')}"`;
}
function createLeadsRouter() {
    const router = (0, express_1.Router)();
    router.get("/", (0, roles_1.requireRole)("viewer", "admin", "superadmin"), async (request, response) => {
        const query = (0, validation_1.parseWithSchema)(leadQuerySchema, request.query);
        const leads = await prisma_1.prisma.leadSubmission.findMany({
            where: buildLeadWhere(query),
            orderBy: {
                submittedAt: "desc"
            }
        });
        response.json({
            data: leads.map(serializeLead)
        });
    });
    router.get("/export.csv", (0, roles_1.requireRole)("admin", "superadmin"), async (request, response) => {
        const query = (0, validation_1.parseWithSchema)(leadQuerySchema, request.query);
        const leads = await prisma_1.prisma.leadSubmission.findMany({
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
        const lines = leads.map((lead) => [
            csvEscape(lead.id),
            csvEscape(lead.fullName),
            csvEscape(lead.companyName),
            csvEscape(lead.email),
            csvEscape(lead.phone),
            csvEscape((0, mappers_1.leadSourceToApi)(lead.source)),
            csvEscape(lead.status),
            csvEscape(lead.submittedAt.toISOString()),
            csvEscape(lead.notes)
        ].join(","));
        response
            .status(200)
            .type("text/csv")
            .attachment("deepdale-leads.csv")
            .send([header, ...lines].join("\n"));
    });
    router.get("/:id", (0, roles_1.requireRole)("viewer", "admin", "superadmin"), async (request, response) => {
        const id = String(request.params.id ?? "");
        const lead = await prisma_1.prisma.leadSubmission.findUniqueOrThrow({
            where: {
                id
            }
        });
        response.json({
            data: serializeLead(lead)
        });
    });
    router.patch("/:id", (0, roles_1.requireRole)("admin", "superadmin"), csrf_1.requireCsrf, async (request, response) => {
        const input = (0, validation_1.parseWithSchema)(leadUpdateSchema, request.body);
        const id = String(request.params.id ?? "");
        const data = {};
        if (input.status !== undefined) {
            data.status = input.status;
        }
        if (input.notes !== undefined) {
            data.notes = input.notes;
        }
        const lead = await prisma_1.prisma.leadSubmission.update({
            where: {
                id
            },
            data
        });
        await (0, activity_log_1.recordActivity)({
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
    });
    return router;
}
