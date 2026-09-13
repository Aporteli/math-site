import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogHub } from '@/components/public/BlogHub';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

type BlogPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const { blogPage } = getDictionary(locale);

  return {
    title: blogPage.meta.title,
    description: blogPage.meta.description,
  };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);

  return <BlogHub locale={locale} author={dict.brand.person} copy={dict.blogPage} />;
}
