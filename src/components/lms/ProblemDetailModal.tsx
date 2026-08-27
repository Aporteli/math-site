"use client";

import { useState } from "react";
import {
  X,
  UploadCloud,
  CheckCircle2,
  Clock,
  RotateCcw,
  FileText,
  ZoomIn,
  Send,
  Lock,
} from "lucide-react";
import { KatexPreview } from "@/components/math/katex-preview";

type Difficulty = "easy" | "medium" | "hard" | "olympiad";
type ProblemStatus = "notStarted" | "uploaded" | "submitted" | "graded";

interface ProblemDetailModalProps {
  problem: {
    id: string;
    promptTex: string;
    topic: string;
    difficulty: Difficulty;
    status: ProblemStatus;
    fileName?: string;
    previewUrl?: string;
    grade?: number;
    feedback?: string;
  };
  assignmentTitle: string;
  onClose: () => void;
  onFile: (file: File) => void;
  onRemoveFile: () => void;
  onMarkSubmitted: () => void;
  onWithdraw?: () => void;
}

export function ProblemDetailModal({
  problem,
  assignmentTitle,
  onClose,
  onFile,
  onRemoveFile,
  onMarkSubmitted,
  onWithdraw,
}: ProblemDetailModalProps) {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const isSubmitted = problem.status === "submitted" || problem.status === "graded";
  const isGraded = problem.status === "graded";

  // თუ previewUrl არის ჯგუფური სურათების JSON მასივი, ვშიფრავთ სწორად
  let previewImages: string[] = [];
  if (problem.previewUrl) {
    try {
      const parsed = JSON.parse(problem.previewUrl);
      if (Array.isArray(parsed)) {
        previewImages = parsed;
      } else {
        previewImages = [problem.previewUrl];
      }
    } catch {
      previewImages = [problem.previewUrl];
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-hairline px-6 py-4 bg-paper/40">
            <div>
              <h3 className="text-base font-bold text-ink">
                {problem.topic || "ამოცანა"}
              </h3>
              <p className="text-xs text-muted mt-0.5">{assignmentTitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* ამოცანის პირობა */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2.5">
                ამოცანის პირობა
              </h4>
              <div className="rounded-2xl border border-hairline-soft bg-paper/50 p-5 overflow-x-auto shadow-inner">
                <KatexPreview
                  tex={problem.promptTex}
                  displayMode
                  className="text-ink text-sm sm:text-base leading-relaxed"
                />
              </div>
            </div>

            {/* მოსწავლის ნამუშევრის სექცია */}
            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2.5">
                თქვენი ნამუშევარი
              </h4>

              {isSubmitted ? (
                /* გაგზავნილი მდგომარეობა: დაბლოკილია და ღილაკი ამოღებულია */
                <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isGraded ? (
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      ) : (
                        <Clock className="size-4 text-blue-600" />
                      )}
                      <span className="text-xs font-bold text-ink">
                        {isGraded ? "დავალება ჩაბარებულია" : "დავალება გაგზავნილია"}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-muted border border-hairline">
                      <Lock className="size-3" />
                      დახურულია
                    </span>
                  </div>

                  {/* სურათების პრევიუ */}
                  {previewImages.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 pt-2 border-t border-blue-200/60">
                      {previewImages.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          onClick={() => setFullscreenImage(imgUrl)}
                          className="group relative cursor-zoom-in h-16 w-16 rounded-xl border border-blue-200 bg-white overflow-hidden shadow-xs"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgUrl}
                            alt="Solution"
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <ZoomIn className="size-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : problem.status === "uploaded" && previewImages.length > 0 ? (
                /* ასატვირთად მომზადებული მდგომარეობა (ინდივიდუალური) */
                <div className="rounded-2xl border border-hairline bg-paper/40 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-ink truncate">
                      {problem.fileName || "მიმაგრებული ფაილი"}
                    </span>
                    <button
                      type="button"
                      onClick={onRemoveFile}
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      წაშლა
                    </button>
                  </div>

                  <div
                    onClick={() => setFullscreenImage(previewImages[0])}
                    className="relative cursor-zoom-in inline-block rounded-xl border border-hairline overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewImages[0]}
                      alt="Uploaded preview"
                      className="h-24 w-24 object-cover"
                    />
                  </div>
                </div>
              ) : (
                /* საწყისი მდგომარეობა - ინდივიდუალური ატვირთვის ზონა */
                <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-hairline bg-paper/40 p-6 text-center cursor-pointer transition-colors hover:bg-paper/80">
                  <UploadCloud className="size-6 text-navy" />
                  <div>
                    <span className="text-xs font-bold text-ink">
                      ატვირთეთ ფოტო ამ ამოცანისთვის
                    </span>
                    <p className="text-[10px] text-muted mt-0.5">PNG, JPG ან WEBP</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onFile(file);
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-hairline bg-paper/30 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-hairline bg-white px-5 py-2 text-xs font-bold text-ink hover:bg-paper transition-colors"
            >
              დახურვა
            </button>

            {!isSubmitted && problem.status === "uploaded" && (
              <button
                type="button"
                onClick={onMarkSubmitted}
                className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-5 py-2 text-xs font-bold text-white hover:bg-navy-strong shadow-xs transition-colors"
              >
                <Send className="size-3.5" />
                <span>გაგზავნა</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* სურათის სრულ ეკრანზე ნახვა */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-md cursor-zoom-out"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative flex h-full w-full items-center justify-center">
            <button
              type="button"
              className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-rose-500 transition-colors"
              onClick={() => setFullscreenImage(null)}
            >
              <X className="size-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullscreenImage}
              alt="Full solution"
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}