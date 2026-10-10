'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { AssignImage } from './types';
import { AssignProblemImageThumb } from './AssignProblemImageThumb';

export function AssignProblemImageList({
  assignImages,
  setAssignImages,
  assignFileRef,
}: {
  assignImages: AssignImage[];
  setAssignImages: Dispatch<SetStateAction<AssignImage[]>>;
  assignFileRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
        {assignImages.map((image, index) => (
          <AssignProblemImageThumb
            key={`${image.fileName}-${index}`}
            image={image}
            onRemove={() => setAssignImages((prev) => prev.filter((_, i) => i !== index))}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => assignFileRef.current?.click()}
        className="text-xs font-semibold text-navy hover:text-navy-strong transition-colors cursor-pointer">
        კიდევ სურათის დამატება
      </button>
    </div>
  );
}
