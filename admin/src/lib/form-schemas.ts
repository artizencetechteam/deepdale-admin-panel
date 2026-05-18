import { z } from "zod";

const fullUrlMessage = "Enter a valid full URL, for example https://example.com";
const urlOrPathMessage = "Enter a full URL or a site path starting with /";

function isAbsoluteUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export const requiredUrlField = z
  .string()
  .trim()
  .min(1, "This field is required")
  .refine(isAbsoluteUrl, fullUrlMessage);

export const optionalUrlField = z
  .string()
  .trim()
  .refine((value) => value === "" || isAbsoluteUrl(value), fullUrlMessage);

export const requiredUrlOrPathField = z
  .string()
  .trim()
  .min(1, "This field is required")
  .refine(
    (value) => isAbsoluteUrl(value) || value.startsWith("/"),
    urlOrPathMessage
  );

export const optionalUrlOrPathField = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || isAbsoluteUrl(value) || value.startsWith("/"),
    urlOrPathMessage
  );
