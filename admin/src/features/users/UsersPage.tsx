import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, UserCog } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { DrawerForm } from "../../components/ui/dialogs";
import { EmptyState } from "../../components/ui/empty-state";
import { FormField, Input, Select, Switch } from "../../components/ui/field";
import { PageHeader } from "../../components/ui/page-header";
import { Table, TableWrapper } from "../../components/ui/table";
import { apiRequest } from "../../lib/api-client";
import type { AdminUser, Role } from "../../lib/api-types";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";
import { queryKeys } from "../../lib/query-keys";
import { isSuperadmin } from "../../lib/role-utils";
import { useToast } from "../../components/ui/toast";

const roleOptions: Role[] = ["viewer", "editor", "admin", "superadmin"];

const userEditorSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120),
  role: z.enum(["viewer", "editor", "admin", "superadmin"]),
  isActive: z.boolean(),
  password: z.string().optional()
});

const passwordSchema = z.object({
  password: z.string().min(8)
});

type UserEditorValues = z.infer<typeof userEditorSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

function formatDate(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function UsersPage() {
  const { user, csrfToken } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const canManageUsers = isSuperadmin(user?.role);
  const [requestError, setRequestError] = useState<string>();
  const [editorState, setEditorState] = useState<{
    open: boolean;
    user: AdminUser | null;
  }>({ open: false, user: null });
  const [passwordState, setPasswordState] = useState<{
    open: boolean;
    user: AdminUser | null;
  }>({ open: false, user: null });

  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    enabled: canManageUsers,
    queryFn: () => apiRequest<AdminUser[]>("/api/admin/users")
  });

  const editorForm = useForm<UserEditorValues>({
    resolver: zodResolver(userEditorSchema),
    defaultValues: {
      email: "",
      name: "",
      role: "viewer",
      isActive: true,
      password: ""
    }
  });
  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: ""
    }
  });

  const saveUserMutation = useMutation({
    mutationFn: async (values: UserEditorValues) => {
      if (!editorState.user) {
        if (!values.password || values.password.length < 8) {
          editorForm.setError("password", {
            message: "Password must be at least 8 characters"
          });
          throw new Error("Password must be at least 8 characters");
        }

        return apiRequest<AdminUser>("/api/admin/users", {
          method: "POST",
          csrfToken,
          body: {
            email: values.email,
            name: values.name,
            role: values.role,
            isActive: values.isActive,
            password: values.password
          }
        });
      }

      return apiRequest<AdminUser>(`/api/admin/users/${editorState.user.id}`, {
        method: "PATCH",
        csrfToken,
        body: {
          email: values.email,
          name: values.name,
          role: values.role,
          isActive: values.isActive
        }
      });
    },
    onSuccess: async () => {
      setEditorState({ open: false, user: null });
      editorForm.reset({
        email: "",
        name: "",
        role: "viewer",
        isActive: true,
        password: ""
      });
      setRequestError(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.users });
      pushToast("User saved");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  const setPasswordMutation = useMutation({
    mutationFn: (values: PasswordValues) => {
      if (!passwordState.user) {
        throw new Error("No user selected");
      }

      return apiRequest<void>(`/api/admin/users/${passwordState.user.id}/set-password`, {
        method: "POST",
        csrfToken,
        body: values
      });
    },
    onSuccess: async () => {
      setPasswordState({ open: false, user: null });
      passwordForm.reset({ password: "" });
      setRequestError(undefined);
      pushToast("Password updated");
    },
    onError: (error) => setRequestError(getErrorMessage(error))
  });

  function openEditor(targetUser?: AdminUser) {
    setEditorState({
      open: true,
      user: targetUser ?? null
    });
    editorForm.reset({
      email: targetUser?.email ?? "",
      name: targetUser?.name ?? "",
      role: targetUser?.role ?? "viewer",
      isActive: targetUser?.isActive ?? true,
      password: ""
    });
  }

  function openPasswordDrawer(targetUser: AdminUser) {
    setPasswordState({
      open: true,
      user: targetUser
    });
    passwordForm.reset({ password: "" });
  }

  if (!canManageUsers) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="User Management"
          description="Only superadmin users can create, edit, and secure admin accounts."
        />
        <EmptyState
          title="Access restricted"
          description="Your current role does not allow access to user management."
        />
      </div>
    );
  }

  const users = usersQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage admin accounts, role assignments, access state, and password resets."
        actions={
          <Button onClick={() => openEditor()}>
            <Plus className="h-4 w-4" />
            Add user
          </Button>
        }
      />
      <BackendErrorAlert message={requestError} />
      {users.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Create the first admin user for this environment."
        />
      ) : (
        <Card>
          <TableWrapper>
            <Table>
              <thead className="bg-[color:var(--dd-panel-strong)] text-xs uppercase tracking-[0.18em] text-[color:var(--dd-muted)]">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last login</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id} className="border-t border-[color:var(--dd-border)]">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[color:var(--dd-text)]">
                        {item.name}
                      </div>
                      <div className="text-sm text-[color:var(--dd-muted)]">{item.email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-[color:var(--dd-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                        {item.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                          item.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[color:var(--dd-muted)]">
                      {formatDate(item.lastLoginAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="secondary" onClick={() => openEditor(item)}>
                          <UserCog className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button variant="ghost" onClick={() => openPasswordDrawer(item)}>
                          <KeyRound className="h-4 w-4" />
                          Password
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        </Card>
      )}
      <DrawerForm
        open={editorState.open}
        onOpenChange={(open) => setEditorState((current) => ({ ...current, open }))}
        title={editorState.user ? "Edit user" : "Create user"}
      >
        <form className="space-y-5" onSubmit={editorForm.handleSubmit((values) => saveUserMutation.mutate(values))}>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Name" error={editorForm.formState.errors.name?.message}>
              <Input {...editorForm.register("name")} />
            </FormField>
            <FormField label="Email" error={editorForm.formState.errors.email?.message}>
              <Input type="email" {...editorForm.register("email")} />
            </FormField>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Role" error={editorForm.formState.errors.role?.message}>
              <Select {...editorForm.register("role")}>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Select>
            </FormField>
            {!editorState.user ? (
              <FormField label="Password" error={editorForm.formState.errors.password?.message}>
                <Input type="password" {...editorForm.register("password")} />
              </FormField>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--dd-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-[color:var(--dd-text)]">Active account</div>
              <div className="text-sm text-[color:var(--dd-muted)]">
                Disable access without deleting the user record.
              </div>
            </div>
            <Switch
              checked={editorForm.watch("isActive")}
              onCheckedChange={(nextValue) => editorForm.setValue("isActive", nextValue)}
            />
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditorState({ open: false, user: null })}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveUserMutation.isPending}>
              {saveUserMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DrawerForm>
      <DrawerForm
        open={passwordState.open}
        onOpenChange={(open) => setPasswordState((current) => ({ ...current, open }))}
        title={`Set password${passwordState.user ? ` for ${passwordState.user.name}` : ""}`}
      >
        <form className="space-y-5" onSubmit={passwordForm.handleSubmit((values) => setPasswordMutation.mutate(values))}>
          <FormField label="New password" error={passwordForm.formState.errors.password?.message}>
            <Input type="password" {...passwordForm.register("password")} />
          </FormField>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setPasswordState({ open: false, user: null })}>
              Cancel
            </Button>
            <Button type="submit" disabled={setPasswordMutation.isPending}>
              {setPasswordMutation.isPending ? "Saving..." : "Update password"}
            </Button>
          </div>
        </form>
      </DrawerForm>
    </div>
  );
}
