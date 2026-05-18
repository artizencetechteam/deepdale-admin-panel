import type { ApiEnvelope, ApiErrorResponse, MediaKind } from "./api-types";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  csrfToken?: string | null;
  ignoreUnauthorized?: boolean;
  headers?: HeadersInit;
};

let unauthorizedHandler: (() => void) | undefined;

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code = "request_failed",
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  unauthorizedHandler = handler;
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const raw = await response.text();

  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ApiClientError(
      "Invalid JSON response",
      response.status,
      "invalid_response"
    );
  }
}

async function parseError(response: Response): Promise<never> {
  let payload: ApiErrorResponse | undefined;

  try {
    const parsed = await parseJsonBody(response);

    if (parsed && typeof parsed === "object" && "error" in parsed) {
      payload = parsed as ApiErrorResponse;
    } else {
      payload = undefined;
    }
  } catch {
    payload = undefined;
  }

  throw new ApiClientError(
    payload?.error.message ?? response.statusText,
    response.status,
    payload?.error.code ?? "request_failed",
    payload?.error.details
  );
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const requestInit: RequestInit = {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(options.csrfToken ? { "x-csrf-token": options.csrfToken } : {}),
      ...options.headers
    }
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  const response = await fetch(path, requestInit);

  if (response.status === 401 && !options.ignoreUnauthorized) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    return parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await parseJsonBody(response);

  if (payload === undefined) {
    throw new ApiClientError("Empty response body", response.status, "empty_response");
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}

export async function uploadMedia<T>(
  file: File,
  kind: MediaKind,
  csrfToken: string
): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  const response = await fetch("/api/admin/media/upload", {
    method: "POST",
    credentials: "include",
    headers: {
      "x-csrf-token": csrfToken
    },
    body: formData
  });

  if (response.status === 401) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    return parseError(response);
  }

  const payload = await parseJsonBody(response);

  if (payload === undefined) {
    throw new ApiClientError("Empty response body", response.status, "empty_response");
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}
