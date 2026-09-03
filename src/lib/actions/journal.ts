"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

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

    await prisma.journalEvent.upsert({
      where: { id: event.id },
      update: {
        title: event.title,
        date: event.date,
        allDay: event.allDay,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        description: event.description,
        guests: event.guests,
        color: event.color,
        repeat: event.repeat,
        reminder: event.reminder,
      },
      create: {
        id: event.id,
        userId,
        title: event.title,
        date: event.date,
        allDay: event.allDay,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        description: event.description,
        guests: event.guests,
        color: event.color,
        repeat: event.repeat,
        reminder: event.reminder,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to save journal event:", error);
    return { success: false, error: "შენახვა ვერ მოხერხდა" };
  }
}

export async function deleteJournalEventAction(eventId: string) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.journalEvent.deleteMany({
      where: {
        id: eventId,
        userId: session.user.id,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete journal event:", error);
    return { success: false, error: "წაშლა ვერ მოხერხდა" };
  }
}