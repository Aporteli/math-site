'use client';

import { useEffect, useState } from 'react';
import { getProblemDetailsAction } from '@/lib/actions/teacher-students';
import type { SelectedProblemDetails } from './types';

export function useSelectedProblemDetails(selectedProblemId: string) {
  const [selectedProblemDetails, setSelectedProblemDetails] = useState<SelectedProblemDetails | null>(null);
  const [loadingProblemDetails, setLoadingProblemDetails] = useState(false);

  useEffect(() => {
    if (selectedProblemId === 'custom') {
      setSelectedProblemDetails(null);
      setLoadingProblemDetails(false);
      return;
    }

    let cancelled = false;
    setLoadingProblemDetails(true);
    setSelectedProblemDetails(null);

    getProblemDetailsAction(selectedProblemId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setSelectedProblemDetails({
            promptTex: res.promptTex ?? '',
            solutionTex: res.solutionTex ?? '',
          });
        }
        setLoadingProblemDetails(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingProblemDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedProblemId]);

  return { selectedProblemDetails, loadingProblemDetails };
}
