import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { legalLinks, telegramHref } from "@/lib/navigation";

export function SiteFooter({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const { contact } = dict.footer;

  return (
    <footer className="border-t border-hairline bg-paper-deep text-body">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          {dict.footer.copyright.replace(
            "{year}",
            String(new Date().getFullYear()),
          )}
        </p>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <li>
            <a
              href={`mailto:${contact.email}`}
              className="transition-colors hover:text-navy"
            >
              {contact.email}
            </a>
          </li>
          <li>
            <a
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-navy"
            >
              {contact.telegram}
            </a>
          </li>
          {legalLinks.map((link) => (
            <li key={link.id}>
              <Link
                href={localePath(locale, link.href)}
                className="transition-colors hover:text-navy"
              >
                {dict.footer.legal[link.id]}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
