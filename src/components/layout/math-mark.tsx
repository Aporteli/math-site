/**
 * Brand mark: a parabola plotted on graph paper, tangent to the x-axis.
 * Drawn as inline SVG (no gradient <defs>) so it can be repeated on a page
 * without duplicate element ids, and stays crisp from 24px to 96px.
 */
export function MathMark({
  tone = "dark",
  className = "size-9",
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  const isLight = tone === "light";

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl",
        isLight
          ? "bg-paper text-navy ring-1 ring-white/25"
          : "bg-linear-to-br from-navy to-navy-strong text-white ring-1 ring-navy-strong/40",
        className,
      ].join(" ")}
    >
      <svg viewBox="0 0 32 32" fill="none" className="size-full" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="0.75" opacity="0.18">
          <path d="M8 2v28M16 2v28M24 2v28M2 8h28M2 16h28M2 24h28" />
        </g>
        <path
          d="M4 24h24"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M7 9q9 30 18 0"
          className={isLight ? "stroke-brass" : "stroke-brass-soft"}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <circle cx="16" cy="24" r="1.75" fill="currentColor" />
      </svg>
    </span>
  );
}
