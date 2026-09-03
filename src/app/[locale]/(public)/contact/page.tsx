import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContactHub } from '@/hooks/public/contact-hub';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { parseCourseQuery } from '@/lib/contact';

type ContactPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ course?: string | string[] }>;
};

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const { contactPage } = getDictionary(locale);

  return {
    title: contactPage.meta.title,
    description: contactPage.meta.description,
  };
}

export default async function ContactPage({ params, searchParams }: ContactPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { course } = await searchParams;
  const dict = getDictionary(locale);

  return <ContactHub copy={dict.contactPage} contact={dict.footer.contact} initialCourse={parseCourseQuery(course)} />;
}
