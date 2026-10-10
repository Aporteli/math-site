'use client';

import { useState } from 'react';

export type SelectMode = 'rect' | 'freeform' | 'draw';

export function useToolbarMenus() {
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number[] | null>(null);
  const [isPenMenuOpen, setIsPenMenuOpen] = useState(false);
  const [isEraserMenuOpen, setIsEraserMenuOpen] = useState(false);
  const [isShapesMenuOpen, setIsShapesMenuOpen] = useState(false);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [isStylusMenuOpen, setIsStylusMenuOpen] = useState(false);
  const [isImageMenuOpen, setIsImageMenuOpen] = useState(false);
  const [selectMode, setSelectMode] = useState<SelectMode>('rect');
  const [isSelectMenuOpen, setIsSelectMenuOpen] = useState(false);

  return {
    isClearConfirmOpen,
    setIsClearConfirmOpen,
    pendingDelete,
    setPendingDelete,
    isPenMenuOpen,
    setIsPenMenuOpen,
    isEraserMenuOpen,
    setIsEraserMenuOpen,
    isShapesMenuOpen,
    setIsShapesMenuOpen,
    isColorMenuOpen,
    setIsColorMenuOpen,
    isStylusMenuOpen,
    setIsStylusMenuOpen,
    isImageMenuOpen,
    setIsImageMenuOpen,
    selectMode,
    setSelectMode,
    isSelectMenuOpen,
    setIsSelectMenuOpen,
  };
}
