import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TeacherWorkspacePage, teacherPageMetadata } from '@/components/layout/DashboardPage';
import { StudentListClient } from '@/components/lms/teacher/student-list/components/StudentListClient';
import {
  getTeacherGroups,
  getTeacherStudents,
  getTeacherPayments,
  getTeacherIndividualStudents,
  getTeacherIndividualPayments,
} from '@/components/lms/teacher/student-list/queries';
import { getSession } from '@/lib/auth/session';

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return teacherPageMetadata('studentList', params);
}

export default async function TeacherStudentListPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect('/login');

  const teacherId = session.user.id;

  const [
    groups,
    groupStudents,
    individualStudents,
    groupPayments,
    individualPayments,
  ] = await Promise.all([
    getTeacherGroups(teacherId),
    getTeacherStudents(teacherId),
    getTeacherIndividualStudents(teacherId),
    getTeacherPayments(teacherId),
    getTeacherIndividualPayments(teacherId),
  ]);

  return (

      <StudentListClient
        initialStudents={[...groupStudents, ...individualStudents]}
        groups={groups}
        initialPayments={[...groupPayments, ...individualPayments]}
      />
  
  );
}