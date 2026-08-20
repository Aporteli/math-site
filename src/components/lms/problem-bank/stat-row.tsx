interface StatRowProps {
  label: string;
  value: number;
}

export function StatRow({ label, value }: StatRowProps) {
  return (
    <p className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="text-muted">{label}</span>
      <span className="text-lg font-semibold tabular-nums text-ink">{value}</span>
    </p>
  );
}
