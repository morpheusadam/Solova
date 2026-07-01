import argon2 from "argon2";
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { db } from "~/server/db";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Single-user credentials auth (spec §1): argon2-hashed password, JWT session
 * in an httpOnly cookie. The `users` table already models future multi-user.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user) return null;

        const valid = await argon2.verify(user.passwordHash, parsed.data.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.displayName };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: { ...session.user, id: token.sub ?? "" },
    }),
  },
});
