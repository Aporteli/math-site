"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  Check,
  ChevronDown,
  FlaskConical,
  GraduationCap,
  ImagePlus,
  Library,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  UserCheck,
  X,
  Layers,
  BookOpen,
} from "lucide-react";
import {
  AdminSlashPromptManager,
  AdminSlashPromptMenu,
} from "@/components/lms/problem-bank/admin-slash-prompts";
import { AdminSlashPromptFillModal } from "@/components/lms/problem-bank/admin-slash-prompt-fill-modal";
import { KatexPreview } from "@/components/math/katex-preview";
import { SelectMenu } from "@/components/ui/select-menu";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { handlePlainTextPaste } from "@/lib/helpers/plain-text-paste";
import { fileToChatImage, type ChatImageDraft } from "@/lib/helpers/image-input";
import {
  saveProblemsAction,
  saveToLabAction,
  teacherAiChatAction,
} from "@/lib/math/problems/actions";
import { sendProblemToStudentAction } from "@/lib/actions/students";
import { getTeacherStudentsAction } from "@/lib/actions/teacher-students";
import {
  filterAdminChatPrompts,
  findSlashToken,
  insertSlashPrompt,
  loadAdminChatPrompts,
  type AdminChatPrompt,
} from "@/lib/math/problems/admin-chat-prompts";
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
} from "@/lib/math/problems";
import { toKatexFriendlyTex } from "@/lib/math/problems/tex";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
  images?: string[];
};

interface CourseGroup {
  id: string;
  title: string;
  students: {
    id: string;
    name: string;
    email?: string;
  }[];
}

interface TeacherAiChatPanelProps {
  copy: ProblemBankCopy["chat"];
  fullCopy: ProblemBankCopy;
  model: AiModelId;
  onModelChange: (model: AiModelId) => void;
  modelStatus: AiModelStatus[];
  onClose: () => void;
  className?: string;
  initialDraft?: string;
  initialImageBase64?: string;
  showSaveToLab?: boolean;
  enableSlashPrompts?: boolean;
  slashPromptsUserId?: string;
  onSavedProblems?: (
    problems: BankProblem[],
    target: "bank" | "lab",
    meta?: { labIds?: string[]; idMap?: Record<string, string> },
  ) => void | Promise<void>;
}

function chatErrorText(copy: ProblemBankCopy["chat"], error: string) {
  switch (error) {
    case "missing_key":
      return copy.errorMissingKey;
    case "invalid_key":
      return copy.errorInvalidKey;
    case "limit_exceeded":
      return copy.errorLimit;
    case "billing":
      return copy.errorBilling;
    case "timeout":
      return copy.errorTimeout;
    case "unauthorized":
      return copy.errorUnauthorized;
    case "bad_output":
      return copy.errorBadOutput;
    case "image_unsupported":
      return copy.errorImageUnsupported;
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
  className = "",
  initialDraft = "",
  initialImageBase64 = "",
  showSaveToLab = true,
  enableSlashPrompts = false,
  slashPromptsUserId = "",
  onSavedProblems,
}: TeacherAiChatPanelProps) {
  const inputId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState(initialDraft);
  const [replyLocale, setReplyLocale] = useState<Locale>(defaultLocale);
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<ChatImageDraft[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Record<string, "bank" | "lab">>({});
  const slashEnabled = enableSlashPrompts && Boolean(slashPromptsUserId);
  const [slashPrompts, setSlashPrompts] = useState<AdminChatPrompt[]>([]);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashTokenStart, setSlashTokenStart] = useState(0);
  const [slashActiveIndex, setSlashActiveIndex] = useState(0);
  const [manageSlashOpen, setManageSlashOpen] = useState(false);
  const [fillPrompt, setFillPrompt] = useState<AdminChatPrompt | null>(null);
  const fillInsertRef = useRef<{ tokenStart: number; cursor: number } | null>(null);
  
  // რეფი, რომელიც იმახსოვრებს ბოლო დამატებულ სურათს
  const lastAddedImageRef = useRef<string | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningProblemText, setAssigningProblemText] = useState<{ topic: string; promptTex: string; solutionTex: string } | null>(null);
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([]);
  const [expandedCourseIds, setExpandedCourseIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [assignPending, setAssignPending] = useState(false);
  const [assignTargetType, setAssignTargetType] = useState<"task" | "material" | null>(null);
  const [assignedStatus, setAssignedStatus] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

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

    if (event.key === "Escape") {
      event.preventDefault();
      setSlashMenuOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filteredSlashPrompts.length === 0) return;
      setSlashActiveIndex((index) => (index + 1) % filteredSlashPrompts.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filteredSlashPrompts.length === 0) return;
      setSlashActiveIndex((index) => (index - 1 + filteredSlashPrompts.length) % filteredSlashPrompts.length);
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
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

  const previewTex = draft.trim() ? toKatexFriendlyTex(draft) : "";

  async function persistCards(
    problems: BankProblem[],
    target: "bank" | "lab",
    keys: string[],
  ) {
    if (problems.length === 0) return;
    const batchKey = keys.join("|");
    setSavingKey(batchKey);
    setNotice(null);
    try {
      const payload = problems.map((problem) => toPersistInput(problem, target));
      const result =
        target === "lab"
          ? await saveToLabAction(payload)
          : await saveProblemsAction(payload);
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
        await onSavedProblems(result.saved, target, {
          labIds: "labIds" in result ? (result.labIds as string[]) : undefined,
          idMap: result.idMap,
        });
      }
      setNotice(target === "lab" ? copy.savedToLab : copy.savedToBank);
    } catch {
      setNotice(copy.saveFailed);
    } finally {
      setSavingKey(null);
    }
  }

  const fetchCoursesAndStudents = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const res = await getTeacherStudentsAction();
      if (res.success && res.courseGroups) {
        setCourseGroups(res.courseGroups);
        if (res.courseGroups.length > 0) {
          setExpandedCourseIds([res.courseGroups[0].id]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const handleOpenAssignModal = (problem: { topic: string; promptTex: string; solutionTex: string }) => {
    setAssigningProblemText(problem);
    setSelectedStudentIds([]);
    setAssignError(null);
    setIsAssignModalOpen(true);
    void fetchCoursesAndStudents();
  };

  const toggleCourseExpand = (courseId: string) => {
    setExpandedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const toggleCourseSelectAll = (course: CourseGroup) => {
    const studentIds = course.students.map((s) => s.id);
    const allSelected = studentIds.every((id) => selectedStudentIds.includes(id));

    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !studentIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...studentIds])));
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSendProblemToStudents = async (mode: "task" | "material") => {
    if (!assigningProblemText) return;

    if (selectedStudentIds.length === 0) {
      setAssignError("გთხოვთ მონიშნოთ მინიმუმ 1 მოსწავლე");
      setTimeout(() => setAssignError(null), 2500);
      return;
    }

    setAssignPending(true);
    setAssignTargetType(mode);
    setAssignError(null);

    try {
      const isMat = mode === "material";
      const sendPromises = selectedStudentIds.map((studentId) =>
        sendProblemToStudentAction({
          studentId,
          instructions: isMat ? "მასალა" : undefined,
          problem: {
            id: `ai-prob-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            topic: assigningProblemText.topic || "AI ამოცანა",
            difficulty: isMat ? "easy" : "medium",
            promptTex: assigningProblemText.promptTex,
            solutionTex: assigningProblemText.solutionTex,
          },
        })
      );

      const results = await Promise.all(sendPromises);
      const hasFailure = results.some((r) => !r.success);

      if (hasFailure) {
        throw new Error("ზოგიერთი ჩანაწერის გაგზავნა ვერ მოხერხდა");
      }

      setAssignedStatus(
        isMat
          ? `მასალები წარმატებით გაეგზავნა ${selectedStudentIds.length} მოსწავლეს!`
          : `დავალებები წარმატებით გაეგზავნა ${selectedStudentIds.length} მოსწავლეს!`
      );
      setTimeout(() => {
        setAssignedStatus(null);
        setIsAssignModalOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error("Failed to assign problem to students:", err);
      setAssignError(err.message || "გაგზავნა ვერ მოხერხდა");
    } finally {
      setAssignPending(false);
      setAssignTargetType(null);
    }
  };

  function removeImage(id: string) {
    setImages((current) => current.filter((image) => image.id !== id));
  }

  async function addImages(files: File[]) {
    const drafts: ChatImageDraft[] = [];
    for (const file of files.slice(0, 4)) {
      const prepared = await fileToChatImage(file);
      if (prepared) drafts.push(prepared);
    }
    if (drafts.length === 0) return;
    setImages((current) => [...current, ...drafts].slice(0, 4));
  }

  // დაცვა ორმაგი დამატებისგან React Strict Mode-ის გამო
  useEffect(() => {
    if (initialImageBase64 && initialImageBase64 !== lastAddedImageRef.current) {
      lastAddedImageRef.current = initialImageBase64;
      
      fetch(initialImageBase64)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], "board-capture.png", { type: "image/png" });
          void addImages([file]);
        })
        .catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialImageBase64]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) void addImages(files);
    event.target.value = "";
  }

  function onComposerPaste(event: ReactClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (files.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      void addImages(files);
      return;
    }

    handlePlainTextPaste(event, draft, setDraft, 10000, "katex");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if ((!message && images.length === 0) || busy) return;

    const sentImages = images.map(({ mimeType, data }) => ({ mimeType, data }));
    const nextUser: ChatMessage = {
      role: "user",
      content: message,
      images: images.map((image) => image.previewUrl),
    };
    const nextHistory = [...messages, nextUser].slice(-20);
    setMessages(nextHistory);
    setDraft("");
    setImages([]);
    setBusy(true);
    setNotice(null);

    try {
      const result = await teacherAiChatAction({
        model,
        locale: replyLocale,
        message,
        history: messages.slice(-20).map(({ role, content }) => ({ role, content })),
        images: sentImages,
      });
      if (!result.ok) {
        setNotice(chatErrorText(copy, result.error));
        setMessages(messages);
        setDraft(message);
        setImages(images);
        return;
      }
      setMessages([
        ...nextHistory,
        { role: "assistant", content: result.reply || copy.emptyReply },
      ]);
    } catch {
      setNotice(copy.errorFailed);
      setMessages(messages);
      setDraft(message);
      setImages(images);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`${className} space-y-4 rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5 relative`}
      aria-labelledby="teacher-ai-chat-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
        <h2
          id="teacher-ai-chat-heading"
          className="text-lg font-semibold tracking-tight text-ink"
        >
          {copy.title}
        </h2>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-paper hover:text-navy"
          aria-label={copy.close}
          onClick={onClose}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_10rem_auto] md:items-center">
        <div>
          <label htmlFor={`${inputId}-model`} className="sr-only">
            {copy.model}
          </label>
          <SelectMenu
            id={`${inputId}-model`}
            value={model}
            onChange={(value) => onModelChange(value as AiModelId)}
            options={AI_MODEL_IDS.map((id) => ({
              value: id,
              label: copy.models[id],
            }))}
          />
        </div>
        <p className="text-sm text-muted" title={copy.limitLabel}>
          {remainingLabel}
        </p>
        <div>
          <label htmlFor={`${inputId}-language`} className="sr-only">
            {copy.replyLanguage}
          </label>
          <SelectMenu
            id={`${inputId}-language`}
            value={replyLocale}
            onChange={(value) => setReplyLocale(value as Locale)}
            options={locales.map((id) => ({
              value: id,
              label: copy.languages[id],
            }))}
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-4 py-2.5 text-sm font-medium text-body hover:border-navy/30 hover:text-navy disabled:opacity-60"
          disabled={busy || messages.length === 0}
          onClick={() => {
            setMessages([]);
            setNotice(null);
            setSavedKeys({});
          }}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {copy.clear}
        </button>
      </div>

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
              const user = message.role === "user";
              if (user) {
                return (
                  <li key={`user-${index}`} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl bg-navy px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">
                        {copy.you}
                      </p>
                      {message.content ? (
                        <KatexPreview
                          tex={toKatexFriendlyTex(message.content)}
                          className="block break-words text-white [&_.katex-display]:my-2 [&_.katex]:text-[0.95rem] [&_.katex]:text-white"
                        />
                      ) : null}
                      {message.images?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {message.images.map((src, imageIndex) => (
                            <div key={`${index}-${imageIndex}`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={src}
                                alt=""
                                className="size-20 rounded-lg border border-white/20 object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              }

              let prose = message.content;
              let bankProblems: ReturnType<typeof chatCardsToBankProblems> = [];
              try {
                const split = splitTeacherChatReply(message.content);
                prose = split.prose;
                bankProblems = chatCardsToBankProblems(split.problems, index);
              } catch {
                prose = message.content;
                bankProblems = [];
              }

              return (
                <li key={`assistant-${index}`} className="flex justify-start">
                  <div className="max-w-[95%] space-y-3 sm:max-w-[85%]">
                    {bankProblems.length === 0 ? (
                      <div className="rounded-2xl border border-hairline bg-white px-4 py-3 text-sm leading-relaxed text-ink shadow-sm">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">
                          {copy.assistant}
                        </p>
                        <KatexPreview
                          tex={prose || message.content}
                          className="block break-words whitespace-pre-wrap text-ink [&_.katex-display]:my-2 [&_.katex]:text-[0.95rem]"
                        />
                      </div>
                    ) : null}

                    {bankProblems.length > 0 ? (
                      <div className="rounded-2xl border border-navy/15 bg-navy-tint/30 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold tracking-wide text-brass">
                            {copy.cardsTitle}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={savingKey !== null}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-navy/20 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-navy-tint disabled:opacity-60"
                              onClick={() =>
                                void persistCards(
                                  bankProblems,
                                  "bank",
                                  bankProblems.map((item) => item.id),
                                )
                              }
                            >
                              <Library className="size-3.5" aria-hidden="true" />
                              {savingKey === bankProblems.map((item) => item.id).join("|")
                                ? copy.savingCard
                                : copy.saveAllToBank}
                            </button>
                          </div>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {bankProblems.map((problem) => {
                            const status = savedKeys[problem.id];
                            const busyThis = savingKey === problem.id;
                            return (
                              <li
                                key={problem.id}
                                className="rounded-xl border border-hairline bg-white p-3"
                              >
                                <div className="mb-2 flex flex-wrap gap-2 text-[11px] text-muted">
                                  <span className="rounded-full bg-paper-deep px-2 py-0.5 font-semibold text-brass-strong">
                                    {fullCopy.difficulties[problem.difficulty]}
                                  </span>
                                  <span>
                                    {topicLabel(fullCopy.topics, problem.topic)}
                                  </span>
                                  {problem.year ? (
                                    <span>{fullCopy.years[problem.year]}</span>
                                  ) : null}
                                  {status ? (
                                    <span className="ml-auto font-semibold text-navy">
                                      {status === "lab"
                                        ? copy.savedToLab
                                        : copy.savedToBank}
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
                                {problem.solutionTex.trim() &&
                                problem.solutionTex.trim() !== "—" ? (
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
                                    onClick={() =>
                                      void persistCards(
                                        [problem],
                                        "bank",
                                        [problem.id],
                                      )
                                    }
                                  >
                                    <Library
                                      className="size-3.5"
                                      aria-hidden="true"
                                    />
                                    {busyThis && savingKey === problem.id
                                      ? copy.savingCard
                                      : copy.saveToBank}
                                  </button>

                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-navy-strong shadow-xs transition-all active:scale-95"
                                    onClick={() =>
                                      handleOpenAssignModal({
                                        topic: problem.topic,
                                        promptTex: problem.promptTex,
                                        solutionTex: problem.solutionTex,
                                      })
                                    }
                                  >
                                    <Send className="size-3.5" aria-hidden="true" />
                                    <span>კურსზე გაგზავნა</span>
                                  </button>
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={copy.addImage}
            title={copy.addImage}
            className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-navy-tint"
          >
            <ImagePlus className="size-3.5" aria-hidden="true" />
            {copy.addImage}
          </button>
          {slashEnabled ? (
            <button
              type="button"
              onClick={() => setManageSlashOpen((open) => !open)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-navy-tint"
            >
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
        {images.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {images.map((image) => (
              <li key={image.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.previewUrl}
                  alt=""
                  className="size-20 rounded-xl border border-hairline object-cover shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  aria-label={copy.removeImage}
                  title={copy.removeImage}
                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-white shadow hover:bg-rose-600"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs text-muted">{copy.imageHint}</p>
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
            onClick={(event) =>
              syncSlashMenu(event.currentTarget.value, event.currentTarget.selectionStart)
            }
            onKeyUp={(event) => {
              if (
                event.key === "ArrowLeft" ||
                event.key === "ArrowRight" ||
                event.key === "Home" ||
                event.key === "End"
              ) {
                syncSlashMenu(event.currentTarget.value, event.currentTarget.selectionStart);
              }
            }}
            onKeyDown={onDraftKeyDown}
            onPaste={onComposerPaste}
          />
        </div>
        {previewTex ? (
          <div className="rounded-xl border border-hairline-soft bg-paper px-3 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              {copy.previewLabel}
            </p>
            <KatexPreview
              tex={previewTex}
              className="block whitespace-pre-wrap break-words text-sm leading-relaxed text-ink [&_.katex-display]:my-2 [&_.katex]:text-[1.05rem]"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="submit"
            disabled={busy || (!draft.trim() && images.length === 0)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-strong disabled:opacity-60"
          >
            <Send className="size-4" aria-hidden="true" />
            {busy ? copy.sending : copy.send}
          </button>
        </div>
      </form>

      {notice ? (
        <p className="rounded-xl border border-brass/25 bg-brass-tint px-4 py-3 text-sm text-brass-strong">
          {notice}
        </p>
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

      {isAssignModalOpen && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150 rounded-2xl">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl border border-hairline animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-hairline bg-paper/30 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-navy-tint text-navy">
                  <Send className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink leading-tight">ამოცანის გაგზავნა მოსწავლეებთან</h3>
                  <p className="text-[11px] text-muted">აირჩიეთ კურსები და მოსწავლეები</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setAssignError(null);
                }}
                className="flex size-7 items-center justify-center rounded-xl border border-hairline bg-white text-muted hover:bg-paper hover:text-ink transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-ink">
                    კურსები და მოსწავლეები ({selectedStudentIds.length} მონიშნულია):
                  </span>
                  {courseGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allStudentIds = courseGroups.flatMap((g) => g.students.map((s) => s.id));
                        if (allStudentIds.every((id) => selectedStudentIds.includes(id))) {
                          setSelectedStudentIds([]);
                        } else {
                          setSelectedStudentIds(Array.from(new Set(allStudentIds)));
                        }
                      }}
                      className="text-xs font-bold text-navy hover:underline"
                    >
                      {courseGroups.flatMap((g) => g.students).every((s) => selectedStudentIds.includes(s.id))
                        ? "მონიშვნის მოხსნა"
                        : "ყველა მოსწავლის მონიშვნა"}
                    </button>
                  )}
                </div>

                {loadingCourses ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted">
                    <Loader2 className="size-6 animate-spin text-navy" />
                    <span className="text-xs">კურსები იტვირთება...</span>
                  </div>
                ) : courseGroups.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted border border-dashed rounded-2xl">
                    კურსები და მოსწავლეები ვერ მოიძებნა
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {courseGroups.map((group) => {
                      const isExpanded = expandedCourseIds.includes(group.id);
                      const groupStudentIds = group.students.map((s) => s.id);
                      const allGroupSelected =
                        groupStudentIds.length > 0 &&
                        groupStudentIds.every((id) => selectedStudentIds.includes(id));
                      const someGroupSelected =
                        groupStudentIds.some((id) => selectedStudentIds.includes(id)) && !allGroupSelected;

                      return (
                        <div
                          key={group.id}
                          className="rounded-2xl border border-hairline bg-paper/30 overflow-hidden transition-all"
                        >
                          <div
                            onClick={() => toggleCourseExpand(group.id)}
                            className="flex items-center justify-between p-3 bg-white hover:bg-paper cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <GraduationCap className="size-4 text-navy shrink-0" />
                              <span className="text-xs font-bold text-ink truncate">{group.title}</span>
                              <span className="rounded-md bg-paper-deep px-1.5 py-0.5 text-[10px] font-bold text-muted">
                                {group.students.length}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCourseSelectAll(group);
                                }}
                                className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-all ${
                                  allGroupSelected
                                    ? "bg-navy text-white border-navy"
                                    : someGroupSelected
                                    ? "bg-navy-tint text-navy border-navy/30"
                                    : "bg-paper text-muted border-hairline hover:text-ink"
                                }`}
                              >
                                {allGroupSelected ? "მონიშნულია" : "ჯგუფის მონიშვნა"}
                              </button>

                              <ChevronDown
                                className={`size-4 text-muted transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-2 border-t border-hairline bg-slate-50/50 space-y-1">
                              {group.students.length === 0 ? (
                                <p className="text-[11px] text-muted p-2 text-center">ამ კურსში მოსწავლეები არ არიან</p>
                              ) : (
                                group.students.map((student) => {
                                  const isSelected = selectedStudentIds.includes(student.id);
                                  return (
                                    <div
                                      key={student.id}
                                      onClick={() => toggleStudentSelection(student.id)}
                                      className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                                        isSelected
                                          ? "bg-navy text-white shadow-2xs font-bold"
                                          : "bg-white hover:bg-paper text-ink border border-hairline"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0 pr-2">
                                        <div
                                          className={`flex size-5 items-center justify-center rounded-full text-[9px] font-bold shrink-0 ${
                                            isSelected ? "bg-white text-navy" : "bg-paper-deep text-muted"
                                          }`}
                                        >
                                          {student.name.charAt(0)}
                                        </div>
                                        <span className="truncate">{student.name}</span>
                                      </div>

                                      <div
                                        className={`flex size-4 shrink-0 items-center justify-center rounded-md border transition-all ${
                                          isSelected
                                            ? "bg-white border-white text-navy"
                                            : "border-slate-300 bg-paper text-transparent"
                                        }`}
                                      >
                                        {isSelected && <Check className="size-2.5 stroke-[3]" />}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {assignedStatus && (
                <div className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
                  <UserCheck className="size-4" />
                  <span>{assignedStatus}</span>
                </div>
              )}

              {assignError && (
                <div className="py-2 text-xs font-bold text-rose-600 text-center animate-in fade-in">
                  <span>{assignError}</span>
                </div>
              )}
            </div>

            <div className="border-t border-hairline bg-paper/30 p-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={assignPending || selectedStudentIds.length === 0}
                onClick={() => handleSendProblemToStudents("task")}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-navy hover:bg-navy-strong text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
              >
                {assignPending && assignTargetType === "task" ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>იგზავნება...</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="size-3.5" />
                    <span>დავალებებში</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={assignPending || selectedStudentIds.length === 0}
                onClick={() => handleSendProblemToStudents("material")}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
              >
                {assignPending && assignTargetType === "material" ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>იგზავნება...</span>
                  </>
                ) : (
                  <>
                    <Layers className="size-3.5" />
                    <span>მასალებში</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}