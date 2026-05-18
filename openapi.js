"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openApiDocument = void 0;
const adminSecurity = [{ adminSession: [] }];
const singletonResources = [
    { path: "site-settings", tag: "Content", label: "site settings" },
    { path: "hero", tag: "Content", label: "hero content" },
    { path: "section-config", tag: "Content", label: "section config" },
    {
        path: "support-form-config",
        tag: "Content",
        label: "support form config"
    },
    { path: "rating-summary", tag: "Content", label: "rating summary" }
];
const collectionResources = [
    { path: "products", tag: "Content", singular: "product" },
    { path: "partners", tag: "Content", singular: "partner" },
    { path: "voice-scenarios", tag: "Content", singular: "voice scenario" },
    {
        path: "automation-engines",
        tag: "Content",
        singular: "automation engine"
    },
    { path: "capabilities", tag: "Content", singular: "capability" },
    { path: "roi-industries", tag: "Content", singular: "ROI industry" },
    { path: "process-steps", tag: "Content", singular: "process step" },
    {
        path: "product-features",
        tag: "Content",
        singular: "product feature"
    },
    { path: "callers", tag: "Content", singular: "caller profile" },
    { path: "testimonials", tag: "Content", singular: "testimonial" },
    { path: "faq-categories", tag: "Content", singular: "FAQ category" },
    { path: "faqs", tag: "Content", singular: "FAQ item" },
    { path: "integrations", tag: "Content", singular: "integration" },
    {
        path: "navigation-items",
        tag: "Content",
        singular: "navigation item"
    },
    { path: "mega-menu-items", tag: "Content", singular: "mega menu item" },
    {
        path: "footer-link-groups",
        tag: "Content",
        singular: "footer link group"
    }
];
function jsonResponse(description, schema) {
    return {
        description,
        content: {
            "application/json": {
                schema: schema ?? { type: "object" }
            }
        }
    };
}
function csvResponse(description) {
    return {
        description,
        content: {
            "text/csv": {
                schema: {
                    type: "string"
                }
            }
        }
    };
}
function adminOperation(summary, tag, options = {}) {
    return {
        summary,
        tags: [tag],
        security: adminSecurity,
        responses: {
            "200": jsonResponse("Successful response"),
            "401": jsonResponse("Authentication required", {
                $ref: "#/components/schemas/ErrorResponse"
            }),
            "403": jsonResponse("Forbidden", {
                $ref: "#/components/schemas/ErrorResponse"
            })
        },
        ...options
    };
}
function adminMutation(summary, tag, options = {}) {
    const existingParameters = Array.isArray(options.parameters)
        ? options.parameters
        : [];
    return adminOperation(summary, tag, {
        ...options,
        parameters: [
            ...existingParameters,
            { $ref: "#/components/parameters/CsrfHeader" }
        ]
    });
}
const singletonPaths = Object.fromEntries(singletonResources.map((resource) => [
    `/api/admin/${resource.path}`,
    {
        get: adminOperation(`Get ${resource.label}`, resource.tag),
        put: adminMutation(`Update ${resource.label}`, resource.tag, {
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object"
                        }
                    }
                }
            }
        })
    }
]));
const collectionPaths = Object.fromEntries(collectionResources.flatMap((resource) => [
    [
        `/api/admin/${resource.path}`,
        {
            get: adminOperation(`List ${resource.path}`, resource.tag),
            post: adminMutation(`Create ${resource.singular}`, resource.tag, {
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object"
                            }
                        }
                    }
                },
                responses: {
                    "201": jsonResponse(`${resource.singular} created`)
                }
            })
        }
    ],
    [
        `/api/admin/${resource.path}/{id}`,
        {
            get: adminOperation(`Get ${resource.singular}`, resource.tag, {
                parameters: [{ $ref: "#/components/parameters/IdPath" }]
            }),
            put: adminMutation(`Update ${resource.singular}`, resource.tag, {
                parameters: [{ $ref: "#/components/parameters/IdPath" }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object"
                            }
                        }
                    }
                }
            }),
            delete: adminMutation(`Delete ${resource.singular}`, resource.tag, {
                parameters: [{ $ref: "#/components/parameters/IdPath" }],
                responses: {
                    "204": {
                        description: `${resource.singular} deleted`
                    }
                }
            })
        }
    ],
    [
        `/api/admin/${resource.path}/reorder`,
        {
            patch: adminMutation(`Reorder ${resource.path}`, resource.tag, {
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ReorderRequest"
                            }
                        }
                    }
                }
            })
        }
    ]
]));
const collectionPublicationPaths = Object.fromEntries(collectionResources.map((resource) => [
    `/api/admin/${resource.path}/{id}/publication-status`,
    {
        patch: adminMutation(`Update ${resource.singular} publication status`, resource.tag, {
            parameters: [{ $ref: "#/components/parameters/IdPath" }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/PublicationStatusRequest"
                        }
                    }
                }
            }
        })
    }
]));
exports.openApiDocument = {
    openapi: "3.1.0",
    info: {
        title: "Deepdale Backend API",
        version: "0.1.0",
        description: "Backend-first CMS API for Deepdale marketing content, admin operations, media, chat, and lead intake."
    },
    servers: [{ url: "/" }],
    tags: [
        { name: "System" },
        { name: "Auth" },
        { name: "Users" },
        { name: "Activity" },
        { name: "Dashboard" },
        { name: "Preview" },
        { name: "Media" },
        { name: "Leads" },
        { name: "TTS" },
        { name: "Content" },
        { name: "Public" }
    ],
    components: {
        securitySchemes: {
            adminSession: {
                type: "apiKey",
                in: "cookie",
                name: "dd_admin_session"
            }
        },
        parameters: {
            CsrfHeader: {
                name: "x-csrf-token",
                in: "header",
                required: true,
                schema: {
                    type: "string"
                }
            },
            IdPath: {
                name: "id",
                in: "path",
                required: true,
                schema: {
                    type: "string"
                }
            },
            SectionKeyPath: {
                name: "key",
                in: "path",
                required: true,
                schema: {
                    type: "string"
                }
            },
            PreviewTokenQuery: {
                name: "previewToken",
                in: "query",
                required: false,
                schema: {
                    type: "string"
                },
                description: "Short-lived signed token returned by GET /api/admin/preview/session. When present, public payloads include hidden sections and draft items and are served with Cache-Control: no-store."
            }
        },
        schemas: {
            ErrorResponse: {
                type: "object",
                properties: {
                    error: {
                        type: "object",
                        properties: {
                            code: { type: "string" },
                            message: { type: "string" },
                            details: {}
                        },
                        required: ["code", "message"]
                    }
                },
                required: ["error"]
            },
            LoginRequest: {
                type: "object",
                properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 }
                },
                required: ["email", "password"]
            },
            PublicLeadSubmissionRequest: {
                type: "object",
                properties: {
                    fullName: { type: "string" },
                    companyName: { type: "string" },
                    email: { type: "string", format: "email" },
                    phone: { type: "string" },
                    source: {
                        type: "string",
                        enum: ["support-form", "book-a-call"]
                    }
                },
                required: ["fullName", "companyName", "email", "source"]
            },
            ChatRequest: {
                type: "object",
                properties: {
                    prompt: { type: "string" },
                    messages: {
                        type: "array",
                        maxItems: 20,
                        items: {
                            type: "object",
                            properties: {
                                role: {
                                    type: "string",
                                    enum: ["user", "assistant"]
                                },
                                content: {
                                    type: "string"
                                }
                            },
                            required: ["role", "content"]
                        }
                    }
                }
            },
            ReorderRequest: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        sortOrder: { type: "integer", minimum: 0 }
                    },
                    required: ["id", "sortOrder"]
                }
            },
            PublicationStatusRequest: {
                type: "object",
                properties: {
                    publicationStatus: {
                        type: "string",
                        enum: ["draft", "published"]
                    }
                },
                required: ["publicationStatus"]
            },
            ActivityLogEntry: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    actorUserId: { type: ["string", "null"] },
                    actorRole: { type: ["string", "null"] },
                    actorName: { type: ["string", "null"] },
                    actorEmail: { type: ["string", "null"] },
                    action: { type: "string" },
                    resourceType: { type: "string" },
                    resourceId: { type: ["string", "null"] },
                    resourceLabel: { type: ["string", "null"] },
                    summary: { type: "string" },
                    metadata: {
                        type: ["object", "null"],
                        additionalProperties: true
                    },
                    ipAddress: { type: ["string", "null"] },
                    createdAt: { type: "string", format: "date-time" }
                },
                required: [
                    "id",
                    "actorUserId",
                    "actorRole",
                    "actorName",
                    "actorEmail",
                    "action",
                    "resourceType",
                    "resourceId",
                    "resourceLabel",
                    "summary",
                    "metadata",
                    "ipAddress",
                    "createdAt"
                ]
            },
            PreviewSessionEndpoint: {
                type: "object",
                properties: {
                    key: {
                        type: "string",
                        enum: ["home", "navigation", "footer"]
                    },
                    label: { type: "string" },
                    path: { type: "string" },
                    absoluteUrl: { type: "string", format: "uri" }
                },
                required: ["key", "label", "path", "absoluteUrl"]
            },
            PreviewSessionResponse: {
                type: "object",
                properties: {
                    data: {
                        type: "object",
                        properties: {
                            token: { type: "string" },
                            expiresAt: { type: "string", format: "date-time" },
                            requestedByUserId: { type: "string" },
                            endpoints: {
                                type: "array",
                                items: {
                                    $ref: "#/components/schemas/PreviewSessionEndpoint"
                                }
                            }
                        },
                        required: ["token", "expiresAt", "requestedByUserId", "endpoints"]
                    }
                },
                required: ["data"]
            }
        }
    },
    paths: {
        "/": {
            get: {
                summary: "API root descriptor",
                tags: ["System"],
                responses: {
                    "200": jsonResponse("Service descriptor")
                }
            }
        },
        "/health": {
            get: {
                summary: "Health check",
                tags: ["System"],
                responses: {
                    "200": jsonResponse("Service is healthy")
                }
            }
        },
        "/openapi.json": {
            get: {
                summary: "Get the OpenAPI document",
                tags: ["System"],
                responses: {
                    "200": jsonResponse("OpenAPI document")
                }
            }
        },
        "/api/admin/auth/login": {
            post: {
                summary: "Admin login",
                tags: ["Auth"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/LoginRequest"
                            }
                        }
                    }
                },
                responses: {
                    "200": jsonResponse("Authenticated session created"),
                    "401": jsonResponse("Invalid credentials", {
                        $ref: "#/components/schemas/ErrorResponse"
                    }),
                    "429": jsonResponse("Too many failed login attempts", {
                        $ref: "#/components/schemas/ErrorResponse"
                    })
                }
            }
        },
        "/api/admin/auth/logout": {
            post: adminMutation("Admin logout", "Auth", {
                responses: {
                    "204": {
                        description: "Session destroyed"
                    }
                }
            })
        },
        "/api/admin/auth/me": {
            get: adminOperation("Current admin user", "Auth")
        },
        "/api/admin/auth/csrf": {
            get: adminOperation("Current CSRF token", "Auth")
        },
        "/api/admin/meta/ui-options": {
            get: adminOperation("UI option metadata", "Content")
        },
        "/api/admin/activity-log": {
            get: adminOperation("List activity log entries", "Activity", {
                parameters: [
                    {
                        name: "action",
                        in: "query",
                        schema: {
                            type: "string",
                            enum: [
                                "create",
                                "update",
                                "delete",
                                "reorder",
                                "toggle_visibility",
                                "login",
                                "logout",
                                "set_password"
                            ]
                        }
                    },
                    {
                        name: "resourceType",
                        in: "query",
                        schema: {
                            type: "string"
                        }
                    },
                    {
                        name: "userId",
                        in: "query",
                        schema: {
                            type: "string"
                        }
                    },
                    {
                        name: "dateFrom",
                        in: "query",
                        schema: {
                            type: "string",
                            format: "date-time"
                        }
                    },
                    {
                        name: "dateTo",
                        in: "query",
                        schema: {
                            type: "string",
                            format: "date-time"
                        }
                    },
                    {
                        name: "limit",
                        in: "query",
                        schema: {
                            type: "integer",
                            minimum: 1,
                            maximum: 100,
                            default: 50
                        }
                    }
                ],
                responses: {
                    "200": jsonResponse("Activity log entries", {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    $ref: "#/components/schemas/ActivityLogEntry"
                                }
                            }
                        },
                        required: ["data"]
                    }),
                    "401": jsonResponse("Authentication required", {
                        $ref: "#/components/schemas/ErrorResponse"
                    }),
                    "403": jsonResponse("Forbidden", {
                        $ref: "#/components/schemas/ErrorResponse"
                    })
                }
            })
        },
        "/api/admin/users": {
            get: adminOperation("List users", "Users"),
            post: adminMutation("Create user", "Users", {
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object"
                            }
                        }
                    }
                },
                responses: {
                    "201": jsonResponse("User created")
                }
            })
        },
        "/api/admin/users/{id}": {
            patch: adminMutation("Update user", "Users", {
                parameters: [{ $ref: "#/components/parameters/IdPath" }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object"
                            }
                        }
                    }
                }
            })
        },
        "/api/admin/users/{id}/set-password": {
            post: adminMutation("Set user password", "Users", {
                parameters: [{ $ref: "#/components/parameters/IdPath" }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    password: {
                                        type: "string",
                                        minLength: 8
                                    }
                                },
                                required: ["password"]
                            }
                        }
                    }
                },
                responses: {
                    "204": {
                        description: "Password updated"
                    }
                }
            })
        },
        "/api/admin/dashboard/overview": {
            get: adminOperation("Dashboard overview", "Dashboard", {
                description: "Returns dashboard totals, recent leads, ordered section managers, frontend integration endpoints, and recent admin activity for admin-level sessions."
            })
        },
        "/api/admin/preview/session": {
            get: adminOperation("Create preview session", "Preview", {
                description: "Returns a short-lived signed preview token and prebuilt public payload URLs that include draft records and hidden sections.",
                responses: {
                    "200": jsonResponse("Preview session created", {
                        $ref: "#/components/schemas/PreviewSessionResponse"
                    }),
                    "401": jsonResponse("Authentication required", {
                        $ref: "#/components/schemas/ErrorResponse"
                    }),
                    "403": jsonResponse("Forbidden", {
                        $ref: "#/components/schemas/ErrorResponse"
                    })
                }
            })
        },
        "/api/admin/media": {
            get: adminOperation("List media assets", "Media")
        },
        "/api/admin/media/upload": {
            post: adminMutation("Upload media asset", "Media", {
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                properties: {
                                    file: {
                                        type: "string",
                                        format: "binary"
                                    },
                                    kind: {
                                        type: "string",
                                        enum: ["image", "audio", "svg", "document"]
                                    }
                                },
                                required: ["file"]
                            }
                        }
                    }
                },
                responses: {
                    "201": jsonResponse("Media uploaded"),
                    "400": jsonResponse("Invalid upload", {
                        $ref: "#/components/schemas/ErrorResponse"
                    })
                }
            })
        },
        "/api/admin/media/{id}": {
            delete: adminMutation("Delete media asset", "Media", {
                parameters: [{ $ref: "#/components/parameters/IdPath" }],
                responses: {
                    "204": {
                        description: "Media deleted"
                    }
                }
            })
        },
        "/api/admin/leads": {
            get: adminOperation("List leads", "Leads")
        },
        "/api/admin/leads/export.csv": {
            get: adminOperation("Export leads as CSV", "Leads", {
                responses: {
                    "200": csvResponse("Lead export")
                }
            })
        },
        "/api/admin/leads/{id}": {
            get: adminOperation("Get lead", "Leads", {
                parameters: [{ $ref: "#/components/parameters/IdPath" }]
            }),
            patch: adminMutation("Update lead", "Leads", {
                parameters: [{ $ref: "#/components/parameters/IdPath" }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    status: {
                                        type: "string",
                                        enum: ["new", "contacted", "qualified", "closed"]
                                    },
                                    notes: {
                                        type: ["string", "null"]
                                    }
                                }
                            }
                        }
                    }
                }
            })
        },
        "/api/admin/tts/preview/voice-scenario": {
            post: adminOperation("Preview voice scenario speech", "TTS", {
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    text: { type: "string" },
                                    voicePitch: { type: "number" }
                                },
                                required: ["text"]
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Generated MP3 audio",
                        content: {
                            "audio/mpeg": {
                                schema: {
                                    type: "string",
                                    format: "binary"
                                }
                            }
                        }
                    },
                    "503": jsonResponse("TTS provider is disabled", {
                        $ref: "#/components/schemas/ErrorResponse"
                    })
                }
            })
        },
        "/api/admin/tts/preview/caller": {
            post: adminOperation("Preview caller speech", "TTS", {
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    text: { type: "string" },
                                    voicePitch: { type: "number" }
                                },
                                required: ["text"]
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Generated MP3 audio",
                        content: {
                            "audio/mpeg": {
                                schema: {
                                    type: "string",
                                    format: "binary"
                                }
                            }
                        }
                    },
                    "503": jsonResponse("TTS provider is disabled", {
                        $ref: "#/components/schemas/ErrorResponse"
                    })
                }
            })
        },
        ...singletonPaths,
        "/api/admin/section-states": {
            get: adminOperation("List section states", "Content")
        },
        "/api/admin/section-states/{key}": {
            patch: adminMutation("Update section state", "Content", {
                parameters: [{ $ref: "#/components/parameters/SectionKeyPath" }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    isVisible: { type: "boolean" },
                                    sortOrder: { type: "integer", minimum: 0 }
                                }
                            }
                        }
                    }
                }
            })
        },
        ...collectionPaths,
        ...collectionPublicationPaths,
        "/api/content/home": {
            get: {
                summary: "Get aggregated home content",
                tags: ["Public"],
                parameters: [{ $ref: "#/components/parameters/PreviewTokenQuery" }],
                description: "Returns the live landing-page payload. When previewToken is provided, hidden sections and draft records are included and the response is not cached.",
                responses: {
                    "200": jsonResponse("Public home payload"),
                    "400": jsonResponse("Invalid preview token request", {
                        $ref: "#/components/schemas/ErrorResponse"
                    }),
                    "403": jsonResponse("Expired or invalid preview token", {
                        $ref: "#/components/schemas/ErrorResponse"
                    })
                }
            }
        },
        "/api/content/navigation": {
            get: {
                summary: "Get navigation content",
                tags: ["Public"],
                parameters: [{ $ref: "#/components/parameters/PreviewTokenQuery" }],
                description: "Returns the live header and mega-menu payload. When previewToken is provided, hidden navigation and draft records are included and the response is not cached.",
                responses: {
                    "200": jsonResponse("Public navigation payload"),
                    "400": jsonResponse("Invalid preview token request", {
                        $ref: "#/components/schemas/ErrorResponse"
                    }),
                    "403": jsonResponse("Expired or invalid preview token", {
                        $ref: "#/components/schemas/ErrorResponse"
                    })
                }
            }
        },
        "/api/content/footer": {
            get: {
                summary: "Get footer content",
                tags: ["Public"],
                parameters: [{ $ref: "#/components/parameters/PreviewTokenQuery" }],
                description: "Returns the live footer payload. When previewToken is provided, hidden footer content and draft records are included and the response is not cached.",
                responses: {
                    "200": jsonResponse("Public footer payload"),
                    "400": jsonResponse("Invalid preview token request", {
                        $ref: "#/components/schemas/ErrorResponse"
                    }),
                    "403": jsonResponse("Expired or invalid preview token", {
                        $ref: "#/components/schemas/ErrorResponse"
                    })
                }
            }
        },
        "/api/content/leads": {
            post: {
                summary: "Create public lead submission",
                tags: ["Public"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/PublicLeadSubmissionRequest"
                            }
                        }
                    }
                },
                responses: {
                    "201": jsonResponse("Lead captured"),
                    "400": jsonResponse("Invalid lead submission", {
                        $ref: "#/components/schemas/ErrorResponse"
                    })
                }
            }
        },
        "/api/content/chat": {
            post: {
                summary: "Public chat endpoint",
                tags: ["Public"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ChatRequest"
                            }
                        }
                    }
                },
                responses: {
                    "200": jsonResponse("Chat response"),
                    "400": jsonResponse("Invalid chat request", {
                        $ref: "#/components/schemas/ErrorResponse"
                    }),
                    "429": jsonResponse("Chat rate limit exceeded", {
                        $ref: "#/components/schemas/ErrorResponse"
                    }),
                    "503": jsonResponse("Chat provider is not configured", {
                        $ref: "#/components/schemas/ErrorResponse"
                    })
                }
            }
        }
    }
};
