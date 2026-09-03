'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X, UploadCloud, Loader2, Search, Check } from 'lucide-react';
import { sendProblemToStudentAction } from '@/lib/actions/students';
import { uploadImageToStorageAction } from '@/lib/actions/upload';
import { getProblemDetailsAction } from '@/lib/actions/teacher-students';
import { KatexPreview } from '@/components/math/katex-preview';
import { fileToBase64 } from '../helpers/teacher-workspace.helpers';
import type { StudentItem, SetProblem, StudentAssignment } from '../types/teacher-workspace.types';

interface AssignProblemModalProps {
  isOpen?: boolean;
  onClose: () => void;
  activeStudent: StudentItem;
  availableSetProblems: SetProblem[];
  onSuccess: (newAssignment: StudentAssignment) => void;
}

export function AssignProblemModal({
  isOpen = true,
  onClose,
  activeStudent,
  availableSetProblems,
  onSuccess,
}: AssignProblemModalProps) {
  const [selectedProblemId, setSelectedProblemId] = useState<string>('custom');
  const [customTitle, setCustomTitle] = useState('თავისუფალი დავალება');
  const [assignComment, setAssignComment] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [problemSearchQuery, setProblemSearchQuery] = useState('');
  const [assignImage, setAssignImage] = useState<string | null>(null);
  const [assignImageName, setAssignImageName] = useState<string | null>(null);
  const assignFileRef = useRef<HTMLInputElement>(null);

  const [selectedProblemDetails, setSelectedProblemDetails] = useState<{
    promptTex: string;
    solutionTex: string;
  } | null>(null);
  const [loadingProblemDetails, setLoadingProblemDetails] = useState(false);

  useEffect(() => {
    if (selectedProblemId === 'custom') {
      setSelectedProblemDetails(null);
      setLoadingProblemDetails(false);
      return;
    }

    let cancelled = false;
    setLoadingProblemDetails(true);
    setSelectedProblemDetails(null);

    getProblemDetailsAction(selectedProblemId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setSelectedProblemDetails({
            promptTex: res.promptTex ?? '',
            solutionTex: res.solutionTex ?? '',
          });
        }
        setLoadingProblemDetails(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingProblemDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedProblemId]);

  if (!isOpen) return null;

  const filteredSetProblems = availableSetProblems.filter(
    (p) =>
      p.title.toLowerCase().includes(problemSearchQuery.toLowerCase()) ||
      p.setTitle.toLowerCase().includes(problemSearchQuery.toLowerCase()),
  );

  const selectedProblem = availableSetProblems.find((p) => p.id === selectedProblemId);
  const isSendDisabled =
    assigning ||
    (selectedProblemId === 'custom' && !assignImage && !assignComment.trim()) ||
    (selectedProblemId !== 'custom' && (!selectedProblem || loadingProblemDetails || !selectedProblemDetails));

  async function handleSend() {
    const safeTitle = customTitle.trim() || 'თავისუფალი დავალება';
    const safeComment = assignComment.trim();

    let problemData;
    if (selectedProblemId === 'custom') {
      problemData = {
        id: 'custom-' + Date.now(),
        topic: safeTitle,
        difficulty: 'medium',
        promptTex: '',
        solutionTex: '',
      };
    } else {
      if (!selectedProblem || !selectedProblemDetails) return;
      problemData = {
        id: selectedProblem.id,
        topic: selectedProblem.title,
        difficulty: 'medium',
        promptTex: selectedProblemDetails.promptTex || '',
        solutionTex: selectedProblemDetails.solutionTex || '',
      };
    }

    setAssigning(true);

    try {
      let resolvedImage: string | null = null;
      if (assignImage) {
        const uploaded = await uploadImageToStorageAction({
          dataUrl: assignImage,
          fileName: assignImageName || undefined,
        });
        if (!uploaded.success || !uploaded.url) {
          alert('სურათის ატვირთვა ვერ მოხერხდა');
          return;
        }
        resolvedImage = uploaded.url;
      }

      const res = await sendProblemToStudentAction({
        studentId: activeStudent.id,
        instructions: safeComment || undefined,
        attachmentUrl: resolvedImage,
        problem: problemData,
      });

      if (res.success) {
        const newAssignment: StudentAssignment = {
          id: res.assignmentId || 'temp-' + Date.now(),
          title: problemData.topic,
          type: 'PROBLEM',
          instructions: safeComment || null,
          status: 'PUBLISHED',
          createdAt: new Date().toISOString(),
          promptTex: problemData.promptTex,
          problemImageUrl: resolvedImage,
          studentAttachmentUrl: null,
          commentCount: safeComment ? 1 : 0,
        };

        onSuccess(newAssignment);
        onClose();
      } else {
        alert('გაგზავნა ვერ მოხერხდა: ' + (res.error || 'უცნობი შეცდომა'));
      }
    } catch (error) {
      console.error(error);
      alert('დაფიქსირდა შეცდომა დავალების გაგზავნისას.');
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => !assigning && onClose()}>
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-hairline bg-paper shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-hairline bg-surface px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex size-7 items-center justify-center rounded-lg bg-navy/15 text-navy">
              <Send className="size-3.5" />
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">დავალების გადაცემა</h3>
              <span className="text-xs text-muted">/ {activeStudent.name}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg border border-hairline/80 bg-surface/50 text-muted hover:bg-paper-deep hover:text-ink transition-colors cursor-pointer">
            <X className="size-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          <div className="md:col-span-7 border-b md:border-b-0 md:border-r border-hairline p-5 bg-paper/40 flex flex-col justify-center">
            <input
              ref={assignFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const base64 = await fileToBase64(file);
                  setAssignImage(base64);
                  setAssignImageName(file.name);
                }
              }}
            />

            {assignImage ? (
              <div className="relative group overflow-hidden rounded-xl border border-hairline bg-surface shadow-inner">
                <img src={assignImage} alt="Attachment" className="w-full h-52 object-contain bg-black/20" />
                <div className="absolute inset-x-0 bottom-0 bg-surface/90 backdrop-blur-xs border-t border-hairline px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-ink truncate max-w-[200px]">{assignImageName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignImage(null);
                      setAssignImageName(null);
                    }}
                    className="text-rose-500 hover:text-rose-400 p-1 rounded-md transition-colors cursor-pointer">
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => assignFileRef.current?.click()}
                className="group flex flex-col items-center justify-center gap-2.5 h-52 rounded-xl border-2 border-dashed border-hairline/80 bg-surface/30 hover:border-navy hover:bg-surface/80 transition-all cursor-pointer">
                <div className="flex size-10 items-center justify-center rounded-xl bg-paper-deep text-muted group-hover:bg-navy group-hover:text-white transition-all shadow-2xs">
                  <UploadCloud className="size-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-ink group-hover:text-navy transition-colors">ატვირთეთ დავალების სურათი</p>
                  <span className="text-[10px] font-mono text-muted">PNG, JPG, WEBP (მაქს. 10MB)</span>
                </div>
              </button>
            )}
          </div>

          <div className="md:col-span-5 p-5 flex flex-col justify-between bg-surface/20">
            <div className="space-y-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brass-strong block">
                ინსტრუქცია მოსწავლეს
              </span>
              <textarea
                value={assignComment}
                onChange={(e) => setAssignComment(e.target.value)}
                placeholder="ჩაწერეთ მითითება ან კითხვა ამოცანის ირგვლივ..."
                className="w-full resize-none rounded-xl border border-hairline bg-surface p-3 text-xs text-ink placeholder:text-muted/70 outline-none focus:border-navy transition-colors"
                rows={5}
              />
            </div>

            <div className="pt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={isSendDisabled || assigning}
                onClick={handleSend}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-navy py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-navy-strong disabled:opacity-40 transition-all active:scale-98 cursor-pointer">
                {assigning ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
                <span>გაგზავნა დავალებებში</span>
              </button>
              <button
                type="button"
                disabled={assigning}
                onClick={onClose}
                className="w-full py-1.5 text-center text-xs font-semibold text-muted hover:text-ink transition-colors cursor-pointer">
                გაუქმება
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}