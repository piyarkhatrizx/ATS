import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * DEVELOPMENT ONLY. Signs you in as a fixed user with no verification.
 *
 * This exists because the nodemailer provider needs a real SMTP server to
 * deliver its magic link, which makes local testing of gated pages impossible
 * without one. It mints a Session row exactly as the Prisma adapter would and
 * sets the same cookie, so everything downstream — middleware, auth(), actorId
 * on Activity rows — behaves identically to a real sign-in.
 *
 * It refuses outright in production. Delete this file before shipping, or keep
 * it and rely on the guard; it is not a back door that can be opened by a
 * request, only by building in development mode.
 */
export const dynamic = "force-dynamic";

const DEV_EMAIL = "dev@northstar.local";
const DEV_NAME = "Dev Recruiter";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await prisma.user.upsert({
    where: { email: DEV_EMAIL },
    update: { name: DEV_NAME },
    create: { email: DEV_EMAIL, name: DEV_NAME, emailVerified: new Date() },
  });

  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { sessionToken, userId: user.id, expires } });

  const target = new URL(request.url);
  const next = target.searchParams.get("next") ?? "/";
  const response = NextResponse.redirect(new URL(next, target.origin));

  // Same cookie the Prisma adapter sets over http in development.
  response.cookies.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });

  return response;
}
