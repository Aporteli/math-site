"use client";

import type { RefObject } from "react";
import { Loader2, UploadCloud } from "lucide-react";

interface UploadDropzoneProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  loading: boolean;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  uploadedCount: number;
  onFiles: (files: FileList | null) => Promise<void>;
}

export function UploadDropzone({
  fileInputRef,
  loading,
  isDragging,
  setIsDragging,
  uploadedCount,
  onFiles,
}: UploadDropzoneProps) {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="sr-only"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            onFiles(files).finally(() => {
              if (fileInputRef.current) fileInputRef.current.value = "";
            });
          }
        }}
      />

      <div
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isDragging) setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          onFiles(e.dataTransfer.files);
        }}
        className={`group flex flex-col items-center justify-center gap-3 rounded-box border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-navy bg-navy-tint/60 scale-[1.01]"
            : "border-navy/30 bg-navy-tint/20 hover:border-navy hover:bg-navy-tint/40"
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="size-8 animate-spin text-navy" />
            <p className="text-sm font-bold text-navy">ფაილები მუშავდება...</p>
          </div>
        ) : (
          <>
            <span className="flex size-12 items-center justify-center rounded-box border border-navy/10 bg-white text-navy shadow-sm transition-transform group-hover:scale-105">
              <UploadCloud className="size-6" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">
                დააჭირეთ, ან გადმოათრიეთ ფაილები აქ
              </p>
              <p className="text-xs text-muted mt-1">
                ატვირთულია:{" "}
                <span className="font-bold text-navy">{uploadedCount} ფაილი</span>
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
