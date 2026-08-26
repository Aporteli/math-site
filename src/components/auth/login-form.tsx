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

  function handleGoogleSignIn() {
  const callbackUrl = searchParams.get("callbackUrl") || `/${locale}`;
  signIn("google", { callbackUrl });
}

  return (
    <div className="space-y-4">
      {/* Google Sign In Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-hairline bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-navy/15"
      >
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Google-ით შესვლა</span>
      </button>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-hairline" />
        <span className="absolute bg-[#FBFBFA] px-3 text-xs uppercase text-muted">
          ან
        </span>
      </div>

      {/* Credentials Form */}
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
    </div>
  );
}
