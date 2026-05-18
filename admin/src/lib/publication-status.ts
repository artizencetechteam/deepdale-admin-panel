import type { PublicationStatus } from "./api-types";

export function publicationStatusLabel(status: PublicationStatus) {
  return status === "published" ? "Published" : "Draft";
}

export function publicationStatusClassName(status: PublicationStatus) {
  return status === "published"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-amber-100 text-amber-800";
}

export function togglePublicationStatus(status: PublicationStatus): PublicationStatus {
  return status === "published" ? "draft" : "published";
}

export function publicationActionLabel(status: PublicationStatus) {
  return status === "published" ? "Move to draft" : "Publish";
}
