import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { BLOG_POSTS } from '@/lib/blog';

type BlogPostPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">{post.id}</h1>
      <p className="mt-4 text-muted">სტატია მალე დაემატება.</p>
    </div>
  );
}
