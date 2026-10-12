'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, TriangleAlert, Video, X } from 'lucide-react';
import {
  createLessonMeetAction,
  createLessonMiroAction,
  getLessonRoomAction,
  saveLessonLinksAction,
  type LessonRoomView,
} from '@/lib/actions/lesson-room';
import { miroLiveEmbedUrl } from '@/lib/lesson-room/links';

interface LessonRoomProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
}

export function LessonRoom({ courseId, courseTitle, onClose }: LessonRoomProps) {
  const [room, setRoom] = useState<LessonRoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [meetDraft, setMeetDraft] = useState('');
  const [miroDraft, setMiroDraft] = useState('');
  const replaceInFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getLessonRoomAction(courseId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setRoom(null);
      } else {
        setRoom(result.room);
        setError(null);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  async function run(action: () => Promise<{ ok: true; room: LessonRoomView } | { ok: false; error: string }>) {
    setPending(true);
    setError(null);
    const result = await action();
    if (!result.ok) setError(result.error);
    else {
      setRoom(result.room);
      setMeetDraft('');
      setMiroDraft('');
    }
    setPending(false);
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-paper text-ink">
      <header className="flex items-center justify-between gap-3 border-b border-hairline bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">გაკვეთილი</p>
          <h2 className="truncate text-lg font-bold">{courseTitle}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-box border border-hairline bg-white text-ink"
          aria-label="დახურვა">
          <X className="size-5" />
        </button>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted" />
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3 border-b border-hairline bg-surface px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold">Google Meet</p>
              <p className="text-xs text-muted">
                Meet იხსნება ახალ ფანჯარაში. Google არ იძლევა შეხვედრის ჩასმას ამ გვერდზე.
              </p>
              {room?.meetUrl ? (
                <p className="mt-1 text-sm font-bold text-ink">ამ ჯგუფისთვის Meet-ის ბმული უკვე შექმნილია</p>
              ) : room ? (
                <p className="mt-1 text-sm font-bold text-muted">ამ ჯგუფისთვის Meet-ის ბმული ჯერ არ შექმნილა</p>
              ) : null}
            </div>
            {room?.meetUrl ? (
              <a
                href={room.meetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-box bg-[#465D73] px-4 py-3 text-sm font-bold text-white">
                <Video className="size-4" />
                Meet-ში შესვლა
              </a>
            ) : null}
          </section>

          {room?.canWrite ? (
            <form
              className="grid gap-3 border-b border-hairline bg-white px-4 py-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void run(() => saveLessonLinksAction(courseId, { meetUrl: meetDraft, miroBoard: miroDraft }));
              }}>
              <label className="flex flex-col gap-1 text-xs font-bold text-muted">
                Meet-ის ბმული
                <input
                  value={meetDraft}
                  onChange={(event) => setMeetDraft(event.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="rounded-box border border-hairline px-3 py-2 text-sm font-normal text-ink"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-muted">
                Miro დაფის ბმული
                <input
                  value={miroDraft}
                  onChange={(event) => setMiroDraft(event.target.value)}
                  placeholder="https://miro.com/app/board/..."
                  className="rounded-box border border-hairline px-3 py-2 text-sm font-normal text-ink"
                />
              </label>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-box border border-hairline px-3 py-2 text-sm font-bold disabled:opacity-50">
                  ბმულების შენახვა
                </button>
                <button
                  type="button"
                  disabled={pending || !room.meetApiReady}
                  onClick={() => void run(() => createLessonMeetAction(courseId))}
                  className="rounded-box border border-hairline px-3 py-2 text-sm font-bold disabled:opacity-50">
                  Meet-ის შექმნა
                </button>
                {room.meetUrl && room.meetApiReady ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (replaceInFlight.current) return;
                      replaceInFlight.current = true;
                      void run(() => createLessonMeetAction(courseId, { replace: true })).finally(() => {
                        replaceInFlight.current = false;
                      });
                    }}
                    className="rounded-box border border-hairline px-3 py-2 text-sm font-bold disabled:opacity-50">
                    ახალი Meet-ის შექმნა
                  </button>
                ) : null}
                {room.meetUrl && room.meetApiReady ? (
                  <p className="flex w-full items-start gap-1.5 text-xs font-bold text-red-700">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    ახალი Meet-ის შექმნა შენახულ ბმულს ჩაანაცვლებს. მოსწავლეებმა ახალი ბმული უნდა გამოიყენონ.
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={pending || !room.miroApiReady}
                  onClick={() => void run(() => createLessonMiroAction(courseId))}
                  className="rounded-box border border-hairline px-3 py-2 text-sm font-bold disabled:opacity-50">
                  Miro დაფის შექმნა
                </button>
              </div>
              {!room.meetApiReady || !room.miroApiReady ? (
                <p className="text-xs text-muted md:col-span-2">
                  ავტომატური შექმნა ჩართულია მხოლოდ მაშინ, როცა სერვერზე წერია Google Meet-ის refresh token და Miro-ს access token. მანამდე ჩასვით ოფიციალური ბმულები.
                </p>
              ) : null}
            </form>
          ) : null}

          {error ? (
            <p role="alert" className="px-4 py-2 text-sm font-bold text-red-700">
              {error}
            </p>
          ) : null}

          <section className="min-h-0 flex-1 bg-white">
            {room?.miroBoardId ? (
              <iframe
                title={`${courseTitle} Miro`}
                src={miroLiveEmbedUrl(room.miroBoardId)}
                className="h-full w-full border-0"
                allow="fullscreen; clipboard-read; clipboard-write"
                allowFullScreen
              />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
