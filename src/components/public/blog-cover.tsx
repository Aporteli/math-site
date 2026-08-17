import Image from "next/image";

interface BlogCoverProps {
  src?: string;
  alt: string;
  className?: string;
}

/**
 * Cover slot for a post. Renders a stored image when `src` is set (object
 * storage URL later); otherwise a single brand illustration.
 */
export function BlogCover({ src, alt, className = "" }: BlogCoverProps) {
  return (
    <div className={`relative overflow-hidden bg-paper-deep ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0" role="img" aria-label={alt}>
          <PlaceholderArt />
        </div>
      )}
    </div>
  );
}

function PlaceholderArt() {
  return (
    <svg
      viewBox="0 0 640 400"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      aria-hidden="true"
    >
      <rect width="640" height="400" fill="#f2f0ea" />
      <g stroke="#17365d" strokeWidth="0.8" opacity="0.1">
        <path d="M80 0v400M160 0v400M240 0v400M320 0v400M400 0v400M480 0v400M560 0v400" />
        <path d="M0 50h640M0 125h640M0 200h640M0 275h640M0 350h640" />
      </g>
      <path d="M48 320h544" stroke="#17365d" strokeWidth="2.2" strokeLinecap="round" opacity="0.45" />
      <path d="M96 48v304" stroke="#17365d" strokeWidth="2.2" strokeLinecap="round" opacity="0.45" />
      <path
        d="M96 320 Q320 28 544 320"
        fill="none"
        stroke="#8a621b"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="320" cy="320" r="8" fill="#17365d" />
      <circle cx="96" cy="320" r="5" fill="#8a621b" />
      <circle cx="544" cy="320" r="5" fill="#8a621b" />
    </svg>
  );
}
