import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  BookMarked,
  ClipboardCheck,
  ClipboardList,
  FlaskConical,
  Layers,
  LayoutDashboard,
  Library,
  PenTool,
  Shield,
  Target,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import type { Dictionary } from "@/i18n/types";

export type TeacherNavId = keyof Dictionary["dashboard"]["teacher"]["nav"];
export type StudentNavId = keyof Dictionary["dashboard"]["student"]["nav"];
export type TeacherPageId = keyof Dictionary["dashboard"]["teacher"]["pages"];
export type StudentPageId = keyof Dictionary["dashboard"]["student"]["pages"];

export const SIDEBAR_COOKIE = "mathlab-sidebar";

export interface DashboardLink<Id extends string> {
  id: Id;
  href: string;
  icon: LucideIcon;
}

export const TEACHER_NAV: DashboardLink<TeacherNavId>[] = [
  { id: "journal", href: "/teacher/journal", icon: BookOpen },
  { id: "whiteboard", href: "/teacher/whiteboard", icon: PenTool },
  { id: "admin", href: "/teacher/admin", icon: Shield },
  { id: "problems", href: "/teacher/problems", icon: Library },
  { id: "tools", href: "/teacher/tools", icon: Wrench },
  { id: "students", href: "/teacher/students", icon: Users },
];

export const STUDENT_NAV: DashboardLink<StudentNavId>[] = [
  { id: "assignments", href: "/student/assignments", icon: ClipboardList },
  { id: "flashcards", href: "/student/flashcards", icon: Layers }
];
