"use client";

interface FileOptionButtonProps {
  index: number;
  name: string;
  selected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function FileOptionButton({
  index,
  name,
  selected,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: FileOptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`w-full text-left px-3 py-3 text-xs transition-colors ${
        selected
          ? "bg-mainButton font-bold text-mainText"
          : "font-medium text-ink hover:bg-navy-tint hover:text-navy"
      }`}
    >
      #{index + 1} — {name}
    </button>
  );
}
