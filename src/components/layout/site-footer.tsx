import Link from "next/link";
import { Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { SiteLogo } from "@/components/layout/site-logo";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { footerGroupOrder, footerLinkHrefs, legalLinks } from "@/lib/navigation";

export function SiteFooter({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const { contact, groups } = dict.footer;

  const contactDetails: { icon: LucideIcon; label: string; href?: string }[] = [
    { icon: Mail, label: contact.email, href: `mailto:${contact.email}` },
    {
      icon: Phone,
      label: contact.phone,
      href: `tel:${contact.phone.replace(/\s/g, "")}`,
    },
    { icon: MapPin, label: contact.address },
  ];

  return (
    <footer className="bg-navy text-paper/75">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <SiteLogo locale={locale} brand={dict.brand} tone="light" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              {dict.footer.description}
            </p>
            <ul className="mt-6 space-y-3">
              {contactDetails.map((detail) => (
                <li key={detail.label} className="flex items-center gap-2.5 text-sm">
                  <detail.icon
                    className="size-4 shrink-0 text-brass-soft"
                    aria-hidden="true"
                  />
                  {detail.href ? (
                    <a
                      href={detail.href}
                      className="transition-colors hover:text-white"
                    >
                      {detail.label}
                    </a>
                  ) : (
                    <span>{detail.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {footerGroupOrder.map((groupId) => {
            const group = groups[groupId];

            return (
              <nav key={groupId} aria-label={group.title}>
                <h2 className="text-sm font-bold tracking-wide text-white">
                  {group.title}
                </h2>
                <ul className="mt-4 space-y-3">
                  {Object.entries(group.links).map(([linkId, linkLabel]) => (
                    <li key={linkId}>
                      <Link
                        href={localePath(locale, footerLinkHrefs[linkId] ?? "/")}
                        className="text-sm transition-colors hover:text-white"
                      >
                        {linkLabel}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            );
          })}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            {dict.footer.copyright.replace(
              "{year}",
              String(new Date().getFullYear()),
            )}
          </p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {legalLinks.map((link) => (
              <li key={link.id}>
                <Link
                  href={localePath(locale, link.href)}
                  className="text-sm transition-colors hover:text-white"
                >
                  {dict.footer.legal[link.id]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
