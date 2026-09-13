import { cookies } from 'next/headers';
import { DashboardFrame } from '@/components/layout/DashboardFrame';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';
import { SIDEBAR_COOKIE } from '@/lib/dashboard';

type DashboardShellProps = {
  locale: Locale;
  dict: Dictionary;
  roleLabel: string;
  userName: string;
  children: React.ReactNode;
} & (
  | {
      role: 'teacher';
      labels: Dictionary['dashboard']['teacher']['nav'];
    }
  | {
      role: 'student';
      labels: Dictionary['dashboard']['student']['nav'];
    }
);

export async function DashboardShell(props: DashboardShellProps) {
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === '1';

  if (props.role === 'teacher') {
    return (
      <DashboardFrame
        locale={props.locale}
        dict={props.dict}
        roleLabel={props.roleLabel}
        userName={props.userName}
        initialCollapsed={collapsed}
        role="teacher"
        labels={props.labels}>
        {props.children}
      </DashboardFrame>
    );
  }

  return (
    <DashboardFrame
      locale={props.locale}
      dict={props.dict}
      roleLabel={props.roleLabel}
      userName={props.userName}
      initialCollapsed={collapsed}
      role="student"
      labels={props.labels}>
      {props.children}
    </DashboardFrame>
  );
}
