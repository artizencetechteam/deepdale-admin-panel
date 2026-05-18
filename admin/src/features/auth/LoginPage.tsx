import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { BackendErrorAlert } from "../../components/ui/backend-error-alert";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FormField, Input } from "../../components/ui/field";
import { useAuth } from "../../lib/auth-store";
import { getErrorMessage } from "../../lib/form-errors";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [requestError, setRequestError] = useState<string>();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@deepdale.local",
      password: "ChangeMe123!"
    }
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      setRequestError(undefined);
      await login(values.email, values.password);
      navigate("/");
    } catch (error) {
      setRequestError(getErrorMessage(error, "Unable to sign in"));
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-80 w-80 rounded-full bg-teal-500/18 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-amber-500/14 blur-3xl" />
      </div>
      <div className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[1.08fr,0.92fr] lg:gap-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#113635,#0f766e_55%,#d68a25)] p-6 text-white shadow-[0_40px_90px_-42px_rgba(15,118,110,0.95)] sm:p-8 lg:rounded-[2.3rem] lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_24%)]" />
          <div className="relative">
            <div className="inline-flex items-center rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white/72">
              Deepdale
            </div>
            <h1 className="mt-8 max-w-xl text-[2.3rem] font-extrabold leading-tight tracking-[-0.05em] sm:text-4xl lg:text-5xl">
              One admin surface for content, leads, and operations.
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-white/78">
              Sign in with your Deepdale admin account to manage the landing
              page CMS, inbox workflows, and system configuration.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Landing CMS", "All sections in one place"],
                ["Live Inbox", "Recent leads and ops view"],
                ["System Control", "Roles, media, and settings"]
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[1.4rem] border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/62">
                    {label}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Card className="p-6 sm:p-8 lg:p-9">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--dd-accent)]">
              Admin login
            </div>
            <h2 className="text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--dd-text)]">
              Welcome back
            </h2>
            <p className="text-sm leading-6 text-[color:var(--dd-muted)]">
              Use the credentials seeded for your environment or a user created
              from the admin API.
            </p>
          </div>
          <form
            className="mt-8 space-y-5"
            onSubmit={form.handleSubmit((values) => onSubmit(values))}
          >
            <BackendErrorAlert message={requestError} />
            <FormField
              label="Email"
              error={form.formState.errors.email?.message}
            >
              <Input
                type="email"
                placeholder="admin@deepdale.local"
                {...form.register("email")}
              />
            </FormField>
            <FormField
              label="Password"
              error={form.formState.errors.password?.message}
            >
              <Input
                type="password"
                placeholder="Your password"
                {...form.register("password")}
              />
            </FormField>
            <Button
              type="submit"
              className="w-full"
              loading={form.formState.isSubmitting}
            >
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
