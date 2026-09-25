'use client';

import { useState, useTransition } from 'react';
import { User2, X, Save, Trash2, Phone, Users } from 'lucide-react';
import type { PriceType, StudentRecord } from '../studentList.types';
import { PRICE_TYPE_OPTIONS, PRICE_TYPE_LABELS } from '../studentList.helpers';

interface Props {
  open: boolean;
  student: StudentRecord | null;
  onClose: () => void;
  onCreate: (input: {
    firstName: string;
    lastName: string;
    phone?: string;
    parentPhone?: string;
    email?: string;
    monthlyPrice?: number;
    priceType?: PriceType;
    note?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onUpdate: (
    studentId: string,
    patch: Partial<StudentRecord>,
  ) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (studentId: string) => Promise<{ ok: boolean; error?: string }>;
}

export function IndividualStudentModal({
  open,
  student,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState(student?.firstName ?? '');
  const [lastName, setLastName] = useState(student?.lastName ?? '');
  const [phone, setPhone] = useState(student?.phone ?? '');
  const [parentPhone, setParentPhone] = useState(student?.parentPhone ?? '');
  const [email, setEmail] = useState(student?.email ?? '');
  const [monthlyPrice, setMonthlyPrice] = useState(
    student?.monthlyPrice ? String(student.monthlyPrice) : '',
  );
  const [priceType, setPriceType] = useState<PriceType>(
    student?.priceType ?? 'MONTHLY',
  );
  const [note, setNote] = useState(student?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;
  const isEdit = Boolean(student);

  const handleSave = () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError('სახელი და გვარი სავალდებულოა');
      return;
    }

    startTransition(async () => {
      if (isEdit && student) {
        const res = await onUpdate(student.id, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || '',
          parentPhone: parentPhone.trim() || undefined,
          email: email.trim() || undefined,
          monthlyPrice: monthlyPrice ? Number(monthlyPrice) : 0,
          priceType,
          note: note.trim() || undefined,
        });
        if (!res.ok) {
          setError(res.error ?? 'შეცდომა');
          return;
        }
      } else {
        const res = await onCreate({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
          parentPhone: parentPhone.trim() || undefined,
          email: email.trim() || undefined,
          monthlyPrice: monthlyPrice ? Number(monthlyPrice) : 0,
          priceType,
          note: note.trim() || undefined,
        });
        if (!res.ok) {
          setError(res.error ?? 'შეცდომა');
          return;
        }
      }
      onClose();
    });
  };

  const handleDelete = () => {
    if (!student) return;
    if (!confirm('ნამდვილად წაიშალოს ეს მოსწავლე და მისი ყველა გადახდა?')) return;

    startTransition(async () => {
      const res = await onDelete(student.id);
      if (!res.ok) {
        setError(res.error ?? 'შეცდომა');
        return;
      }
      onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-3 backdrop-blur-[2px] sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[min(92dvh,100%)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-hairline bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-xl border border-hairline bg-brass-tint text-brass-strong">
              <User2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-ink">
                {isEdit ? ' მოსწავლის რედაქტირება' : ' მოსწავლის დამატება'}
              </h2>
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

        <div className="custom-scrollbar space-y-3 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="სახელი"
                className="w-full rounded-xl border border-hairline bg-paper px-3 py-2.5 text-base font-bold text-ink outline-none focus:border-navy/50 focus:bg-surface focus:ring-2 focus:ring-navy/15 sm:text-sm"
              />
            </div>
            <div>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="გვარი"
                className="w-full rounded-xl border border-hairline bg-paper px-3 py-2.5 text-base font-bold text-ink outline-none focus:border-navy/50 focus:bg-surface focus:ring-2 focus:ring-navy/15 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-muted">
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="ტელეფონი"
              className="w-full rounded-xl border border-hairline bg-paper px-3 py-2.5 text-base font-bold text-ink outline-none focus:border-navy/50 focus:bg-surface focus:ring-2 focus:ring-navy/15 sm:text-sm"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-muted">
            </label>
            <input
              type="tel"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="მშობლის ტელეფონი"
              className="w-full rounded-xl border border-hairline bg-paper px-3 py-2.5 text-base font-bold text-ink outline-none focus:border-navy/50 focus:bg-surface focus:ring-2 focus:ring-navy/15 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="number"
                min={0}
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
                placeholder="ფასი"
                className="w-full rounded-xl border border-hairline bg-paper px-3 py-2.5 text-base font-bold text-ink outline-none focus:border-navy/50 focus:bg-surface focus:ring-2 focus:ring-navy/15 sm:text-sm"
              />
            </div>
            <div>
              <select
                value={priceType}
                onChange={(e) => setPriceType(e.target.value as PriceType)}
                className="w-full rounded-xl border border-hairline bg-paper px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-navy/50 focus:bg-surface focus:ring-2 focus:ring-navy/15"
              >
                {PRICE_TYPE_OPTIONS.map((pt) => (
                  <option key={pt} value={pt}>
                    {PRICE_TYPE_LABELS[pt]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ელფოსტა"
              className="w-full rounded-xl border border-hairline bg-paper px-3 py-2.5 text-base text-ink outline-none focus:border-navy/50 focus:bg-surface focus:ring-2 focus:ring-navy/15 sm:text-sm"
            />
          </div>

          <div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="შენიშვნა"
              className="w-full resize-none rounded-xl border border-hairline bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-navy/50 focus:bg-surface focus:ring-2 focus:ring-navy/15"
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-loss-tint px-3 py-2 text-[11px] font-bold text-loss">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-hairline bg-paper/50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-between sm:px-5">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-loss/30 bg-loss-tint px-4 py-2.5 text-sm font-bold text-loss transition hover:bg-loss/20 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              წაშლა
            </button>
          ) : (
            <span />
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
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
              {isPending ? 'ინახება...' : isEdit ? 'შენახვა' : 'დამატება'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}