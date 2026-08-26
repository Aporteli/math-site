import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { LOGIN_PATH } from '@/lib/auth/paths';
import { loginSchema } from '@/lib/auth/schemas';
import { authSecret } from '@/lib/auth/secret';
import { prisma } from '@/lib/prisma';
import { findUserByEmail, passwordsMatch, toPublicUser } from '@/lib/auth/users';
import { isOwnerEmail, type UserRole } from '@/lib/auth/roles';

export { authSecret };

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  session: { strategy: 'jwt' },
  pages: { 
    signIn: LOGIN_PATH,
    error: LOGIN_PATH,
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          prompt: 'select_account',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
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
      if (account?.provider === 'google') {
        if (!user.email) return false;

        const normalizedEmail = user.email.trim().toLowerCase();

        try {
          const isOwner = isOwnerEmail(normalizedEmail);
          const targetRole: UserRole = isOwner ? 'ADMIN' : 'VISITOR';

          // მომხმარებლის ძებნა ან შექმნა
          let dbUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          });

          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                name: user.name ?? normalizedEmail.split('@')[0],
                email: normalizedEmail,
                passwordHash: '',
                role: targetRole,
                imageUrl: user.image ?? null,
              },
            });
          } else if (isOwner && dbUser.role !== 'ADMIN') {
            dbUser = await prisma.user.update({
              where: { id: dbUser.id },
              data: { role: 'ADMIN' },
            });
          }

          user.id = dbUser.id;
          (user as { role?: UserRole }).role = dbUser.role as UserRole;
          return true;
        } catch (error) {
          console.error('CRITICAL_GOOGLE_SIGNIN_ERROR:', error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // 1. საწყისი ავტორიზაციისას ID-ისა და როლის მინიჭება
      if (user) {
        token.id = user.id;
        token.role = ((user as { role?: UserRole }).role ?? 'VISITOR') as UserRole;
      }

      // 2. როლის განახლება ბაზიდან ყოველ ჯერზე, თუ ის აკლია ან ხდება განახლება
      if ((!token.role || trigger === 'update') && token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email.trim().toLowerCase() },
            select: { id: true, role: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role as UserRole;
          }
        } catch (e) {
          console.error('JWT_FETCH_USER_ERROR:', e);
        }
      }

      if (trigger === 'update' && session?.role) {
        token.role = session.role as UserRole;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? '';
        session.user.role = (token.role as UserRole) ?? 'VISITOR';
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // ახალი ავტორიზაციის შემდეგ ყველა გადადის მთავარ გვერდზე (/ka)
      if (url.includes('/login') || url.includes('/signup') || url === baseUrl) {
        return `${baseUrl}/ka`;
      }
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/ka`;
    },
  },
};