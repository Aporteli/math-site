'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  CalendarDays, Trash2, Wallet, X, Save, Receipt, DollarSign, ChevronDown,
} from 'lucide-react';
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

  /* ── accordion state ── */
  const [priceSectionOpen, setPriceSectionOpen] = useState(false);

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
    setPriceSectionOpen(false);
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
      setPriceSectionOpen(false);
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

  const handleSaveComment = () => {
    onUpdateStudent(student.id, { note: comment.trim() });
    setCommentSaved(true);
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
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-box border border-hairline bg-win-tint text-win">
              <Wallet className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-ink">გადახდა</h2>
              <p className="truncate text-[11px] font-medium text-muted">
                {student.firstName} {student.lastName}
              </p>
            </div>
          </div>
          {embedded ? null : (
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-box text-muted transition hover:bg-paper hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ═══ Scrollable body ═══ */}
        <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {/* ─── Month navigation ─── */}
          <div className="flex items-center justify-between gap-2 rounded-box border border-hairline bg-paper p-1">
            <button
              type="button"
              onClick={() => setMonthKey(shiftMonth(monthKey, -1))}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-box text-muted transition hover:bg-surface hover:text-ink"
              aria-label="წინა თვე">
              ‹
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-bold text-ink">{formatMonthLabel(monthKey)}</p>
            </div>
            <button
              type="button"
              onClick={() => setMonthKey(shiftMonth(monthKey, 1))}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-box text-muted transition hover:bg-surface hover:text-ink"
              aria-label="შემდეგი თვე">
              ›
            </button>
          </div>

          {/* ─── Summary cards ─── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-box border border-hairline bg-paper px-3 py-2.5">
              <p className="text-[10px] font-bold tracking-wide text-muted">თვის ფასი</p>
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
              PRICE MANAGEMENT — accordion
             ═══════════════════════════════════════════════════════ */}
          <div className="overflow-hidden rounded-box border border-brass/30 bg-brass-tint/20">
            {/* toggle header */}
            <button
              type="button"
              onClick={() => setPriceSectionOpen((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-3 transition hover:bg-brass-tint/40">
              <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-brass-strong">
                <DollarSign className="h-3 w-3" /> ფასის მართვა
              </span>
              <span className="flex items-center gap-2">
                {/* preview value */}
                {!priceSectionOpen && (
                  <span className="text-[11px] font-bold text-ink">
                    {student.monthlyPrice.toLocaleString('ka-GE')} ₾
                    <span className="ml-1 text-muted">
                      / {PRICE_TYPE_SHORT[student.priceType ?? 'MONTHLY']}
                    </span>
                  </span>
                )}
                <ChevronDown
                  className={`h-3.5 w-3.5 text-brass-strong transition-transform duration-200 ${
                    priceSectionOpen ? 'rotate-180' : ''
                  }`}
                />
              </span>
            </button>

           
            {priceSectionOpen && (
              <div className="space-y-2.5 border-t border-brass/20 p-3.5">
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
                  className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-box border border-brass/40 bg-brass-strong px-4 py-2 text-sm font-bold text-white transition hover:bg-brass disabled:opacity-50">
                  <Save className="h-3.5 w-3.5" />
                  {priceSaved ? '✓ შენახულია' : 'ფასის შენახვა'}
                </button>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════
              ADD PAYMENT — accordion
             ═══════════════════════════════════════════════════════ */}
          {expected > 0 && monthOwed > 0 ? (
            <button
              type="button"
              onClick={handlePay}
              disabled={isPending}
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-box bg-navy px-4 py-2.5 text-sm font-bold text-white transition hover:bg-navy-strong disabled:opacity-50"
            >
              {isPending ? 'ინახება...' : `გადახდა · ${formatPrice(monthOwed)}`}
            </button>
          ) : null}

          {error ? (
            <p className="rounded-box bg-loss-tint px-3 py-2 text-[11px] font-bold text-loss">{error}</p>
          ) : null}

          <div className="space-y-2 rounded-box border border-hairline bg-paper p-3.5">
            <label className="block text-[11px] font-bold tracking-wide text-muted" htmlFor="student-note">
              შენიშვნა
            </label>
            <textarea
              id="student-note"
              value={comment}
              onChange={(event) => {
                setComment(event.target.value);
                setCommentSaved(false);
              }}
              rows={4}
              placeholder="მოვლენები და შენიშვნები ამ მოსწავლეზე"
              className="w-full resize-y rounded-box border border-hairline bg-surface px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-navy"
            />
            <button
              type="button"
              onClick={handleSaveComment}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-box bg-navy px-3 py-2 text-xs font-bold text-white transition hover:bg-navy-strong"
            >
              <Save className="h-3.5 w-3.5" />
              {commentSaved ? 'შენახულია' : 'შენახვა'}
            </button>
          </div>

          {/* ═══ History ═══ */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-muted">
              <Receipt className="h-3 w-3" />
              ამ თვის გადახდები ({monthPayments.length})
            </p>

            {monthPayments.length === 0 ? (
              <p className="rounded-box border border-dashed border-hairline bg-paper px-3 py-4 text-center text-xs text-muted">
                ამ თვეში ჯერ არ არის გადახდა
              </p>
            ) : (
              <div className="space-y-1.5">
                {monthPayments.map((p) => {
                  const d = new Date(p.paidAt);
                  const dateLabel = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-box border border-hairline bg-paper px-3 py-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted" />
                        <span className="text-xs font-bold text-ink">{dateLabel}</span>
                        <span className="text-[10px] font-medium text-muted">
                          {p.method ? METHOD_LABEL[p.method] : '—'}
                        </span>
                        {p.note ? <span className="truncate text-[10px] text-muted">— {p.note}</span> : null}
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-win">+{p.amount} ₾</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        disabled={isPending}
                        title="წაშლა"
                        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-box text-muted transition hover:bg-loss-tint hover:text-loss disabled:opacity-40">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}