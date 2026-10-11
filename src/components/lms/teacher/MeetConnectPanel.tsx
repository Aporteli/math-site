import type { Locale } from '@/i18n/config';
import type { MeetConnectNotice } from '@/lib/lesson-room/meet-connect';
import type { MeetConnectionView } from '@/lib/lesson-room/meet-connect-flow';

const NOTICES: Record<MeetConnectNotice, string> = {
  connected: 'Google Meet დაკავშირებულია ამ ანგარიშზე.',
  kept: 'Google-მა ახალი refresh token არ დააბრუნა. არსებული კავშირი შენარჩუნებულია.',
  denied: 'Google-თან დაკავშირება გაუქმდა.',
  missing_refresh: 'Google-მა refresh token არ დააბრუნა. კავშირი არ შენახულა.',
  invalid: 'Google Meet-ის დაკავშირება ვერ მოხერხდა. სცადეთ თავიდან.',
  disconnected: 'Google Meet გათიშულია.',
  unconfigured: 'სერვერზე Google Meet-ის დაკავშირება ჯერ არ არის ჩართული.',
  unavailable: 'Google Meet-ის სტატუსი ამჟამად მიუწვდომელია.',
};

export function MeetConnectPanel({
  locale,
  connection,
  notice,
  configured,
}: {
  locale: Locale;
  connection: MeetConnectionView;
  notice: MeetConnectNotice | null;
  configured: boolean;
}) {
  const connected = connection.status === 'connected';
  const unavailable = connection.status === 'unavailable';
  if (unavailable && !notice) return null;
  const status = connected
    ? connection.googleEmail
      ? `დაკავშირებულია: ${connection.googleEmail}`
      : 'დაკავშირებულია'
    : unavailable
      ? 'სტატუსი მიუწვდომელია'
      : 'თქვენი Google ანგარიში ჯერ არ არის დაკავშირებული';

  return (
    <section className="mb-4 rounded-box border border-hairline bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold">Google Meet</h2>
          <p className="text-xs text-muted">
            {status}. შეხვედრის Google ანგარიში შეიძლება განსხვავდებოდეს შესვლის ელფოსტისგან.
          </p>
        </div>
        {unavailable ? null : (
          <div className="flex flex-wrap gap-2">
            {configured ? (
              <form method="post" action="/api/google/meet/connect">
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="rounded-box border border-hairline px-3 py-2 text-sm font-bold">
                  {connected ? 'თავიდან დაკავშირება' : 'დაკავშირება'}
                </button>
              </form>
            ) : null}
            {connected ? (
              <form method="post" action="/api/google/meet/disconnect">
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="rounded-box border border-hairline px-3 py-2 text-sm font-bold">
                  გათიშვა
                </button>
              </form>
            ) : null}
          </div>
        )}
      </div>
      {notice ? (
        <p role="status" className="mt-2 text-xs font-bold text-ink">
          {NOTICES[notice]}
        </p>
      ) : null}
      {!configured && !unavailable && notice !== 'unconfigured' ? (
        <p className="mt-2 text-xs text-muted">სერვერზე Google Meet-ის დაკავშირება ჯერ არ არის ჩართული.</p>
      ) : null}
    </section>
  );
}
