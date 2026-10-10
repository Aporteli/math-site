'use client';

export function ChartLegend({ items }: { items: { swatchClass: string; label: string }[] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-hairline pt-2 text-[10px] font-medium text-muted">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1">
          <span className={`size-2 rounded-box ${item.swatchClass}`} /> {item.label}
        </span>
      ))}
    </div>
  );
}
