"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import { joinClassWithCodeAction } from "@/app/[locale]/(dashboard)/visitor/actions";

export function JoinClassModal({ locale }: { locale: string }) {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  if (isClosed) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await joinClassWithCodeAction(code);

      if (!res.success) {
        setError(res.error ?? "დაფიქსირდა შეცდომა");
        setPending(false);
        return;
      }

      // Refresh the encrypted NextAuth cookie before navigating. getSession() hits
      // /api/auth/session, which re-runs the jwt callback (fetching the latest role
      // from the DB) and re-encodes + sets the cookie in the browser. This is what
      // makes the proxy/middleware see STUDENT instead of the stale VISITOR role.
      await getSession();

      window.location.href = `/${locale}/student/overview`;
    } catch (err) {
      setError("კავშირის შეცდომა");
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-ink">შეუერთდი კლასს</h2>
        <p className="mt-2 text-sm text-muted">
          შეიყვანეთ მასწავლებლისგან მიღებული კოდი სამუშაო სივრცეში შესასვლელად.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="მაგ: CLASS-1234"
            className="w-full rounded-xl border border-hairline p-3 text-center text-lg font-semibold uppercase tracking-widest focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15"
            required
            disabled={pending}
          />

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-navy py-3 text-sm font-semibold text-white transition hover:bg-navy-strong disabled:opacity-70"
          >
            {pending ? "მოწმდება..." : "შესვლა"}
          </button>

          <button
            type="button"
            onClick={() => setIsClosed(true)}
            className="w-full text-center text-xs text-muted hover:text-ink hover:underline"
          >
            არ მაქვს კოდი, გავაგრძელებ როგორც სტუმარი
          </button>
        </form>
      </div>
    </div>
  );
}