import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { LOGIN_PATH } from "@/lib/auth/paths";
import { loginSchema } from "@/lib/auth/schemas";
import { authSecret } from "@/lib/auth/secret";
import {
  findUserByEmail,
  passwordsMatch,
  toPublicUser,
} from "@/lib/auth/users";

export { authSecret };

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  session: { strategy: "jwt" },
  pages: { signIn: LOGIN_PATH },
  providers: [
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
        if (!user || !passwordsMatch(parsed.data.password, user.password)) {
          return null;
        }

        return toPublicUser(user);
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};
