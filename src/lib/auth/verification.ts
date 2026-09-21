import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function generateAndSendOTP(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  // 6-ნიშნა შემთხვევითი კოდი
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // ვადა: 10 წუთი

  // ძველი კოდების წაშლა ამ მეილისთვის
  await prisma.verificationToken.deleteMany({
    where: { email: normalizedEmail },
  });

  // ახალი კოდის შენახვა
  await prisma.verificationToken.create({
    data: {
      email: normalizedEmail,
      token,
      expires,
    },
  });

  // მეილის გაგზავნა
  await resend.emails.send({
    from: "MathLab <onboarding@resend.dev>", // პროდაქშენში შენი დომენი
    to: normalizedEmail,
    subject: "თქვენი ვერიფიკაციის კოდი - MathLab",
    html: `<p>თქვენი რეგისტრაციის კოდია: <strong>${token}</strong>. კოდი აქტიურია 10 წუთის განმავლობაში.</p>`,
  });

  return true;
}

export async function verifyOTP(email: string, token: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();

  const record = await prisma.verificationToken.findFirst({
    where: {
      email: normalizedEmail,
      token: token.trim(),
      expires: { gt: new Date() }, // ამოწმებს ხომ არ გაუვიდა ვადა
    },
  });

  if (!record) return false;

  // გამოყენებული კოდის წაშლა
  await prisma.verificationToken.delete({
    where: { id: record.id },
  });

  return true;
}