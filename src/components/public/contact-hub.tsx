"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  ClipboardCheck,
  House,
  Laptop,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import { PageHero } from "@/components/ui/page-hero";
import {
  CONTACT_COURSES,
  CONTACT_FORMATS,
  CONTACT_ROLES,
  TELEGRAM_HREF,
  consultationSchema,
  phoneHref,
  whatsappHref,
  type ContactCourseId,
  type ContactFormatId,
  type ContactRoleId,
  type ConsultationInput,
} from "@/lib/contact";

type ContactCopy = Dictionary["contactPage"];
type ContactDetails = Dictionary["footer"]["contact"];
type FieldErrors = Partial<Record<keyof ConsultationInput, string>>;

const fieldClass =
  "w-full min-w-0 appearance-none rounded-xl border border-hairline bg-white px-3.5 py-3 text-base text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:ring-2 focus:ring-navy/15 focus:outline-none";

const fieldErrorClass =
  "w-full min-w-0 appearance-none rounded-xl border border-brass bg-white px-3.5 py-3 text-base text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:ring-2 focus:ring-navy/15 focus:outline-none";

interface ContactHubProps {
  copy: ContactCopy;
  contact: ContactDetails;
  initialCourse?: ContactCourseId;
}

export function ContactHub({ copy, contact, initialCourse }: ContactHubProps) {
  return (
    <div className="overflow-x-clip">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <PageHero
          icon={Mail}
          eyebrow={copy.hero.eyebrow}
          title={copy.hero.title}
          description={copy.hero.subtitle}
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-12">
          <aside className="space-y-5 lg:col-span-5">
            <DirectContactCard copy={copy} contact={contact} />
            <HoursCard copy={copy} />
            <AssessmentCard copy={copy} />
          </aside>

          <div className="lg:col-span-7">
            <ConsultationForm copy={copy} initialCourse={initialCourse} />
          </div>
        </div>

        <MapPlaceholder copy={copy} address={contact.address} />
      </div>
    </div>
  );
}

function DirectContactCard({
  copy,
  contact,
}: {
  copy: ContactCopy;
  contact: ContactDetails;
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-ink">{copy.channels.title}</h2>
      <ul className="mt-5 space-y-4">
        <ContactRow icon={Phone} label={copy.channels.phone}>
          <a
            href={phoneHref(contact.phone)}
            className="font-medium text-navy transition-colors hover:text-navy-strong"
          >
            {contact.phone}
          </a>
        </ContactRow>
        <li className="flex gap-3">
          <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy-tint text-navy">
            <MessageCircle className="size-5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-2 pt-1">
            <a
              href={whatsappHref(contact.phone)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={copy.channels.whatsappAria}
              className="inline-flex items-center rounded-full border border-hairline bg-paper px-3 py-1.5 text-sm font-semibold text-navy transition-colors hover:border-navy/30"
            >
              {copy.channels.whatsapp}
            </a>
            <a
              href={TELEGRAM_HREF}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={copy.channels.telegramAria}
              className="inline-flex items-center rounded-full border border-hairline bg-paper px-3 py-1.5 text-sm font-semibold text-navy transition-colors hover:border-navy/30"
            >
              {copy.channels.telegram}
            </a>
          </div>
        </li>
        <ContactRow icon={Mail} label={copy.channels.email}>
          <a
            href={`mailto:${contact.email}`}
            className="break-all font-medium text-navy transition-colors hover:text-navy-strong"
          >
            {contact.email}
          </a>
        </ContactRow>
        <ContactRow icon={MapPin} label={copy.channels.location}>
          <p className="font-medium text-ink">{contact.address}</p>
          <p className="mt-0.5 text-sm text-muted">{copy.channels.locationNote}</p>
        </ContactRow>
      </ul>
    </section>
  );
}

function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy-tint text-navy">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-muted">{label}</p>
        <div className="mt-1">{children}</div>
      </div>
    </li>
  );
}

function HoursCard({ copy }: { copy: ContactCopy }) {
  return (
    <section className="rounded-2xl border border-hairline bg-white p-5 shadow-sm sm:p-6">
      <div className="flex gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy-tint text-navy">
          <Clock className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink">{copy.hours.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-body">{copy.hours.value}</p>
        </div>
      </div>
    </section>
  );
}

function AssessmentCard({ copy }: { copy: ContactCopy }) {
  return (
    <aside className="rounded-xl border border-brass/30 bg-brass-tint p-4">
      <div className="flex gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brass">
          <ClipboardCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-ink">{copy.assessment.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-body">
            {copy.assessment.text}
          </p>
        </div>
      </div>
    </aside>
  );
}

function ConsultationForm({
  copy,
  initialCourse,
}: {
  copy: ContactCopy;
  initialCourse?: ContactCourseId;
}) {
  const formId = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<ContactRoleId | "">("");
  const [course, setCourse] = useState<ContactCourseId | "">(initialCourse ?? "");
  const [format, setFormat] = useState<ContactFormatId | "">("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function resetForm() {
    setName("");
    setPhone("");
    setRole("");
    setCourse(initialCourse ?? "");
    setFormat("");
    setMessage("");
    setErrors({});
    setSent(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = consultationSchema.safeParse({
      name,
      phone,
      role: role || undefined,
      course: course || undefined,
      format: format || undefined,
      message: message.trim() ? message : undefined,
    });

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "name" || key === "phone" || key === "role" || key === "course" || key === "format") {
          next[key] = copy.errors[key];
        }
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSending(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setSending(false);
    setSent(true);
  }

  return (
    <section className="rounded-2xl border border-hairline bg-white p-5 shadow-sm sm:p-6 lg:p-8">
      <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
        {copy.form.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-body sm:text-base">
        {copy.form.subtitle}
      </p>

      {sent ? (
        <div className="mt-8 rounded-xl border border-hairline bg-paper-deep px-5 py-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-navy" aria-hidden="true" />
          <p className="mt-4 text-lg font-semibold text-ink">{copy.form.successTitle}</p>
          <p className="mt-2 text-sm leading-relaxed text-body">{copy.form.successText}</p>
          <button
            type="button"
            onClick={resetForm}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-strong"
          >
            {copy.form.successAgain}
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
          <Field
            id={`${formId}-name`}
            label={copy.form.name}
            error={errors.name}
          >
            <input
              id={`${formId}-name`}
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={copy.form.namePlaceholder}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? `${formId}-name-error` : undefined}
              className={errors.name ? fieldErrorClass : fieldClass}
            />
          </Field>

          <Field
            id={`${formId}-phone`}
            label={copy.form.phone}
            error={errors.phone}
          >
            <input
              id={`${formId}-phone`}
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={copy.form.phonePlaceholder}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? `${formId}-phone-error` : undefined}
              className={errors.phone ? fieldErrorClass : fieldClass}
            />
          </Field>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">{copy.form.role}</legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {CONTACT_ROLES.map((id) => (
                <ChoicePill
                  key={id}
                  name="role"
                  checked={role === id}
                  onChange={() => setRole(id)}
                >
                  {copy.roles[id]}
                </ChoicePill>
              ))}
            </div>
            {errors.role && (
              <p className="mt-2 text-sm text-brass-strong" role="alert">
                {errors.role}
              </p>
            )}
          </fieldset>

          <Field
            id={`${formId}-course`}
            label={copy.form.course}
            error={errors.course}
          >
            <div className="relative">
              <select
                id={`${formId}-course`}
                name="course"
                value={course}
                onChange={(event) =>
                  setCourse(event.target.value as ContactCourseId | "")
                }
                aria-invalid={Boolean(errors.course)}
                aria-describedby={errors.course ? `${formId}-course-error` : undefined}
                className={`${errors.course ? fieldErrorClass : fieldClass} pr-10`}
              >
                <option value="">{copy.form.coursePlaceholder}</option>
                {CONTACT_COURSES.map((id) => (
                  <option key={id} value={id}>
                    {copy.courses[id]}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
            </div>
          </Field>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">{copy.form.format}</legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {CONTACT_FORMATS.map((id) => {
                const Icon = formatIcon[id];
                return (
                  <ChoicePill
                    key={id}
                    name="format"
                    checked={format === id}
                    onChange={() => setFormat(id)}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {copy.formats[id]}
                  </ChoicePill>
                );
              })}
            </div>
            {errors.format && (
              <p className="mt-2 text-sm text-brass-strong" role="alert">
                {errors.format}
              </p>
            )}
          </fieldset>

          <Field
            id={`${formId}-message`}
            label={`${copy.form.message} ${copy.form.messageOptional}`}
          >
            <textarea
              id={`${formId}-message`}
              name="message"
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={copy.form.messagePlaceholder}
              className={`${fieldClass} resize-y min-h-28`}
            />
          </Field>

          <button
            type="submit"
            disabled={sending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-3 text-base font-medium text-white shadow-sm transition-all hover:bg-navy-strong disabled:cursor-wait disabled:opacity-70"
          >
            {sending ? copy.form.sending : copy.form.submit}
            <Send className="size-4 shrink-0" aria-hidden="true" />
          </button>
        </form>
      )}
    </section>
  );
}

const formatIcon: Record<ContactFormatId, LucideIcon> = {
  onsite: House,
  online: Laptop,
  either: ArrowLeftRight,
};

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-brass-strong" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ChoicePill({
  name,
  checked,
  onChange,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={`inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
        checked
          ? "border-navy bg-navy text-white shadow-sm"
          : "border-hairline bg-white text-body hover:border-navy/30 hover:text-ink"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {children}
    </label>
  );
}

function MapPlaceholder({
  copy,
  address,
}: {
  copy: ContactCopy;
  address: string;
}) {
  return (
    <section className="mt-12 overflow-hidden rounded-2xl border border-hairline bg-white shadow-sm sm:mt-16">
      <div className="border-b border-hairline px-5 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-ink">{copy.map.title}</h2>
        <p className="mt-1 text-sm text-body">{copy.map.subtitle}</p>
      </div>
      <div className="relative isolate min-h-64 overflow-hidden bg-paper-deep sm:min-h-80">
        <svg
          viewBox="0 0 640 320"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 size-full text-navy/10"
          aria-hidden="true"
        >
          <rect width="640" height="320" fill="#f2f0ea" />
          <g stroke="currentColor" strokeWidth="0.8">
            <path d="M80 0v320M160 0v320M240 0v320M320 0v320M400 0v320M480 0v320M560 0v320" />
            <path d="M0 40h640M0 80h640M0 120h640M0 160h640M0 200h640M0 240h640M0 280h640" />
          </g>
          <path
            d="M40 220 C120 180 180 250 260 200 C340 150 380 240 460 190 C520 155 560 210 620 170"
            fill="none"
            stroke="#17365d"
            strokeWidth="2.5"
            opacity="0.18"
          />
          <path
            d="M20 140 C90 110 140 190 220 130 C300 70 360 160 440 110 C510 70 560 140 640 100"
            fill="none"
            stroke="#8a621b"
            strokeWidth="2"
            opacity="0.2"
          />
        </svg>
        <div className="relative flex min-h-64 flex-col items-center justify-center px-4 py-12 sm:min-h-80">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-white text-navy shadow-md ring-1 ring-hairline">
            <MapPin className="size-7" aria-hidden="true" />
          </span>
          <p className="mt-4 text-base font-semibold text-ink">{copy.map.pin}</p>
          <p className="mt-1 text-sm text-muted">{address}</p>
        </div>
      </div>
    </section>
  );
}
