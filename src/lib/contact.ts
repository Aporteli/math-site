import { z } from "zod";
import type { Dictionary } from "@/i18n/types";

export type ContactRoleId = keyof Dictionary["contactPage"]["roles"];
export type ContactCourseId = keyof Dictionary["contactPage"]["courses"];
export type ContactFormatId = keyof Dictionary["contactPage"]["formats"];

export const CONTACT_ROLES = [
  "parent",
  "pupil",
  "student",
] as const satisfies ReadonlyArray<ContactRoleId>;

export const CONTACT_COURSES = [
  "national",
  "school",
  "olympiad",
  "university",
  "other",
] as const satisfies ReadonlyArray<ContactCourseId>;

export const CONTACT_FORMATS = [
  "onsite",
  "online",
  "either",
] as const satisfies ReadonlyArray<ContactFormatId>;

/** Query values used by course CTAs (`/contact?course=national-exams`). */
export const COURSE_QUERY: Record<string, ContactCourseId> = {
  "national-exams": "national",
  national: "national",
  school: "school",
  olympiad: "olympiad",
  university: "university",
  other: "other",
};

export const TELEGRAM_HREF = "https://t.me/mathlabge";

export function parseCourseQuery(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  return COURSE_QUERY[raw];
}

export function phoneHref(phone: string) {
  return `tel:${phone.replace(/\s/g, "")}`;
}

export function whatsappHref(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

export const consultationSchema = z.object({
  name: z.string().trim().min(2),
  phone: z
    .string()
    .trim()
    .refine((value) => value.replace(/\D/g, "").length >= 9),
  role: z.enum(CONTACT_ROLES),
  course: z.enum(CONTACT_COURSES),
  format: z.enum(CONTACT_FORMATS),
  message: z.string().trim().max(1000).optional(),
});

export type ConsultationInput = z.infer<typeof consultationSchema>;
