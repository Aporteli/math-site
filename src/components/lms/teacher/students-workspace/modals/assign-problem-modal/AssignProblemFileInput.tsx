'use client';

import type { RefObject } from 'react';

export function AssignProblemFileInput({
  assignFileRef,
  onFiles,
}: {
  assignFileRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: File[]) => Promise<void>;
}) {
  return (
    <input
      ref={assignFileRef}
      type="file"
      multiple
      accept="image/png,image/jpeg,image/webp"
      className="sr-only"
      onChange={async (e) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length > 0) await onFiles(files);
        e.target.value = '';
      }}
    />
  );
}
