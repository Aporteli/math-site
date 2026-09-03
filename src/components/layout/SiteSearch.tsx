"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  FileText,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { BLOG_POSTS, postPath } from "@/lib/blog";
import { mainNavLinks } from "@/lib/navigation";
import { TOOL_SECTIONS } from "@/lib/tools";

const subscribeToPlatform = () => () => {};
const getIsMac = () => /Mac|iPhone|iPad/.test(navigator.userAgent);
const getIsMacOnServer = () => false;

type SearchGroupId = keyof Dictionary["header"]["searchGroups"];

interface SearchHit {
  id: string;
  group: SearchGroupId;
  href: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
}

interface SiteSearchProps {
  locale: Locale;
  header: Dictionary["header"];
  nav: Dictionary["nav"];
  toolItems: Dictionary["toolsPage"]["items"];
  posts: Dictionary["blogPage"]["posts"];
  children: ReactNode;
}

const SearchContext = createContext<{
  open: boolean;
  shortcut: string;
  header: Dictionary["header"];
  openSearch: (trigger?: HTMLButtonElement) => void;
} | null>(null);

function useSiteSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("SearchTrigger must be used within SiteSearch");
  }
  return context;
}

export function SearchTrigger({
  variant,
  className = "",
}: {
  variant: "field" | "icon";
  className?: string;
}) {
  const { open, shortcut, header, openSearch } = useSiteSearch();

  if (variant === "field") {
    return (
      <button
        type="button"
        onClick={(event) => openSearch(event.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={header.search}
        className={`min-w-0 items-center gap-2 rounded-full border border-hairline bg-white py-2 pr-2 pl-3 text-left text-sm text-muted transition-colors hover:border-navy/40 hover:text-ink ${className}`}
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{header.searchPlaceholder}</span>
        <kbd className="pointer-events-none hidden rounded border border-hairline bg-paper-deep px-1.5 py-0.5 font-sans text-[11px] font-semibold text-muted lg:inline-block">
          {shortcut}
        </kbd>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => openSearch(event.currentTarget)}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={header.search}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-hairline bg-white p-2 text-ink transition-colors duration-200 hover:border-navy/40 hover:text-navy ${className}`}
    >
      <Search className="size-5" aria-hidden="true" />
    </button>
  );
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function collectHits(
  query: string,
  locale: Locale,
  nav: Dictionary["nav"],
  toolItems: Dictionary["toolsPage"]["items"],
  posts: Dictionary["blogPage"]["posts"],
): SearchHit[] {
  const q = normalize(query);
  const hits: SearchHit[] = [];

  for (const link of mainNavLinks) {
    const title = nav[link.id];
    if (q && !normalize(title).includes(q)) continue;
    hits.push({
      id: `page-${link.id}`,
      group: "pages",
      href: localePath(locale, link.href),
      title,
      icon: FileText,
    });
  }

  const toolLimit = q ? Infinity : 6;
  let toolCount = 0;
  for (const section of TOOL_SECTIONS) {
    for (const tool of section.tools) {
      const item = toolItems[tool.id];
      const haystack = normalize(`${item.title} ${item.description}`);
      if (q && !haystack.includes(q)) continue;
      if (toolCount >= toolLimit) continue;
      hits.push({
        id: `tool-${tool.id}`,
        group: "tools",
        href: localePath(locale, tool.href),
        title: item.title,
        subtitle: item.description,
        icon: Calculator,
      });
      toolCount += 1;
    }
  }

  const postLimit = q ? Infinity : 4;
  let postCount = 0;
  for (const post of BLOG_POSTS) {
    const item = posts[post.id];
    const haystack = normalize(`${item.title} ${item.excerpt}`);
    if (q && !haystack.includes(q)) continue;
    if (postCount >= postLimit) continue;
    hits.push({
      id: `post-${post.id}`,
      group: "articles",
      href: localePath(locale, postPath(post.slug)),
      title: item.title,
      subtitle: item.excerpt,
      icon: BookOpen,
    });
    postCount += 1;
  }

  return hits;
}

export function SiteSearch({
  locale,
  header,
  nav,
  toolItems,
  posts,
  children,
}: SiteSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const router = useRouter();
  const isMac = useSyncExternalStore(
    subscribeToPlatform,
    getIsMac,
    getIsMacOnServer,
  );

  const hits = collectHits(query, locale, nav, toolItems, posts);
  const groups: SearchGroupId[] = ["pages", "tools", "articles"];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k") return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      setQuery("");
      setActiveIndex(0);
      setOpen((current) => !current);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        lastTriggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function openSearch(trigger?: HTMLButtonElement) {
    if (trigger) lastTriggerRef.current = trigger;
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  }

  function closeSearch() {
    setOpen(false);
    lastTriggerRef.current?.focus();
  }

  function moveActive(delta: number) {
    if (hits.length === 0) return;
    const next = (activeIndex + delta + hits.length) % hits.length;
    setActiveIndex(next);
    const item = listRef.current?.querySelector<HTMLElement>(
      `[data-search-index="${next}"]`,
    );
    item?.scrollIntoView({ block: "nearest" });
  }

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Enter") {
      const hit = hits[activeIndex];
      if (!hit) return;
      event.preventDefault();
      setOpen(false);
      router.push(hit.href);
    }
  }

  const shortcut = isMac ? "⌘K" : "Ctrl K";

  return (
    <SearchContext.Provider value={{ open, shortcut, header, openSearch }}>
      {children}
      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh] sm:px-6">
              <button
                type="button"
                aria-label={header.searchClose}
                className="absolute inset-0 bg-navy-strong/40 backdrop-blur-sm"
                onClick={closeSearch}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative z-10 flex max-h-[min(32rem,70vh)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-hairline bg-white shadow-lg shadow-navy/10"
              >
                <h2 id={titleId} className="sr-only">
                  {header.search}
                </h2>
                <div className="flex items-center gap-2 border-b border-hairline px-3">
                  <Search
                    className="size-5 shrink-0 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setActiveIndex(0);
                    }}
                    onKeyDown={onInputKeyDown}
                    placeholder={header.searchPlaceholder}
                    autoComplete="off"
                    className="min-w-0 flex-1 appearance-none bg-transparent py-3.5 text-base text-ink placeholder:text-muted focus:outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
                  />
                  <kbd className="hidden rounded border border-hairline bg-paper-deep px-1.5 py-0.5 font-sans text-[11px] font-semibold text-muted sm:inline-block">
                    Esc
                  </kbd>
                  <button
                    type="button"
                    onClick={closeSearch}
                    aria-label={header.searchClose}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-paper-deep hover:text-ink"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>

                <div ref={listRef} className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
                  {hits.length === 0 ? (
                    <p className="px-3 py-10 text-center text-sm text-muted">
                      {header.searchEmpty}
                    </p>
                  ) : (
                    groups.map((group) => {
                      const items = hits.filter((hit) => hit.group === group);
                      if (items.length === 0) return null;

                      return (
                        <section key={group} className="mb-2 last:mb-0">
                          <h3 className="px-3 py-1.5 text-xs font-semibold tracking-wide text-brass">
                            {header.searchGroups[group]}
                          </h3>
                          <ul>
                            {items.map((hit) => {
                              const index = hits.indexOf(hit);
                              const active = index === activeIndex;
                              const Icon = hit.icon;

                              return (
                                <li key={hit.id}>
                                  <Link
                                    href={hit.href}
                                    data-search-index={index}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => setOpen(false)}
                                    className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                                      active
                                        ? "bg-navy-tint text-navy"
                                        : "text-ink hover:bg-paper"
                                    }`}
                                  >
                                    <Icon
                                      className={`mt-0.5 size-4 shrink-0 ${
                                        active ? "text-navy" : "text-muted"
                                      }`}
                                      aria-hidden="true"
                                    />
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-medium">
                                        {hit.title}
                                      </span>
                                      {hit.subtitle ? (
                                        <span className="mt-0.5 block truncate text-xs text-muted">
                                          {hit.subtitle}
                                        </span>
                                      ) : null}
                                    </span>
                                    <ArrowRight
                                      className={`mt-0.5 size-4 shrink-0 ${
                                        active ? "text-navy" : "text-muted/0"
                                      }`}
                                      aria-hidden="true"
                                    />
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      );
                    })
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </SearchContext.Provider>
  );
}
