interface ComingSoonCardProps {
    title: string;
    description: string;
    soon: string;
    hint: string;
}   

export function ComingSoonCard({ title, description, soon, hint }: ComingSoonCardProps) {
    return (
      <div className="rounded-2xl border border-hairline bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight text-ink">{title}</h3>
            <p className="mt-1 text-sm text-body">{description}</p>
          </div>
          <span className="rounded-full bg-brass-tint px-2.5 py-1 text-[11px] font-semibold text-brass">{soon}</span>
        </div>
        <p className="mt-4 rounded-xl border border-hairline-soft bg-paper px-4 py-3 text-sm text-muted">{hint}</p>
      </div>
    );
  }