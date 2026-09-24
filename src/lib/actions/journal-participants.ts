"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export type ParticipantType = "group" | "individual";

export interface ParticipantRef {
  id: string;                       // უნიკალური key (React-ისთვის)
  name: string;
  type: ParticipantType;
  // ▼ ცალკე ID-ები — query/filter-ისთვის
  userId?: string;                  // ჯგუფური მოსწავლის User.id
  individualStudentId?: string;     // ინდივიდუალური მოსწავლის IndividualStudent.id
  courseId?: string;                // კურსის ID (მხოლოდ group)
  courseTitle?: string;             // კურსის სახელი (snapshot)
}

export interface ParticipantOption {
  id: string;
  name: string;
  type: ParticipantType;
  userId?: string;
  individualStudentId?: string;
  courseId?: string;
  courseTitle?: string;
  yearGroup?: string;
}

export interface ParticipantGroup {
  label: string;
  type: ParticipantType;
  courseId?: string;
  students: ParticipantOption[];
}

export async function getJournalParticipantOptionsAction() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Unauthorized",
        groups: [] as ParticipantGroup[],
      };
    }

    const teacherId = session.user.id;

    // 1) ჯგუფური კურსები + ჩარიცხული მოსწავლეები
    const courses = await prisma.course.findMany({
      where: { teacherId },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        yearGroup: true,
        enrollments: {
          where: { status: "ACTIVE" },
          select: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    const groups: ParticipantGroup[] = courses
      .filter((c) => c.enrollments.length > 0)
      .map((c) => ({
        label: c.title,
        type: "group" as const,
        courseId: c.id,
        students: c.enrollments.map((e) => ({
          id: `group:${c.id}:${e.user.id}`,
          name: e.user.name,
          type: "group" as const,
          userId: e.user.id,              // ← ცალკე
          courseId: c.id,                 // ← ცალკე
          courseTitle: c.title,           // ← snapshot
          yearGroup: c.yearGroup,
        })),
      }));

    // 2) ინდივიდუალური მოსწავლეები
    const individuals = await prisma.individualStudent.findMany({
      where: { teacherId, status: "active" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    });

    if (individuals.length > 0) {
      groups.push({
        label: "ინდივიდუალური მოსწავლეები",
        type: "individual",
        students: individuals.map((s) => ({
          id: `individual:${s.id}`,
          name: `${s.firstName} ${s.lastName}`.trim(),
          type: "individual" as const,
          individualStudentId: s.id,     // ← ცალკე
        })),
      });
    }

    return { success: true, groups };
  } catch (error) {
    console.error("Failed to fetch participant options:", error);
    return {
      success: false,
      error: "მონაწილეების წამოღება ვერ მოხერხდა",
      groups: [] as ParticipantGroup[],
    };
  }
}