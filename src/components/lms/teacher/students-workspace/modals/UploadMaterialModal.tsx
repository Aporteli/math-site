'use client';

import { useState, useRef } from 'react';
import { Layers, X, UploadCloud, FileText, Loader2 } from 'lucide-react';
import { sendProblemToStudentAction } from '@/lib/actions/students';
import { uploadImageToStorageAction } from '@/lib/actions/upload';
import { fileToBase64 } from '../helpers/teacher-workspace.helpers';
import type { StudentItem, StudentAssignment } from '../types/teacher-workspace.types';

interface UploadMaterialModalProps {
  isOpen?: boolean;
  onClose: () => void;
  activeStudent: StudentItem;
  onSuccess: (newMaterial: StudentAssignment) => void;
}

export function UploadMaterialModal({ isOpen = true, onClose, activeStudent, onSuccess }: UploadMaterialModalProps) {
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialNote, setMaterialNote] = useState('');
  const [materialFileBase64, setMaterialFileBase64] = useState<string | null>(null);
  const [materialFileName, setMaterialFileName] = useState<string | null>(null);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const materialFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  async function handleUpload() {
    if (!materialFileBase64) return;

    const safeTitle = materialTitle.trim() || materialFileName || 'სასწავლო მასალა';
    const safeNote = materialNote.trim() ? `მასალა: ${materialNote.trim()}` : 'მასალა';

    setUploadingMaterial(true);

    try {
      const uploaded = await uploadImageToStorageAction({
        dataUrl: materialFileBase64,
        fileName: materialFileName || undefined,
      });

      if (!uploaded.success || !uploaded.url) {
        alert('მასალის ატვირთვა ვერ მოხერხდა');
        return;
      }

      const res = await sendProblemToStudentAction({
        studentId: activeStudent.id,
        instructions: safeNote,
        attachmentUrl: uploaded.url,
        problem: {
          id: 'mat-' + Date.now(),
          topic: safeTitle,
          difficulty: 'easy',
          promptTex: materialFileName ? `ფაილი: ${materialFileName}` : '',
          solutionTex: '',
        },
      });

      if (res.success) {
        const newMaterial: StudentAssignment = {
          id: res.assignmentId || 'mat-' + Date.now(),
          title: safeTitle,
          type: 'MATERIAL',
          instructions: safeNote,
          status: 'PUBLISHED',
          createdAt: new Date().toISOString(),
          promptTex: materialFileName ? `ფაილი: ${materialFileName}` : '',
          problemImageUrl: uploaded.url,
          studentAttachmentUrl: null,
          commentCount: 0,
        };

        onSuccess(newMaterial);
        onClose();
      } else {
        alert('გაგზავნა ვერ მოხერხდა: ' + (res.error || 'უცნობი შეცდომა'));
      }
    } catch (error) {
      console.error(error);
      alert('დაფიქსირდა შეცდომა მასალის გაგზავნისას.');
    } finally {
      setUploadingMaterial(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => !uploadingMaterial && onClose()}>
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-hairline bg-paper shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-hairline bg-surface px-5 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-navy/15 text-navy">
              <Layers className="size-3.5" />
            </div>
            <div className="flex items-baseline gap-2 min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink truncate">მასალის ატვირთვა</h3>
              <span className="text-[11px] text-muted shrink-0">/ {activeStudent.name}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-hairline/80 bg-surface/50 text-muted hover:bg-paper-deep hover:text-ink transition-colors cursor-pointer">
            <X className="size-3.5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">მასალის სათაური</label>
            <input
              type="text"
              value={materialTitle}
              onChange={(e) => setMaterialTitle(e.target.value)}
              placeholder="მაგ: თეორიული მასალა (გეომეტრია)"
              className="w-full rounded-xl border border-hairline bg-surface/60 px-3.5 py-2 text-xs font-medium text-ink placeholder:text-muted outline-none focus:border-navy focus:bg-surface transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">ფაილი</label>
            <input
              ref={materialFileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const base64 = await fileToBase64(file);
                  setMaterialFileBase64(base64);
                  setMaterialFileName(file.name);
                  if (!materialTitle) setMaterialTitle(file.name.replace(/\.[^/.]+$/, ''));
                }
              }}
            />

            {materialFileBase64 ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface p-2.5 shadow-2xs">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy/10 text-navy">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-ink truncate">{materialFileName}</p>
                  <span className="text-[10px] font-mono text-win">მზადაა ასატვირთად</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMaterialFileBase64(null);
                    setMaterialFileName(null);
                  }}
                  className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer">
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => materialFileInputRef.current?.click()}
                className="group w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-hairline hover:border-navy bg-surface/40 hover:bg-surface/80 py-6 text-xs transition-all cursor-pointer">
                <div className="flex size-8 items-center justify-center rounded-lg bg-paper-deep text-muted group-hover:bg-navy/10 group-hover:text-navy transition-colors">
                  <UploadCloud className="size-4" />
                </div>
                <span className="font-semibold text-muted group-hover:text-ink transition-colors">
                  დააწკაპუნეთ ფაილის ასარჩევად
                </span>
                <span className="text-[10px] font-mono text-muted/60">PDF, DOCX, TXT, PNG, JPG</span>
              </button>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">
              შენიშვნა / კომენტარი <span className="text-muted font-normal">(არასავალდებულო)</span>
            </label>
            <textarea
              value={materialNote}
              onChange={(e) => setMaterialNote(e.target.value)}
              placeholder="ჩაწერეთ მითითება ამ მასალისთვის..."
              className="w-full resize-none rounded-xl border border-hairline bg-surface/60 p-3 text-xs text-ink placeholder:text-muted outline-none focus:border-navy focus:bg-surface transition-colors"
              rows={2}
            />
          </div>
        </div>

        <div className="border-t border-hairline bg-surface px-5 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={uploadingMaterial}
            onClick={onClose}
            className="rounded-xl px-3.5 py-1.5 text-xs font-bold text-body hover:text-ink hover:bg-paper-deep transition-colors cursor-pointer disabled:opacity-50">
            გაუქმება
          </button>
          <button
            type="button"
            disabled={uploadingMaterial || !materialFileBase64}
            onClick={handleUpload}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-navy-strong disabled:opacity-40 transition-all active:scale-98 cursor-pointer">
            {uploadingMaterial ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>იტვირთება...</span>
              </>
            ) : (
              <>
                <UploadCloud className="size-3.5" />
                <span>ატვირთვა</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
