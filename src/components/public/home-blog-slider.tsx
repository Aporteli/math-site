"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BlogCover } from "@/components/public/blog-cover";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import {
  BLOG_POSTS,
  postPath,
  type BlogPost,
} from "@/lib/blog";

const SLIDE_COUNT = 5;

type SliderCopy = Dictionary["home"]["slider"];
type BlogCopy = Dictionary["blogPage"];

interface HomeBlogSliderProps {
  locale: Locale;
  slider: SliderCopy;
  blog: BlogCopy;
}

export function HomeBlogSlider({ locale, slider, blog }: HomeBlogSliderProps) {
  const posts = BLOG_POSTS.slice(0, SLIDE_COUNT);
  const [index, setIndex] = useState(0);
  const total = posts.length;

  if (total === 0) return null;

  const post = posts[index] ?? posts[0];
  const content = blog.posts[post.id];

  function goTo(next: number) {
    setIndex((next + total) % total);
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={slider.title}
      className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8"
    >
      <div className="group relative overflow-hidden rounded-2xl border border-hairline bg-white shadow-sm">
        <Slide
          locale={locale}
          post={post}
          title={content.title}
          excerpt={content.excerpt}
          category={blog.categories[post.category]}
          readMore={blog.readMore}
          coverAlt={blog.coverAlt.replace("{title}", content.title)}
        />

        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label={slider.prev}
          className="absolute top-1/2 left-3 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-white/95 text-navy shadow-sm transition-colors hover:bg-white hover:text-navy-strong sm:left-4 sm:size-11"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label={slider.next}
          className="absolute top-1/2 right-3 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-white/95 text-navy shadow-sm transition-colors hover:bg-white hover:text-navy-strong sm:right-4 sm:size-11"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>

        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {posts.map((item, i) => {
            const active = i === index;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={slider.goTo.replace("{n}", String(i + 1))}
                aria-current={active ? "true" : undefined}
                className={[
                  "size-2.5 rounded-full transition-colors",
                  active
                    ? "bg-white ring-1 ring-white/80"
                    : "bg-white/45 hover:bg-white/75",
                ].join(" ")}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Slide({
  locale,
  post,
  title,
  excerpt,
  category,
  readMore,
  coverAlt,
}: {
  locale: Locale;
  post: BlogPost;
  title: string;
  excerpt: string;
  category: string;
  readMore: string;
  coverAlt: string;
}) {
  const href = localePath(locale, postPath(post.slug));

  return (
    <article className="relative">
      <Link href={href} tabIndex={-1} className="block">
        <BlogCover
          src={post.coverImage}
          alt={coverAlt}
          className="aspect-[16/10] sm:aspect-[2/1]"
        />
      </Link>
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-navy-strong/90 via-navy-strong/35 to-navy-strong/10" />
      <div className="absolute inset-x-0 bottom-0 z-[1] px-5 pb-12 pt-16 sm:px-10 sm:pb-14 sm:pt-20">
        <p className="text-xs font-semibold tracking-wide text-brass-soft">
          {category}
        </p>
        <h2 className="mt-2 max-w-2xl text-xl font-bold tracking-tight text-balance text-white sm:text-3xl">
          <Link href={href} className="hover:underline">
            {title}
          </Link>
        </h2>
        <p className="mt-2 hidden max-w-xl text-sm leading-relaxed text-pretty text-paper/85 sm:block">
          {excerpt}
        </p>
        <Link
          href={href}
          className="mt-4 inline-flex rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-navy shadow-sm transition-colors hover:bg-paper"
        >
          {readMore}
        </Link>
      </div>
    </article>
  );
}
