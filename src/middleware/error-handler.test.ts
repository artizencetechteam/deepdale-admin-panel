import express from "express";
import { Prisma } from "@prisma/client";
import multer from "multer";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { errorHandler } from "./error-handler";

function createTestApp(error: unknown) {
  const app = express();

  app.get("/boom", (_request, _response, next) => {
    next(error);
  });
  app.use(errorHandler);

  return app;
}

describe("error handler", () => {
  it("maps prisma not found errors to 404", async () => {
    const app = createTestApp(
      new Prisma.PrismaClientKnownRequestError("Not found", {
        code: "P2025",
        clientVersion: "test",
        meta: {
          modelName: "User"
        }
      })
    );

    const response = await request(app).get("/boom");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("resource_not_found");
    expect(response.body.error.details.modelName).toBe("User");
  });

  it("maps prisma unique constraint errors to 409", async () => {
    const app = createTestApp(
      new Prisma.PrismaClientKnownRequestError("Duplicate", {
        code: "P2002",
        clientVersion: "test",
        meta: {
          target: ["email"]
        }
      })
    );

    const response = await request(app).get("/boom");

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("unique_constraint_violation");
    expect(response.body.error.details.target).toEqual(["email"]);
  });

  it("maps prisma relation constraint errors to 409", async () => {
    const app = createTestApp(
      new Prisma.PrismaClientKnownRequestError("Relation constraint", {
        code: "P2003",
        clientVersion: "test",
        meta: {
          field_name: "LeadSubmission_userId_fkey"
        }
      })
    );

    const response = await request(app).get("/boom");

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("relation_constraint_violation");
  });

  it("maps malformed json parser errors to 400", async () => {
    const error = new SyntaxError("Unexpected token") as SyntaxError & {
      status: number;
      type: string;
    };
    error.status = 400;
    error.type = "entity.parse.failed";

    const app = createTestApp(error);
    const response = await request(app).get("/boom");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("invalid_json");
  });

  it("maps multer file size errors to 400", async () => {
    const app = createTestApp(new multer.MulterError("LIMIT_FILE_SIZE"));
    const response = await request(app).get("/boom");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("file_too_large");
  });
});
