'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import { AssignProblemEmptyDropzone } from './AssignProblemEmptyDropzone';
import { AssignProblemFileInput } from './AssignProblemFileInput';
import { AssignProblemImageList } from './AssignProblemImageList';
import type { AssignImage } from './types';

export function AssignProblemImagePanel({
  assignFileRef,
  assignImages,
  setAssignImages,
  onFiles,
}: {
  assignFileRef: RefObject<HTMLInputElement | null>;
  assignImages: AssignImage[];
  setAssignImages: Dispatch<SetStateAction<AssignImage[]>>;
  onFiles: (files: File[]) => Promise<void>;
}) {
  return (
    <div className="md:col-span-7 border-b md:border-b-0 md:border-r border-hairline p-5 bg-main flex flex-col justify-center">
      <AssignProblemFileInput assignFileRef={assignFileRef} onFiles={onFiles} />

      {assignImages.length > 0 ? (
        <AssignProblemImageList
          assignImages={assignImages}
          setAssignImages={setAssignImages}
          assignFileRef={assignFileRef}
        />
      ) : (
        <AssignProblemEmptyDropzone assignFileRef={assignFileRef} />
      )}
    </div>
  );
}
