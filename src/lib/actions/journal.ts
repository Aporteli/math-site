"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import type { Prisma } from "@prisma/client";
import type { ParticipantRef } from "./journal-participants";

export interface JournalEventInput {
  id: string;
  title: string;
  date: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  guests: string[];
  participants?: ParticipantRef[];
  color: string;
  repeat: string;
  reminder: string;
}

export async function getJournalEventsAction() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", events: [] };
    }

    const events = await prisma.journalEvent.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "asc" },
    });

    return { success: true, events };
  } catch (error) {
    console.error("Failed to fetch journal events:", error);
    return { success: false, error: "მონაცემების წამოღება ვერ მოხერხდა", events: [] };
  }
}

export async function saveJournalEventAction(event: JournalEventInput) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const participants = event.participants ?? [];

    // ▼ სრული snapshot — ყველაფერი რაც popover-შია
    const metadata: Prisma.InputJsonObject = {
      // საბაზისო ველები
      id: event.id,
      title: event.title,
      date: event.date,
      allDay: event.allDay,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      description: event.description,
      color: event.color,
      repeat: event.repeat,
      reminder: event.reminder,
      // მონაწილეები
      participants: participants.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        courseId: p.courseId ?? null,
        courseTitle: p.courseTitle ?? null,
      })) as Prisma.InputJsonArray,
      // თავისუფალი სტუმრები
      guests: event.guests as Prisma.InputJsonArray,
      // დროის მარკა
      savedAt: new Date().toISOString(),
    };

    const participantsJson = JSON.parse(
      JSON.stringify(participants)
    ) as Prisma.InputJsonArray;

    const data = {
      title: event.title,
      date: event.date,
      allDay: event.allDay,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      description: event.description,
      guests: event.guests,
      participants: participantsJson,
      metadata,                    // ← სრული snapshot
      color: event.color,
      repeat: event.repeat,
      reminder: event.reminder,
    };

    const existing = await prisma.journalEvent.findFirst({
      where: { id: event.id, userId },
      select: { id: true },
    });

    if (existing) {
      await prisma.journalEvent.update({
        where: { id: event.id },
        data,
      });
    } else {
      await prisma.journalEvent.create({
        data: { id: event.id, userId, ...data },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to save journal event:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "შენახვა ვერ მოხერხდა",
    };
  }
}

export async function deleteJournalEventAction(eventId: string) {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await prisma.journalEvent.deleteMany({
      where: { id: eventId, userId: session.user.id },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete journal event:", error);
    return { success: false, error: "წაშლა ვერ მოხერხდა" };
  }
}