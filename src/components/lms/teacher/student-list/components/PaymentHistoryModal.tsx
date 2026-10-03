'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { CalendarDays, Trash2, Wallet, X, Save, Receipt, DollarSign } from 'lucide-react';
import {
  formatMonthLabel,
  getMonthKey,
  shiftMonth,
  computeExpectedForMonth,
  parseMonthKey,
} from '../paymentCalendar.helpers';
import { formatPrice, PRICE_TYPE_OPTIONS, PRICE_TYPE_SHORT } from '../studentList.helpers';
import type { PaymentRecord, PriceType, StudentRecord } from '../studentList.types';

interface Props {
  open: boolean;
  embedded?: boolean;
  student: StudentRecord | null;
  payments: PaymentRecord[];
  onClose: () => void;
  onAddPayment: (input: {
    studentId: string;
    amount: number;
    paidAt: string;
    method?: 'cash' | 'card' | 'transfer';
    note?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDeletePayment: (paymentId: string) => Promise<{ ok: boolean; error?: string }>;
  onUpdateStudent: (id: string, patch: Partial<StudentRecord>) => void;
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'ნაღდი',
  card: 'ბარათი',
  transfer: 'გადარიცხვა',
};

export function PaymentHistoryModal({
  open,
  embedded = false,
  student,
  payments,
  onClose,
  onAddPayment,
  onDeletePayment,
  onUpdateStudent,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [monthKey, setMonthKey] = useState(() => getMonthKey(new Date()));

  const [priceModalOpen, setPriceModalOpen] = useState(false);

  /* ── payment ── */
  const [error, setError] = useState<string | null>(null);

  /* ── student notes ── */
  const [comment, setComment] = useState('');
  const [commentSaved, setCommentSaved] = useState(false);

  /* ── price form ── */
  const [priceDraft, setPriceDraft] = useState('');
  const [priceTypeDraft, setPriceTypeDraft] = useState<PriceType>('MONTHLY');
  const [priceSaved, setPriceSaved] = useState(false);

  const monthPayments = useMemo(
    () =>
      payments
        .filter((p) => p.studentId === student?.id && p.monthKey === monthKey)
        .sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
    [payments, student?.id, monthKey],
  );

  const monthPaid = monthPayments.reduce((s, p) => s + p.amount, 0);

  const { year, month } = parseMonthKey(monthKey);
  const expected = student ? computeExpectedForMonth(student, year, month) : 0;
  const monthOwed = Math.max(0, expected - monthPaid);

  /* ── reset on open/student change ── */
  useEffect(() => {
    if (!open || !student) return;
    setError(null);
    setMonthKey(getMonthKey(new Date()));
    setPriceDraft(String(student.monthlyPrice));
    setPriceTypeDraft(student.priceType ?? 'MONTHLY');
    setPriceSaved(false);
    setPriceModalOpen(false);
    setComment(student.note ?? '');
    setCommentSaved(false);
  }, [open, student?.id]);

  /* ── sync drafts when student updates externally ── */
  useEffect(() => {
    if (!student) return;
    setPriceDraft(String(student.monthlyPrice));
    setPriceTypeDraft(student.priceType ?? 'MONTHLY');
  }, [student?.monthlyPrice, student?.priceType]);

  if (!open || !student) return null;

  /* ─────── Save price + type ─────── */

  const handleSavePrice = () => {
    setError(null);
    const value = Number(priceDraft);
    if (!Number.isFinite(value) || value < 0) {
      setError('შეიყვანე სწორი ფასი');
      return;
    }

    onUpdateStudent(student.id, {
      monthlyPrice: value,
      priceType: priceTypeDraft,
    });

    setPriceSaved(true);
    setTimeout(() => {
      setPriceSaved(false);
      setPriceModalOpen(false);
    }, 800);
  };

  /* ─────── Pay the chosen amount ─────── */
  const handlePay = () => {
    if (monthOwed <= 0) return;
    setError(null);
    startTransition(async () => {
      const res = await onAddPayment({
        studentId: student.id,
        amount: monthOwed,
        paidAt: new Date().toISOString(),
        method: 'cash',
      });
      if (!res.ok) setError(res.error ?? 'შეცდომა');
    });
  };

  const savedNote = (student.note ?? '').trim();
  const noteDirty = comment.trim() !== savedNote;

  const handleSaveComment = () => {
    if (!noteDirty) return;
    const next = comment.trim();
    onUpdateStudent(student.id, { note: next });
    setComment(next);
    setCommentSaved(true);
    window.setTimeout(() => setCommentSaved(false), 800);
  };

  const handleDelete = (id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await onDeletePayment(id);
      if (!res.ok) setError(res.error ?? 'შეცდომა');
    });
  };

  return (
    <div
      className={
        embedded
          ? 'flex h-full min-h-0 min-w-0 flex-1'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-3 backdrop-blur-[2px] sm:p-4'
      }
      onClick={embedded ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal={embedded ? undefined : true}
        className={
          embedded
            ? 'flex h-full min-h-0 w-full flex-col overflow-hidden rounded-box border border-hairline bg-surface shadow-sm'
            : 'flex max-h-[min(92dvh,100%)] w-full max-w-lg flex-col overflow-hidden rounded-box border border-hairline bg-surface shadow-xl'
        }
        onClick={(e) => e.stopPropagation()}>
        {/* ═══ Header ═══ */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-5">
          <div className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-box border border-hairline bg-win-tint px-2.5 py-2 text-[11px] font-bold text-win transition hover:bg-win-tint/80">
            <Wallet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">გადახდა</span>
          </div>
          <div className="w-[200px] flex items-center justify-between gap-2 rounded-box border border-hairline bg-paper sm:w-auto">
            <button
              type="button"
              onClick={() => setMonthKey(shiftMonth(monthKey, -1))}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-box text-muted transition hover:bg-surface hover:text-ink"
              aria-label="წინა თვე">
              ‹
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[10px] truncate font-bold text-ink sm:text-sm">{formatMonthLabel(monthKey)}</p>
            </div>
            <button
              type="button"
              onClick={() => setMonthKey(shiftMonth(monthKey, 1))}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-box text-muted transition hover:bg-surface hover:text-ink"
              aria-label="შემდეგი თვე">
              ›
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setPriceModalOpen(true)}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-box border border-brass/40 bg-brass-tint px-2.5 py-2 text-[11px] font-bold text-brass-strong transition hover:bg-brass-tint/80">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ფასის მართვა</span>
            </button>
            {embedded ? null : (
              <button
                type="button"
                onClick={onClose}
                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-box text-muted transition hover:bg-sectionHeader hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ═══ Scrollable body ═══ */}
        <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {/* ─── Month navigation ─── */}

          {/* ─── Summary cards ─── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-box border border-hairline bg-paper px-3 py-2.5">
              <p className="text-[10px] font-bold tracking-wide text-muted">ფასი</p>
              <p className="mt-1 truncate text-sm font-bold tabular-nums text-ink">{formatPrice(expected)}</p>
            </div>
            <div className="rounded-box border border-hairline bg-paper px-3 py-2.5">
              <p className="text-[10px] font-bold tracking-wide text-muted">გადახდილი</p>
              <p className="mt-1 truncate text-sm font-bold tabular-nums text-win">{formatPrice(monthPaid)}</p>
              {expected > 0 && monthOwed <= 0 ? (
                <p className="mt-0.5 text-[10px] font-bold text-win">გადახდილია</p>
              ) : null}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              ADD PAYMENT
             ═══════════════════════════════════════════════════════ */}

          {error ? <p className="rounded-box bg-loss-tint px-3 py-2 text-[11px] font-bold text-loss">{error}</p> : null}

          <div className="relative rounded-box border border-hairline bg-surface">
            <textarea
              id="student-note"
              value={comment}
              onChange={(event) => {
                setComment(event.target.value);
                setCommentSaved(false);
              }}
              rows={4}
              placeholder="მოვლენები და შენიშვნები ამ მოსწავლეზე"
              className="w-full resize-y rounded-box bg-surface px-3 py-2.5 text-sm font-medium text-ink outline-none"
            />
            {noteDirty || commentSaved ? (
              <button
                type="button"
                onClick={handleSaveComment}
                disabled={!noteDirty}
                className="absolute right-3 top-3 inline-flex cursor-pointer items-center gap-1.5 rounded-box bg-[#465D73] px-3 py-2 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] active:scale-[0.98] disabled:cursor-default disabled:opacity-45 disabled:shadow-none">
                <Save className="h-3.5 w-3.5" />
                {noteDirty ? 'შენახვა' : 'შენახულია'}
              </button>
            ) : null}
          </div>
          {expected > 0 && monthOwed > 0 ? (
            <button
              type="button"
              onClick={handlePay}
              disabled={isPending}
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-box bg-[#465D73] px-4 py-2.5 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
              {isPending ? 'ინახება...' : `გადახდა · ${formatPrice(monthOwed)}`}
            </button>
          ) : null}
        </div>
      </div>

      {priceModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 p-3 backdrop-blur-[2px]"
          onClick={(e) => {
            e.stopPropagation();
            setPriceModalOpen(false);
          }}>
          <div
            role="dialog"
            aria-modal
            aria-label="ფასის მართვა"
            className="w-full max-w-sm space-y-2.5 rounded-box border border-hairline bg-surface p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink">
                <DollarSign className="h-3.5 w-3.5 text-brass-strong" />
                ფასის მართვა
              </h3>
              <button
                type="button"
                onClick={() => setPriceModalOpen(false)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-box text-muted transition hover:bg-sectionHeader hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-muted">ფასი (₾)</label>
                <input
                  type="number"
                  min={0}
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-box border border-hairline bg-surface px-3 py-2.5 text-base font-bold text-ink outline-none focus:border-brass focus:ring-2 focus:ring-brass/20 sm:text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-muted">ფასის ტიპი</label>
                <select
                  value={priceTypeDraft}
                  onChange={(e) => setPriceTypeDraft(e.target.value as PriceType)}
                  className="w-full rounded-box border border-hairline bg-surface px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-brass focus:ring-2 focus:ring-brass/20">
                  {PRICE_TYPE_OPTIONS.map((pt) => (
                    <option key={pt} value={pt}>
                      {PRICE_TYPE_SHORT[pt]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSavePrice}
              disabled={isPending}
              className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-box bg-[#A66A32] px-4 py-2 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_5px_rgba(166,106,50,0.22)] transition-all duration-200 hover:bg-[#B8783B] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
              <Save className="h-3.5 w-3.5" />
              {priceSaved ? '✓ შენახულია' : 'ფასის შენახვა'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
