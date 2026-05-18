import { Prisma } from "@prisma/client";

// Mocking Prisma.sql for testing the logic
const PrismaMock = {
  sql: (strings: TemplateStringsArray, ...values: any[]) => {
    return { strings, values };
  }
};

function buildMetadataSql(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) {
    return "NULL";
  }

  const SENSITIVE_FIELDS = [
    "password",
    "passwordHash",
    "token",
    "csrfToken",
    "secret",
    "apiKey",
    "accessKey",
    "authorization"
  ];

  const sanitized = { ...metadata };

  for (const key of Object.keys(sanitized)) {
    if (
      SENSITIVE_FIELDS.some((field) =>
        key.toLowerCase().includes(field.toLowerCase())
      )
    ) {
      sanitized[key] = "[REDACTED]";
    }
  }

  return JSON.stringify(sanitized);
}

const testData = {
  id: "123",
  name: "Test User",
  password: "mypassword123",
  userToken: "secret-token-value",
  apiKey: "my-api-key",
  deepdale_secret: "some-secret",
  nonSensitive: "all-good"
};

console.log("Original:", JSON.stringify(testData, null, 2));
console.log("Sanitized:", buildMetadataSql(testData));

if (buildMetadataSql(testData).includes("REDACTED") && !buildMetadataSql(testData).includes("mypassword123")) {
    console.log("Verification PASSED: Sensitive fields were redacted.");
} else {
    console.log("Verification FAILED: Sensitive fields were NOT properly redacted.");
    process.exit(1);
}
