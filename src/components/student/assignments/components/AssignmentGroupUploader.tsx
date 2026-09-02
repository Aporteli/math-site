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
    <div className="shrink-0 mt-3 pt-3 border-t border-hairline">
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 shadow-2xs">
        {isGroupAlreadySubmitted ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-1">
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>ამ დღის პასუხები უკვე გაგზავნილია (იხილეთ „პასუხების“ ტაბში)</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={isWithdrawing}
                onClick={() => onResetGroup(selectedDateKey, taskAssignments)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-all shadow-2xs active:scale-95 disabled:opacity-50">
                {isWithdrawing ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                <span>პასუხის დაბრუნება</span>
              </button>

              <span className="inline-flex items-center gap-1 rounded-md bg-paper-deep px-2.5 py-1 text-[10px] font-semibold text-muted border border-slate-200 shrink-0">
                <Lock className="size-3" />
                <span>დახურულია</span>
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-ink">ჯგუფური პასუხების მიმაგრება</h4>
                <p className="text-[11px] text-muted mt-0.5">
                  ატვირთეთ ფაილები მთლიანი დღის ({taskAssignments.length} დავალების) პასუხებისთვის ერთად.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="cursor-pointer flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-ink hover:bg-paper transition-colors shadow-2xs">
                  {isUploading ? (
                    <Loader2 className="size-3.5 animate-spin text-navy" />
                  ) : (
                    <UploadCloud className="size-3.5 text-navy" />
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

                {currentGroupFiles.length > 0 && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => onSubmitGroup(selectedDateKey, taskAssignments)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-navy-strong disabled:opacity-50 transition-colors shadow-xs">
                    {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    <span>გაგზავნა ({currentGroupFiles.length})</span>
                  </button>
                )}
              </div>
            </div>

            {currentGroupFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                {currentGroupFiles.map((att) => (
                  <div
                    key={att.id}
                    className="group/thumb relative rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs">
                    <img src={att.url} alt="file" className="h-12 w-12 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(selectedDateKey, att.id)}
                      className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-white shadow-xs">
                      <X className="size-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
