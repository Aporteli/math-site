import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TeacherWorkspacePage, teacherPageMetadata } from '@/components/layout/DashboardPage';
import { StudentListClient } from '@/components/lms/teacher/student-list/components/StudentListClient';
import { getTeacherGroups, getTeacherPayments, getTeacherStudents } from '@/lib/teacher/queries';
import { getSession } from '@/lib/auth/session';

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return teacherPageMetadata('studentList', params);
}

export default async function TeacherStudentListPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await getSession();

  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
    redirect(`/${locale}/teacher`);
  }

  const teacherId = session.user.id;

  // სამივე პარალელურად წამოვიღოთ
  const [groups, students, payments] = await Promise.all([
    getTeacherGroups(teacherId),
    getTeacherStudents(teacherId),
    getTeacherPayments(teacherId),
  ]);

  return <StudentListClient initialStudents={students} groups={groups} initialPayments={payments} />;
}
