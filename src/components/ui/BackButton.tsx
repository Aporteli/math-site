import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  href: string;
  label?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  href,
  label = "უკან",
  className = "",
}) => {
  return (
    <div className={`mb-2 ${className}`}>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
      >
        <ArrowLeft className="size-4" />
        <span>{label}</span>
      </Link>
    </div>
  );
};