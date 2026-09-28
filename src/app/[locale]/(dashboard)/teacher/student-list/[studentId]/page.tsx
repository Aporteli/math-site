import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { teacherPageMetadata } from '@/components/layout/DashboardPage';
import { StudentListClient } from '@/components/lms/teacher/student-list/components/StudentListClient';
import {
  getTeacherGroups,
  getTeacherStudents,
  getTeacherPayments,
  getTeacherIndividualStudents,
  getTeacherIndividualPayments,
} from '@/components/lms/teacher/student-list/queries';
import { getSession } from '@/lib/auth/session';

type PageProps = { params: Promise<{ locale: string; studentId: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return teacherPageMetadata('studentList', params);
}

export default async function TeacherStudentPage({ params }: PageProps) {
  const session = await getSession();
  if (!session?.user?.id) redirect('/login');

  const { studentId } = await params;
  const teacherId = session.user.id;

  const [groups, groupStudents, individualStudents, groupPayments, individualPayments] =
    await Promise.all([
      getTeacherGroups(teacherId),
      getTeacherStudents(teacherId),
      getTeacherIndividualStudents(teacherId),
      getTeacherPayments(teacherId),
      getTeacherIndividualPayments(teacherId),
    ]);

  return (
    <StudentListClient
      studentId={studentId}
      initialStudents={[...groupStudents, ...individualStudents]}
      groups={groups}
      initialPayments={[...groupPayments, ...individualPayments]}
    />
  );
}
