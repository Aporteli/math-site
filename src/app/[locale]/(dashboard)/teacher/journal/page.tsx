import type { Metadata } from 'next';
import { TeacherWorkspacePage, teacherPageMetadata } from '@/components/layout/DashboardPage';

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return teacherPageMetadata('journal', params);
}

export default function TeacherCalendarPage({ params }: PageProps) {
  return <TeacherWorkspacePage id="journal" params={params} />;
}
