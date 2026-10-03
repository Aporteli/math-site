import type { ClipboardEvent, KeyboardEvent, RefObject } from 'react';
import { cleanPastedText } from '../utils/text';
import { adaptStrokeForTheme } from '../utils/theme';

interface TextEditorOverlayProps {
  editingPos: { x: number; y: number; width: number };
  currentFontSize: number;
  isDark: boolean;
  scale: number;
  strokeColor: string;
  editingTextValue: string;
  textareaInputRef: RefObject<HTMLTextAreaElement>;
  onFontSizeChange: (size: number) => void;
  onTextChange: (value: string) => void;
  onBlur: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function TextEditorOverlay({
  editingPos,
  currentFontSize,
  isDark,
  scale,
  strokeColor,
  editingTextValue,
  textareaInputRef,
  onFontSizeChange,
  onTextChange,
  onBlur,
  onKeyDown,
}: TextEditorOverlayProps) {
  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    let hasImage = false;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          hasImage = true;
          break;
        }
      }
    }
    if (hasImage) return;
    e.stopPropagation();
    const pasted = e.clipboardData.getData('text/plain');
    if (pasted) {
      e.preventDefault();
      const cleaned = cleanPastedText(pasted);
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      onTextChange(editingTextValue.substring(0, start) + cleaned + editingTextValue.substring(end));
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: Math.max(10, editingPos.y - 48),
        left: Math.max(10, editingPos.x),
        zIndex: 10000,
        pointerEvents: 'auto',
      }}
      className="flex flex-col gap-1"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}>
      <div
        className="flex w-max select-none items-center gap-1.5 rounded-box border border-hairline bg-paper p-1 text-xs shadow-md"
        onMouseDown={(e) => e.preventDefault()}>
        <span className="px-1 text-[11px] font-bold text-muted">ზომა:</span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const s = Math.max(12, currentFontSize - 4);
            onFontSizeChange(s);
          }}
          className="flex size-6 cursor-pointer items-center justify-center rounded-box bg-main font-bold text-mainText transition-colors hover:bg-mainButtonHover">
          -
        </button>
        <span
          className="min-w-[32px] px-1 text-center font-mono font-bold text-[#465D73]">
          {currentFontSize}px
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const s = Math.min(72, currentFontSize + 4);
            onFontSizeChange(s);
          }}
          className="flex size-6 cursor-pointer items-center justify-center rounded-box bg-main font-bold text-mainText transition-colors hover:bg-mainButtonHover">
          +
        </button>
        {[18, 24, 32, 40, 48].map((s) => (
          <button
            key={s}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onFontSizeChange(s);
            }}
            className={`rounded-box px-1.5 py-0.5 text-[11px] font-bold transition-colors ${
              currentFontSize === s
                ? 'bg-[#465D73] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)]'
                : 'bg-main text-mainText hover:bg-mainButtonHover'
            }`}>
            {s}
          </button>
        ))}
      </div>

      <textarea
        ref={textareaInputRef}
        value={editingTextValue}
        onChange={(e) => onTextChange(e.target.value)}
        onPaste={handlePaste}
        onBlur={onBlur}
        placeholder="ჩაწერეთ ან ჩასვით ტექსტი..."
        onKeyDown={onKeyDown}
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: `${Math.max(14, currentFontSize * (scale || 1))}px`,
          lineHeight: '1.4',
          color: adaptStrokeForTheme(strokeColor, isDark),
          width: `${Math.max(300, editingPos.width)}px`,
          minHeight: '85px',
          pointerEvents: 'auto',
          userSelect: 'text',
          touchAction: 'auto',
        }}
        className="resize rounded-box border-2 border-[#465D73] bg-paper p-2.5 shadow-2xl outline-none"
      />
    </div>
  );
}
