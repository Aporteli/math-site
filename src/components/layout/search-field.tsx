import { Search } from "lucide-react";
import { localePath, type Locale } from "@/i18n/config";

export function SearchField({
  locale,
  label,
  placeholder,
  className = "",
}: {
  locale: Locale;
  label: string;
  placeholder: string;
  className?: string;
}) {
  return (
    <form role="search" action={localePath(locale, "/search")} className={className}>
      <label className="relative flex items-center">
        <span className="sr-only">{label}</span>
        <Search
          className="pointer-events-none absolute left-3 size-4 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          placeholder={placeholder}
          className="w-full rounded-xl border border-hairline bg-white py-2 pl-9 pr-3 text-sm text-ink transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15"
        />
      </label>
    </form>
  );
}
