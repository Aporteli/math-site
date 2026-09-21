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
        className={`flex items-center gap-1.5 ${
          isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
        } p-1 rounded-xl shadow-md border text-xs w-max select-none`}
        onMouseDown={(e) => e.preventDefault()}>
        <span className="text-[11px] font-bold text-slate-500 px-1">ზომა:</span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const s = Math.max(12, currentFontSize - 4);
            onFontSizeChange(s);
          }}
          className={`size-6 flex items-center justify-center rounded-lg ${
            isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          } font-bold transition-colors`}>
          -
        </button>
        <span
          className={`font-mono font-bold px-1 min-w-[32px] text-center ${
            isDark ? 'text-indigo-400' : 'text-indigo-600'
          }`}>
          {currentFontSize}px
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const s = Math.min(72, currentFontSize + 4);
            onFontSizeChange(s);
          }}
          className={`size-6 flex items-center justify-center rounded-lg ${
            isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          } font-bold transition-colors`}>
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
            className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
              currentFontSize === s
                ? 'bg-indigo-600 text-white'
                : isDark
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
        className={`border-2 border-indigo-500 shadow-2xl outline-none p-2.5 resize rounded-xl ${
          isDark ? 'bg-slate-900/95' : 'bg-white/95'
        }`}
      />
    </div>
  );
}
