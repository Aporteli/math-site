import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { LOGIN_PATH } from "@/lib/auth/paths";
import { loginSchema } from "@/lib/auth/schemas";
import { authSecret } from "@/lib/auth/secret";
import { prisma } from "@/lib/prisma";
import {
  findUserByEmail,
  passwordsMatch,
  toPublicUser,
} from "@/lib/auth/users";
import { isOwnerEmail, type UserRole } from "@/lib/auth/roles";

export { authSecret };

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  session: { strategy: "jwt" },
  pages: { signIn: LOGIN_PATH },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await findUserByEmail(parsed.data.email);
        if (!user) return null;

        const isValid = await passwordsMatch(parsed.data.password, user.password);
        if (!isValid) return null;

        return toPublicUser(user);
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        const normalizedEmail = user.email.trim().toLowerCase();
        let dbUser = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              name: user.name ?? "Google User",
              email: normalizedEmail,
              passwordHash: "",
              role: "VISITOR",
            },
          });
        }

        if (isOwnerEmail(normalizedEmail) && dbUser.role !== "ADMIN") {
          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: { role: "ADMIN" },
          });
        }

        user.id = dbUser.id;
        user.role = dbUser.role;
      }
      return true;
    },

    async jwt({ token, user }) {
      // პირველი შესვლისას
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // ყოველ მოთხოვნაზე ვამოწმებთ ბაზიდან აქტუალურ როლს (როლის შეცვლის შემდეგ მომენტალურად რომ აისახოს)
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email.trim().toLowerCase() },
          select: { id: true, role: true },
        });

        if (dbUser) {
          const role =
            isOwnerEmail(token.email) && dbUser.role !== "ADMIN"
              ? (
                  await prisma.user.update({
                    where: { id: dbUser.id },
                    data: { role: "ADMIN" },
                    select: { role: true },
                  })
                ).role
              : dbUser.role;
          token.id = dbUser.id;
          token.role = role;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as UserRole) ?? "VISITOR";
      }
      return session;
    },
  },
};
