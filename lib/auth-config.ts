import NextAuth, { type Session } from "next-auth";
import Email from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { isAllowedEmail } from "@/lib/auth-allowlist";

/**
 * Auth.js wiring. Nothing outside lib/auth.ts should import from here — the
 * rest of the app goes through getUser() and requireUser(), so swapping the
 * provider means rewriting those two functions and this file, and nothing else.
 */

/**
 * Gate used by middleware.ts.
 *
 * Auth.js defaults this to `true`, which leaves every route open; lead records
 * are personal data, so nothing renders signed out. Exported for the test.
 */
export const authorized = ({ auth }: { auth: Session | null }) => Boolean(auth?.user);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Email({
      server: process.env.EMAIL_SERVER ?? "smtp://localhost:1025",
      from: process.env.EMAIL_FROM ?? "Korosha <no-reply@localhost>",
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    authorized,
    /**
     * Authorization, not authentication: anyone can receive a magic link, but
     * only an allowlisted address may complete sign-in. Returning false sends
     * them back to /login rather than throwing.
     */
    signIn({ user }) {
      return isAllowedEmail(user?.email);
    },
  },
});
