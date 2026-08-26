import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';

export type BlogCategoryId = keyof Dictionary['blogPage']['categories'];
export type BlogTagId = keyof Dictionary['blogPage']['tags'];
export type BlogPostId = keyof Dictionary['blogPage']['posts'];
export type DownloadId = keyof Dictionary['blogPage']['files'];
export type ResourceCategoryId = keyof Dictionary['blogPage']['fileCategories'];
export type BlogFilterId = Exclude<keyof Dictionary['blogPage']['filters'], 'aria'>;

/**
 * Catalog row for a post. Titles, excerpts and tag labels live in i18n.
 * The shape is ready to map from a Prisma `Post` model later (id, slug,
 * category, publishedAt, tags). Author is the site teacher unless a CMS
 * supplies another name.
 */
export interface BlogPost {
  id: BlogPostId;
  slug: string;
  category: BlogCategoryId;
  publishedAt: string;
  readMinutes: number;
  featured?: boolean;
  tags: BlogTagId[];
  /** Object-storage URL. Empty for now; the UI shows a placeholder. */
  coverImage?: string;
}

/**
 * Catalog row for a downloadable file. Titles live in i18n; file metadata
 * stays here so a later Prisma `Resource` row can replace this array.
 */
export interface ResourceDownload {
  id: DownloadId;
  fileType: 'PDF' | 'ZIP';
  fileSize: string;
  category: ResourceCategoryId;
  downloadUrl: string;
}

export const BLOG_FILTERS: BlogFilterId[] = ['all', 'history', 'biographies', 'funFacts', 'guides', 'downloads'];

export const categoryBadgeClass: Record<BlogCategoryId, string> = {
  history: 'bg-brass-tint text-brass-strong',
  biographies: 'bg-navy-tint text-navy',
  funFacts: 'bg-paper-deep text-ink',
  guides: 'bg-navy-tint text-navy',
  paradoxes: 'bg-brass-tint text-brass-strong',
};

const dateLocales: Record<Locale, string> = {
  ka: 'ka-GE',
  en: 'en-GB',
  ru: 'ru-RU',
};

export function formatPostDate(dateStr: string, locale: string = 'ka') {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat(locale === 'ka' ? 'ka-GE' : locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
export function postPath(slug: string) {
  return `/blog/${slug}`;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'euclid-geometry',
    slug: 'euclid-geometry',
    category: 'history',
    publishedAt: '2026-08-12',
    readMinutes: 12,
    featured: true,
    tags: ['geometry', 'history'],
  },
  {
    id: 'euler-biography',
    slug: 'euler-biography',
    category: 'biographies',
    publishedAt: '2026-08-05',
    readMinutes: 9,
    tags: ['biography', 'analysis'],
  },
  {
    id: 'story-of-zero',
    slug: 'story-of-zero',
    category: 'funFacts',
    publishedAt: '2026-07-28',
    readMinutes: 6,
    tags: ['history', 'arithmetic'],
  },
  {
    id: 'exam-writeup',
    slug: 'exam-writeup',
    category: 'guides',
    publishedAt: '2026-07-20',
    readMinutes: 8,
    tags: ['exam', 'algebra'],
  },
  {
    id: 'zeno-paradoxes',
    slug: 'zeno-paradoxes',
    category: 'paradoxes',
    publishedAt: '2026-07-14',
    readMinutes: 10,
    tags: ['paradox', 'analysis'],
  },
  {
    id: 'hypatia',
    slug: 'hypatia',
    category: 'biographies',
    publishedAt: '2026-07-02',
    readMinutes: 7,
    tags: ['biography', 'history'],
  },
  {
    id: 'golden-ratio',
    slug: 'golden-ratio',
    category: 'funFacts',
    publishedAt: '2026-06-25',
    readMinutes: 5,
    tags: ['geometry', 'art'],
  },
  {
    id: 'katex-in-class',
    slug: 'katex-in-class',
    category: 'guides',
    publishedAt: '2026-06-18',
    readMinutes: 6,
    tags: ['formulas', 'exam'],
  },
];

export const RESOURCE_DOWNLOADS: ResourceDownload[] = [
  {
    id: 'formula-cheatsheet',
    fileType: 'PDF',
    fileSize: '1.8 MB',
    category: 'formulas',
    downloadUrl: '/downloads/formula-cheatsheet.pdf',
  },
  {
    id: 'national-exam-archive',
    fileType: 'ZIP',
    fileSize: '14.2 MB',
    category: 'examArchives',
    downloadUrl: '/downloads/national-exam-archive.zip',
  },
  {
    id: 'geometry-workbook',
    fileType: 'PDF',
    fileSize: '3.4 MB',
    category: 'cheatSheets',
    downloadUrl: '/downloads/geometry-workbook.pdf',
  },
  {
    id: 'olympiad-set',
    fileType: 'PDF',
    fileSize: '4.6 MB',
    category: 'cheatSheets',
    downloadUrl: '/downloads/olympiad-set.pdf',
  },
];
