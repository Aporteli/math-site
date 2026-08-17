"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import {
  STUDENT_NAV,
  TEACHER_NAV,
  type DashboardLink,
} from "@/lib/dashboard";

type DashboardNavProps = {
  locale: Locale;
  label: string;
  variant?: "sidebar" | "tabs";
  collapsed?: boolean;
} & (
  | {
      role: "teacher";
      labels: Dictionary["dashboard"]["teacher"]["nav"];
    }
  | {
      role: "student";
      labels: Dictionary["dashboard"]["student"]["nav"];
    }
);

export function DashboardNav(props: DashboardNavProps) {
  if (props.role === "teacher") {
    return (
      <NavList
        locale={props.locale}
        label={props.label}
        variant={props.variant}
        collapsed={props.collapsed}
        links={TEACHER_NAV}
        labels={props.labels}
      />
    );
  }

  return (
    <NavList
      locale={props.locale}
      label={props.label}
        variant={props.variant}
        collapsed={props.collapsed}
        links={STUDENT_NAV}
        labels={props.labels}
    />
  );
}

function NavList<Id extends string>({
  locale,
  label,
  links,
  labels,
  variant = "sidebar",
  collapsed = false,
}: {
  locale: Locale;
  label: string;
  links: DashboardLink<Id>[];
  labels: Record<Id, string>;
  variant?: "sidebar" | "tabs";
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const tabs = variant === "tabs";
  const rail = collapsed && !tabs;

  return (
    <nav aria-label={label} className={tabs ? "px-3 py-2" : rail ? "px-2" : "px-3"}>
      <ul className={tabs ? "flex gap-1" : "space-y-1"}>
        {links.map((link) => {
          const href = localePath(locale, link.href);
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          const Icon = link.icon;
          const title = labels[link.id];

          return (
            <li key={link.id} className={tabs ? "shrink-0" : undefined}>
              <Link
                href={href}
                title={rail ? title : undefined}
                aria-label={rail ? title : undefined}
                className={[
                  "flex items-center rounded-xl text-sm font-medium transition-colors",
                  tabs ? "gap-3 px-3 py-2" : rail ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                  active
                    ? "bg-navy-tint text-navy"
                    : "text-body hover:bg-paper hover:text-navy",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className={rail ? "sr-only" : "min-w-0 whitespace-nowrap"}>
                  {title}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
