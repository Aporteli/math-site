import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { localePath } from '@/i18n/config';
import type { AuthEntryProps } from './types';

export function AuthEntry({ locale, loginLabel, signOutLabel, session, withText = false }: AuthEntryProps) {
  if (session) {
    return <SignOutButton locale={locale} label={signOutLabel} variant="header" />;
  }

  return (
    <Link
      href={localePath(locale, '/login')}
      aria-label={loginLabel}
      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-navy px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-navy-strong sm:px-4">
      <LogIn className="size-4 shrink-0" aria-hidden="true" />
      <span className={withText ? 'inline' : 'hidden sm:inline'}>{loginLabel}</span>
    </Link>
  );
}
