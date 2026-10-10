'use client';

import { useRef } from 'react';
import { useAssignDrag } from './use-assign-drag';
import { useAssignImages } from './use-assign-images';
import { useAssignPaste } from './use-assign-paste';
import { useAssignProblemForm } from './use-assign-problem-form';
import { useSelectedProblemDetails } from './use-selected-problem-details';

export function useAssignProblemState(isOpen: boolean) {
  const form = useAssignProblemForm();
  const images = useAssignImages();
  const assignFileRef = useRef<HTMLInputElement>(null);
  const details = useSelectedProblemDetails(form.selectedProblemId);

  useAssignPaste(isOpen, images.addFiles);
  const drag = useAssignDrag(images.addFiles);

  return {
    ...form,
    ...images,
    assignFileRef,
    ...details,
    ...drag,
  };
}
