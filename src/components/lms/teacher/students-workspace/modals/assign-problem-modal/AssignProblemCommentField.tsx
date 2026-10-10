'use client';

export function AssignProblemCommentField({
  assignComment,
  onChange,
}: {
  assignComment: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brass-strong block">
        ინსტრუქცია მოსწავლეს
      </span>
      <textarea
        value={assignComment}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ჩაწერეთ მითითება ან კითხვა ამოცანის ირგვლივ..."
        className="w-full resize-none rounded-box border border-hairline bg-inputs p-3 text-xs text-ink placeholder:text-muted/70 outline-none focus:border-navy transition-colors"
        rows={5}
      />
    </div>
  );
}
