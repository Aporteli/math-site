'use server';

import { signupSchema } from '@/lib/auth/schemas';
import { createUser, findUserByEmail } from '@/lib/auth/users';
import { generateAndSendOTP, verifyOTP } from '@/lib/auth/verification';

/**
 * ეტაპი 1: ფორმის მონაცემების ვალიდაცია და მეილზე 6-ნიშნა კოდის გაგზავნა
 */
export async function sendSignupOtpAction(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  // Zod-ით ვამოწმებთ შეყვანილ მონაცემებს
  const parsed = signupSchema.safeParse({
    name,
    email,
    password,
    confirmPassword,
  });

  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  // ვამოწმებთ, ხომ არ არის მეილი უკვე დაკავებული
  const existingUser = await findUserByEmail(parsed.data.email);
  if (existingUser) {
    return { success: false, error: 'Email already exists' };
  }

  // ვაგენერირებთ და ვაგზავნით კოდს
  try {
    await generateAndSendOTP(parsed.data.email);
    return { success: true };
  } catch (error) {
    console.error('OTP გაგზავნის შეცდომა:', error);
    return { success: false, error: 'Failed to send OTP' };
  }
}

/**
 * ეტაპი 2: 6-ნიშნა კოდის გადამოწმება და მომხმარებლის ბაზაში შექმნა
 */
export async function verifyAndCreateUserAction(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const code = (formData.get('code') as string)?.trim();

  if (!code || code.length !== 6) {
    return { success: false, error: 'Invalid verification code' };
  }

  const parsed = signupSchema.safeParse({
    name,
    email,
    password,
    confirmPassword,
  });

  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  // ვამოწმებთ მეილზე გაგზავნილ OTP კოდს Prisma-ს ბაზაში
  const isValid = await verifyOTP(parsed.data.email, code);
  if (!isValid) {
    return { success: false, error: 'Invalid or expired OTP' };
  }

  // ვქმნით მომხმარებელს ბაზაში
  try {
    await createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role: 'VISITOR',
    });

    return { success: true };
  } catch (error) {
    console.error('მომხმარებლის შექმნის შეცდომა:', error);
    return { success: false, error: 'Failed to create user' };
  }
}