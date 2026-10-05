'use client';

import { useEffect } from 'react';
import { localePath, type Locale } from '@/i18n/config';

const CHECK_MS = 3000;

export function DashboardAccountWatch({ locale }: { locale: Locale }) {
  useEffect(() => {
    let stopped = false;

    async function check() {
      if (document.visibilityState === 'hidden') return;
      try {
        const response = await fetch('/api/auth/account-status', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!response.ok) return;
        const body = (await response.json()) as { active?: boolean };
        if (!stopped && body.active === false) {
          window.location.replace(localePath(locale, '/'));
        }
      } catch {
        // A failed check leaves the open dashboard in place.
      }
    }

    const id = window.setInterval(() => void check(), CHECK_MS);
    function onVisible() {
      if (document.visibilityState === 'visible') void check();
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [locale]);

  return null;
}
