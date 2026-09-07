import NextAuth, { type Session } from "next-auth";
import Email from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

/**
 * Gate used by `middleware.ts`.
 *
 * Auth.js defaults this to `true`, which leaves every route open; candidate
 * records are PII, so nothing renders signed out. Exported for the test.
 */
export const authorized = ({ auth }: { auth: Session | null }) => Boolean(auth?.user);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Email({
      server: process.env.EMAIL_SERVER ?? "smtp://localhost:1025",
      from: process.env.EMAIL_FROM ?? "ATS <no-reply@localhost>",
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: { authorized },
});
