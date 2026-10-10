"use client";

import { BatchUploadFooter } from "./BatchUploadFooter";
import { BatchUploadHeader } from "./BatchUploadHeader";
import { FullscreenPreview } from "./FullscreenPreview";
import { MatchSection } from "./MatchSection";
import type { BatchUploadModalProps } from "./types";
import { UploadDropzone } from "./UploadDropzone";
import { useBatchUpload } from "./use-batch-upload";

export { useLockBodyScroll } from "./use-lock-body-scroll";

export function BatchUploadModal({
  problems,
  onClose,
  onApplyAssignments,
}: BatchUploadModalProps) {
  const upload = useBatchUpload({ problems, onClose, onApplyAssignments });

  return (
    <div className="fixed inset-0 z-[60] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-in duration-200">
      <div
        className="flex h-[90vh] max-h-[820px] w-full max-w-5xl flex-col overflow-hidden rounded-box border border-hairline bg-paper shadow-2xl"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <BatchUploadHeader onClose={onClose} />

        <div
          className="flex-1 overflow-y-auto p-6 pb-32 space-y-6"
          onClick={() => upload.setOpenDropdown(null)}
        >
          <UploadDropzone
            fileInputRef={upload.fileInputRef}
            loading={upload.loading}
            isDragging={upload.isDragging}
            setIsDragging={upload.setIsDragging}
            uploadedCount={upload.uploadedItems.length}
            onFiles={upload.handleFiles}
          />

          {upload.uploadedItems.length > 0 && (
            <MatchSection
              problems={problems}
              uploadedItems={upload.uploadedItems}
              matches={upload.matches}
              hoveredItems={upload.hoveredItems}
              openDropdown={upload.openDropdown}
              setOpenDropdown={upload.setOpenDropdown}
              matchedCount={upload.matchedCount}
              progressPct={upload.progressPct}
              onMatchChange={upload.handleMatchChange}
              onUnmatch={upload.handleUnmatch}
              onDropdownHover={upload.handleDropdownHover}
              onOpenFullscreen={upload.setFullscreenImage}
            />
          )}
        </div>

        <BatchUploadFooter
          matchedCount={upload.matchedCount}
          loading={upload.loading}
          onClose={onClose}
          onConfirm={upload.handleConfirm}
        />
      </div>

      {upload.fullscreenImage && (
        <FullscreenPreview
          url={upload.fullscreenImage}
          onClose={() => upload.setFullscreenImage(null)}
        />
      )}
    </div>
  );
}
