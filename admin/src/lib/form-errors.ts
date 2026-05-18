import { ApiClientError } from "./api-client";

function formatValidationDetails(details: unknown) {
  if (!details || typeof details !== "object") {
    return undefined;
  }

  const detailRecord = details as {
    formErrors?: unknown;
    fieldErrors?: unknown;
  };
  const messages: string[] = [];

  if (Array.isArray(detailRecord.formErrors)) {
    for (const entry of detailRecord.formErrors) {
      if (typeof entry === "string" && entry.trim()) {
        messages.push(entry.trim());
      }
    }
  }

  if (
    detailRecord.fieldErrors &&
    typeof detailRecord.fieldErrors === "object" &&
    !Array.isArray(detailRecord.fieldErrors)
  ) {
    for (const [field, fieldMessages] of Object.entries(detailRecord.fieldErrors)) {
      if (!Array.isArray(fieldMessages)) {
        continue;
      }

      const joined = fieldMessages
        .filter((message): message is string => typeof message === "string" && Boolean(message.trim()))
        .join(", ");

      if (joined) {
        messages.push(`${field}: ${joined}`);
      }
    }
  }

  if (messages.length === 0) {
    return undefined;
  }

  return messages.slice(0, 4).join(" | ");
}

export function getErrorMessage(error: unknown, fallback = "Request failed") {
  if (error instanceof ApiClientError) {
    if (error.code === "validation_error") {
      return formatValidationDetails(error.details) ?? error.message;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
