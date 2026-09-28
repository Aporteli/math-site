'use client';

import { useEffect, useState, useTransition } from 'react';
import { Mail, Phone, Save, Users } from 'lucide-react';
import type { StudentRecord } from '../studentList.types';

interface Props {
  student: StudentRecord;
  onSave: (
    studentId: string,
    phone: string | null,
    parentPhone: string | null,
    email: string | null,
  ) => Promise<{ ok: boolean; error?: string }>;
}

export function StudentContactCard({ student, onSave }: Props) {
  const [isPending, startTransition] = useTransition();
  const [phone, setPhone] = useState(student.phone ?? '');
  const [parentPhone, setParentPhone] = useState(student.parentPhone ?? '');
  const [email, setEmail] = useState(student.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPhone(student.phone ?? '');
    setParentPhone(student.parentPhone ?? '');
    setEmail(student.email ?? '');
  }, [student.phone, student.parentPhone, student.email]);

  const handleSave = () => {
    setError(null);
    setSaved(false);
    if (phone.trim() && !/[0-9]/.test(phone)) {
      setError('მოსწავლის ტელეფონი უნდა შეიცავდეს ციფრებს');
      return;
    }
    if (parentPhone.trim() && !/[0-9]/.test(parentPhone)) {
      setError('მშობლის ტელეფონი უნდა შეიცავდეს ციფრებს');
      return;
    }

    startTransition(async () => {
      const res = await onSave(student.id, phone.trim() || null, parentPhone.trim() || null, email.trim() || null);
      if (!res.ok) {
        setError(res.error ?? 'შეცდომა');
        return;
      }
      setSaved(true);
    });
  };

  return (
    <div className="overflow-hidden rounded-box border border-hairline bg-surface shadow-sm">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-hairline px-4 py-3">
        <span className="inline-flex size-8 items-center justify-center rounded-box bg-navy-tint text-navy">
          <Phone className="size-3.5" />
        </span>
        <p className="text-sm font-bold text-ink">ტელეფონი და ელფოსტა</p>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-muted">
            <Phone className="size-3" /> ტელეფონი
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+995 555 12 34 56"
            className="w-full rounded-box border border-hairline bg-paper px-3 py-2 text-sm font-bold text-ink outline-none focus:border-navy"
          />
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-muted">
            <Users className="size-3" /> მშობლის ტელეფონი
          </span>
          <input
            type="tel"
            value={parentPhone}
            onChange={(event) => setParentPhone(event.target.value)}
            placeholder="+995 599 98 76 54"
            className="w-full rounded-box border border-hairline bg-paper px-3 py-2 text-sm font-bold text-ink outline-none focus:border-navy"
          />
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-muted">
            <Mail className="size-3" /> ელფოსტა
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@email.com"
            className="w-full rounded-box border border-hairline bg-paper px-3 py-2 text-sm font-bold text-ink outline-none focus:border-navy"
          />
        </label>

        {error ? <p className="rounded-box bg-loss-tint px-3 py-2 text-[11px] font-bold text-loss">{error}</p> : null}
      </div>

      <div className="flex shrink-0 justify-end border-t border-hairline px-4 py-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-box bg-navy px-3 py-2 text-xs font-bold text-white transition hover:bg-navy-strong disabled:opacity-50"
        >
          <Save className="size-3.5" />
          {isPending ? 'ინახება...' : saved ? 'შენახულია' : 'შენახვა'}
        </button>
      </div>
    </div>
  );
}
