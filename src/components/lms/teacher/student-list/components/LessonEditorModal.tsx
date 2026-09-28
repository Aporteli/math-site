'use client';

import { useState, useTransition } from 'react';

import { Clock3, Plus, Trash2, X } from 'lucide-react';

import { DAY_LABELS } from '../studentList.helpers';

import type { LessonSlot, StudentGroup, StudentRecord } from '../studentList.types';

interface Props {
  student: StudentRecord;
  groups: StudentGroup[];
  groupMemberCounts?: Record<string, number>;
  open: boolean;
  embedded?: boolean;
  onClose: () => void;
  onAdd: (input: {
    studentId: string;
    groupId: string;
    dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    startTime: string;
    endTime: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (lessonId: string) => Promise<{ ok: boolean; error?: string }>;
}

const DAYS: (1 | 2 | 3 | 4 | 5 | 6 | 7)[] = [1, 2, 3, 4, 5, 6, 7];
const DAY_SHORT_KA = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი'];

export function LessonEditorModal({
  student,
  groups,
  groupMemberCounts = {},
  open,
  embedded = false,
  onClose,
  onAdd,
  onDelete,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [groupId, setGroupId] = useState(student.groupIds[0] ?? '');
  const [dayOfWeek, setDayOfWeek] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:30');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const isIndividual = student.kind === 'individual';
  const inHomeGroup = isIndividual && Boolean(student.homeGroupId);
  const homeGroupName = groups.find((g) => g.id === student.homeGroupId)?.name;

  const handleAdd = () => {
    setError(null);

    if (!isIndividual && !groupId) {
      setError('აირჩიე ჯგუფი');
      return;
    }

    if (startTime >= endTime) {
      setError('დაწყების დრო უნდა იყოს დასრულების დროზე ადრე');
      return;
    }

    startTransition(async () => {
      const res = await onAdd({
        studentId: student.id,
        groupId: isIndividual ? '' : groupId,
        dayOfWeek,
        startTime,
        endTime,
      });

      if (!res.ok) {
        setError(res.error ?? 'შეცდომა');
        return;
      }
      setIsAddOpen(false);
    });
  };

  const handleDelete = (id: string) => {
    setError(null);

    startTransition(async () => {
      const res = await onDelete(id);

      if (!res.ok) setError(res.error ?? 'შეცდომა');
    });
  };

  const lessonsByDay = new Map<number, LessonSlot[]>();

  student.lessons.forEach((l) => {
    const arr = lessonsByDay.get(l.dayOfWeek) ?? [];
    arr.push(l);
    lessonsByDay.set(l.dayOfWeek, arr);
  });

  return (
    <div
      className={
        embedded
          ? 'flex h-full min-h-0 min-w-0 flex-1'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-3 backdrop-blur-[2px] sm:p-4'
      }
      onClick={embedded ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal={embedded ? undefined : true}
        aria-labelledby="lesson-editor-title"
        className={
          embedded
            ? 'flex h-full min-h-0 w-full flex-col overflow-hidden rounded-box border border-hairline bg-surface shadow-sm'
            : 'flex max-h-[min(92dvh,100%)] w-full max-w-lg flex-col overflow-hidden rounded-box border border-hairline bg-surface shadow-xl'
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-box border border-hairline bg-brass-strong/90 text-paper">
              <Clock3 className="h-4 w-4" />
            </span>

            <div className="min-w-0">
              <h2 id="lesson-editor-title" className="text-sm font-bold text-ink mb-1">
                {isIndividual ? student.firstName + ' ' + student.lastName : groups.find((g) => g.id === (groupId || student.groupIds[0]))?.name ??
                      'ჯგუფი'}
              </h2>

              <p className="truncate text-[11px] font-medium text-muted">
                {isIndividual ? (
                  <>
                    <span className=" text-brass-strong">
                      {inHomeGroup ? `სახლში · ${homeGroupName ?? 'ჯგუფი'}` : 'სახლში'}
                    </span>
                    {inHomeGroup && groupMemberCounts[student.homeGroupId ?? ''] ? (
                      <span className="text-brass-strong">
                        {' '}
                        · {groupMemberCounts[student.homeGroupId ?? '']} მოსწავლე
                      </span>
                    ) : null}
                  </>
                ) : (
                  <>
                    {groupMemberCounts[groupId || student.groupIds[0]] ? (
                      <span className=" text-navy">
                      {groupMemberCounts[groupId || student.groupIds[0]]} მოსწავლე
                      </span>
                    ) : null}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setIsAddOpen(true);
                setError(null);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-box border border-navy/30 bg-navy-tint px-2.5 py-2 text-[11px] font-bold text-navy transition hover:bg-navy-tint/80"
            >
              <Plus className="h-3.5 w-3.5" />
              ახალი გაკვეთილი
            </button>
            {embedded ? null : (
              <button
                type="button"
                onClick={onClose}
                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-box text-muted transition hover:bg-paper hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
          {/* არსებული გაკვეთილები */}
          <div className="mb-4">
            <p className="mb-2 text-[11px] font-bold tracking-wide text-muted">
              არსებული გაკვეთილები
            </p>

            {student.lessons.length === 0 ? (
              <p className="rounded-box border border-dashed border-hairline bg-paper px-3 py-4 text-center text-xs text-muted">
                ჯერ არ არის დამატებული
              </p>
            ) : (
              <div className="space-y-1.5">
                {DAYS.map((d) => {
                  const dayLessons = lessonsByDay.get(d) ?? [];

                  if (dayLessons.length === 0) return null;

                  return (
                    <div
                      key={d}
                      className="rounded-box border border-hairline bg-paper p-2.5"
                    >
                      <div className="space-y-1">
                        <p className="mb-1.5 text-[11px] font-bold text-ink">
                          {DAY_LABELS[d]}
                        </p>

                        {dayLessons.map((l) => {
                          return (
                            <div
                              key={l.id}
                              className="flex items-center justify-between gap-2 rounded-box px-2.5 py-1.5"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="text-xs font-bold text-navy">
                                  {l.startTime}–{l.endTime}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDelete(l.id)}
                                disabled={isPending}
                                className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-box text-muted transition hover:bg-loss-tint hover:text-loss disabled:opacity-40"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!isAddOpen && error ? (
              <p className="mt-2 rounded-box bg-loss-tint px-2.5 py-1.5 text-[11px] font-bold text-loss">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {isAddOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 p-3 backdrop-blur-[2px]"
          onClick={(e) => {
            e.stopPropagation();
            setIsAddOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal
            aria-label="ახალი გაკვეთილი"
            className="w-full max-w-sm space-y-2.5 rounded-box border border-hairline bg-surface p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink">
                <Plus className="h-3.5 w-3.5 text-navy" />
                ახალი გაკვეთილი
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-box text-muted transition hover:bg-paper hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!isIndividual || inHomeGroup ? (
              <p
                className={`rounded-box border px-2.5 py-2 text-[11px] font-medium leading-snug text-muted ${
                  inHomeGroup ? 'border-brass/30 bg-brass-tint/40' : 'border-navy/15 bg-paper'
                }`}
              >
                ეს დრო დაემატება ჯგუფის ყველა მოსწავლეს. გადახდები რჩება ცალ-ცალკე.
              </p>
            ) : null}

            {!isIndividual && (
              <div>
                <label className="mb-1 block text-[10px] font-bold text-muted">ჯგუფი</label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full rounded-box border border-hairline bg-surface px-3 py-2 text-sm font-bold text-ink outline-none focus:border-navy/50 focus:ring-2 focus:ring-navy/15"
                >
                  {student.groupIds.map((gid) => (
                    <option key={gid} value={gid}>
                      {groups.find((g) => g.id === gid)?.name ?? gid}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-[10px] font-bold text-muted">დღე</label>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDayOfWeek(d)}
                    className={`min-h-9 cursor-pointer rounded-box border px-0.5 py-1.5 text-[10px] font-bold transition ${
                      dayOfWeek === d
                        ? 'border-navy bg-navy text-white'
                        : 'border-hairline bg-surface text-body hover:border-navy/40'
                    }`}
                  >
                    {DAY_SHORT_KA[d - 1]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-muted">დაწყება</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-box border border-hairline bg-surface px-3 py-2 text-sm font-bold text-ink outline-none focus:border-navy/50 focus:ring-2 focus:ring-navy/15"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-muted">დასრულება</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-box border border-hairline bg-surface px-3 py-2 text-sm font-bold text-ink outline-none focus:border-navy/50 focus:ring-2 focus:ring-navy/15"
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-box bg-loss-tint px-2.5 py-1.5 text-[11px] font-bold text-loss">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending}
              className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-box bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-strong disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              {isPending ? 'ინახება...' : 'დამატება'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}