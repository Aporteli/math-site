'use client';

import { useCallback, useState } from 'react';
import { fileToBase64 } from '../../helpers/teacher-workspace.helpers';
import type { AssignImage } from './types';

export function useAssignImages() {
  const [assignImages, setAssignImages] = useState<AssignImage[]>([]);

  const addFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    const next = await Promise.all(
      imageFiles.map(async (file) => ({
        dataUrl: await fileToBase64(file),
        fileName: file.name || `pasted-${Date.now()}.png`,
      })),
    );
    setAssignImages((prev) => [...prev, ...next]);
  }, []);

  return { assignImages, setAssignImages, addFiles };
}
