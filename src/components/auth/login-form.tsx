"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { isUserRole } from "@/lib/auth/roles";
import { resolvePostLoginHref } from "@/lib/auth/paths";
import { loginSchema } from "@/lib/auth/schemas";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

type LoginCopy = Dictionary["auth"]["login"];

const fieldClass =
  "w-full min-w-0 rounded-xl border border-hairline bg-white px-3.5 py-3 text-base text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15";

interface LoginFormProps {
  locale: Locale;
  copy: LoginCopy;
}

export function LoginForm({ locale, copy }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(copy.error);
      return;
    }

    setPending(true);

    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    if (!result?.ok) {
      setPending(false);
      setError(copy.error);
      return;
    }

    const session = await getSession();
    const role = session?.user.role;
    if (!isUserRole(role)) {
      setPending(false);
      setError(copy.error);
      return;
    }

    router.replace(
      resolvePostLoginHref(role, locale, searchParams.get("callbackUrl")),
    );
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="text-sm font-medium text-ink">
          {copy.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={copy.emailPlaceholder}
          className={`${fieldClass} mt-1.5`}
          required
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-ink">
          {copy.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={copy.passwordPlaceholder}
          className={`${fieldClass} mt-1.5`}
          required
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-brass-strong">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-full bg-navy px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-strong disabled:opacity-70"
      >
        {pending ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}
