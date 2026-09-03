'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, signIn } from 'next-auth/react';
import { isUserRole } from '@/lib/auth/roles';
import { resolvePostLoginHref } from '@/lib/auth/paths';
import { signupSchema } from '@/lib/auth/schemas';
import {
  sendSignupOtpAction,
  verifyAndCreateUserAction,
} from '@/app/[locale]/(auth)/signup/actions';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';

type SignupCopy = Dictionary['auth']['signup'];

const fieldClass =
  'w-full min-w-0 rounded-xl border border-hairline bg-white px-3.5 py-3 text-base text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15';

interface SignupFormProps {
  locale: Locale;
  copy: SignupCopy;
}

export function SignupForm({ locale, copy }: SignupFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<'DETAILS' | 'OTP'>('DETAILS');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // ეტაპი 1: ფორმის შემოწმება და OTP კოდის გაგზავნა
  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = signupSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
    });

    if (!parsed.success) {
      setError(copy.error);
      return;
    }

    setPending(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('confirmPassword', confirmPassword);

    const result = await sendSignupOtpAction(formData);
    setPending(false);

    if (!result.success) {
      setError(
        result.error === 'Email already exists' ? copy.emailExists : copy.error,
      );
      return;
    }

    setStep('OTP');
  }

  // ეტაპი 2: კოდის გადამოწმება, იუზერის შექმნა და ავტომატური ლოგინი
  async function handleVerifyAndRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('confirmPassword', confirmPassword);
    formData.append('code', code);

    const result = await verifyAndCreateUserAction(formData);

    if (!result.success) {
      setPending(false);
      setError(copy.error);
      return;
    }

    // ავტომატური შესვლა რეგისტრაციის წარმატებით გავლის შემდეგ
    const signInResult = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (!signInResult?.ok) {
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

    router.replace(resolvePostLoginHref(role, locale, null));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {step === 'DETAILS' ? (
        <form onSubmit={handleSendCode} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="text-sm font-medium text-ink">
              {copy.name}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={copy.namePlaceholder}
              className={`${fieldClass} mt-1.5`}
              required
            />
          </div>
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
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={copy.passwordPlaceholder}
              className={`${fieldClass} mt-1.5`}
              required
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="text-sm font-medium text-ink">
              {copy.confirmPassword}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={copy.confirmPasswordPlaceholder}
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
            {pending ? copy.submitting : 'კოდის მიღება'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyAndRegister} className="space-y-4" noValidate>
          <div className="rounded-xl bg-slate-50 p-3 text-center text-sm text-ink/80">
            ვერიფიკაციის კოდი გაიგზავნა მისამართზე:
            <br />
            <strong>{email}</strong>
          </div>

          <div>
            <label htmlFor="code" className="text-sm font-medium text-ink">
              6-ნიშნა კოდი
            </label>
            <input
              id="code"
              name="code"
              type="text"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456"
              className={`${fieldClass} mt-1.5 text-center text-xl font-bold tracking-widest`}
              required
              autoFocus
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-brass-strong text-center">
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

          <button
            type="button"
            onClick={() => setStep('DETAILS')}
            className="w-full text-center text-xs text-muted hover:text-ink transition-colors"
          >
            მონაცემების რედაქტირება
          </button>
        </form>
      )}
    </div>
  );
}