'use client';

import { useCallback, useEffect } from 'react';
import { renderElementsToDataUrl } from './renderElementsToDataUrl';
import { getTeacherStudentsAction } from '@/lib/actions/teacher-students';
import { uploadImageToStorageAction } from '@/lib/actions/upload';
import { sendProblemToStudentAction } from '@/lib/actions/students';
import type { CourseGroup, ToolId } from './types';
import type { WhiteboardState } from './useWhiteboardState';
import type { WhiteboardPersistence } from './useWhiteboardPersistence';
import type { WhiteboardHistory } from './useWhiteboardHistory';

export function useWhiteboardCommands(boardState: WhiteboardState, persistence: WhiteboardPersistence, history: WhiteboardHistory) {
  const {
    canvasRef,
    fileInputRef,
    boardRootRef,
    setIsBoardFullscreen,
    pages,
    setPages,
    currentPageIndex,
    setCurrentPageIndex,
    setActiveTool,
    setStrokeColor,
    setStrokeWidth,
    setEraserWidth,
    isDark,
    setIsDark,
    zoomScale,
    setZoomScale,
    schedulePushRef,
    setIsAssignModalOpen,
    selectedPagesForAssign,
    setSelectedPagesForAssign,
    selectedStudentIds,
    setSelectedStudentIds,
    setCourseGroups,
    setExpandedCourseIds,
    setLoadingCourses,
    setAssignPending,
    setAssignTargetType,
    setAssignedStatus,
    setAssignError,
    pagesRef,
    currentPageIndexRef,
    historyMapRef,
    previousToolRef,
    isTemporaryEraserRef,
    temporaryEraserHoldersRef,
    savePreferencesImmediately,
    updateUndoRedoState,
    scheduleLocalPagesSave,
    handleElementsChange,
  } = { ...boardState, ...persistence, ...history };
  const setAndSaveTool = (tool: ToolId) => {
    isTemporaryEraserRef.current = false;
    temporaryEraserHoldersRef.current.clear();
    if (tool !== 'eraser') previousToolRef.current = tool;
    setActiveTool(tool);
    savePreferencesImmediately({ tool });
  };
  const setAndSaveColor = (color: string) => {
    setStrokeColor(color);
    savePreferencesImmediately({ color });
  };
  const setAndSaveWidth = (width: number) => {
    setStrokeWidth(width);
    savePreferencesImmediately({ width });
  };
  const setAndSaveEraserWidth = (width: number) => {
    setEraserWidth(width);
    savePreferencesImmediately({ eraserWidth: width });
  };
  const toggleAndSaveTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    savePreferencesImmediately({ isDark: nextDark });
  };
  const zoomIn = () => {
    const next = Math.min(4, Math.round((zoomScale + 0.15) * 100) / 100);
    setZoomScale(next);
    savePreferencesImmediately({ zoomScale: next });
  };
  const zoomOut = () => {
    const next = Math.max(0.2, Math.round((zoomScale - 0.15) * 100) / 100);
    setZoomScale(next);
    savePreferencesImmediately({ zoomScale: next });
  };
  const zoomReset = () => {
    setZoomScale(1);
    savePreferencesImmediately({ zoomScale: 1 });
  };

  useEffect(() => {
    const sync = () => {
      const el = boardRootRef.current;
      setIsBoardFullscreen(!!el && document.fullscreenElement === el);
    };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const toggleBoardFullscreen = () => {
    const el = boardRootRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      void document.exitFullscreen();
      return;
    }
    void el.requestFullscreen();
  };

  const fitToContent = () => canvasRef.current?.fitToContent();
  const deleteSelected = () => canvasRef.current?.deleteSelected();
  const clearBoard = () => handleElementsChange([]);
  const openImagePicker = () => fileInputRef.current?.click();

  const exportPng = () => {
    const url = canvasRef.current?.toDataURL();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    a.click();
  };

  const handleAddNewPage = () => {
    const updated = [...pagesRef.current, []];
    const newIdx = updated.length - 1;
    setPages(updated);
    pagesRef.current = updated;
    setCurrentPageIndex(newIdx);
    currentPageIndexRef.current = newIdx;
    historyMapRef.current.set(newIdx, { states: [[]], index: 0 });
    scheduleLocalPagesSave();
    savePreferencesImmediately({ pageIdx: newIdx });
    schedulePushRef.current();
    updateUndoRedoState();
  };

  const handleDeletePage = (pageIdx: number) => {
    if (pages.length <= 1) {
      clearBoard();
      return;
    }
    const updated = pages.filter((_, idx) => idx !== pageIdx);
    setPages(updated);
    pagesRef.current = updated;
    const nextIdx = Math.min(currentPageIndex, updated.length - 1);
    setCurrentPageIndex(nextIdx);
    currentPageIndexRef.current = nextIdx;
    scheduleLocalPagesSave();
    savePreferencesImmediately({ pageIdx: nextIdx });
    schedulePushRef.current();
    updateUndoRedoState();
  };

  const handleSwitchPage = (idx: number) => {
    if (idx < 0 || idx >= pages.length) return;
    setCurrentPageIndex(idx);
    currentPageIndexRef.current = idx;
    savePreferencesImmediately({ pageIdx: idx });
    schedulePushRef.current();
    if (!historyMapRef.current.has(idx)) {
      historyMapRef.current.set(idx, { states: [pages[idx] || []], index: 0 });
    }
    updateUndoRedoState();
  };

  const fetchCoursesAndStudents = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const res = await getTeacherStudentsAction();
      if (res.success && res.courseGroups) {
        setCourseGroups(res.courseGroups);
        if (res.courseGroups.length > 0) setExpandedCourseIds([res.courseGroups[0].id]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const handleOpenAssignModal = () => {
    setAssignError(null);
    setSelectedPagesForAssign([currentPageIndex]);
    setIsAssignModalOpen(true);
    void fetchCoursesAndStudents();
  };

  const togglePageSelection = (idx: number) => {
    setSelectedPagesForAssign((prev) => (prev.includes(idx) ? prev.filter((p) => p !== idx) : [...prev, idx]));
  };
  const toggleCourseExpand = (courseId: string) => {
    setExpandedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId],
    );
  };
  const toggleCourseSelectAll = (course: CourseGroup) => {
    const studentIds = course.students.map((s) => s.id);
    const allSelected = studentIds.every((id) => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !studentIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...studentIds])));
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  const handleAssignSelectedBoards = async (mode: 'task' | 'material') => {
    if (selectedPagesForAssign.length === 0) {
      setAssignError('გთხოვთ მონიშნოთ მინიმუმ 1 დაფა');
      setTimeout(() => setAssignError(null), 2500);
      return;
    }
    if (selectedStudentIds.length === 0) {
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

      const isMat = mode === 'material';
      const sendPromises = [];
      for (const studentId of selectedStudentIds) {
        for (const board of resolvedBoardImages) {
          const title = isMat
            ? `სასწავლო მასალა (დაფა ${board.pageIdx + 1})`
            : `დაფის ამოცანა — გვერდი ${board.pageIdx + 1}`;
          sendPromises.push(
            sendProblemToStudentAction({
              studentId,
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
      if (results.some((r) => !r.success)) throw new Error('ზოგიერთი ჩანაწერის გაგზავნა ვერ მოხერხდა');
      setAssignedStatus(
        isMat
          ? `მასალები წარმატებით გაეგზავნა ${selectedStudentIds.length} მოსწავლეს!`
          : `დავალებები წარმატებით გაეგზავნა ${selectedStudentIds.length} მოსწავლეს!`,
      );
      setTimeout(() => {
        setAssignedStatus(null);
        setIsAssignModalOpen(false);
      }, 1500);
    } catch (err: unknown) {
      console.error(err);
      const message = err && typeof err === 'object' && 'message' in err ? (err as { message?: unknown }).message : undefined;
      setAssignError((typeof message === 'string' ? message : '') || 'გაგზავნა ვერ მოხერხდა');
    } finally {
      setAssignPending(false);
      setAssignTargetType(null);
    }
  };
  return { setAndSaveTool, setAndSaveColor, setAndSaveWidth, setAndSaveEraserWidth, toggleAndSaveTheme, zoomIn, zoomOut, zoomReset, toggleBoardFullscreen, fitToContent, deleteSelected, clearBoard, openImagePicker, exportPng, handleAddNewPage, handleDeletePage, handleSwitchPage, fetchCoursesAndStudents, handleOpenAssignModal, togglePageSelection, toggleCourseExpand, toggleCourseSelectAll, toggleStudentSelection, handleAssignSelectedBoards };
}

export type WhiteboardCommands = ReturnType<typeof useWhiteboardCommands>;
