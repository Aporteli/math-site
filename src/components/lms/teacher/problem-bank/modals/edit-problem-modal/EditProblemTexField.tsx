'use client';

import { handlePlainTextPaste } from '@/lib/helpers/plain-text-paste';
import { fieldClass } from './field-class';
import { MathFieldPreview } from './MathFieldPreview';

export function EditProblemTexField({
  id,
  label,
  value,
  maxLength,
  placeholder,
  previewLabel,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  maxLength: number;
  placeholder: string;
  previewLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-ink" htmlFor={id}>
          {label}
        </label>
        <textarea
          id={id}
          className={`${fieldClass} mt-1.5 min-h-[8rem] resize-y font-sans`}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onPaste={(event) => handlePlainTextPaste(event, value, onChange, maxLength, 'katex')}
        />
      </div>
      <MathFieldPreview label={previewLabel} tex={value} />
    </>
  );
}
