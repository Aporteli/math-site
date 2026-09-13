'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Clock, Download, FileArchive, FileText, Search } from 'lucide-react';
import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';
import { BlogCover } from '@/components/public/BlogCover';
import { PageHero, SectionHeading } from '@/components/ui/PageHero';
import {
  BLOG_FILTERS,
  BLOG_POSTS,
  RESOURCE_DOWNLOADS,
  categoryBadgeClass,
  formatPostDate,
  postPath,
  type BlogFilterId,
  type BlogPost,
  type ResourceDownload,
} from '@/lib/blog';

type BlogCopy = Dictionary['blogPage'];

interface BlogHubProps {
  locale: Locale;
  author: string;
  copy: BlogCopy;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function postMatches(
  post: BlogPost,
  content: BlogCopy['posts'][BlogPost['id']],
  tags: BlogCopy['tags'],
  query: string,
) {
  if (!query) return true;
  const tagText = post.tags.map((tag) => tags[tag]).join(' ');
  return normalize(`${content.title} ${content.excerpt} ${tagText}`).includes(query);
}

function fileMatches(file: ResourceDownload, content: BlogCopy['files'][ResourceDownload['id']], query: string) {
  if (!query) return true;
  return normalize(`${content.title} ${content.description}`).includes(query);
}

function postInFilter(post: BlogPost, filter: BlogFilterId) {
  if (filter === 'all' || filter === 'downloads') return true;
  if (filter === 'funFacts') {
    return post.category === 'funFacts' || post.category === 'paradoxes';
  }
  return post.category === filter;
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`max-w-full rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-200 sm:px-4 ${
        active
          ? 'border-navy bg-navy text-white shadow-sm'
          : 'border-hairline bg-white text-body hover:border-navy/30 hover:text-ink'
      }`}>
      {children}
    </button>
  );
}

function ArticleCard({
  locale,
  post,
  content,
  copy,
}: {
  locale: Locale;
  post: BlogPost;
  content: BlogCopy['posts'][BlogPost['id']];
  copy: BlogCopy;
}) {
  const href = localePath(locale, postPath(post.slug));
  const coverAlt = copy.coverAlt.replace('{title}', content.title);

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-hairline bg-white shadow-sm transition-all hover:border-navy/30 hover:shadow-md">
      <Link href={href} prefetch={false} tabIndex={-1} className="block">
        <BlogCover src={post.coverImage} alt={coverAlt} className="aspect-16/10" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${categoryBadgeClass[post.category]}`}>
            {copy.categories[post.category]}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
            <Clock className="size-3.5" aria-hidden="true" />
            {copy.readTime.replace('{minutes}', String(post.readMinutes))}
          </span>
        </div>
        <h3 className="mt-4 break-words text-lg font-semibold leading-snug text-ink">
          <Link href={href} prefetch={false} className="transition-colors hover:text-navy">
            {content.title}
          </Link>
        </h3>
        <p className="mt-2 min-h-0 flex-1 break-words text-sm leading-relaxed text-body">{content.excerpt}</p>
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-paper-deep px-2 py-0.5 text-xs font-medium text-muted">
              {copy.tags[tag]}
            </li>
          ))}
        </ul>
        <Link
          href={href}
          prefetch={false}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy">
          {copy.readMore}
          <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function DownloadCard({
  file,
  content,
  categoryLabel,
  cta,
}: {
  file: ResourceDownload;
  content: BlogCopy['files'][ResourceDownload['id']];
  categoryLabel: string;
  cta: string;
}) {
  const FileIcon = file.fileType === 'ZIP' ? FileArchive : FileText;

  return (
    <article className="flex h-full min-w-0 flex-col rounded-2xl border border-hairline bg-white p-5 shadow-sm transition-all hover:border-navy/30 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy-tint text-navy">
          <FileIcon className="size-5" aria-hidden="true" />
        </span>
        <span className="rounded-full bg-paper-deep px-2.5 py-1 text-xs font-semibold leading-none text-ink">
          {file.fileType}
        </span>
      </div>
      <p className="mt-4 text-xs font-semibold tracking-wide text-brass">{categoryLabel}</p>
      <h3 className="mt-1 break-words text-lg font-semibold leading-snug text-ink">{content.title}</h3>
      <p className="mt-2 min-h-0 flex-1 break-words text-sm leading-relaxed text-body">{content.description}</p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted">{file.fileSize}</span>
        <a href={file.downloadUrl} className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy">
          {cta}
          <Download className="size-4 shrink-0" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export function BlogHub({ locale, author, copy }: BlogHubProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<BlogFilterId>('all');
  const normalizedQuery = normalize(query);

  const matchingPosts = BLOG_POSTS.filter(
    (post) => postInFilter(post, filter) && postMatches(post, copy.posts[post.id], copy.tags, normalizedQuery),
  ).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const matchingFiles = RESOURCE_DOWNLOADS.filter((file) => fileMatches(file, copy.files[file.id], normalizedQuery));

  const featured = filter === 'all' && !normalizedQuery ? matchingPosts.find((post) => post.featured) : undefined;
  const gridPosts = featured ? matchingPosts.filter((post) => post.id !== featured.id) : matchingPosts;

  const showArticles = filter !== 'downloads';
  const showDownloads = filter === 'all' || filter === 'downloads';
  const visibleArticles = showArticles ? matchingPosts : [];
  const visibleFiles = showDownloads ? matchingFiles : [];
  const isEmpty = visibleArticles.length === 0 && (!showDownloads || visibleFiles.length === 0) && !featured;

  return (
    <div className="overflow-x-clip">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <PageHero
          icon={BookOpen}
          eyebrow={copy.hero.eyebrow}
          title={copy.hero.title}
          description={copy.hero.subtitle}
          aside={
            <>
              <label className="relative block">
                <span className="sr-only">{copy.hero.searchLabel}</span>
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.hero.searchPlaceholder}
                  autoComplete="off"
                  className="w-full min-w-0 appearance-none rounded-2xl border border-hairline bg-white py-3 pr-4 pl-12 text-base text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:ring-2 focus:ring-navy/15 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
                />
              </label>
              {showArticles ? (
                <p className="text-sm text-muted" aria-live="polite">
                  {copy.hero.articleCount.replace('{count}', String(visibleArticles.length))}
                </p>
              ) : null}
            </>
          }
          footer={
            <nav aria-label={copy.filters.aria}>
              <div className="flex flex-wrap gap-2">
                {BLOG_FILTERS.map((id) => (
                  <FilterPill key={id} active={filter === id} onClick={() => setFilter(id)}>
                    {copy.filters[id]}
                  </FilterPill>
                ))}
              </div>
            </nav>
          }
        />

        <div className="mt-12 space-y-14 sm:space-y-16">
          {isEmpty && (
            <p className="rounded-2xl border border-hairline bg-white px-6 py-16 text-center text-body shadow-sm">
              {copy.hero.empty}
            </p>
          )}

          {featured && (
            <article className="group overflow-hidden rounded-3xl border border-hairline bg-white shadow-sm">
              <div className="grid lg:grid-cols-5">
                <Link
                  href={localePath(locale, postPath(featured.slug))}
                  prefetch={false}
                  tabIndex={-1}
                  className="block h-full lg:col-span-2">
                  <BlogCover
                    src={featured.coverImage}
                    alt={copy.coverAlt.replace('{title}', copy.posts[featured.id].title)}
                    className="aspect-4/3 h-full min-h-52 lg:aspect-auto"
                  />
                </Link>
                <div className="flex min-w-0 flex-col p-6 sm:p-8 lg:col-span-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brass-tint px-2.5 py-1 text-xs font-semibold leading-none text-brass-strong">
                      {copy.featuredLabel}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${categoryBadgeClass[featured.category]}`}>
                      {copy.categories[featured.category]}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
                      <Clock className="size-3.5" aria-hidden="true" />
                      {copy.readTime.replace('{minutes}', String(featured.readMinutes))}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-bold tracking-tight break-words text-ink sm:text-3xl">
                    {copy.posts[featured.id].title}
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-pretty text-body">
                    {copy.posts[featured.id].excerpt}
                  </p>
                  <p className="mt-4 text-sm text-muted">
                    {author}
                    <span aria-hidden="true"> · </span>
                    <time dateTime={featured.publishedAt} suppressHydrationWarning>
                      {formatPostDate(featured.publishedAt, locale)}
                    </time>
                  </p>
                  <Link
                    href={localePath(locale, postPath(featured.slug))}
                    prefetch={false}
                    className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-strong">
                    {copy.readMore}
                    <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          )}

          {showArticles && gridPosts.length > 0 && (
            <section aria-labelledby="articles-title">
              {featured ? (
                <h2 id="articles-title" className="sr-only">
                  {copy.articlesTitle}
                </h2>
              ) : (
                <SectionHeading id="articles-title" title={copy.articlesTitle} />
              )}
              <ul className={`grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 ${featured ? '' : 'mt-8'}`}>
                {gridPosts.map((post) => (
                  <li key={post.id} className="min-w-0">
                    <ArticleCard locale={locale} post={post} content={copy.posts[post.id]} copy={copy} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {showDownloads && visibleFiles.length > 0 && (
            <section aria-labelledby="downloads-title">
              <SectionHeading id="downloads-title" title={copy.downloads.title} description={copy.downloads.subtitle} />
              <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {visibleFiles.map((file) => (
                  <li key={file.id} className="min-w-0">
                    <DownloadCard
                      file={file}
                      content={copy.files[file.id]}
                      categoryLabel={copy.fileCategories[file.category]}
                      cta={copy.downloads.cta}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
