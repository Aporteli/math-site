'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Copy,
  MessageSquare,
  MoreVertical,
  PenLine,
  Plus,
  Trash2,
  Users,
  X,
  Search,
  Check,
  Send,
  Loader2,
  GraduationCap,
} from 'lucide-react';
import type { BankProblem, ProblemBankCopy } from '@/lib/math/problems';
import { getStudentsAction, sendProblemToStudentAction, type StudentData } from '@/lib/actions/students';

interface ProblemCardMenuProps {
  problem: BankProblem;
  copy: ProblemBankCopy;
  inSet: boolean;
  inLab?: boolean;
  showSendToLab?: boolean;
  showSaveToLab?: boolean;
  showGenerateVariants?: boolean;
  canGenerateVariants?: boolean;
  onEdit: (problem: BankProblem) => void;
  onAskAi: (problem: BankProblem) => void;
  onCopyPrompt: (problem: BankProblem) => void;
  onToggleSet: (problem: BankProblem) => void;
  onSendToLab?: (problem: BankProblem) => void;
  onSaveToLab?: (problem: BankProblem) => void;
  onSaveToBank?: (problem: BankProblem) => void;
  onRemoveFromLab?: (problem: BankProblem) => void;
  onGenerateVariants?: (problem: BankProblem) => void;
  onDiscard: (problem: BankProblem) => void;
}

export function ProblemCardMenu({
  problem,
  copy,
  inSet,
  onEdit,
  onAskAi,
  onCopyPrompt,
  onToggleSet,
  onDiscard,
}: ProblemCardMenuProps) {
  const menu = copy.cardMenu;
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingStudentId, setSendingStudentId] = useState<string | null>(null);
  const [sentStudentIds, setSentStudentIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isStudentModalOpen) return;

    let isMounted = true;
    async function loadStudents() {
      setIsLoadingStudents(true);
      try {
        const data = await getStudentsAction();
        if (isMounted) {
          setStudents(data);
        }
      } finally {
        if (isMounted) setIsLoadingStudents(false);
      }
    }

    loadStudents();
    return () => {
      isMounted = false;
    };
  }, [isStudentModalOpen]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = menuRef.current?.offsetWidth ?? 220;
      const menuHeight = menuRef.current?.offsetHeight ?? 260;
      const gap = 6;
      const padding = 8;

      let top = rect.bottom + gap;
      let left = rect.right - menuWidth;

      if (left < padding) left = padding;
      if (left + menuWidth > window.innerWidth - padding) {
        left = Math.max(padding, window.innerWidth - menuWidth - padding);
      }
      if (top + menuHeight > window.innerHeight - padding) {
        top = Math.max(padding, rect.top - menuHeight - gap);
      }

      setCoords({ top, left });
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  async function handleSend(student: StudentData) {
    if (sentStudentIds.includes(student.id) || sendingStudentId) return;

    setSendingStudentId(student.id);
    try {
      const res = await sendProblemToStudentAction({
        studentId: student.id,
        problem: {
          id: (problem as unknown as { id?: string }).id || problem.originId || problem.templateId,
          topic: problem.topic,
          difficulty: problem.difficulty,
          promptTex: problem.promptTex,
          solutionTex: problem.solutionTex,
          templateId: problem.templateId,
        },
      });

      if (res.success) {
        setSentStudentIds((prev) => [...prev, student.id]);
      }
    } finally {
      setSendingStudentId(null);
    }
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.grade && s.grade.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const items = [
    {
      id: 'send-student',
      label: 'მოსწავლისთვის გაგზავნა',
      icon: Users,
      highlight: true,
      onClick: () => {
        setOpen(false);
        setIsStudentModalOpen(true);
      },
    },
    {
      id: 'edit',
      label: menu.edit,
      icon: PenLine,
      onClick: () => run(() => onEdit(problem)),
    },
    {
      id: 'ask-ai',
      label: menu.askAi,
      icon: MessageSquare,
      onClick: () => run(() => onAskAi(problem)),
    },
    {
      id: 'copy',
      label: menu.copyPrompt,
      icon: Copy,
      onClick: () => run(() => onCopyPrompt(problem)),
    },
    {
      id: 'set',
      label: inSet ? copy.removeFromSet : copy.addToSet,
      icon: inSet ? X : Plus,
      onClick: () => run(() => onToggleSet(problem)),
    },
    {
      id: 'discard',
      label: problem.source === 'bank' ? copy.generate.remove : copy.generate.discard,
      icon: Trash2,
      danger: true,
      onClick: () => run(() => onDiscard(problem)),
    },
  ];

  return (
    <div ref={rootRef} className="absolute top-2 right-2 z-10">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={menu.open}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-hairline bg-white text-muted shadow-sm transition-colors hover:border-navy/30 hover:text-navy"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}>
        <MoreVertical className="size-4" aria-hidden="true" />
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <ul
              ref={menuRef}
              id={menuId}
              role="menu"
              style={
                coords ? { top: coords.top, left: coords.left } : { top: 0, left: 0, visibility: 'hidden' as const }
              }
              className="fixed z-[80] min-w-[14rem] origin-top-right animate-dropdown rounded-2xl border border-hairline bg-white p-1.5 shadow-lg shadow-navy/5"
              onClick={(event) => event.stopPropagation()}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className={[
                        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors',
                        item.danger
                          ? 'text-brass-strong hover:bg-brass-tint/50'
                          : item.highlight
                            ? 'text-navy bg-navy-tint/40 hover:bg-navy-tint font-bold'
                            : 'text-body hover:bg-paper hover:text-navy',
                      ].join(' ')}
                      onClick={item.onClick}>
                      <Icon className={`size-4 shrink-0 ${item.highlight ? 'text-navy' : ''}`} aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}

      {isStudentModalOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-200"
              onClick={() => setIsStudentModalOpen(false)}>
              <div
                className="flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl border border-hairline bg-white p-5 shadow-2xl transition-all sm:p-6"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between pb-3 border-b border-hairline">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-navy-tint text-navy">
                      <GraduationCap className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-ink">ამოცანის გაგზავნა</h3>
                      <p className="text-xs text-muted">აირჩიეთ მოსწავლე სიიდან</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsStudentModalOpen(false)}
                    className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink transition">
                    <X className="size-4" />
                  </button>
                </div>

                <div className="relative my-4">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="მოძებნეთ სახელით..."
                    className="w-full rounded-2xl border border-hairline bg-paper py-2.5 pl-10 pr-4 text-xs font-medium text-ink outline-none focus:ring-2 focus:ring-navy/20 transition"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[340px]">
                  {isLoadingStudents ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-muted">
                      <Loader2 className="size-5 animate-spin text-navy" />
                      <span>მოსწავლეები იტვირთება...</span>
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted">მოსწავლე ვერ მოიძებნა</div>
                  ) : (
                    filteredStudents.map((student) => {
                      const isSent = sentStudentIds.includes(student.id);
                      const isSending = sendingStudentId === student.id;

                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between rounded-2xl border border-hairline p-3 hover:border-navy/30 hover:bg-navy-tint/20 transition group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy text-white text-xs font-bold">
                              {student.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-ink truncate">{student.name}</p>
                              {student.grade && <p className="text-[11px] text-muted">{student.grade}</p>}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isSent || isSending}
                            onClick={() => handleSend(student)}
                            className={[
                              'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition shadow-xs',
                              isSent
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isSending
                                  ? 'bg-paper text-muted border border-hairline'
                                  : 'bg-navy text-white hover:bg-navy-strong',
                            ].join(' ')}>
                            {isSending ? (
                              <>
                                <Loader2 className="size-3 animate-spin" />
                                <span>იგზავნება...</span>
                              </>
                            ) : isSent ? (
                              <>
                                <Check className="size-3 text-emerald-600" />
                                <span>გაგზავნილია</span>
                              </>
                            ) : (
                              <>
                                <Send className="size-3" />
                                <span>გაგზავნა</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-4 mt-3 border-t border-hairline flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsStudentModalOpen(false)}
                    className="rounded-xl bg-paper px-4 py-2 text-xs font-bold text-ink hover:bg-paper-deep transition">
                    დახურვა
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}