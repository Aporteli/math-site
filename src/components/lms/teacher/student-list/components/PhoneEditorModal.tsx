'use client';

import { useState, useTransition } from 'react';
import { Phone, X, Save, Trash2, User2, Users } from 'lucide-react';
import type { StudentRecord } from '../studentList.types';

interface Props {
  student: StudentRecord;
  open: boolean;
  onClose: () => void;
  onSave: (
    studentId: string,
    phone: string | null,
    parentPhone: string | null,
  ) => Promise<{ ok: boolean; error?: string }>;
}

export function PhoneEditorModal({ student, open, onClose, onSave }: Props) {
  const [isPending, startTransition] = useTransition();
  const [phone, setPhone] = useState(student.phone ?? '');
  const [parentPhone, setParentPhone] = useState(student.parentPhone ?? '');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSave = () => {
    setError(null);

    if (phone.trim() && !/[0-9]/.test(phone)) {
      setError('მოსწავლის ტელეფონი უნდა შეიცავდეს ციფრებს');
      return;
    }
    if (parentPhone.trim() && !/[0-9]/.test(parentPhone)) {
      setError('მშობლის ტელეფონი უნდა შეიცავდეს ციფრებს');
      return;
    }

    startTransition(async () => {
      const res = await onSave(
        student.id,
        phone.trim() || null,
        parentPhone.trim() || null,
      );
      if (!res.ok) {
        setError(res.error ?? 'შეცდომა');
        return;
      }
      onClose();
    });
  };

  const handleClearStudentPhone = () => {
    setPhone('');
    setError(null);
  };

  const handleClearParentPhone = () => {
    setParentPhone('');
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-editor-title"
        className="flex max-h-[min(92dvh,100%)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-hairline bg-surface shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-xl border border-hairline bg-navy-tint text-navy">
              <Phone className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 id="phone-editor-title" className="text-sm font-bold text-ink">ტელეფონის ნომრები</h2>
              <p className="truncate text-[11px] font-medium text-muted">
                {student.firstName} {student.lastName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-paper hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ═══ Body ═══ */}
        <div className="custom-scrollbar space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* მოსწავლის ტელეფონი */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-muted">
              <User2 className="h-3 w-3" /> მოსწავლის ტელეფონი
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+995 555 12 34 56"
                className="w-full rounded-xl border border-hairline bg-paper py-3 pl-9 pr-10 text-base font-bold text-ink outline-none transition placeholder:font-medium placeholder:text-muted focus:border-navy/50 focus:bg-surface focus:ring-2 focus:ring-navy/15 sm:py-2.5 sm:text-sm"
              />
              {phone ? (
                <button
                  type="button"
                  onClick={handleClearStudentPhone}
                  title="წაშლა"
                  className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-loss-tint hover:text-loss"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : null}
            </div>
            {student.phone ? (
              <p className="mt-1 text-[10px] font-medium text-muted">
                მიმდინარე: {student.phone}
              </p>
            ) : (
              <p className="mt-1 text-[10px] font-medium text-muted">
                ჯერ არ არის დამატებული
              </p>
            )}
          </div>

          {/* მშობლის ტელეფონი */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-muted">
              <Users className="h-3 w-3" /> მშობლის ტელეფონი
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="+995 599 98 76 54"
                className="w-full rounded-xl border border-hairline bg-paper py-3 pl-9 pr-10 text-base font-bold text-ink outline-none transition placeholder:font-medium placeholder:text-muted focus:border-navy/50 focus:bg-surface focus:ring-2 focus:ring-navy/15 sm:py-2.5 sm:text-sm"
              />
              {parentPhone ? (
                <button
                  type="button"
                  onClick={handleClearParentPhone}
                  title="წაშლა"
                  className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-loss-tint hover:text-loss"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : null}
            </div>
            {student.parentPhone ? (
              <p className="mt-1 text-[10px] font-medium text-muted">
                მიმდინარე: {student.parentPhone}
              </p>
            ) : (
              <p className="mt-1 text-[10px] font-medium text-muted">
                ჯერ არ არის დამატებული
              </p>
            )}
          </div>

          {error ? (
            <p className="rounded-lg bg-loss-tint px-3 py-2 text-[11px] font-bold text-loss">
              {error}
            </p>
          ) : null}
        </div>

        {/* ═══ Footer ═══ */}
        <div className="flex flex-col-reverse gap-2 border-t border-hairline bg-paper/50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="min-h-10 cursor-pointer rounded-xl border border-hairline bg-surface px-4 py-2.5 text-sm font-bold text-body transition hover:bg-paper disabled:opacity-50"
          >
            გაუქმება
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-navy-strong disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {isPending ? 'ინახება...' : 'შენახვა'}
          </button>
        </div>
      </div>
    </div>
  );
}