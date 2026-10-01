'use client';

import { CheckCircle2, Loader2, Lock, RotateCcw, Send, UploadCloud, X } from 'lucide-react';
import type { Assignment } from '../types/student-assignment.types';

interface AssignmentGroupUploaderProps {
  selectedDateKey: string;
  taskAssignments: Assignment[];
  isGroupAlreadySubmitted: boolean;
  isWithdrawing: boolean;
  isUploading: boolean;
  isSubmitting: boolean;
  currentGroupFiles: { id: string; fileName: string; url: string }[];
  onResetGroup: (dateKey: string, items: Assignment[]) => void;
  onFileUpload: (dateKey: string, files: FileList | null) => Promise<void>;
  onSubmitGroup: (dateKey: string, items: Assignment[]) => void;
  onRemoveAttachment: (dateKey: string, id: string) => void;
}

export function AssignmentGroupUploader({
  selectedDateKey,
  taskAssignments,
  isGroupAlreadySubmitted,
  isWithdrawing,
  isUploading,
  isSubmitting,
  currentGroupFiles,
  onResetGroup,
  onFileUpload,
  onSubmitGroup,
  onRemoveAttachment,
}: AssignmentGroupUploaderProps) {
  return (
    <div className="shrink-0 border-t border-hairline bg-sectionHeader px-3 py-3 sm:px-4">
      {isGroupAlreadySubmitted ? (
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-xs font-bold text-mainText">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>ამ დღის პასუხები უკვე გაგზავნილია (იხილეთ „პასუხების“ ტაბში)</span>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              type="button"
              disabled={isWithdrawing}
              onClick={() => onResetGroup(selectedDateKey, taskAssignments)}
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-box border border-loss/30 bg-loss-tint px-3.5 py-2 text-xs font-bold text-loss transition hover:bg-loss/10 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">
              {isWithdrawing ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
              <span>პასუხის დაბრუნება</span>
            </button>

            <span className="inline-flex shrink-0 items-center gap-1 rounded-box border border-hairline bg-paper px-2.5 py-1 text-[10px] font-bold text-mainText">
              <Lock className="size-3" />
              <span>დახურულია</span>
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h4 className="text-sm font-bold text-mainText">ჯგუფური პასუხების მიმაგრება</h4>
              <p className="mt-0.5 text-[11px] text-muted">
                ატვირთეთ ფაილები მთლიანი დღის ({taskAssignments.length} დავალების) პასუხებისთვის ერთად.
              </p>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-box bg-mainButton px-4 py-2 text-xs font-bold tracking-wide text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-200 hover:bg-mainButtonHover hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_8px_rgba(0,0,0,0.3)] active:translate-y-[1px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
                {isUploading ? (
                  <Loader2 className="size-3.5 animate-spin text-mainText" />
                ) : (
                  <UploadCloud className="size-3.5 text-mainText" />
                )}
                <span>ფაილის არჩევა</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) =>
                    onFileUpload(selectedDateKey, e.target.files).finally(() => {
                      e.target.value = '';
                    })
                  }
                />
              </label>

              {currentGroupFiles.length > 0 ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onSubmitGroup(selectedDateKey, taskAssignments)}
                  className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-box bg-navy px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-mainButton/80 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">
                  {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  <span>გაგზავნა ({currentGroupFiles.length})</span>
                </button>
              ) : null}
            </div>
          </div>

          {currentGroupFiles.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-hairline pt-3">
              {currentGroupFiles.map((attachment) => (
                <div key={attachment.id} className="relative rounded-box border border-hairline bg-paper p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={attachment.url} alt={attachment.fileName} className="size-12 rounded-box object-cover" />
                  <button
                    type="button"
                    title="წაშლა"
                    onClick={() => onRemoveAttachment(selectedDateKey, attachment.id)}
                    className="absolute -right-1.5 -top-1.5 flex size-5 cursor-pointer items-center justify-center rounded-box bg-loss text-mainText shadow-sm transition hover:bg-loss/80">
                    <X className="size-3 text-mainText" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
