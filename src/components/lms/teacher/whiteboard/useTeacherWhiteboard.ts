'use client';

import { DEFAULT_COLOR, SHAPE_TOOLS } from './constants';
import { useWhiteboardCommands } from './useWhiteboardCommands';
import { useWhiteboardHistory } from './useWhiteboardHistory';
import { useWhiteboardInput } from './useWhiteboardInput';
import { useWhiteboardPersistence } from './useWhiteboardPersistence';
import { useWhiteboardState } from './useWhiteboardState';
import { useWhiteboardSync } from './useWhiteboardSync';

export function useTeacherWhiteboard() {
  const state = useWhiteboardState();
  const persistence = useWhiteboardPersistence(state);
  const sync = useWhiteboardSync(state, persistence);
  const history = useWhiteboardHistory(state, persistence);
  const input = useWhiteboardInput(state, persistence, history);
  const commands = useWhiteboardCommands(state, persistence, history);

  const { activeTool, isDark, strokeColor } = state;
  const currentShapeObj = SHAPE_TOOLS.find((s) => s.id === activeTool) || SHAPE_TOOLS[2];
  const CurrentShapeIcon = currentShapeObj.icon;
  const isShapeActive = SHAPE_TOOLS.some((s) => s.id === activeTool);
  const effectiveStroke =
    isDark && (strokeColor === DEFAULT_COLOR || strokeColor === '#000000') ? '#ffffff' : strokeColor;

  return {
    ...state,
    ...persistence,
    ...sync,
    ...history,
    ...input,
    ...commands,
    currentShapeObj,
    CurrentShapeIcon,
    isShapeActive,
    effectiveStroke,
  };
}

export type TeacherWhiteboardModel = ReturnType<typeof useTeacherWhiteboard>;
