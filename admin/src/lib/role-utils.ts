import type { Role } from "./api-types";

export function hasRole(role: Role | undefined, ...allowedRoles: Role[]) {
  return Boolean(role && allowedRoles.includes(role));
}

export function canWriteContent(role: Role | undefined) {
  return hasRole(role, "editor", "admin", "superadmin");
}

export function canWriteAdminOnly(role: Role | undefined) {
  return hasRole(role, "admin", "superadmin");
}

export function isSuperadmin(role: Role | undefined) {
  return role === "superadmin";
}
