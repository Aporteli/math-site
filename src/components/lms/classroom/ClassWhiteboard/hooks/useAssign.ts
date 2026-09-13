//CUT დასაჭერელია

'use client';

import { useCallback, useState, type MutableRefObject, type RefObject } from 'react';
import { sendProblemToStudentAction } from '@/lib/actions/students';
import { uploadImageToStorageAction } from '@/lib/actions/upload';
import type { CanvasElement, KonvaCanvasHandle } from '../../KonvaCanvas/utils/types';
import { renderElementsToDataUrl } from '../utils/renderElementsToDataUrl';
import type { Student } from '../utils/types';

interface Options {
  courseTitle: string;
  isDark: boolean;
  pagesRef: MutableRefObject<CanvasElement[][]>;
  currentPageIndexRef: MutableRefObject<number>;
  canvasRef: RefObject<KonvaCanvasHandle | null>;
  students: Student[];
}

export function useAssign({ courseTitle, isDark, pagesRef, currentPageIndexRef, canvasRef, students }: Options) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedPagesForAssign, setSelectedPagesForAssign] = useState<number[]>([0]);
  const [selectedStudentIdentities, setSelectedStudentIdentities] = useState<string[]>([]);
  const [assignedStatus, setAssignedStatus] = useState<string | null>(null);
  const [assignPending, setAssignPending] = useState(false);
  const [assignTargetType, setAssignTargetType] = useState<'task' | 'material' | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const togglePageSelectionForAssign = useCallback((idx: number) => {
    setSelectedPagesForAssign((prev) => (prev.includes(idx) ? prev.filter((p) => p !== idx) : [...prev, idx]));
  }, []);

  const toggleStudentSelection = useCallback((identity: string) => {
    setSelectedStudentIdentities((prev) =>
      prev.includes(identity) ? prev.filter((id) => id !== identity) : [...prev, identity],
    );
  }, []);

  const selectAllStudents = useCallback(() => {
    setSelectedStudentIdentities((prev) =>
      prev.length === students.length ? [] : students.map((s) => s.identity),
    );
  }, [students]);

  const handleAssignSelectedBoards = useCallback(async (mode: 'task' | 'material') => {
    if (selectedPagesForAssign.length === 0) {
      setAssignError('გთხოვთ მონიშნოთ მინიმუმ 1 დაფა');
      setTimeout(() => setAssignError(null), 2500);
      return;
    }

    if (selectedStudentIdentities.length === 0) {
      setAssignError('გთხოვთ მონიშნოთ მინიმუმ 1 მოსწავლე');
      setTimeout(() => setAssignError(null), 2500);
      return;
    }

    setAssignPending(true);
    setAssignTargetType(mode);
    setAssignError(null);

    try {
      const boardImages: { pageIdx: number; url: string }[] = [];
      for (const pageIdx of selectedPagesForAssign) {
        if (pageIdx === currentPageIndexRef.current && canvasRef.current) {
          const liveUrl = canvasRef.current.toDataURL();
          if (liveUrl) {
            boardImages.push({ pageIdx, url: liveUrl });
            continue;
          }
        }
        const elems = pagesRef.current[pageIdx] || [];
        const renderedUrl = renderElementsToDataUrl(elems, isDark);
        boardImages.push({ pageIdx, url: renderedUrl });
      }

      const uploadedBoardUrls = await Promise.all(
        boardImages.map((board) =>
          uploadImageToStorageAction({
            dataUrl: board.url,
            fileName: `${mode === 'material' ? 'material' : 'board'}-page-${board.pageIdx + 1}.png`,
          }),
        ),
      );

      const resolvedBoardImages: { pageIdx: number; url: string }[] = [];
      for (let index = 0; index < boardImages.length; index++) {
        const uploaded = uploadedBoardUrls[index];
        if (!uploaded?.success || !uploaded.url) throw new Error('დაფის სურათის ატვირთვა ვერ მოხერხდა');
        resolvedBoardImages.push({ pageIdx: boardImages[index].pageIdx, url: uploaded.url });
      }

      const sendPromises = [];
      for (const studentIdentity of selectedStudentIdentities) {
        for (const board of resolvedBoardImages) {
          const isMat = mode === 'material';
          const title = isMat
            ? `${courseTitle || 'სასწავლო მასალა'} (დაფა ${board.pageIdx + 1})`
            : `${courseTitle || 'დაფის ამოცანა'} — გვერდი ${board.pageIdx + 1}`;

          sendPromises.push(
            sendProblemToStudentAction({
              studentId: studentIdentity,
              instructions: isMat ? 'მასალა' : undefined,
              attachmentUrl: board.url,
              problem: {
                id: `${isMat ? 'mat' : 'whiteboard'}-${Date.now()}-${board.pageIdx}`,
                topic: title,
                difficulty: isMat ? 'easy' : 'medium',
                promptTex: '',
                solutionTex: '',
              },
            }),
          );
        }
      }

      const results = await Promise.all(sendPromises);
      const hasFailure = results.some((r) => !r.success);
      if (hasFailure) throw new Error('ზოგიერთი ჩანაწერის გაგზავნა ვერ მოხერხდა');

      setAssignedStatus(
        mode === 'material'
          ? `მასალები წარმატებით გაეგზავნა ${selectedStudentIdentities.length} მოსწავლეს!`
          : `დავალებები წარმატებით გაეგზავნა ${selectedStudentIdentities.length} მოსწავლეს!`,
      );
      setTimeout(() => {
        setAssignedStatus(null);
        setIsAssignModalOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to assign boards to students:', err);
      setAssignError(err.message || 'გაგზავნა ვერ მოხერხდა');
    } finally {
      setAssignPending(false);
      setAssignTargetType(null);
    }
  }, [
    selectedPagesForAssign, selectedStudentIdentities, courseTitle, isDark,
    pagesRef, currentPageIndexRef, canvasRef,
  ]);

  return {
    isAssignModalOpen, setIsAssignModalOpen,
    selectedPagesForAssign, setSelectedPagesForAssign,
    selectedStudentIdentities, setSelectedStudentIdentities,
    assignedStatus, assignPending, assignTargetType, assignError,
    togglePageSelectionForAssign, toggleStudentSelection, selectAllStudents,
    handleAssignSelectedBoards,
  };
}