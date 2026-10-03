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
      className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-box bg-[#465D73] px-3 py-2 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98] sm:px-4">
      <LogIn className="size-4 shrink-0 text-white" aria-hidden="true" />
      <span className={withText ? 'inline' : 'hidden sm:inline'}>{loginLabel}</span>
    </Link>
  );
}
