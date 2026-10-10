"use client";

import { useRef, useState } from "react";
import { buildAssignmentResults } from "./build-assignment-results";
import { collectUploadedItems } from "./collect-uploaded-items";
import { fillEmptyMatches } from "./fill-empty-matches";
import { getMatchProgress } from "./get-match-progress";
import type { BatchUploadModalProps, UploadedFileItem } from "./types";
import { useLockBodyScroll } from "./use-lock-body-scroll";

export function useBatchUpload({
  problems,
  onClose,
  onApplyAssignments,
}: BatchUploadModalProps) {
  useLockBodyScroll(true);

  const [loading, setLoading] = useState(false);
  const [uploadedItems, setUploadedItems] = useState<UploadedFileItem[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [hoveredItems, setHoveredItems] = useState<Record<string, string | null>>({});
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setLoading(true);
    const fileArray = Array.from(files);
    const newItems = await collectUploadedItems(fileArray);

    const allItems = [...uploadedItems, ...newItems];
    setUploadedItems(allItems);

    setMatches(fillEmptyMatches(problems, matches, allItems));
    setLoading(false);
  };

  const handleMatchChange = (problemId: string, itemId: string) => {
    setMatches((prev) => ({
      ...prev,
      [problemId]: itemId,
    }));
  };

  const handleUnmatch = (problemId: string) => {
    setMatches((prev) => {
      const copy = { ...prev };
      delete copy[problemId];
      return copy;
    });
  };

  const handleDropdownHover = (problemId: string, itemId: string | null) => {
    setHoveredItems((prev) => ({
      ...prev,
      [problemId]: itemId,
    }));
  };

  const handleConfirm = () => {
    const results = buildAssignmentResults(matches, uploadedItems);

    onApplyAssignments(results);
    onClose();
  };

  const matchedCount = Object.keys(matches).length;
  const progressPct = getMatchProgress(matchedCount, problems.length);

  return {
    loading,
    uploadedItems,
    matches,
    openDropdown,
    setOpenDropdown,
    hoveredItems,
    fullscreenImage,
    setFullscreenImage,
    isDragging,
    setIsDragging,
    fileInputRef,
    handleFiles,
    handleMatchChange,
    handleUnmatch,
    handleDropdownHover,
    handleConfirm,
    matchedCount,
    progressPct,
  };
}
