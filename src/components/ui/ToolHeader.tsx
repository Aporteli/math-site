import React from "react";
import { Calculator, LucideIcon } from "lucide-react";

interface ToolHeaderProps {
  category?: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export const ToolHeader: React.FC<ToolHeaderProps> = ({
  category = "კალკულატორი",
  title,
  description,
  icon,
}) => {
  return (
    <div className="relative mb-6 w-full overflow-hidden rounded-box border border-hairline bg-main p-6 shadow-sm">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-hero)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-hero)_1px,transparent_1px)] bg-[size:1rem_1rem] opacity-35"
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 top-0 h-1 bg-brass" aria-hidden="true" />
      <div className="relative z-10">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-box bg-brass-tint p-2 text-brass-strong">
            {icon}
          </div>
          <span className="text-xs font-bold tracking-wide text-brass uppercase">
            {category}
          </span>
        </div>

        <h1 className="text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>

        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-body">
          {description}
        </p>
      </div>
    </div>
  );
};