import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { legalLinks, telegramHref } from "@/lib/navigation";
import { Mail, Send, ShieldCheck, FileText, Sparkles, BookOpen, GraduationCap } from "lucide-react";

export function SiteFooter({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const { contact } = dict.footer;
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full border-t border-hairline bg-paper text-body">
      <div className="mx-auto max-w-6xl px-4 pt-4 pb-2.5 sm:px-6 lg:px-8">
        {/* ზედა ძირითადი ბადე */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:gap-8">
          {/* 1. ბრენდი & აღწერა */}
          <div className="space-y-1 md:col-span-2">
            <div className="flex items-center gap-1.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-navy text-white shadow-2xs">
                <GraduationCap className="size-4" />
              </div>
              <span className="text-sm font-black tracking-tight text-ink">
                MathLab
              </span>
            </div>
            <p className="max-w-sm text-[11px] leading-snug text-muted">
              ინტერაქციული მათემატიკური პლატფორმა მოსწავლეებისა და მასწავლებლებისთვის. გაკვეთილები, ინტერაქტიული დაფა და AI ასისტენტი ერთ სივრცეში.
            </p>
          </div>

          {/* 2. ნავიგაცია & რესურსები */}
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink">
              რესურსები
            </h4>
            <ul className="space-y-1 text-xs">
              <li>
                <Link
                  href={localePath(locale, "/courses")}
                  className="inline-flex items-center gap-1 transition-colors hover:text-navy"
                >
                  <BookOpen className="size-3 text-muted" />
                  <span>კურსები</span>
                </Link>
              </li>
              <li>
                <Link
                  href={localePath(locale, "/problem-bank")}
                  className="inline-flex items-center gap-1 transition-colors hover:text-navy"
                >
                  <Sparkles className="size-3 text-muted" />
                  <span>ამოცანების ბანკი</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* 3. კონტაქტი */}
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink">
              კონტაქტი
            </h4>
            <ul className="space-y-1 text-xs">
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="inline-flex items-center gap-1 transition-colors hover:text-navy"
                >
                  <Mail className="size-3 text-muted" />
                  <span>{contact.email}</span>
                </a>
              </li>
              <li>
                <a
                  href={telegramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 transition-colors hover:text-navy"
                >
                  <Send className="size-3 text-muted" />
                  <span>{contact.telegram}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* ქვედა ზოლი: Copyright & Legal */}
        <div className="mt-3 flex flex-col items-center justify-between gap-2 border-t border-hairline/60 pt-2 text-[11px] text-muted sm:flex-row">
          <p>
            {dict.footer.copyright.replace("{year}", String(currentYear))}
          </p>

          <ul className="flex flex-wrap items-center gap-3">
            {legalLinks.map((link) => (
              <li key={link.id}>
                <Link
                  href={localePath(locale, link.href)}
                  className="inline-flex items-center gap-1 transition-colors hover:text-navy"
                >
                  {link.id.includes("privacy") ? (
                    <ShieldCheck className="size-3 opacity-70" />
                  ) : (
                    <FileText className="size-3 opacity-70" />
                  )}
                  <span>{dict.footer.legal[link.id]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}