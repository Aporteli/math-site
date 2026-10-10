'use client';

import { useCallback, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from 'react';
import type { KonvaCanvasHandle } from '../../KonvaCanvas/utils/types';
import type { Student } from '../utils/types';

interface Options {
  selectedPages: number[];
  currentPageIndex: number;
  setSelectedPagesForAssign: Dispatch<SetStateAction<number[]>>;
  setSelectedStudentIdentities: Dispatch<SetStateAction<string[]>>;
  setIsAssignModalOpen: Dispatch<SetStateAction<boolean>>;
  students: Student[];
  handleAskAIAboutBoard: (selectedPages: number[], currentPageIndex: number) => void;
  canvasRef: RefObject<KonvaCanvasHandle | null>;
  setIsDark: Dispatch<SetStateAction<boolean>>;
  setStylusOnly: Dispatch<SetStateAction<boolean>>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  setIsClearConfirmOpen: Dispatch<SetStateAction<boolean>>;
  currentPageIndexRef: MutableRefObject<number>;
  handleSwitchPage: (index: number) => void;
  setIsPagesTrayOpen: Dispatch<SetStateAction<boolean>>;
}

export function useBoardCommands({
  selectedPages,
  currentPageIndex,
  setSelectedPagesForAssign,
  setSelectedStudentIdentities,
  setIsAssignModalOpen,
  students,
  handleAskAIAboutBoard,
  canvasRef,
  setIsDark,
  setStylusOnly,
  fileInputRef,
  setIsClearConfirmOpen,
  currentPageIndexRef,
  handleSwitchPage,
  setIsPagesTrayOpen,
}: Options) {
  const openSendModal = useCallback(() => {
    const pagesToAssign = selectedPages.length > 0 ? selectedPages : [currentPageIndex];
    setSelectedPagesForAssign(pagesToAssign);
    if (students.length > 0) setSelectedStudentIdentities([students[0].identity]);
    setIsAssignModalOpen(true);
  }, [currentPageIndex, selectedPages, setIsAssignModalOpen, setSelectedPagesForAssign, setSelectedStudentIdentities, students]);

  const handleAskAIFromBoard = useCallback(
    () => handleAskAIAboutBoard(selectedPages, currentPageIndex),
    [currentPageIndex, handleAskAIAboutBoard, selectedPages],
  );

  const handleCropImage = useCallback(() => {
    canvasRef.current?.cropSelectedImage();
  }, [canvasRef]);

  const onToggleDark = useCallback(() => setIsDark((value) => !value), [setIsDark]);
  const onToggleStylusOnly = useCallback(() => setStylusOnly((value) => !value), [setStylusOnly]);
  const onFileInputClick = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);
  const onClearClick = useCallback(() => setIsClearConfirmOpen(true), [setIsClearConfirmOpen]);
  const onFit = useCallback(() => {
    canvasRef.current?.fitToContent();
  }, [canvasRef]);
  const onPrevPage = useCallback(() => {
    handleSwitchPage(currentPageIndexRef.current - 1);
  }, [currentPageIndexRef, handleSwitchPage]);
  const onNextPage = useCallback(() => {
    handleSwitchPage(currentPageIndexRef.current + 1);
  }, [currentPageIndexRef, handleSwitchPage]);
  const onToggleTray = useCallback(() => {
    setIsPagesTrayOpen((open) => !open);
  }, [setIsPagesTrayOpen]);

  return {
    openSendModal,
    handleAskAIFromBoard,
    handleCropImage,
    onToggleDark,
    onToggleStylusOnly,
    onFileInputClick,
    onClearClick,
    onFit,
    onPrevPage,
    onNextPage,
    onToggleTray,
  };
}
