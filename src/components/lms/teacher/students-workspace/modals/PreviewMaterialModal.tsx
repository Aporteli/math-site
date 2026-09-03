'use client';

import { Layers, Download, X } from 'lucide-react';
import { isImageString } from '../helpers/teacher-workspace.helpers';

interface PreviewMaterialModalProps {
  material: {
    url: string;
    title: string;
    instructions?: string | null;
  } | null;
  onClose: () => void;
}

export function PreviewMaterialModal({ material, onClose }: PreviewMaterialModalProps) {
  if (!material) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}>
      <div
        className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-hairline bg-paper shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-hairline bg-surface px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy/15 text-navy">
              <Layers className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink truncate">
                  {material.title || 'სასწავლო მასალა'}
                </h3>
                <span className="rounded-md bg-paper-deep px-1.5 py-0.5 text-[10px] font-mono text-muted border border-hairline/60 shrink-0">
                  დაფა
                </span>
              </div>
              {material.instructions && material.instructions !== 'მასალა' && (
                <p className="text-[11px] text-muted truncate mt-0.5">{material.instructions}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={material.url}
              target="_blank"
              rel="noreferrer"
              download
              className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:bg-navy hover:text-white hover:border-navy transition-all shadow-2xs active:scale-98 cursor-pointer">
              <Download className="size-3.5" />
              <span>გადმოწერა</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-xl border border-hairline bg-surface text-muted hover:bg-paper-deep hover:text-ink transition-colors cursor-pointer">
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[#161512] p-4 sm:p-6 overflow-hidden flex items-center justify-center">
          <div className="relative flex items-center justify-center max-h-full max-w-full overflow-hidden rounded-xl border border-[#363431] bg-white shadow-2xl p-1.5">
            {isImageString(material.url) ? (
              <img
                src={material.url}
                alt={material.title || 'მასალის გადახედვა'}
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg"
              />
            ) : (
              <iframe
                src={material.url}
                title={material.title}
                className="h-[72vh] w-[80vw] max-w-4xl rounded-lg bg-white border-0"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}