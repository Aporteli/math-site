
interface MathMarkProps {
  tone?: 'dark' | 'light';
  className?: string;
}

export function MathMark({ tone = 'dark', className = 'h-11 w-11' }: MathMarkProps) {
  const stroke = tone === 'light' ? '#ffffff' : '#1b78d0';

  return (
    <span className={['inline-flex shrink-0 items-center justify-center select-none', className].join(' ')}>
      <svg
        viewBox="0 0 200 200"
        className="size-full"
        role="img"
        aria-label="pinf logo: a pi whose two legs curl into an infinity sign">
        <g fill="none" stroke={stroke} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 40 H182" />
          <path d="M44 40 V140" />
          <path d="M156 40 V140" />
          <path d="M100 140 C116 104 156 104 156 140 C156 176 116 176 100 140 C84 104 44 104 44 140 C44 176 84 176 100 140 Z" />
        </g>
      </svg>
    </span>
  );
}
