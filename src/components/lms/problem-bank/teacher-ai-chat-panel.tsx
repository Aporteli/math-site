'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { FlaskConical, Library, MessageSquare, RotateCcw, Send, Sparkles, X, ChevronDown } from 'lucide-react';
import { AdminSlashPromptManager, AdminSlashPromptMenu } from '@/components/lms/problem-bank/admin-slash-prompts';
import { AdminSlashPromptFillModal } from '@/components/lms/problem-bank/admin-slash-prompt-fill-modal';
import { KatexPreview } from '@/components/math/katex-preview';
import { SelectMenu } from '@/components/ui/select-menu';
import { defaultLocale, locales, type Locale } from '@/i18n/config';
import { handlePlainTextPaste } from '@/lib/helpers/plain-text-paste';
import { saveProblemsAction, saveToLabAction, generateDiverseProblemsAction } from '@/lib/math/problems/actions';
import { AiProviderIcon } from '@/components/lms/problem-bank/ai-provider-icon';
import {
  filterAdminChatPrompts,
  findSlashToken,
  insertSlashPrompt,
  loadAdminChatPrompts,
  type AdminChatPrompt,
} from '@/lib/math/problems/admin-chat-prompts';
import {
  AI_MODEL_IDS,
  chatCardsToBankProblems,
  replaceTokens,
  splitTeacherChatReply,
  topicLabel,
  toPersistInput,
  type AiModelId,
  type AiModelStatus,
  type BankProblem,
  type ProblemBankCopy,
} from '@/lib/math/problems';
import { toKatexFriendlyTex } from '@/lib/math/problems/tex';
import { getDictionary } from '@/i18n/get-dictionary';
import { uniqueProviders, walletChipLabel, walletHint, walletTone } from './helpers';

type PageProps = { params: Promise<{ locale: string }> };

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
  problems?: BankProblem[];
};

interface TeacherAiChatPanelProps {
  setGenModel: any;
  selectedModelStatus: any;
  aiModelIds: readonly AiModelId[];
  copy: ProblemBankCopy['chat'];
  fullCopy: ProblemBankCopy;
  model: AiModelId;
  onModelChange: (model: AiModelId) => void;
  modelStatus: AiModelStatus[];
  onClose: () => void;
  className?: string;
  initialDraft?: string;
  showSaveToLab?: boolean;
  /** ADMIN-only `/` prompt snippets. */
  enableSlashPrompts?: boolean;
  slashPromptsUserId?: string;
  /** Optional: merge saved cards into the open bank/lab workspace. */
  onSavedProblems?: (
    problems: BankProblem[],
    target: 'bank' | 'lab',
    meta?: { labIds?: string[]; idMap?: Record<string, string> },
  ) => void | Promise<void>;
}

function chatErrorText(copy: ProblemBankCopy['chat'], error: string) {
  switch (error) {
    case 'missing_key':
      return copy.errorMissingKey;
    case 'invalid_key':
      return copy.errorInvalidKey;
    case 'limit_exceeded':
      return copy.errorLimit;
    case 'billing':
      return copy.errorBilling;
    case 'timeout':
      return copy.errorTimeout;
    case 'unauthorized':
      return copy.errorUnauthorized;
    case 'bad_output':
      return copy.errorBadOutput;
    default:
      return copy.errorFailed;
  }
}

export function TeacherAiChatPanel({
  copy,
  fullCopy,
  model,
  onModelChange,
  modelStatus,
  onClose,
  className = '',
  initialDraft = '',
  showSaveToLab = true,
  enableSlashPrompts = false,
  slashPromptsUserId = '',
  onSavedProblems,
  aiModelIds,
  selectedModelStatus,
  setGenModel,
}: TeacherAiChatPanelProps) {
  const genId = useId();
  const inputId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState(initialDraft);
  const [replyLocale, setReplyLocale] = useState<Locale>(defaultLocale);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Record<string, 'bank' | 'lab'>>({});
  const slashEnabled = enableSlashPrompts && Boolean(slashPromptsUserId);
  const [slashPrompts, setSlashPrompts] = useState<AdminChatPrompt[]>([]);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashTokenStart, setSlashTokenStart] = useState(0);
  const [slashActiveIndex, setSlashActiveIndex] = useState(0);
  const [manageSlashOpen, setManageSlashOpen] = useState(false);
  const [fillPrompt, setFillPrompt] = useState<AdminChatPrompt | null>(null);
  const fillInsertRef = useRef<{ tokenStart: number; cursor: number } | null>(null);

  useEffect(() => {
    setDraft(initialDraft);
    setMessages([]);
    setNotice(null);
    setSavedKeys({});
  }, [initialDraft]);

  useEffect(() => {
    if (!slashEnabled) {
      setSlashPrompts([]);
      return;
    }
    setSlashPrompts(loadAdminChatPrompts(slashPromptsUserId));
  }, [slashEnabled, slashPromptsUserId]);

  const filteredSlashPrompts = useMemo(
    () => filterAdminChatPrompts(slashPrompts, slashQuery),
    [slashPrompts, slashQuery],
  );

  useEffect(() => {
    setSlashActiveIndex(0);
  }, [slashQuery, slashMenuOpen]);

  function syncSlashMenu(value: string, cursor: number) {
    if (!slashEnabled) {
      setSlashMenuOpen(false);
      return;
    }
    const token = findSlashToken(value.slice(0, cursor));
    if (!token) {
      setSlashMenuOpen(false);
      return;
    }
    setSlashTokenStart(token.start);
    setSlashQuery(token.query);
    setSlashMenuOpen(true);
  }

  function applySlashPrompt(prompt: AdminChatPrompt) {
    const cursor = textareaRef.current?.selectionStart ?? slashTokenStart + 1 + slashQuery.length;
    fillInsertRef.current = { tokenStart: slashTokenStart, cursor };
    setSlashMenuOpen(false);
    setFillPrompt(prompt);
  }

  function confirmFilledPrompt(filled: string) {
    const target = fillInsertRef.current;
    const tokenStart = target?.tokenStart ?? slashTokenStart;
    const cursor = target?.cursor ?? textareaRef.current?.selectionStart ?? tokenStart + 1 + slashQuery.length;
    const next = insertSlashPrompt(draft, cursor, tokenStart, filled);
    setDraft(next.text);
    setFillPrompt(null);
    fillInsertRef.current = null;
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(next.cursor, next.cursor);
    });
  }

  function cancelFilledPrompt() {
    setFillPrompt(null);
    fillInsertRef.current = null;
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function onDraftKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (!slashMenuOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      setSlashMenuOpen(false);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (filteredSlashPrompts.length === 0) return;
      setSlashActiveIndex((index) => (index + 1) % filteredSlashPrompts.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (filteredSlashPrompts.length === 0) return;
      setSlashActiveIndex((index) => (index - 1 + filteredSlashPrompts.length) % filteredSlashPrompts.length);
      return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      const selected = filteredSlashPrompts[slashActiveIndex];
      if (!selected) return;
      event.preventDefault();
      applySlashPrompt(selected);
    }
  }

  const selectedStatus = modelStatus.find((item) => item.id === model) ?? null;
  const remainingLabel = useMemo(() => {
    if (!selectedStatus) return null;
    if (!selectedStatus.configured) return copy.limitNoKey;
    if (selectedStatus.limit > 0 && selectedStatus.remaining <= 0) {
      return copy.limitExhausted;
    }
    if (selectedStatus.limit === 0) return copy.limitReady;
    return replaceTokens(copy.limitUsed, {
      used: selectedStatus.used,
      limit: selectedStatus.limit,
    });
  }, [copy, selectedStatus]);

  const previewTex = draft.trim() ? toKatexFriendlyTex(draft) : '';

  async function persistCards(problems: BankProblem[], target: 'bank' | 'lab', keys: string[]) {
    if (problems.length === 0) return;
    const batchKey = keys.join('|');
    setSavingKey(batchKey);
    setNotice(null);
    try {
      const payload = problems.map((problem) => toPersistInput(problem, target));
      const result = target === 'lab' ? await saveToLabAction(payload) : await saveProblemsAction(payload);
      if (!result.ok) {
        setNotice(copy.saveFailed);
        return;
      }
      setSavedKeys((current) => {
        const next = { ...current };
        for (const key of keys) next[key] = target;
        return next;
      });
      if (onSavedProblems) {
        const rawLabIds = (result as Record<string, unknown>).labIds;
        const safeLabIds = Array.isArray(rawLabIds)
          ? rawLabIds.filter((id): id is string => typeof id === 'string')
          : undefined;

        await onSavedProblems(result.saved, target, {
          labIds: safeLabIds,
          idMap: result.idMap,
        });
      }
      setNotice(target === 'lab' ? copy.savedToLab : copy.savedToBank);
    } catch {
      setNotice(copy.saveFailed);
    } finally {
      setSavingKey(null);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;

    const nextUser: ChatMessage = { role: 'user', content: message };
    const nextHistory = [...messages, nextUser].slice(-20);
    setMessages(nextHistory);
    setDraft('');
    setBusy(true);
    setNotice(null);

    try {
      const result = await generateDiverseProblemsAction({
        model,
        locale: replyLocale,
        request: message,
        count: 3,
        check: 'plain',
        history: messages.slice(-20).map(({ role, content }) => ({ role, content })),
      });

      console.log(result, 'result');
      if (!result.ok) {
        setNotice(chatErrorText(copy, result.error));
        setMessages(messages);
        setDraft(message);
        return;
      }

      setMessages([
        ...nextHistory,
        {
          role: 'assistant',
          content: '',
          problems: result.problems,
        },
      ]);
    } catch {
      setNotice(copy.errorFailed);
      setMessages(messages);
      setDraft(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`${className} space-y-4 rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5`}
      aria-labelledby="teacher-ai-chat-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
        <h2 id="teacher-ai-chat-heading" className="text-lg font-semibold tracking-tight text-ink">
          {copy.title}
        </h2>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-paper hover:text-navy"
          aria-label={copy.close}
          onClick={onClose}>
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <details className="group rounded-2xl border border-hairline-soft bg-paper p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="text-sm font-medium text-ink">{fullCopy.generate.model}</span>
          <ChevronDown
            className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="mt-3">
          <label htmlFor={`${genId}-model`} className="sr-only">
            {fullCopy.generate.model}
          </label>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <SelectMenu
              className="flex-1"
              id={`${inputId}-model`}
              value={model}
              onChange={(value) => onModelChange(value as AiModelId)}
              options={AI_MODEL_IDS.map((id) => ({
                value: id,
                label: copy.models[id],
              }))}
            />
            <SelectMenu
              className="flex-1"
              id={`${inputId}-language`}
              value={replyLocale}
              onChange={(value) => setReplyLocale(value as Locale)}
              options={locales.map((id) => ({
                value: id,
                label: copy.languages[id],
              }))}
            />
          </div>
          {selectedModelStatus ? (
            <p className="mt-2 text-xs text-body">{walletHint(fullCopy.generate, selectedModelStatus.wallet)}</p>
          ) : null}

          <p className="mt-3 text-xs font-medium text-muted">{fullCopy.generate.walletLabel}</p>
          <ul className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {uniqueProviders(modelStatus).map((status) => {
              const selected = selectedModelStatus?.provider === status.provider;
              return (
                <li key={status.provider} className="min-w-0">
                  <button
                    type="button"
                    className={`flex h-full w-full items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors ${walletTone(status.wallet, selected)}`}
                    onClick={() => {
                      if (selectedModelStatus?.provider === status.provider) {
                        return;
                      }
                      setGenModel(status.id);
                    }}>
                    <AiProviderIcon provider={status.provider} className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block w-full truncate text-[11px] font-medium">
                        {fullCopy.generate.providers[status.provider]}
                      </span>
                      <span className="mt-0.5 block w-full truncate text-[10px] opacity-80">
                        {walletChipLabel(fullCopy.generate, status.wallet)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs font-medium text-muted">{fullCopy.generate.limitLabel}</p>
          <ul className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {modelStatus.map((status) => {
              const selected = status.id === model;
              const tone = !status.configured
                ? 'border-hairline bg-white text-muted'
                : status.limit > 0 && status.remaining <= 0
                  ? 'border-brass/20 bg-brass-tint/40 text-brass-strong'
                  : selected
                    ? 'border-navy/20 bg-navy-tint text-navy'
                    : 'border-hairline bg-white text-body';
              const detail = !status.configured
                ? fullCopy.generate.limitNoKey
                : status.limit > 0 && status.remaining <= 0
                  ? fullCopy.generate.limitExhausted
                  : status.limit === 0
                    ? fullCopy.generate.limitReady
                    : replaceTokens(fullCopy.generate.limitUsed, {
                        used: status.used,
                        limit: status.limit,
                      });

              return (
                <li key={status.id} className="min-w-0">
                  <button
                    type="button"
                    className={`flex h-full w-full items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors ${tone}`}
                    onClick={() => setGenModel(status.id)}>
                    <AiProviderIcon provider={status.provider} className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block w-full truncate text-[11px] font-medium">
                        {fullCopy.generate.models[status.id]}
                      </span>
                      <span className="mt-0.5 block w-full truncate text-[10px] opacity-80">{detail}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </details>

      <div className="min-h-[18rem] max-h-[28rem] overflow-y-auto rounded-2xl border border-hairline bg-paper p-3">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[14rem] flex-col items-center justify-center text-center">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-navy-tint text-navy">
              <MessageSquare className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-medium text-ink">{copy.emptyTitle}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((message, index) => {
              const user = message.role === 'user';
              if (user) {
                return (
                  <li key={`user-${index}`} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl bg-navy px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">{copy.you}</p>
                      <KatexPreview
                        tex={toKatexFriendlyTex(message.content)}
                        className="block break-words text-white [&_.katex-display]:my-2 [&_.katex]:text-[0.95rem] [&_.katex]:text-white"
                      />
                    </div>
                  </li>
                );
              }

              let prose = message.content;
              let bankProblems: BankProblem[] = message.problems ?? [];

              if (!message.problems && message.content) {
                try {
                  const split = splitTeacherChatReply(message.content);
                  prose = split.prose;
                  bankProblems = chatCardsToBankProblems(split.problems, index);
                } catch {
                  prose = message.content;
                  bankProblems = [];
                }
              }

              return (
                <li key={`assistant-${index}`} className="flex justify-start">
                  <div className="max-w-[95%] space-y-3 sm:max-w-[85%]">
                    {prose.trim() ? (
                      <div className="rounded-2xl border border-hairline bg-white px-4 py-3 text-sm leading-relaxed text-ink shadow-sm">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">
                          {copy.assistant}
                        </p>
                        <KatexPreview
                          tex={prose}
                          className="block break-words whitespace-pre-wrap text-ink [&_.katex-display]:my-2 [&_.katex]:text-[0.95rem]"
                        />
                      </div>
                    ) : null}

                    {bankProblems.length > 0 ? (
                      <div className="rounded-2xl border border-navy/15 bg-navy-tint/30 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold tracking-wide text-brass">{copy.cardsTitle}</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={savingKey !== null}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-navy/20 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-navy-tint disabled:opacity-60"
                              onClick={() =>
                                void persistCards(
                                  bankProblems,
                                  'bank',
                                  bankProblems.map((item) => item.id),
                                )
                              }>
                              <Library className="size-3.5" aria-hidden="true" />
                              {savingKey === bankProblems.map((item) => item.id).join('|')
                                ? copy.savingCard
                                : copy.saveAllToBank}
                            </button>
                            {showSaveToLab ? (
                              <button
                                type="button"
                                disabled={savingKey !== null}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-navy-strong disabled:opacity-60"
                                onClick={() =>
                                  void persistCards(
                                    bankProblems,
                                    'lab',
                                    bankProblems.map((item) => item.id),
                                  )
                                }>
                                <FlaskConical className="size-3.5" aria-hidden="true" />
                                {copy.saveAllToLab}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {bankProblems.map((problem) => {
                            const status = savedKeys[problem.id];
                            const busyThis = savingKey === problem.id;
                            return (
                              <li key={problem.id} className="rounded-xl border border-hairline bg-white p-3">
                                <div className="mb-2 flex flex-wrap gap-2 text-[11px] text-muted">
                                  <span className="rounded-full bg-paper-deep px-2 py-0.5 font-semibold text-brass-strong">
                                    {fullCopy.difficulties[problem.difficulty]}
                                  </span>
                                  <span>{topicLabel(fullCopy.topics, problem.topic)}</span>
                                  {problem.year ? <span>{fullCopy.years[problem.year]}</span> : null}
                                  {status ? (
                                    <span className="ml-auto font-semibold text-navy">
                                      {status === 'lab' ? copy.savedToLab : copy.savedToBank}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                                  {fullCopy.prompt}
                                </p>
                                <KatexPreview
                                  tex={problem.promptTex}
                                  className="block min-w-0 overflow-x-auto hide-scrollbar text-ink [&_.katex]:text-[0.95rem]"
                                />
                                {problem.solutionTex.trim() && problem.solutionTex.trim() !== '—' ? (
                                  <div className="mt-3 border-t border-hairline-soft pt-3">
                                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                                      {fullCopy.solution}
                                    </p>
                                    <KatexPreview
                                      tex={problem.solutionTex}
                                      className="block min-w-0 overflow-x-auto hide-scrollbar whitespace-pre-wrap break-words text-ink [&_.katex-display]:my-2 [&_.katex]:text-[0.95rem]"
                                    />
                                  </div>
                                ) : null}
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={savingKey !== null}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-navy/20 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-navy-tint disabled:opacity-60"
                                    onClick={() => void persistCards([problem], 'bank', [problem.id])}>
                                    <Library className="size-3.5" aria-hidden="true" />
                                    {busyThis && savingKey === problem.id ? copy.savingCard : copy.saveToBank}
                                  </button>
                                  {showSaveToLab ? (
                                    <button
                                      type="button"
                                      disabled={savingKey !== null}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-navy-strong disabled:opacity-60"
                                      onClick={() => void persistCards([problem], 'lab', [problem.id])}>
                                      <FlaskConical className="size-3.5" aria-hidden="true" />
                                      {copy.saveToLab}
                                    </button>
                                  ) : null}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
            {busy ? (
              <li className="flex justify-start">
                <div className="rounded-2xl border border-hairline bg-white px-4 py-3 text-sm text-body shadow-sm">
                  {copy.thinking}
                </div>
              </li>
            ) : null}
          </ul>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="sr-only" htmlFor={inputId}>
            {copy.inputLabel}
          </label>
          {slashEnabled ? (
            <button
              type="button"
              onClick={() => setManageSlashOpen((open) => !open)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-navy-tint">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {copy.slashPrompts.manage}
            </button>
          ) : null}
        </div>
        {slashEnabled && manageSlashOpen ? (
          <AdminSlashPromptManager
            copy={copy.slashPrompts}
            userId={slashPromptsUserId}
            prompts={slashPrompts}
            onChange={setSlashPrompts}
            onClose={() => setManageSlashOpen(false)}
          />
        ) : null}
        <div className="relative">
          {slashEnabled && slashMenuOpen ? (
            <AdminSlashPromptMenu
              copy={copy.slashPrompts}
              items={filteredSlashPrompts}
              activeIndex={slashActiveIndex}
              onHover={setSlashActiveIndex}
              onSelect={applySlashPrompt}
            />
          ) : null}
          <textarea
            id={inputId}
            ref={textareaRef}
            className="min-h-[6rem] w-full rounded-xl border border-hairline bg-white px-3 py-2 font-sans text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15"
            value={draft}
            maxLength={10000}
            placeholder={copy.inputPlaceholder}
            onChange={(event) => {
              const value = event.target.value;
              setDraft(value);
              syncSlashMenu(value, event.target.selectionStart);
            }}
            onClick={(event) => syncSlashMenu(event.currentTarget.value, event.currentTarget.selectionStart)}
            onKeyUp={(event) => {
              if (
                event.key === 'ArrowLeft' ||
                event.key === 'ArrowRight' ||
                event.key === 'Home' ||
                event.key === 'End'
              ) {
                syncSlashMenu(event.currentTarget.value, event.currentTarget.selectionStart);
              }
            }}
            onKeyDown={onDraftKeyDown}
            onPaste={(event) => handlePlainTextPaste(event, draft, setDraft, 10000, 'katex')}
          />
        </div>
        {previewTex ? (
          <div className="rounded-xl border border-hairline-soft bg-paper px-3 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{copy.previewLabel}</p>
            <KatexPreview
              tex={previewTex}
              className="block whitespace-pre-wrap break-words text-sm leading-relaxed text-ink [&_.katex-display]:my-2 [&_.katex]:text-[1.05rem]"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-strong disabled:opacity-60">
            <Send className="size-4" aria-hidden="true" />
            {busy ? copy.sending : copy.send}
          </button>
        </div>
      </form>

      {notice ? (
        <p className="rounded-xl border border-brass/20 bg-brass-tint px-4 py-3 text-sm text-brass-strong">{notice}</p>
      ) : null}

      {fillPrompt ? (
        <AdminSlashPromptFillModal
          copy={copy.slashPrompts}
          title={fillPrompt.name}
          initialBody={fillPrompt.body}
          onConfirm={confirmFilledPrompt}
          onCancel={cancelFilledPrompt}
        />
      ) : null}
    </section>
  );
}